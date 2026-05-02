using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NetTopologySuite.Geometries;
using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class AiSemanticSearchService : IAiSemanticSearchService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private static readonly HashSet<string> FallbackStopWords =
        [
            "gde", "mogu", "moze", "mozete", "da", "na", "sa", "u", "uz", "za", "od", "do", "i", "ili",
            "je", "su", "li", "mi", "me", "ti", "nam", "vam", "meni", "tebi", "se", "sta", "sto", "kako",
            "koji", "koja", "koje", "neko", "neka", "neku", "ovo", "ova", "ovaj", "the", "a", "an", "to",
            "for", "with", "in", "of", "on", "at", "by", "jel", "imas", "imam", "neki", "neko", "neku",
            "bas", "dobar", "dobra", "dobro", "predlog", "predloga", "savet", "savetujes", "mene", "meni",
            "trazim", "htela", "hteo", "zelim", "molim", "nešto", "nesto"
        ];

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly AppDbContext _context;
        private readonly ILogger<AiSemanticSearchService> _logger;
        private readonly OllamaOptions _options;

        public AiSemanticSearchService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            AppDbContext context,
            IOptions<OllamaOptions> options,
            ILogger<AiSemanticSearchService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _context = context;
            _logger = logger;
            _options = options.Value ?? new OllamaOptions();
        }

        public async Task<AiSemanticSearchResponseDto> SearchAsync(
            int? userId,
            AiSemanticSearchQueryDto request,
            CancellationToken cancellationToken = default)
        {
            var sanitized = SanitizeRequest(request);
            if (string.IsNullOrWhiteSpace(sanitized.Query))
            {
                return new AiSemanticSearchResponseDto
                {
                    Provider = "fallback",
                    UsedFallback = true,
                    Warning = "Upit je prazan.",
                    Results = [],
                };
            }

            var cacheKey = BuildCacheKey(sanitized);
            if (_cache.TryGetValue(cacheKey, out AiSemanticSearchResponseDto? cached) && cached != null)
            {
                return CloneResponse(cached);
            }

            var context = await BuildContextAsync(userId, sanitized, cancellationToken);
            var fastLaneExecution = await TryExecuteFastLaneAsync(sanitized, context, cancellationToken);
            if (fastLaneExecution != null)
            {
                var fastLaneResponse = new AiSemanticSearchResponseDto
                {
                    Provider = "fast-lane",
                    UsedFallback = false,
                    Warning = null,
                    QuerySummary = fastLaneExecution.Plan.QuerySummary,
                    RegionName = context.EffectiveRegion?.Name,
                    Categories = fastLaneExecution.Plan.Categories,
                    Results = fastLaneExecution.Results,
                };

                _cache.Set(cacheKey, CloneResponse(fastLaneResponse), TimeSpan.FromMinutes(2));
                return fastLaneResponse;
            }

            SemanticSearchPlan plan = BuildFallbackPlan(sanitized.Query, context);
            Exception? lastException = null;
            var provider = "fallback";

            if (_options.Enabled)
            {
                var client = BuildOllamaClient();
                var candidateModels = await GetAvailableCandidateModelsAsync(client, cancellationToken);
                if (candidateModels.Count == 0)
                {
                    lastException = new InvalidOperationException("No configured Ollama model is installed locally.");
                }

                foreach (var model in candidateModels)
                {
                    try
                    {
                        plan = await CreatePlanAsync(client, model, sanitized, context, cancellationToken);
                        provider = $"ollama:{model}";
                        lastException = null;
                        break;
                    }
                    catch (Exception ex)
                    {
                        lastException = ex;
                        _logger.LogWarning(ex, "AI semantic planner failed for query '{Query}' using model '{Model}'", sanitized.Query, model);
                    }
                }
            }

            plan = FinalizePlan(plan, sanitized, context);
            var candidatePlans = BuildBroadeningPlans(plan, sanitized);
            var snapshot = await BuildSnapshotAsync(candidatePlans, context, cancellationToken);
            var execution = ExecuteWithBroadening(candidatePlans, context, snapshot);
            plan = execution.Plan;
            var results = execution.Results;

            var response = new AiSemanticSearchResponseDto
            {
                Provider = provider,
                UsedFallback = provider == "fallback",
                Warning = provider == "fallback" ? BuildFallbackWarning(lastException) : null,
                QuerySummary = plan.QuerySummary,
                RegionName = context.EffectiveRegion?.Name,
                Categories = plan.Categories,
                Results = results,
            };

            _cache.Set(cacheKey, CloneResponse(response), TimeSpan.FromMinutes(2));
            return response;
        }

        private async Task<PlanExecutionResult?> TryExecuteFastLaneAsync(
            AiSemanticSearchQueryDto request,
            SearchExecutionContext context,
            CancellationToken cancellationToken)
        {
            var queryWordCount = GetQueryWordCount(request.Query);
            if (!IsFastLaneEligible(request.Query, queryWordCount))
            {
                return null;
            }

            var plan = FinalizePlan(BuildFallbackPlan(request.Query, context), request, context);
            var candidates = queryWordCount <= 2
                ? BuildUltraFastLanePlans(plan, request)
                : BuildFastLanePlans(plan, request);
            if (candidates.Count == 0)
            {
                return null;
            }

            var snapshot = await BuildSnapshotAsync(candidates, context, cancellationToken);
            var execution = ExecuteWithBroadening(candidates, context, snapshot);
            return HasAcceptableFastLaneResults(execution.Results)
                ? execution
                : null;
        }

        private HttpClient BuildOllamaClient()
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(4, Math.Min(_options.TimeoutSeconds, 8)));
            return client;
        }

        private static AiSemanticSearchQueryDto SanitizeRequest(AiSemanticSearchQueryDto request)
        {
            return new AiSemanticSearchQueryDto
            {
                Query = request.Query?.Trim() ?? string.Empty,
                PageSize = Math.Clamp(request.PageSize <= 0 ? 8 : request.PageSize, 1, 20),
                RegionId = request.RegionId is > 0 ? request.RegionId : null,
                Latitude = request.Latitude is 0 ? null : request.Latitude,
                Longitude = request.Longitude is 0 ? null : request.Longitude,
            };
        }

        private static int GetQueryWordCount(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return 0;
            }

            return Regex.Matches(NormalizeText(query), @"\p{L}[\p{L}\p{Nd}-]*").Count;
        }

        private static bool IsFastLaneEligible(string query, int queryWordCount)
        {
            if (queryWordCount is >= 1 and <= 4)
            {
                return true;
            }

            if (queryWordCount > 12)
            {
                return false;
            }

            var theme = DetectQueryTheme(query);
            return theme is "food" or "drink" or "nightlife" or "walk" or "family" or "hiking";
        }

        private static bool HasAcceptableFastLaneResults(IReadOnlyCollection<SmartSearchResultDto> results)
        {
            return results.Count > 0 && results.Max(result => result.Score) >= 12d;
        }

        private async Task<SearchExecutionContext> BuildContextAsync(
            int? userId,
            AiSemanticSearchQueryDto request,
            CancellationToken cancellationToken)
        {
            var activeRegions = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderBy(r => r.Name)
                .ToListAsync(cancellationToken);

            var knownDestinations = await _context.Destinations
                .AsNoTracking()
                .Where(d => d.IsActive && d.Status == ContentStatus.Approved)
                .Select(d => d.Name)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync(cancellationToken);

            var knownLocalities = await _context.Localities
                .AsNoTracking()
                .Where(l => l.IsActive)
                .Select(l => l.Name)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync(cancellationToken);

            User? user = null;
            if (userId.HasValue)
            {
                user = await _context.Users
                    .AsNoTracking()
                    .Include(u => u.PreferredRegion)
                    .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
            }

            var effectiveRegion = activeRegions.FirstOrDefault(r => r.Id == request.RegionId)
                ?? user?.PreferredRegion;

            GeoPoint? origin = null;
            if (request.Latitude.HasValue && request.Longitude.HasValue)
            {
                origin = new GeoPoint(request.Latitude.Value, request.Longitude.Value);
            }
            else if (user?.LastKnownLocation != null)
            {
                origin = new GeoPoint(user.LastKnownLocation.Y, user.LastKnownLocation.X);
            }
            else if (effectiveRegion?.CenterLatitude != null && effectiveRegion.CenterLongitude != null)
            {
                origin = new GeoPoint(effectiveRegion.CenterLatitude.Value, effectiveRegion.CenterLongitude.Value);
            }

            return new SearchExecutionContext
            {
                Request = request,
                AvailableRegions = activeRegions,
                AvailablePlaceNames = activeRegions.Select(r => r.Name)
                    .Concat(knownDestinations)
                    .Concat(knownLocalities)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                EffectiveRegion = effectiveRegion,
                Origin = origin,
            };
        }

        private async Task<SemanticSearchPlan> CreatePlanAsync(
            HttpClient client,
            string model,
            AiSemanticSearchQueryDto request,
            SearchExecutionContext context,
            CancellationToken cancellationToken)
        {
            using var plannerCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            plannerCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(3, Math.Min(_options.TimeoutSeconds, 6))));

            var response = await SendChatAsync(client, new OllamaChatRequest
            {
                Model = model,
                Stream = false,
                Format = "json",
                Messages = BuildPlannerConversation(request, context),
                Options = OllamaChatOptions.ForPlanning(),
            }, plannerCts.Token);

            var raw = ExtractJsonPayload(response.Message?.Content);
            if (string.IsNullOrWhiteSpace(raw))
            {
                throw new InvalidOperationException("Planner did not return JSON payload.");
            }

            var parsed = JsonSerializer.Deserialize<SemanticSearchPlan>(raw, JsonOptions);
            if (parsed == null)
            {
                throw new InvalidOperationException("Planner returned invalid JSON plan.");
            }

            return parsed;
        }

        private static List<OllamaMessage> BuildPlannerConversation(
            AiSemanticSearchQueryDto request,
            SearchExecutionContext context)
        {
            var regionNames = context.AvailableRegions.Select(r => r.Name).ToList();
            var regionList = regionNames.Count == 0 ? "nema regiona" : string.Join(", ", regionNames);
            var regionContext = context.EffectiveRegion?.Name ?? "none";
            var latitude = request.Latitude?.ToString(CultureInfo.InvariantCulture) ?? "none";
            var longitude = request.Longitude?.ToString(CultureInfo.InvariantCulture) ?? "none";

            return
            [
                new OllamaMessage
                {
                    Role = "system",
                    Content =
                        $$"""
                        Ti si planner za pretragu turisticke aplikacije.
                        Ne odgovaras korisniku. Vracas SAMO JSON bez markdown-a.

                        Tvoj posao je da korisnicki upit prebacis u strukturisanu semanticku pretragu.
                        Ne oslanjas se na jednu rec iz upita, vec razumes znacenje.

                        Vrati JSON u obliku:
                        {
                          "querySummary": "kratka pretraga na srpskom ili engleskom",
                          "categories": ["destination","locality","object","event","activity"],
                          "regionName": "jedan od dostupnih regiona ili null",
                          "searchStyle": "specific|exploratory",
                          "locationAnchors": ["kanonski nazivi mesta iz aplikacije, npr Valencia ili Kotor"],
                          "preferredObjectTypes": ["bar","club","restaurant"],
                          "mustTerms": ["bitni pojmovi koji moraju ili bi skoro morali da se poklope"],
                          "shouldTerms": ["dodatni pojmovi, sinonimi i feature-i koji pomazu pretrazi"],
                          "nearMe": true,
                          "sortBy": "relevance|distance|rating",
                          "pageSize": 8
                        }

                        Pravila:
                        - regionName koristi SAMO ako korisnik eksplicitno navede region/drzavu, ili ako iz konteksta aktivnog regiona jasno treba ostati u tom regionu.
                        - searchStyle = "specific" kada korisnik trazi konkretnu stvar, pogodnost, kuhinju ili tip mesta.
                        - searchStyle = "exploratory" kada korisnik trazi opstu preporuku, izlazak, sta da vidi, sta je zanimljivo ili gde da ode bez mnogo ogranicenja.
                        - Ako korisnik navede konkretno mesto, grad, destinaciju ili lokalitet, vrati ga u locationAnchors koristeci kanonski naziv iz aplikacije ako mozes da ga prepoznas.
                        - preferredObjectTypes koristi kada korisnik implicitno ili eksplicitno trazi odredjen tip mesta; za genericne upite moze ostati prazno.
                        - Ako korisnik pita za setnju sa decom, kategorije ce najcesce biti activity, locality i destination.
                        - Ako korisnik pita za bazen, kategorije ce najcesce biti object, locality ili activity, ali ne genericni spomenici.
                        - Ako korisnik pita za vecernji izlazak, kategorije ce najcesce biti object, event i locality.
                        - Drustveni kontekst poput "sa drugaricama", "sa deckom", "sa drustvom" obicno nije dobar mustTerm; to su pre shouldTerms ili se ignorisu ako ne pomazu pretrazi u bazi.
                        - shouldTerms smeju da sadrze korisne sinonime i feature-e koje verovatno treba traziti u bazi.
                        - Nemoj da izmisljas region koji nije u listi dostupnih regiona.
                        - Dostupni regioni: {{regionList}}.
                        - Aktivni region iz konteksta: {{regionContext}}.
                        - Ako korisnik nije naveo mesto, a aktivni region postoji, smes da ostanes u tom regionu.

                        Primeri:
                        - "gde mogu da prosetam sa decom u Kotoru" ->
                          categories: ["activity","locality"],
                          locationAnchors: ["Kotor"],
                          mustTerms: ["kotor"],
                          shouldTerms: ["setnja","deca","porodicno","park","priroda"]
                        - "bazen" ->
                          categories: ["object","locality","activity"],
                          preferredObjectTypes: ["hotel","spa","resort","aquapark"],
                          mustTerms: ["bazen"],
                          shouldTerms: ["pool","swimming","aquapark","spa","wellness"]
                        - "jel imas neki dobar predlog gde da izadjem uvece u provod sa drugaricama" ->
                          searchStyle: "exploratory",
                          categories: ["object","event","locality"],
                          preferredObjectTypes: ["bar","club","restaurant","winery"],
                          mustTerms: [],
                          shouldTerms: ["bar","cocktail","music","party","night","wine"]
                        - "sta turisticki da vidim u Valensiji" ->
                          searchStyle: "exploratory",
                          categories: ["destination","locality","activity","event","object"],
                          locationAnchors: ["Valencia"],
                          mustTerms: [],
                          shouldTerms: ["turisticki","zanimljivo","razgledanje","landmark","food","culture"]
                        - "gde u vecernji izlazak" ->
                          categories: ["object","event","locality"],
                          preferredObjectTypes: ["bar","club","restaurant","winery"],
                          mustTerms: [],
                          shouldTerms: ["bar","cocktail","music","party","wine","night"]
                        """,
                },
                new OllamaMessage
                {
                    Role = "user",
                    Content = $"Korisnicki upit: {request.Query}\nKontekst: activeRegion={regionContext}, latitude={latitude}, longitude={longitude}",
                }
            ];
        }

        private SemanticSearchPlan FinalizePlan(
            SemanticSearchPlan plan,
            AiSemanticSearchQueryDto request,
            SearchExecutionContext context)
        {
            var fallbackPlan = BuildFallbackPlan(request.Query, context);
            var normalizedCategories = NormalizeCategories(plan.Categories);
            if (normalizedCategories.Count == 0)
            {
                normalizedCategories = NormalizeCategories(fallbackPlan.Categories);
            }
            if (normalizedCategories.Count == 0)
            {
                normalizedCategories = ["destination", "locality", "object", "event", "activity"];
            }

            var region = ResolveRegion(plan.RegionName, request.RegionId, context);
            context.EffectiveRegion = region;

            var plannerMustTerms = NormalizeTerms(plan.MustTerms);
            var shouldTerms = NormalizeTerms(plan.ShouldTerms);
            var searchStyle = NormalizeSearchStyle(plan.SearchStyle);
            var fallbackStyle = NormalizeSearchStyle(fallbackPlan.SearchStyle);
            var locationAnchors = NormalizeTerms(plan.LocationAnchors);
            var fallbackPreferredObjectTypes = NormalizeTerms(fallbackPlan.PreferredObjectTypes);
            var preferredObjectTypes = NormalizeTerms(plan.PreferredObjectTypes);
            var fallbackShouldTerms = NormalizeTerms(fallbackPlan.ShouldTerms);
            if (locationAnchors.Count == 0)
            {
                locationAnchors = DetectLocationAnchors(request.Query, context);
            }
            if (searchStyle == "specific" && plannerMustTerms.Count == 0 && shouldTerms.Count > 0)
            {
                searchStyle = "exploratory";
            }

            var mustTerms = plannerMustTerms;
            if (mustTerms.Count == 0 && searchStyle == "specific")
            {
                mustTerms = BuildFallbackTerms(request.Query);
            }

            if (preferredObjectTypes.Count == 0 && fallbackPreferredObjectTypes.Count > 0)
            {
                preferredObjectTypes = fallbackPreferredObjectTypes;
            }

            if (shouldTerms.Count == 0 && fallbackShouldTerms.Count > 0)
            {
                shouldTerms = fallbackShouldTerms;
            }

            if (fallbackStyle == "specific" &&
                preferredObjectTypes.Count > 0 &&
                normalizedCategories.Contains("object", StringComparer.OrdinalIgnoreCase))
            {
                normalizedCategories = NormalizeCategories(fallbackPlan.Categories);
                searchStyle = "specific";
            }

            if (string.IsNullOrWhiteSpace(plan.QuerySummary))
            {
                plan.QuerySummary = request.Query;
            }

            return new SemanticSearchPlan
            {
                QuerySummary = plan.QuerySummary.Trim(),
                Categories = normalizedCategories,
                RegionName = region?.Name,
                SearchStyle = searchStyle,
                LocationAnchors = locationAnchors,
                PreferredObjectTypes = preferredObjectTypes,
                MustTerms = mustTerms,
                ShouldTerms = shouldTerms
                    .Where(term => !mustTerms.Contains(term, StringComparer.Ordinal))
                    .ToList(),
                NearMe = plan.NearMe && context.Origin != null,
                SortBy = NormalizeSortBy(plan.SortBy),
                PageSize = Math.Clamp(plan.PageSize ?? request.PageSize, 1, 20),
            };
        }

        private PlanExecutionResult ExecuteWithBroadening(
            IReadOnlyList<SemanticSearchPlan> candidates,
            SearchExecutionContext context,
            SearchDataSnapshot snapshot)
        {
            foreach (var candidate in candidates)
            {
                var results = ExecutePlan(candidate, context, snapshot);
                if (results.Count > 0)
                {
                    return new PlanExecutionResult
                    {
                        Plan = candidate,
                        Results = results,
                    };
                }
            }

            return new PlanExecutionResult
            {
                Plan = candidates.FirstOrDefault() ?? new SemanticSearchPlan(),
                Results = [],
            };
        }

        private static List<SemanticSearchPlan> BuildBroadeningPlans(
            SemanticSearchPlan plan,
            AiSemanticSearchQueryDto request)
        {
            var allCategories = new List<string> { "destination", "locality", "object", "event", "activity" };
            var mergedSemanticTerms = plan.MustTerms
                .Concat(plan.ShouldTerms)
                .Distinct(StringComparer.Ordinal)
                .ToList();
            var fallbackTerms = BuildFallbackTerms(request.Query);
            var candidates = new List<SemanticSearchPlan>
            {
                plan,
                new SemanticSearchPlan
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = [.. plan.Categories],
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = mergedSemanticTerms,
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                },
                new SemanticSearchPlan
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = [.. plan.Categories],
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = fallbackTerms,
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                },
                new SemanticSearchPlan
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = allCategories,
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = mergedSemanticTerms,
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                },
                new SemanticSearchPlan
                {
                    QuerySummary = string.IsNullOrWhiteSpace(plan.QuerySummary) ? request.Query : plan.QuerySummary,
                    Categories = allCategories,
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = fallbackTerms,
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                }
            };

            if (string.Equals(plan.SearchStyle, "exploratory", StringComparison.Ordinal))
            {
                candidates.Add(new SemanticSearchPlan
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = [.. plan.Categories],
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = [],
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                });

                candidates.Add(new SemanticSearchPlan
                {
                    QuerySummary = string.IsNullOrWhiteSpace(plan.QuerySummary) ? request.Query : plan.QuerySummary,
                    Categories = allCategories,
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = [],
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                });
            }

            return candidates;
        }

        private static List<SemanticSearchPlan> BuildFastLanePlans(
            SemanticSearchPlan plan,
            AiSemanticSearchQueryDto request)
        {
            return BuildBroadeningPlans(plan, request)
                .Where(candidate => candidate.MustTerms.Count > 0 || candidate.ShouldTerms.Count > 0)
                .Take(5)
                .ToList();
        }

        private static List<SemanticSearchPlan> BuildUltraFastLanePlans(
            SemanticSearchPlan plan,
            AiSemanticSearchQueryDto request)
        {
            var mergedSemanticTerms = plan.MustTerms
                .Concat(plan.ShouldTerms)
                .Distinct(StringComparer.Ordinal)
                .ToList();
            var fallbackTerms = BuildFallbackTerms(request.Query);

            List<string> focusedCategories;
            if (plan.LocationAnchors.Count > 0)
            {
                focusedCategories = ["destination", "locality"];
            }
            else if (plan.PreferredObjectTypes.Count > 0)
            {
                focusedCategories = ["object", "event", "activity"];
            }
            else
            {
                focusedCategories = ["object", "activity", "event"];
            }

            var candidates = new List<SemanticSearchPlan>
            {
                new()
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = focusedCategories,
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [.. plan.MustTerms],
                    ShouldTerms = [.. plan.ShouldTerms],
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                },
                new()
                {
                    QuerySummary = plan.QuerySummary,
                    Categories = focusedCategories,
                    RegionName = plan.RegionName,
                    SearchStyle = plan.SearchStyle,
                    LocationAnchors = [.. plan.LocationAnchors],
                    PreferredObjectTypes = [.. plan.PreferredObjectTypes],
                    MustTerms = [],
                    ShouldTerms = mergedSemanticTerms.Count > 0 ? mergedSemanticTerms : fallbackTerms,
                    NearMe = plan.NearMe,
                    SortBy = plan.SortBy,
                    PageSize = plan.PageSize,
                }
            };

            candidates.AddRange(BuildFastLanePlans(plan, request));

            return candidates
                .Where(candidate => candidate.MustTerms.Count > 0 || candidate.ShouldTerms.Count > 0)
                .GroupBy(candidate => BuildPlanFingerprint(candidate), StringComparer.Ordinal)
                .Select(group => group.First())
                .Take(5)
                .ToList();
        }

        private async Task<SearchDataSnapshot> BuildSnapshotAsync(
            IReadOnlyCollection<SemanticSearchPlan> plans,
            SearchExecutionContext context,
            CancellationToken cancellationToken)
        {
            var snapshotCacheKey = BuildSnapshotCacheKey(plans, context);
            if (_cache.TryGetValue(snapshotCacheKey, out SearchDataSnapshot? cachedSnapshot) && cachedSnapshot != null)
            {
                return cachedSnapshot;
            }

            var categories = plans
                .SelectMany(plan => plan.Categories)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var snapshot = new SearchDataSnapshot();

            if (categories.Contains("destination"))
            {
                snapshot.DestinationFavoriteCounts = await _context.Favorites.AsNoTracking()
                    .Where(f => f.DestinationId.HasValue)
                    .GroupBy(f => f.DestinationId!.Value)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

                var destinationQuery = _context.Destinations
                    .AsNoTracking()
                    .Include(d => d.Region)
                    .Include(d => d.DestinationType)
                    .Include(d => d.Images)
                    .Where(d => d.IsActive && d.Status == ContentStatus.Approved)
                    .AsQueryable();

                if (context.EffectiveRegion != null)
                {
                    destinationQuery = destinationQuery.Where(d => d.RegionId == context.EffectiveRegion.Id);
                }

                snapshot.Destinations = await destinationQuery.ToListAsync(cancellationToken);
            }

            if (categories.Contains("locality"))
            {
                snapshot.LocalityFavoriteCounts = await _context.Favorites.AsNoTracking()
                    .Where(f => f.LocalityId.HasValue)
                    .GroupBy(f => f.LocalityId!.Value)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

                var localityQuery = _context.Localities
                    .AsNoTracking()
                    .Include(l => l.LocalityType)
                    .Include(l => l.Destination)
                        .ThenInclude(d => d.Region)
                    .Include(l => l.Images)
                    .Where(l => l.IsActive)
                    .AsQueryable();

                if (context.EffectiveRegion != null)
                {
                    localityQuery = localityQuery.Where(l => l.Destination.RegionId == context.EffectiveRegion.Id);
                }

                snapshot.Localities = await localityQuery.ToListAsync(cancellationToken);
            }

            if (categories.Contains("object"))
            {
                snapshot.ObjectFavoriteCounts = await _context.Favorites.AsNoTracking()
                    .Where(f => f.ObjectId.HasValue)
                    .GroupBy(f => f.ObjectId!.Value)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

                var objectQuery = _context.Objects
                    .AsNoTracking()
                    .Include(o => o.ObjectType)
                    .Include(o => o.Destination)
                        .ThenInclude(d => d.Region)
                    .Include(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                    .Include(o => o.Images)
                    .Where(o => o.IsActive && o.Status == ContentStatus.Approved)
                    .AsQueryable();

                if (context.EffectiveRegion != null)
                {
                    objectQuery = objectQuery.Where(o =>
                        o.Destination.RegionId == context.EffectiveRegion.Id ||
                        (o.Locality != null &&
                         o.Locality.Destination != null &&
                         o.Locality.Destination.RegionId == context.EffectiveRegion.Id));
                }

                snapshot.Objects = await objectQuery.ToListAsync(cancellationToken);
            }

            if (categories.Contains("event"))
            {
                snapshot.EventPlannerCounts = await _context.EventPlannerItems.AsNoTracking()
                    .GroupBy(x => x.EventId)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

                var eventQuery = _context.Events
                    .AsNoTracking()
                    .Include(e => e.EventType)
                    .Include(e => e.Destination)
                        .ThenInclude(d => d.Region)
                    .Include(e => e.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                    .Include(e => e.Object)
                    .Include(e => e.Images)
                    .Where(e => e.IsActive && e.Status == ContentStatus.Approved)
                    .AsQueryable();

                if (context.EffectiveRegion != null)
                {
                    eventQuery = eventQuery.Where(e =>
                        (e.Destination != null && e.Destination.RegionId == context.EffectiveRegion.Id) ||
                        (e.Destination == null &&
                         e.Locality != null &&
                         e.Locality.Destination != null &&
                         e.Locality.Destination.RegionId == context.EffectiveRegion.Id));
                }

                snapshot.Events = await eventQuery.ToListAsync(cancellationToken);
            }

            if (categories.Contains("activity"))
            {
                snapshot.ActivityFavoriteCounts = await _context.Favorites.AsNoTracking()
                    .Where(f => f.ActivityId.HasValue)
                    .GroupBy(f => f.ActivityId!.Value)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

                var activityQuery = _context.Activities
                    .AsNoTracking()
                    .Include(a => a.ActivityType)
                    .Include(a => a.Destination)
                        .ThenInclude(d => d.Region)
                    .Include(a => a.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                    .Include(a => a.Object)
                    .Include(a => a.Images)
                    .Where(a => a.IsActive && a.Status == ContentStatus.Approved)
                    .AsQueryable();

                if (context.EffectiveRegion != null)
                {
                    activityQuery = activityQuery.Where(a =>
                        (a.Destination != null && a.Destination.RegionId == context.EffectiveRegion.Id) ||
                        (a.Destination == null &&
                         a.Locality != null &&
                         a.Locality.Destination != null &&
                         a.Locality.Destination.RegionId == context.EffectiveRegion.Id));
                }

                snapshot.Activities = await activityQuery.ToListAsync(cancellationToken);
            }

            _cache.Set(snapshotCacheKey, snapshot, TimeSpan.FromMinutes(1));
            return snapshot;
        }

        private List<SmartSearchResultDto> ExecutePlan(
            SemanticSearchPlan plan,
            SearchExecutionContext context,
            SearchDataSnapshot snapshot)
        {
            var categories = plan.Categories.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var results = new List<SmartSearchResultDto>();

            if (categories.Contains("destination"))
            {
                results.AddRange(snapshot.Destinations
                    .Select(destination => ScoreDestination(destination, plan, context, snapshot.DestinationFavoriteCounts.GetValueOrDefault(destination.Id)))
                    .Where(x => x != null)
                    .Select(x => x!));
            }

            if (categories.Contains("locality"))
            {
                results.AddRange(snapshot.Localities
                    .Select(locality => ScoreLocality(locality, plan, context, snapshot.LocalityFavoriteCounts.GetValueOrDefault(locality.Id)))
                    .Where(x => x != null)
                    .Select(x => x!));
            }

            if (categories.Contains("object"))
            {
                results.AddRange(snapshot.Objects
                    .Select(obj => ScoreObject(obj, plan, context, snapshot.ObjectFavoriteCounts.GetValueOrDefault(obj.Id)))
                    .Where(x => x != null)
                    .Select(x => x!));
            }

            if (categories.Contains("event"))
            {
                results.AddRange(snapshot.Events
                    .Select(evt => ScoreEvent(evt, plan, context, snapshot.EventPlannerCounts.GetValueOrDefault(evt.Id)))
                    .Where(x => x != null)
                    .Select(x => x!));
            }

            if (categories.Contains("activity"))
            {
                results.AddRange(snapshot.Activities
                    .Select(activity => ScoreActivity(activity, plan, context, snapshot.ActivityFavoriteCounts.GetValueOrDefault(activity.Id)))
                    .Where(x => x != null)
                    .Select(x => x!));
            }

            return results
                .GroupBy(x => $"{x.Category}:{x.Id}")
                .Select(g => g.OrderByDescending(x => x.Score).First())
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Name)
                .Take(Math.Clamp(plan.PageSize ?? context.Request.PageSize, 1, 20))
                .ToList();
        }

        private SmartSearchResultDto? ScoreDestination(Destination destination, SemanticSearchPlan plan, SearchExecutionContext context, int favoriteCount)
        {
            var text = BuildSearchableText(
                destination.Name,
                destination.Description,
                destination.DestinationType?.Name,
                [destination.Region?.Name],
                [destination.DisplayTitle]);

            if (plan.LocationAnchors.Count > 0 && !MatchesLocationAnchors(text, plan.LocationAnchors))
            {
                return null;
            }

            var score = ScoreText(text, plan);
            if (score < 0)
            {
                return null;
            }

            score += favoriteCount * 4d;
            score += DistanceBoost(CalculateDistanceFromContext(context.Origin, destination.Geolocation), plan.SortBy == "distance" ? 220_000d : 180_000d, plan.SortBy == "distance" ? 36d : 10d);

            return new SmartSearchResultDto
            {
                Id = destination.Id,
                Name = destination.Name,
                TypeName = destination.DestinationType?.Name ?? "Destination",
                Location = destination.Region?.Name ?? string.Empty,
                Category = "destination",
                MarkerType = "destination",
                Icon = "place",
                ImageUrl = GetMainImageUrl(destination.Images),
                Latitude = destination.Geolocation?.Y,
                Longitude = destination.Geolocation?.X,
                MatchReason = BuildReason(plan),
                Score = Math.Round(score, 2),
            };
        }

        private SmartSearchResultDto? ScoreLocality(Locality locality, SemanticSearchPlan plan, SearchExecutionContext context, int favoriteCount)
        {
            var text = BuildSearchableText(
                locality.Name,
                locality.Description,
                locality.LocalityType?.Name,
                [locality.Destination?.Name, locality.Destination?.Region?.Name],
                []);

            if (plan.LocationAnchors.Count > 0 && !MatchesLocationAnchors(text, plan.LocationAnchors))
            {
                return null;
            }

            var score = ScoreText(text, plan);
            if (score < 0)
            {
                return null;
            }

            score += favoriteCount * 4d;
            score += DistanceBoost(CalculateDistanceFromContext(context.Origin, locality.Geolocation), plan.SortBy == "distance" ? 200_000d : 170_000d, plan.SortBy == "distance" ? 34d : 9d);

            return new SmartSearchResultDto
            {
                Id = locality.Id,
                Name = locality.Name,
                TypeName = locality.LocalityType?.Name ?? "Lokalitet",
                Location = locality.Destination?.Name ?? locality.Destination?.Region?.Name ?? string.Empty,
                Category = "locality",
                MarkerType = "locality",
                Icon = "place",
                ImageUrl = GetMainImageUrl(locality.Images),
                Latitude = locality.Geolocation?.Y,
                Longitude = locality.Geolocation?.X,
                MatchReason = BuildReason(plan),
                Score = Math.Round(score, 2),
            };
        }

        private SmartSearchResultDto? ScoreObject(TouristObject obj, SemanticSearchPlan plan, SearchExecutionContext context, int favoriteCount)
        {
            var text = BuildSearchableText(
                obj.Name,
                obj.Description,
                obj.ObjectType?.Name,
                [obj.Locality?.Name, obj.Destination?.Name, obj.Destination?.Region?.Name ?? obj.Locality?.Destination?.Region?.Name],
                [obj.CuisineType, obj.Amenities == null ? null : string.Join(' ', obj.Amenities)]);

            if (plan.LocationAnchors.Count > 0 && !MatchesLocationAnchors(text, plan.LocationAnchors))
            {
                return null;
            }

            if (plan.PreferredObjectTypes.Count > 0 && !MatchesPreferredObjectType(text, plan.PreferredObjectTypes))
            {
                return null;
            }

            var score = ScoreText(text, plan);
            if (score < 0)
            {
                return null;
            }

            score += (double)obj.AverageRating * (plan.SortBy == "rating" ? 10d : 6d);
            score += Math.Log(obj.ReviewCount + 1, 2) * 5d;
            score += favoriteCount * 3d;
            score += DistanceBoost(CalculateDistanceFromContext(context.Origin, obj.Geolocation), plan.SortBy == "distance" ? 120_000d : 100_000d, plan.SortBy == "distance" ? 32d : 8d);

            return new SmartSearchResultDto
            {
                Id = obj.Id,
                Name = obj.Name,
                TypeName = obj.ObjectType?.Name ?? "Object",
                Location = ResolveObjectLocation(obj),
                Category = "object",
                MarkerType = ResolveObjectMarkerType(obj.ObjectType?.Name),
                Icon = ResolveObjectIcon(obj.ObjectType?.Name),
                ImageUrl = GetMainImageUrl(obj.Images),
                Latitude = obj.Geolocation?.Y,
                Longitude = obj.Geolocation?.X,
                MatchReason = BuildReason(plan),
                Score = Math.Round(score, 2),
            };
        }

        private SmartSearchResultDto? ScoreEvent(Event evt, SemanticSearchPlan plan, SearchExecutionContext context, int plannerCount)
        {
            var text = BuildSearchableText(
                evt.Name,
                evt.Description,
                evt.EventType?.Name,
                [evt.Locality?.Name, evt.Destination?.Name ?? evt.Locality?.Destination?.Name, evt.Destination?.Region?.Name ?? evt.Locality?.Destination?.Region?.Name],
                [evt.Object?.Name]);

            if (plan.LocationAnchors.Count > 0 && !MatchesLocationAnchors(text, plan.LocationAnchors))
            {
                return null;
            }

            var score = ScoreText(text, plan);
            if (score < 0)
            {
                return null;
            }

            score += plannerCount * 4d;
            score += EventDateBoost(evt.StartDate, plan.SortBy);
            score += DistanceBoost(CalculateDistanceFromContext(context.Origin, evt.Geolocation), plan.SortBy == "distance" ? 140_000d : 120_000d, plan.SortBy == "distance" ? 28d : 7d);

            return new SmartSearchResultDto
            {
                Id = evt.Id,
                Name = evt.Name,
                TypeName = evt.EventType?.Name ?? "Event",
                Location = ResolveEventLocation(evt),
                Category = "event",
                MarkerType = "event",
                Icon = "event",
                ImageUrl = GetMainImageUrl(evt.Images),
                Latitude = evt.Geolocation?.Y,
                Longitude = evt.Geolocation?.X,
                MatchReason = BuildReason(plan),
                Score = Math.Round(score, 2),
            };
        }

        private SmartSearchResultDto? ScoreActivity(Activity activity, SemanticSearchPlan plan, SearchExecutionContext context, int favoriteCount)
        {
            var text = BuildSearchableText(
                activity.Name,
                activity.Description,
                activity.ActivityType?.Name,
                [activity.Locality?.Name, activity.Destination?.Name ?? activity.Locality?.Destination?.Name, activity.Destination?.Region?.Name ?? activity.Locality?.Destination?.Region?.Name],
                [activity.Object?.Name]);

            if (plan.LocationAnchors.Count > 0 && !MatchesLocationAnchors(text, plan.LocationAnchors))
            {
                return null;
            }

            var score = ScoreText(text, plan);
            if (score < 0)
            {
                return null;
            }

            score += favoriteCount * 3d;
            score += DistanceBoost(CalculateDistanceFromContext(context.Origin, activity.Geolocation), plan.SortBy == "distance" ? 140_000d : 120_000d, plan.SortBy == "distance" ? 30d : 8d);

            return new SmartSearchResultDto
            {
                Id = activity.Id,
                Name = activity.Name,
                TypeName = activity.ActivityType?.Name ?? "Activity",
                Location = ResolveActivityLocation(activity),
                Category = "activity",
                MarkerType = "activity",
                Icon = "directions_walk",
                ImageUrl = GetMainImageUrl(activity.Images),
                Latitude = activity.Geolocation?.Y,
                Longitude = activity.Geolocation?.X,
                MatchReason = BuildReason(plan),
                Score = Math.Round(score, 2),
            };
        }

        private static double ScoreText(SearchableText text, SemanticSearchPlan plan)
        {
            var matchedMust = 0;
            var matchedShould = 0;
            var score = 0d;

            foreach (var term in plan.MustTerms)
            {
                var termScore = ScoreSingleTerm(text, term);
                if (termScore > 0)
                {
                    matchedMust++;
                    score += termScore * 2.2d;
                }
            }

            var requiredMust = RequiredMustMatches(plan.MustTerms.Count);
            if (matchedMust < requiredMust)
            {
                return -1d;
            }

            foreach (var term in plan.ShouldTerms)
            {
                var termScore = ScoreSingleTerm(text, term);
                if (termScore > 0)
                {
                    matchedShould++;
                    score += termScore;
                }
            }

            if (text.All.Contains(NormalizeText(plan.QuerySummary), StringComparison.Ordinal))
            {
                score += 30d;
            }

            var hasStructuredTerms = plan.MustTerms.Count > 0 || plan.ShouldTerms.Count > 0;
            if (hasStructuredTerms && matchedMust == 0 && matchedShould == 0)
            {
                return -1d;
            }

            return score;
        }

        private static bool MatchesPreferredObjectType(SearchableText text, IReadOnlyCollection<string> preferredTypes)
        {
            if (preferredTypes.Count == 0)
            {
                return true;
            }

            foreach (var type in preferredTypes)
            {
                foreach (var variant in ExpandTerm(type))
                {
                    if (text.Type.Contains(variant, StringComparison.Ordinal) ||
                        text.Name.Contains(variant, StringComparison.Ordinal) ||
                        text.Extra.Contains(variant, StringComparison.Ordinal))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private static bool MatchesLocationAnchors(SearchableText text, IReadOnlyCollection<string> locationAnchors)
        {
            if (locationAnchors.Count == 0)
            {
                return true;
            }

            foreach (var anchor in locationAnchors)
            {
                var normalizedAnchor = NormalizeText(anchor);
                if (string.IsNullOrWhiteSpace(normalizedAnchor))
                {
                    continue;
                }

                if (text.Name.Contains(normalizedAnchor, StringComparison.Ordinal) ||
                    text.Location.Contains(normalizedAnchor, StringComparison.Ordinal) ||
                    text.All.Contains(normalizedAnchor, StringComparison.Ordinal))
                {
                    return true;
                }

                var anchorWords = normalizedAnchor.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (anchorWords.Length > 1 && anchorWords.All(word =>
                    text.Name.Contains(word, StringComparison.Ordinal) ||
                    text.Location.Contains(word, StringComparison.Ordinal) ||
                    text.All.Contains(word, StringComparison.Ordinal)))
                {
                    return true;
                }
            }

            return false;
        }

        private static int RequiredMustMatches(int mustTermCount)
        {
            return mustTermCount switch
            {
                <= 0 => 0,
                1 => 1,
                2 => 1,
                _ => 2,
            };
        }

        private static double ScoreSingleTerm(SearchableText text, string term)
        {
            var variants = ExpandTerm(term);
            var score = 0d;

            foreach (var variant in variants)
            {
                if (text.Name.Contains(variant, StringComparison.Ordinal))
                {
                    score = Math.Max(score, 26d);
                }

                if (text.Type.Contains(variant, StringComparison.Ordinal))
                {
                    score = Math.Max(score, 22d);
                }

                if (text.Location.Contains(variant, StringComparison.Ordinal))
                {
                    score = Math.Max(score, 20d);
                }

                if (text.Extra.Contains(variant, StringComparison.Ordinal))
                {
                    score = Math.Max(score, 16d);
                }

                if (text.Description.Contains(variant, StringComparison.Ordinal))
                {
                    score = Math.Max(score, 12d);
                }
            }

            return score;
        }

        private static string BuildReason(SemanticSearchPlan plan)
        {
            if (plan.MustTerms.Count > 0)
            {
                return $"Matches: {string.Join(", ", plan.MustTerms.Take(2))}";
            }

            if (plan.ShouldTerms.Count > 0)
            {
                return $"Related to: {string.Join(", ", plan.ShouldTerms.Take(2))}";
            }

            return "Relevant match";
        }

        private static double EventDateBoost(DateTime startDate, string sortBy)
        {
            var daysUntil = (startDate.Date - DateTime.UtcNow.Date).TotalDays;
            if (daysUntil is >= 0 and <= 7)
            {
                return sortBy == "rating" ? 6d : 12d;
            }

            if (daysUntil is > 7 and <= 30)
            {
                return 6d;
            }

            return 0d;
        }

        private static double DistanceBoost(double? distanceMeters, double maxDistanceMeters, double maxBoost)
        {
            if (!distanceMeters.HasValue)
            {
                return 0d;
            }

            var normalized = 1d - Math.Min(distanceMeters.Value, maxDistanceMeters) / maxDistanceMeters;
            return Math.Max(0d, normalized * maxBoost);
        }

        private static double? CalculateDistanceFromContext(GeoPoint? origin, Point? point)
        {
            if (origin == null || point == null)
            {
                return null;
            }

            return CalculateDistanceMeters(origin.Latitude, origin.Longitude, point.Y, point.X);
        }

        private static double CalculateDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
        {
            const double earthRadiusMeters = 6371000d;

            var deltaLatitude = DegreesToRadians(latitude2 - latitude1);
            var deltaLongitude = DegreesToRadians(longitude2 - longitude1);
            var normalizedLatitude1 = DegreesToRadians(latitude1);
            var normalizedLatitude2 = DegreesToRadians(latitude2);

            var a =
                Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2) +
                Math.Cos(normalizedLatitude1) * Math.Cos(normalizedLatitude2) *
                Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

        private static SearchableText BuildSearchableText(
            string? name,
            string? description,
            string? type,
            IEnumerable<string?> locationParts,
            IEnumerable<string?> extraParts)
        {
            return new SearchableText
            {
                Name = NormalizeText(name),
                Description = NormalizeText(description),
                Type = NormalizeText(type),
                Location = string.Join(' ', locationParts.Select(NormalizeText).Where(x => !string.IsNullOrWhiteSpace(x))).Trim(),
                Extra = string.Join(' ', extraParts.Select(NormalizeText).Where(x => !string.IsNullOrWhiteSpace(x))).Trim(),
                All = string.Join(' ',
                    new[] { NormalizeText(name), NormalizeText(description), NormalizeText(type) }
                        .Concat(locationParts.Select(NormalizeText))
                        .Concat(extraParts.Select(NormalizeText))
                        .Where(x => !string.IsNullOrWhiteSpace(x))).Trim(),
            };
        }

        private Region? ResolveRegion(string? regionName, int? regionId, SearchExecutionContext context)
        {
            if (regionId is > 0)
            {
                var explicitRegion = context.AvailableRegions.FirstOrDefault(r => r.Id == regionId.Value);
                if (explicitRegion != null)
                {
                    return explicitRegion;
                }
            }

            if (!string.IsNullOrWhiteSpace(regionName))
            {
                var normalizedRequested = NormalizeText(regionName);
                var direct = context.AvailableRegions.FirstOrDefault(r => NormalizeText(r.Name) == normalizedRequested);
                if (direct != null)
                {
                    return direct;
                }

                var contains = context.AvailableRegions.FirstOrDefault(r => NormalizeText(r.Name).Contains(normalizedRequested, StringComparison.Ordinal));
                if (contains != null)
                {
                    return contains;
                }
            }

            return context.EffectiveRegion;
        }

        private static List<string> NormalizeCategories(IEnumerable<string>? categories)
        {
            if (categories == null)
            {
                return [];
            }

            var normalized = new List<string>();
            foreach (var category in categories)
            {
                var value = NormalizeText(category);
                var mapped = value switch
                {
                    "destination" or "destinations" => "destination",
                    "locality" or "localities" or "lokalitet" or "lokaliteti" => "locality",
                    "object" or "objects" or "objekat" or "objekti" or "restaurant" or "restoran" or "hotel" or "bar" or "kafic" => "object",
                    "event" or "events" or "dogadjaj" or "dogadjaji" => "event",
                    "activity" or "activities" or "aktivnost" or "aktivnosti" => "activity",
                    _ => string.Empty,
                };

                if (!string.IsNullOrWhiteSpace(mapped) && !normalized.Contains(mapped, StringComparer.Ordinal))
                {
                    normalized.Add(mapped);
                }
            }

            return normalized;
        }

        private static string NormalizeSortBy(string? sortBy)
        {
            var normalized = NormalizeText(sortBy);
            return normalized switch
            {
                "distance" or "nearest" or "blizu" => "distance",
                "rating" or "top" or "best" => "rating",
                _ => "relevance",
            };
        }

        private static string NormalizeSearchStyle(string? searchStyle)
        {
            var normalized = NormalizeText(searchStyle);
            return normalized switch
            {
                "exploratory" or "broad" or "open" or "explore" or "recommendation" or "general" => "exploratory",
                _ => "specific",
            };
        }

        private static List<string> NormalizeTerms(IEnumerable<string>? terms)
        {
            if (terms == null)
            {
                return [];
            }

            return terms
                .Select(NormalizeText)
                .Where(term => !string.IsNullOrWhiteSpace(term) && term.Length >= 3)
                .Distinct(StringComparer.Ordinal)
                .ToList();
        }

        private static List<string> BuildFallbackTerms(string query)
        {
            // Najpre detektujemo temu — ako je tema nocni zivot ili planinarenje, koristimo semanticke terme
            // umesto sirovih tokena koji mogu da se poklapaju sa imenima mesta (npr. "Bar" = grad).
            var theme = DetectQueryTheme(query);

            if (theme == "nightlife")
            {
                // Koristimo konkretne feature termine koji postoje u tipovima objekata,
                // ne tokene poput "bar" (= grad Bar) ili "drugarice" (nema znacenja u bazi).
                return ["kafana", "klub", "cocktail", "music", "wine", "party"];
            }

            if (theme == "hiking")
            {
                return ["staza", "planinar", "trail", "trekking", "pesacenje", "setnja", "park", "priroda"];
            }

            if (theme == "food")
            {
                return ["restoran", "restaurant", "hrana", "rucak", "vecera", "kafic", "bistro"];
            }

            if (theme == "drink")
            {
                return ["kafic", "cafe", "coffee", "bar", "cocktail", "vino", "wine", "pice", "piće"];
            }

            if (theme == "walk")
            {
                return ["setnja", "promenada", "park", "setaliste", "prirod", "staza"];
            }

            if (theme == "family")
            {
                return ["deca", "porodica", "park", "playground", "setnja", "prirod"];
            }

            // Generalni fallback — uzimamo tokene iz upita, ali filtriramo
            // jednorecne geografske nazive koji bi mogli da zavedu (min 4 slova).
            return NormalizeText(query)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(token => token.Length >= 4 && !FallbackStopWords.Contains(token))
                .Distinct(StringComparer.Ordinal)
                .Take(5)
                .ToList();
        }

        /// <summary>
        /// Detektuje opstu temu upita pre semanticke obrade, kako bi fallback plan
        /// koristio smislene termine umesto sirovih tokena koji mogu zbuniti pretragu.
        /// Na primer, "nocni provod sa drugaricama" sadrzi rec "bar" koja moze
        /// da pogodi grad ili crkvu, a ne nocni klub.
        /// </summary>
        private static string DetectQueryTheme(string query)
        {
            var normalized = NormalizeText(query);

            // Nocni provod — detektujemo eksplicitne i implicitne signale
            if (normalized.Contains("nocni") || normalized.Contains("provod") ||
                normalized.Contains("izlazak") || normalized.Contains("izadjemo") ||
                normalized.Contains("izadjete") || normalized.Contains("izadjim") ||
                normalized.Contains("kafana") || normalized.Contains("klub") ||
                normalized.Contains("cocktail") || normalized.Contains("nightlife") ||
                (normalized.Contains("uvece") && !normalized.Contains("restoran")) ||
                normalized.Contains("veceras") || normalized.Contains("zabava"))
            {
                return "nightlife";
            }

            if (normalized.Contains("popij") || normalized.Contains("pijem") ||
                normalized.Contains("pice") || normalized.Contains("kafa") ||
                normalized.Contains("cafe") || normalized.Contains("coffee") ||
                normalized.Contains("kapucino") || normalized.Contains("espresso") ||
                normalized.Contains("koktel") || normalized.Contains("cocktail") ||
                normalized.Contains("vino") || normalized.Contains("wine") ||
                normalized.Contains("sok") || normalized.Contains("caj"))
            {
                return "drink";
            }

            // Planinarenje i staze — korisnik pita za rute/staze/aktivnosti, ne za objekte
            if (normalized.Contains("staza") || normalized.Contains("staze") ||
                normalized.Contains("planinar") || normalized.Contains("trekking") ||
                normalized.Contains("hiking") || normalized.Contains("uspon") ||
                normalized.Contains("vrh") || normalized.Contains("planina") ||
                normalized.Contains("nije strma") || normalized.Contains("nisu strme") ||
                normalized.Contains("blaga") || normalized.Contains("laka staza"))
            {
                return "hiking";
            }

            // Hrana i restorani
            if (normalized.Contains("restoran") || normalized.Contains("rucak") ||
                normalized.Contains("vecera") || normalized.Contains("jelo") ||
                normalized.Contains("hrana") || normalized.Contains("kuhinja") ||
                normalized.Contains("pojed") || normalized.Contains("jedem") ||
                normalized.Contains("jesti") || normalized.Contains("jedemo") ||
                normalized.Contains("gladna") || normalized.Contains("gladan") ||
                normalized.Contains("gladni") || normalized.Contains("gladne"))
            {
                return "food";
            }

            // Setnja i setaliste
            if (normalized.Contains("setnja") || normalized.Contains("setaliste") ||
                normalized.Contains("promenada") || normalized.Contains("walk") ||
                normalized.Contains("park"))
            {
                return "walk";
            }

            // Porodica i deca
            if (normalized.Contains("deca") || normalized.Contains("decom") ||
                normalized.Contains("porodica") || normalized.Contains("family") ||
                normalized.Contains("kids"))
            {
                return "family";
            }

            return "general";
        }

        private static List<string> DetectLocationAnchors(string query, SearchExecutionContext context)
        {
            var tokens = NormalizeText(query)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(token => token.Length >= 4 && !FallbackStopWords.Contains(token))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (tokens.Count == 0 || context.AvailablePlaceNames.Count == 0)
            {
                return [];
            }

            var matches = new List<string>();
            foreach (var placeName in context.AvailablePlaceNames)
            {
                var normalizedPlace = NormalizeText(placeName);
                var placeWords = normalizedPlace.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                foreach (var token in tokens)
                {
                    if (placeWords.Any(word => LooksLikeSamePlace(token, word)))
                    {
                        matches.Add(placeName);
                        break;
                    }
                }
            }

            return matches
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(3)
                .ToList();
        }

        private static bool LooksLikeSamePlace(string token, string candidateWord)
        {
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(candidateWord))
            {
                return false;
            }

            if (token.Equals(candidateWord, StringComparison.Ordinal))
            {
                return true;
            }

            var tokenStem = StripCommonEnding(token);
            var candidateStem = StripCommonEnding(candidateWord);
            if (tokenStem.Equals(candidateStem, StringComparison.Ordinal))
            {
                return true;
            }

            var prefix = CommonPrefixLength(tokenStem, candidateStem);
            var minLength = Math.Min(tokenStem.Length, candidateStem.Length);
            return prefix >= 4 && minLength >= 5 && (double)prefix / minLength >= 0.65d;
        }

        private static string StripCommonEnding(string value)
        {
            foreach (var suffix in new[] { "ovima", "evima", "anju", "enju", "ima", "ama", "skom", "ckom", "ciji", "siji", "iji", "ju", "om", "em", "im", "oj", "og", "eg", "am", "u", "a", "e", "i" })
            {
                if (value.Length > suffix.Length + 2 && value.EndsWith(suffix, StringComparison.Ordinal))
                {
                    return value[..^suffix.Length];
                }
            }

            return value;
        }

        private static int CommonPrefixLength(string left, string right)
        {
            var limit = Math.Min(left.Length, right.Length);
            var count = 0;
            while (count < limit && left[count] == right[count])
            {
                count++;
            }

            return count;
        }

        private static SemanticSearchPlan BuildFallbackPlan(string query, SearchExecutionContext context)
        {
            var theme = DetectQueryTheme(query);

            // Biramo kategorije na osnovu teme — nocni provod ne trazi destinacije i crkve,
            // planinarenje ne trazi hotele i restorane.
            var categories = theme switch
            {
                "nightlife" => new List<string> { "object", "event", "locality" },
                "drink" => new List<string> { "object", "locality" },
                "hiking" => new List<string> { "activity", "locality", "destination" },
                "food" => new List<string> { "object", "locality" },
                "walk" => new List<string> { "activity", "locality", "destination" },
                "family" => new List<string> { "activity", "locality", "destination", "object" },
                _ => new List<string> { "destination", "locality", "object", "event", "activity" },
            };

            // Za nocni provod preferujemo konkretne tipove objekata (bar, klub, kafana)
            var preferredObjectTypes = theme switch
            {
                "nightlife" => new List<string> { "bar", "kafana", "club", "klub", "wine", "winery", "restaurant", "restoran" },
                "drink" => new List<string> { "bar", "kafic", "cafe", "coffee", "club", "klub", "wine", "winery", "cocktail", "pub", "restoran", "restaurant" },
                "food" => new List<string> { "restoran", "restaurant", "kafic", "bistro" },
                _ => new List<string>(),
            };

            return new SemanticSearchPlan
            {
                QuerySummary = query,
                Categories = categories,
                RegionName = context.EffectiveRegion?.Name,
                SearchStyle = theme == "nightlife" || theme == "drink" || theme == "food" ? "specific" : "exploratory",
                LocationAnchors = [],
                PreferredObjectTypes = preferredObjectTypes,
                MustTerms = [],
                ShouldTerms = BuildFallbackTerms(query),
                NearMe = context.Origin != null,
                SortBy = context.Origin != null ? "distance" : "relevance",
                PageSize = context.Request.PageSize,
            };
        }

        private async Task<OllamaChatResponse> SendChatAsync(HttpClient client, OllamaChatRequest request, CancellationToken cancellationToken)
        {
            using var response = await client.PostAsJsonAsync("api/chat", request, JsonOptions, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new InvalidOperationException($"Ollama returned {(int)response.StatusCode}: {error}");
            }

            var payload = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(JsonOptions, cancellationToken);
            return payload ?? new OllamaChatResponse();
        }

        private async Task<List<string>> GetAvailableCandidateModelsAsync(HttpClient client, CancellationToken cancellationToken)
        {
            var configuredModels = GetCandidateModels().ToList();

            try
            {
                using var response = await client.GetAsync("api/tags", cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    return configuredModels;
                }

                var payload = await response.Content.ReadFromJsonAsync<OllamaTagsResponse>(JsonOptions, cancellationToken);
                var installedModels = payload?.Models?
                    .Select(model => model.Name?.Trim())
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase)
                    ?? [];

                if (installedModels.Count == 0)
                {
                    return configuredModels;
                }

                return configuredModels
                    .Where(model => installedModels.Contains(model))
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Unable to fetch installed Ollama models, using configured model list.");
                return configuredModels;
            }
        }

        private IEnumerable<string> GetCandidateModels()
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(_options.Model) && seen.Add(_options.Model.Trim()))
            {
                yield return _options.Model.Trim();
            }

            foreach (var model in _options.FallbackModels.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                var normalized = model.Trim();
                if (seen.Add(normalized))
                {
                    yield return normalized;
                }
            }
        }

        private static string? ExtractJsonPayload(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var trimmed = raw.Trim();
            var firstBrace = trimmed.IndexOf('{');
            var lastBrace = trimmed.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                return trimmed[firstBrace..(lastBrace + 1)];
            }

            return trimmed;
        }

        private static string BuildFallbackWarning(Exception? ex)
        {
            var message = ex?.Message ?? string.Empty;

            if (message.Contains("requires more system memory", StringComparison.OrdinalIgnoreCase))
            {
                return "Lokalni AI model nema dovoljno slobodne memorije. Prikazana je fallback semanticka pretraga.";
            }

            if (message.Contains("no configured ollama model", StringComparison.OrdinalIgnoreCase) ||
                ((message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                  message.Contains("pull", StringComparison.OrdinalIgnoreCase)) &&
                 message.Contains("model", StringComparison.OrdinalIgnoreCase)))
            {
                return "Nijedan od podesenih Ollama modela nije instaliran lokalno. Prikazana je fallback semanticka pretraga.";
            }

            return "Lokalni AI model trenutno nije dostupan. Prikazana je fallback semanticka pretraga.";
        }

        private static string NormalizeText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var builder = new StringBuilder(value.Trim().ToLowerInvariant());
            builder.Replace('č', 'c')
                .Replace('ć', 'c')
                .Replace('š', 's')
                .Replace('ž', 'z')
                .Replace('đ', 'd');

            var cleaned = Regex.Replace(builder.ToString(), @"[^\p{L}\p{Nd}\s]", " ");
            return Regex.Replace(cleaned, @"\s+", " ").Trim();
        }

        private static IEnumerable<string> ExpandTerm(string term)
        {
            var normalized = NormalizeText(term);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return [];
            }

            var variants = new HashSet<string>(StringComparer.Ordinal)
            {
                normalized,
            };

            foreach (var suffix in new[] { "ovima", "evima", "ima", "ama", "anjem", "enjem", "njem", "om", "em", "im", "og", "eg", "oj", "ju", "u", "a", "e", "i", "o" })
            {
                if (normalized.Length > suffix.Length + 2 && normalized.EndsWith(suffix, StringComparison.Ordinal))
                {
                    variants.Add(normalized[..^suffix.Length]);
                }
            }

            return variants.Where(x => x.Length >= 3);
        }

        private static string? GetMainImageUrl(IEnumerable<Image>? images)
        {
            return images?
                .OrderByDescending(i => i.IsMain)
                .Select(i => i.Url)
                .FirstOrDefault();
        }

        private static string ResolveObjectLocation(TouristObject obj)
        {
            return obj.Locality?.Name
                ?? obj.Destination?.Name
                ?? obj.Destination?.Region?.Name
                ?? obj.ObjectType?.Name
                ?? string.Empty;
        }

        private static string ResolveEventLocation(Event evt)
        {
            return evt.Locality?.Name
                ?? evt.Destination?.Name
                ?? evt.Destination?.Region?.Name
                ?? evt.EventType?.Name
                ?? string.Empty;
        }

        private static string ResolveActivityLocation(Activity activity)
        {
            return activity.Locality?.Name
                ?? activity.Destination?.Name
                ?? activity.Destination?.Region?.Name
                ?? activity.ActivityType?.Name
                ?? string.Empty;
        }

        private static string ResolveObjectMarkerType(string? objectTypeName)
        {
            var normalized = NormalizeText(objectTypeName);
            if (normalized.Contains("hotel") || normalized.Contains("apartman") || normalized.Contains("resort") || normalized.Contains("suite"))
            {
                return "hotel";
            }

            if (normalized.Contains("kafana") || normalized.Contains("bar") || normalized.Contains("kafic") || normalized.Contains("klub") || normalized.Contains("club") || normalized.Contains("wine") || normalized.Contains("vinar"))
            {
                return "kafana";
            }

            return "restaurant";
        }

        private static string ResolveObjectIcon(string? objectTypeName)
        {
            return ResolveObjectMarkerType(objectTypeName) switch
            {
                "hotel" => "hotel",
                "kafana" => "local_bar",
                _ => "restaurant",
            };
        }

        private sealed class SearchExecutionContext
        {
            public required AiSemanticSearchQueryDto Request { get; set; }
            public required List<Region> AvailableRegions { get; set; }
            public required List<string> AvailablePlaceNames { get; set; }
            public Region? EffectiveRegion { get; set; }
            public GeoPoint? Origin { get; set; }
        }

        private sealed class SemanticSearchPlan
        {
            public string QuerySummary { get; set; } = string.Empty;
            public List<string> Categories { get; set; } = [];
            public string? RegionName { get; set; }
            public string SearchStyle { get; set; } = "specific";
            public List<string> LocationAnchors { get; set; } = [];
            public List<string> PreferredObjectTypes { get; set; } = [];
            public List<string> MustTerms { get; set; } = [];
            public List<string> ShouldTerms { get; set; } = [];
            public bool NearMe { get; set; }
            public string SortBy { get; set; } = "relevance";
            public int? PageSize { get; set; }
        }

        private sealed class PlanExecutionResult
        {
            public SemanticSearchPlan Plan { get; set; } = new();
            public List<SmartSearchResultDto> Results { get; set; } = [];
        }

        private sealed class OllamaTagsResponse
        {
            public List<OllamaTagModel> Models { get; set; } = [];
        }

        private sealed class OllamaTagModel
        {
            public string? Name { get; set; }
        }

        private static string BuildCacheKey(AiSemanticSearchQueryDto request)
        {
            var lat = request.Latitude.HasValue ? Math.Round(request.Latitude.Value, 3).ToString(CultureInfo.InvariantCulture) : "none";
            var lng = request.Longitude.HasValue ? Math.Round(request.Longitude.Value, 3).ToString(CultureInfo.InvariantCulture) : "none";
            return $"ai-semantic:{NormalizeText(request.Query)}:{request.RegionId?.ToString() ?? "none"}:{lat}:{lng}:{request.PageSize}";
        }

        private static string BuildSnapshotCacheKey(
            IReadOnlyCollection<SemanticSearchPlan> plans,
            SearchExecutionContext context)
        {
            var categories = plans
                .SelectMany(plan => plan.Categories)
                .Select(NormalizeText)
                .Where(category => !string.IsNullOrWhiteSpace(category))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(category => category, StringComparer.Ordinal)
                .ToList();

            return $"ai-semantic:snapshot:{context.EffectiveRegion?.Id.ToString() ?? "all"}:{string.Join('|', categories)}";
        }

        private static string BuildPlanFingerprint(SemanticSearchPlan plan)
        {
            return string.Join("::",
                string.Join("|", plan.Categories.Select(NormalizeText).OrderBy(x => x, StringComparer.Ordinal)),
                string.Join("|", plan.MustTerms.Select(NormalizeText).OrderBy(x => x, StringComparer.Ordinal)),
                string.Join("|", plan.ShouldTerms.Select(NormalizeText).OrderBy(x => x, StringComparer.Ordinal)),
                string.Join("|", plan.LocationAnchors.Select(NormalizeText).OrderBy(x => x, StringComparer.Ordinal)),
                string.Join("|", plan.PreferredObjectTypes.Select(NormalizeText).OrderBy(x => x, StringComparer.Ordinal)),
                NormalizeText(plan.RegionName),
                NormalizeText(plan.SearchStyle),
                NormalizeText(plan.SortBy));
        }

        private static AiSemanticSearchResponseDto CloneResponse(AiSemanticSearchResponseDto response)
        {
            return new AiSemanticSearchResponseDto
            {
                Provider = response.Provider,
                UsedFallback = response.UsedFallback,
                Warning = response.Warning,
                QuerySummary = response.QuerySummary,
                RegionName = response.RegionName,
                Categories = [.. response.Categories],
                Results = response.Results
                    .Select(result => new SmartSearchResultDto
                    {
                        Id = result.Id,
                        Name = result.Name,
                        TypeName = result.TypeName,
                        Location = result.Location,
                        Category = result.Category,
                        MarkerType = result.MarkerType,
                        Icon = result.Icon,
                        ImageUrl = result.ImageUrl,
                        Latitude = result.Latitude,
                        Longitude = result.Longitude,
                        MatchReason = result.MatchReason,
                        Score = result.Score,
                    })
                    .ToList(),
            };
        }

        private sealed class SearchDataSnapshot
        {
            public List<Destination> Destinations { get; set; } = [];
            public List<Locality> Localities { get; set; } = [];
            public List<TouristObject> Objects { get; set; } = [];
            public List<Event> Events { get; set; } = [];
            public List<Activity> Activities { get; set; } = [];
            public Dictionary<int, int> DestinationFavoriteCounts { get; set; } = [];
            public Dictionary<int, int> LocalityFavoriteCounts { get; set; } = [];
            public Dictionary<int, int> ObjectFavoriteCounts { get; set; } = [];
            public Dictionary<int, int> ActivityFavoriteCounts { get; set; } = [];
            public Dictionary<int, int> EventPlannerCounts { get; set; } = [];
        }

        private sealed class SearchableText
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Type { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public string Extra { get; set; } = string.Empty;
            public string All { get; set; } = string.Empty;
        }

        private sealed record GeoPoint(double Latitude, double Longitude);

        private sealed class OllamaChatRequest
        {
            public string Model { get; set; } = string.Empty;
            public bool Stream { get; set; }
            public string? Format { get; set; }
            public List<OllamaMessage> Messages { get; set; } = [];
            public OllamaChatOptions? Options { get; set; }
        }

        private sealed class OllamaChatResponse
        {
            public OllamaMessage? Message { get; set; }
        }

        private sealed class OllamaMessage
        {
            public string Role { get; set; } = string.Empty;
            public string? Content { get; set; }
        }

        private sealed class OllamaChatOptions
        {
            [JsonPropertyName("temperature")]
            public double Temperature { get; set; }

            [JsonPropertyName("top_p")]
            public double TopP { get; set; }

            [JsonPropertyName("num_predict")]
            public int NumPredict { get; set; }

            public static OllamaChatOptions ForPlanning()
            {
                return new OllamaChatOptions
                {
                    Temperature = 0.05,
                    TopP = 0.9,
                    NumPredict = 80,
                };
            }
        }
    }
}
