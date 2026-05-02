using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class AiChatService : IAiChatService
    {
        private const string SearchPlacesToolName = "search_places";
        private const string ExploreRegionToolName = "explore_region";
        private const int MaxAnswerCharacters = 420;
        private const int MaxGenerativeResults = 3;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ISmartSearchService _smartSearchService;
        private readonly IAiSemanticSearchService _aiSemanticSearchService;
        private readonly AppDbContext _context;
        private readonly ILogger<AiChatService> _logger;
        private readonly OllamaOptions _options;

        public AiChatService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ISmartSearchService smartSearchService,
            IAiSemanticSearchService aiSemanticSearchService,
            AppDbContext context,
            IOptions<OllamaOptions> options,
            ILogger<AiChatService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _smartSearchService = smartSearchService;
            _aiSemanticSearchService = aiSemanticSearchService;
            _context = context;
            _logger = logger;
            _options = options.Value ?? new OllamaOptions();
        }

        public async Task<AiChatResponseDto> ChatAsync(int? userId, AiChatRequestDto request, CancellationToken cancellationToken = default)
        {
            var sanitizedRequest = SanitizeRequest(request);
            var message = sanitizedRequest.Message;

            if (string.IsNullOrWhiteSpace(message))
            {
                return new AiChatResponseDto
                {
                    Answer = "Posalji mi pitanje, na primer: 'gde mogu da idem sa decom u setnju' ili 'preporuci mi restoran za rucak'.",
                    Provider = "fallback",
                    UsedFallback = true,
                };
            }

            var cacheKey = BuildChatCacheKey(sanitizedRequest);
            if (_cache.TryGetValue(cacheKey, out AiChatResponseDto? cached) && cached != null)
            {
                return CloneResponse(cached);
            }

            var semanticResponse = await _aiSemanticSearchService.SearchAsync(userId, new AiSemanticSearchQueryDto
            {
                Query = sanitizedRequest.Message,
                PageSize = 6,
                RegionId = sanitizedRequest.RegionId,
                Latitude = sanitizedRequest.Latitude,
                Longitude = sanitizedRequest.Longitude,
            }, cancellationToken);

            var answer = await BuildSemanticAnswerAsync(sanitizedRequest, semanticResponse, cancellationToken);

            var response = new AiChatResponseDto
            {
                Answer = answer,
                Provider = semanticResponse.Provider,
                UsedTool = true,
                UsedFallback = semanticResponse.UsedFallback,
                Warning = semanticResponse.Warning,
                Results = semanticResponse.Results,
            };

            _cache.Set(cacheKey, CloneResponse(response), TimeSpan.FromMinutes(2));
            return response;
        }

        private async Task<string> BuildSemanticAnswerAsync(
            AiChatRequestDto request,
            AiSemanticSearchResponseDto semanticResponse,
            CancellationToken cancellationToken)
        {
            var fallbackAnswer = semanticResponse.Results.Count == 0
                ? BuildSemanticNoMatchAnswer(request, semanticResponse)
                : BuildSemanticFallbackAnswer(request, semanticResponse);

            if (semanticResponse.Results.Count == 0)
            {
                return PostProcessAnswer(fallbackAnswer, semanticResponse.Results);
            }

            if (!semanticResponse.Provider.StartsWith("ollama:", StringComparison.OrdinalIgnoreCase) ||
                !ShouldUseGenerativeAnswer(request, semanticResponse))
            {
                return PostProcessAnswer(fallbackAnswer, semanticResponse.Results);
            }

            try
            {
                var model = semanticResponse.Provider["ollama:".Length..];
                var client = BuildOllamaClient();
                var promptResults = JsonSerializer.Serialize(
                    semanticResponse.Results.Take(MaxGenerativeResults).Select(r => new
                    {
                        r.Name,
                        r.TypeName,
                        r.Location,
                        r.Category,
                        r.MatchReason,
                    }),
                    JsonOptions);

                using var answerCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                answerCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(2, Math.Min(_options.TimeoutSeconds, 4))));

                var response = await SendChatAsync(client, new OllamaChatRequest
                {
                    Model = model,
                    Stream = false,
                    Messages =
                    [
                        new OllamaMessage
                        {
                            Role = "system",
                            Content =
                                """
                                Ti si turisticki asistent u aplikaciji.
                                Napisaces samo kratak, prirodan odgovor na standardnom srpskom latinicom.
                                Najvise 2 kratka pasusa ili 3 kratke stavke.
                                Koristi iskljucivo mesta iz prosledjenih rezultata.
                                Ne izmisljaj tip kuhinje, pogodnosti, cene, lokacije ni atmosferu ako to nije eksplicitno dato.
                                Ako su rezultati ograniceni, reci to kratko i iskreno.
                                Obavezno pomenuj bar jedno konkretno ime iz rezultata.
                                Nemoj da mesas hrvatske/bosanske oblike niti cudne konstrukcije.
                                """,
                        },
                        new OllamaMessage
                        {
                            Role = "user",
                            Content = $"Pitanje korisnika: {request.Message}\nRegion: {semanticResponse.RegionName ?? "nije zadat"}\nKategorije: {string.Join(", ", semanticResponse.Categories)}\nRezultati: {promptResults}",
                        },
                    ],
                    Options = new OllamaChatOptions
                    {
                        Temperature = 0.2,
                        TopP = 0.85,
                        NumPredict = 72,
                    },
                }, answerCts.Token);

                var generated = PostProcessAnswer(response.Message?.Content, semanticResponse.Results);
                if (IsAcceptableGeneratedAnswer(generated, semanticResponse.Results))
                {
                    return generated;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI answer generation failed for query '{Query}'", request.Message);
            }

            return PostProcessAnswer(fallbackAnswer, semanticResponse.Results);
        }

        private static string BuildSemanticFallbackAnswer(AiChatRequestDto request, AiSemanticSearchResponseDto semanticResponse)
        {
            var top = semanticResponse.Results.Take(3).ToList();
            var regionPart = !string.IsNullOrWhiteSpace(semanticResponse.RegionName)
                ? $" u {semanticResponse.RegionName}"
                : string.Empty;

            if (top.Count == 1)
            {
                var first = top[0];
                return $"Za pitanje \"{request.Message}\" najbolji pogodak{regionPart} deluje {first.Name} ({first.TypeName}) u {first.Location}.";
            }

            var formatted = string.Join(", ", top.Take(2).Select(r => $"{r.Name} ({r.TypeName}) u {r.Location}")) +
                (top.Count > 2 ? $" i {top[2].Name} ({top[2].TypeName}) u {top[2].Location}" : string.Empty);

            return $"Za pitanje \"{request.Message}\" najvise smisla{regionPart} imaju {formatted}.";
        }

        private static string BuildSemanticNoMatchAnswer(AiChatRequestDto request, AiSemanticSearchResponseDto semanticResponse)
        {
            if (!string.IsNullOrWhiteSpace(semanticResponse.RegionName))
            {
                return $"Trenutno nemam dovoljno preciznih rezultata za pitanje \"{request.Message}\" u regionu {semanticResponse.RegionName}. Probaj da navedes tip mesta ili neku konkretnu pogodnost.";
            }

            return $"Trenutno nemam dovoljno preciznih rezultata za pitanje \"{request.Message}\". Probaj da navedes region, tip mesta ili neku konkretnu pogodnost.";
        }

        private HttpClient BuildOllamaClient()
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(3, Math.Min(_options.TimeoutSeconds, 8)));
            return client;
        }

        private static bool ShouldUseGenerativeAnswer(AiChatRequestDto request, AiSemanticSearchResponseDto semanticResponse)
        {
            if (semanticResponse.Results.Count == 0)
            {
                return false;
            }

            var normalized = NormalizeText(request.Message);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return false;
            }

            var wordCount = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Length;
            if (wordCount < 8)
            {
                return false;
            }

            if ((request.History?.Count ?? 0) == 0)
            {
                return false;
            }

            return normalized.Contains("gde", StringComparison.Ordinal) ||
                   normalized.Contains("sta", StringComparison.Ordinal) ||
                   normalized.Contains("prepor", StringComparison.Ordinal) ||
                   normalized.Contains("savet", StringComparison.Ordinal) ||
                   normalized.Contains("izadj", StringComparison.Ordinal) ||
                   normalized.Contains("vidim", StringComparison.Ordinal);
        }

        private static bool IsAcceptableGeneratedAnswer(string answer, IReadOnlyList<SmartSearchResultDto> results)
        {
            if (string.IsNullOrWhiteSpace(answer))
            {
                return false;
            }

            var normalizedAnswer = NormalizeText(answer);
            if (string.IsNullOrWhiteSpace(normalizedAnswer))
            {
                return false;
            }

            if (results.Count > 0 &&
                (normalizedAnswer.Contains("nemam dovoljno", StringComparison.Ordinal) ||
                 normalizedAnswer.Contains("nisam nasao", StringComparison.Ordinal)))
            {
                return false;
            }

            return MentionsKnownResult(answer, results.Take(3).ToList());
        }

        private static bool MentionsKnownResult(string answer, IReadOnlyList<SmartSearchResultDto> results)
        {
            var normalizedAnswer = NormalizeText(answer);

            foreach (var result in results)
            {
                var normalizedName = NormalizeText(result.Name);
                var normalizedLocation = NormalizeText(result.Location);

                if (!string.IsNullOrWhiteSpace(normalizedName) &&
                    normalizedAnswer.Contains(normalizedName, StringComparison.Ordinal))
                {
                    return true;
                }

                if (!string.IsNullOrWhiteSpace(normalizedLocation) &&
                    normalizedAnswer.Contains(normalizedLocation, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private static string PostProcessAnswer(string? rawAnswer, IReadOnlyList<SmartSearchResultDto> results)
        {
            var answer = (rawAnswer ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(answer))
            {
                return string.Empty;
            }

            answer = NormalizeWhitespace(answer);
            answer = NormalizeLanguageVariants(answer);
            answer = TrimAnswer(answer, MaxAnswerCharacters);

            if (results.Count > 0)
            {
                answer = EnsureConcreteEnding(answer, results);
            }

            return answer;
        }

        private static string NormalizeWhitespace(string value)
        {
            var normalized = value
                .Replace("\r\n", "\n", StringComparison.Ordinal)
                .Replace('\r', '\n')
                .Trim();

            while (normalized.Contains("\n\n\n", StringComparison.Ordinal))
            {
                normalized = normalized.Replace("\n\n\n", "\n\n", StringComparison.Ordinal);
            }

            return string.Join('\n',
                normalized.Split('\n')
                    .Select(line => string.Join(' ', line.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))));
        }

        private static string NormalizeLanguageVariants(string value)
        {
            var replacements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["gdje"] = "gde",
                ["uvijek"] = "uvek",
                ["preporucam"] = "preporucujem",
                ["preporučam"] = "preporucujem",
                ["takoder"] = "takodje",
                ["također"] = "takodje",
                ["svidjeti"] = "dopasti",
                ["posjeti"] = "obidji",
                ["posjetiti"] = "obici",
                ["ukoliko zelis"] = "ako zelis",
                ["ukoliko želite"] = "ako zelis",
                ["gdje mozes"] = "gde mozes",
            };

            var normalized = value;
            foreach (var replacement in replacements)
            {
                normalized = normalized.Replace(replacement.Key, replacement.Value, StringComparison.OrdinalIgnoreCase);
            }

            return normalized;
        }

        private static string TrimAnswer(string value, int maxCharacters)
        {
            if (value.Length <= maxCharacters)
            {
                return value;
            }

            var sentences = value
                .Split(['.', '!', '?'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(sentence => !string.IsNullOrWhiteSpace(sentence))
                .ToList();

            if (sentences.Count == 0)
            {
                return value[..Math.Min(value.Length, maxCharacters)].TrimEnd() + "...";
            }

            var builder = new StringBuilder();
            foreach (var sentence in sentences)
            {
                var candidate = builder.Length == 0 ? sentence : $"{builder} {sentence}";
                if (candidate.Length > maxCharacters)
                {
                    break;
                }

                if (builder.Length > 0)
                {
                    builder.Append(' ');
                }

                builder.Append(sentence.Trim());
                if (!sentence.TrimEnd().EndsWith('.'))
                {
                    builder.Append('.');
                }
            }

            if (builder.Length == 0)
            {
                return value[..Math.Min(value.Length, maxCharacters)].TrimEnd() + "...";
            }

            return builder.ToString().Trim();
        }

        private static string EnsureConcreteEnding(string value, IReadOnlyList<SmartSearchResultDto> results)
        {
            if (MentionsKnownResult(value, results))
            {
                return value;
            }

            var first = results.FirstOrDefault();
            if (first == null)
            {
                return value;
            }

            var suffix = $" Najpre bih krenula od {first.Name} u {first.Location}.";
            if (value.Length + suffix.Length <= MaxAnswerCharacters)
            {
                return value.TrimEnd('.', '!', '?') + "." + suffix;
            }

            return value;
        }

        private static string BuildChatCacheKey(AiChatRequestDto request)
        {
            var normalizedHistory = request.History == null || request.History.Count == 0
                ? "no-history"
                : string.Join('|', request.History
                    .TakeLast(4)
                    .Select(item => $"{item.Role}:{NormalizeText(item.Content)}"));

            var lat = request.Latitude.HasValue ? Math.Round(request.Latitude.Value, 3).ToString(System.Globalization.CultureInfo.InvariantCulture) : "none";
            var lng = request.Longitude.HasValue ? Math.Round(request.Longitude.Value, 3).ToString(System.Globalization.CultureInfo.InvariantCulture) : "none";

            return $"ai-chat:{NormalizeText(request.Message)}:{request.RegionId?.ToString() ?? "none"}:{lat}:{lng}:{normalizedHistory}";
        }

        private static AiChatResponseDto CloneResponse(AiChatResponseDto response)
        {
            return new AiChatResponseDto
            {
                Answer = response.Answer,
                Provider = response.Provider,
                UsedTool = response.UsedTool,
                UsedFallback = response.UsedFallback,
                Warning = response.Warning,
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

        private AiChatRequestDto SanitizeRequest(AiChatRequestDto request)
        {
            var history = request.History?
                .Where(x =>
                    NormalizeRole(x.Role) != null &&
                    !string.IsNullOrWhiteSpace(x.Content) &&
                    !string.Equals(x.Content.Trim(), "string", StringComparison.OrdinalIgnoreCase))
                .TakeLast(8)
                .Select(x => new AiChatMessageDto
                {
                    Role = NormalizeRole(x.Role)!,
                    Content = x.Content.Trim(),
                })
                .ToList() ?? [];

            return new AiChatRequestDto
            {
                Message = request.Message?.Trim() ?? string.Empty,
                History = history,
                RegionId = request.RegionId is > 0 ? request.RegionId : null,
                Latitude = request.Latitude is 0 ? null : request.Latitude,
                Longitude = request.Longitude is 0 ? null : request.Longitude,
            };
        }

        private async Task<AiToolSelection?> TrySelectToolAsync(HttpClient client, string model, AiChatRequestDto request, CancellationToken cancellationToken)
        {
            var jsonPlanResponse = await SendChatAsync(client, new OllamaChatRequest
            {
                Model = model,
                Stream = false,
                Format = "json",
                Messages = BuildJsonPlannerConversation(request),
                Tools = [],
                Options = OllamaChatOptions.ForPlanning(),
            }, cancellationToken);

            var jsonSelection = TryParseJsonPlan(jsonPlanResponse.Message?.Content, request);
            if (jsonSelection != null)
            {
                return jsonSelection;
            }

            var toolResponse = await SendChatAsync(client, new OllamaChatRequest
            {
                Model = model,
                Stream = false,
                Messages = BuildToolPlannerConversation(request),
                Tools = BuildTools(),
                Options = OllamaChatOptions.ForPlanning(),
            }, cancellationToken);

            return TryParseToolSelection(toolResponse.Message, request);
        }

        private static List<OllamaMessage> BuildToolPlannerConversation(AiChatRequestDto request)
        {
            var messages = new List<OllamaMessage>
            {
                new()
                {
                    Role = "system",
                    Content =
                        """
                        Ti si planner za SpireGO turisticku aplikaciju.
                        Tvoj posao je da uvek prvo izaberes JEDAN alat i da ne odgovaras direktno korisniku.

                        Koristi:
                        - search_places za konkretne upite: restoran, hotel, bazen, spa, parking, kuhinja, dogadjaj, cena, specificna pogodnost.
                        - explore_region za siroka pitanja: sta videti, sta raditi, gde setati, sta je zanimljivo u nekom regionu ili drzavi.

                        Pravila:
                        - Ako korisnik pita siroko pitanje o regionu ili drzavi, koristi explore_region.
                        - Ako korisnik trazi konkretan tip mesta ili pogodnost, koristi search_places.
                        - U query posalji kratku i korisnu pretragu bez suvisnih reci.
                        - Ako korisnik navede region ili drzavu, prosledi regionName kad koristis explore_region.
                        - regionName sme da bude popunjen SAMO ako je korisnik eksplicitno naveo mesto, drzavu ili region.
                        - Ako korisnik nije naveo mesto, ali postoji aktivan regionId iz konteksta, smes da koristis explore_region sa tim regionId.
                        - Ako nema eksplicitnog mesta u poruci, ostavi regionName prazno i koristi search_places.
                        - Nemoj da izmisljas alat koji nije ponudjen.
                        """,
                }
            };

            foreach (var historyMessage in request.History)
            {
                messages.Add(new OllamaMessage
                {
                    Role = historyMessage.Role,
                    Content = historyMessage.Content,
                });
            }

            messages.Add(new OllamaMessage
            {
                Role = "user",
                Content = BuildPlannerUserPrompt(request),
            });

            return messages;
        }

        private static List<OllamaMessage> BuildJsonPlannerConversation(AiChatRequestDto request)
        {
            var messages = new List<OllamaMessage>
            {
                new()
                {
                    Role = "system",
                    Content =
                        """
                        Ti si planner za SpireGO turisticku aplikaciju.
                        Ne odgovaras korisniku. Vracas SAMO JSON bez markdown-a i bez objasnjenja.

                        Shema:
                        {
                          "tool": "search_places" ili "explore_region",
                          "query": "kratka korisna pretraga za search_places",
                          "regionName": "naziv regiona ili drzave ako postoji",
                          "theme": "sightseeing|walk|food|family|events|nightlife|mixed",
                          "pageSize": 5
                        }

                        Pravila:
                        - Za siroka pitanja tipa sta videti, sta zanimljivo, sta raditi, gde prosetati u regionu ili drzavi koristi explore_region.
                        - Za konkretne zahteve poput restorana, hotela, bazena, parkinga, kuhinje ili cene koristi search_places.
                        - regionName popuni samo kada je korisnik zaista napisao konkretno mesto, drzavu ili region.
                        - Ako korisnik nije napisao mesto, ali postoji aktivan regionId iz konteksta, smes da koristis explore_region sa tim regionId.
                        - Ako korisnik nije napisao mesto, regionName ostavi prazno i koristi search_places.
                        - Ako nisi siguran, koristi search_places sa kratkim query stringom.
                        """,
                }
            };

            foreach (var historyMessage in request.History)
            {
                messages.Add(new OllamaMessage
                {
                    Role = historyMessage.Role,
                    Content = historyMessage.Content,
                });
            }

            messages.Add(new OllamaMessage
            {
                Role = "user",
                Content = BuildPlannerUserPrompt(request),
            });

            return messages;
        }

        private static string? NormalizeRole(string? role)
        {
            var normalized = role?.Trim().ToLowerInvariant();
            return normalized switch
            {
                "user" => "user",
                "assistant" => "assistant",
                "system" => "system",
                _ => null,
            };
        }

        private static string BuildPlannerUserPrompt(AiChatRequestDto request)
        {
            var region = request.RegionId?.ToString() ?? "none";
            var latitude = request.Latitude?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "none";
            var longitude = request.Longitude?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "none";

            return $"Korisnicko pitanje: {request.Message}\nKontekst: regionId={region}, latitude={latitude}, longitude={longitude}";
        }

        private static List<OllamaToolDefinition> BuildTools()
        {
            return
            [
                new OllamaToolDefinition
                {
                    Type = "function",
                    Function = new OllamaToolSchema
                    {
                        Name = SearchPlacesToolName,
                        Description = "Pretrazi mesta u aplikaciji kada korisnik trazi konkretan restoran, hotel, aktivnost, dogadjaj, pogodnost ili kuhinju.",
                        Parameters = new OllamaToolParameters
                        {
                            Type = "object",
                            Required = ["query"],
                            Properties =
                            {
                                ["query"] = new OllamaToolProperty
                                {
                                    Type = "string",
                                    Description = "Kratka korisna pretraga, na primer 'setnja sa decom', 'hotel sa bazenom' ili 'italijanski restoran'.",
                                },
                                ["pageSize"] = new OllamaToolProperty
                                {
                                    Type = "integer",
                                    Description = "Koliko rezultata da se vrati, tipicno 5 ili 6.",
                                },
                                ["regionId"] = new OllamaToolProperty
                                {
                                    Type = "integer",
                                    Description = "Opcioni aktivni region korisnika.",
                                },
                                ["latitude"] = new OllamaToolProperty
                                {
                                    Type = "number",
                                    Description = "Opciona geografska sirina korisnika.",
                                },
                                ["longitude"] = new OllamaToolProperty
                                {
                                    Type = "number",
                                    Description = "Opciona geografska duzina korisnika.",
                                },
                            }
                        }
                    }
                },
                new OllamaToolDefinition
                {
                    Type = "function",
                    Function = new OllamaToolSchema
                    {
                        Name = ExploreRegionToolName,
                        Description = "Izdvoji sta je najzanimljivije videti ili raditi u konkretnom regionu ili drzavi.",
                        Parameters = new OllamaToolParameters
                        {
                            Type = "object",
                            Required = [],
                            Properties =
                            {
                                ["regionName"] = new OllamaToolProperty
                                {
                                    Type = "string",
                                    Description = "Naziv regiona ili drzave, na primer 'Crna Gora' ili 'Spanija'.",
                                },
                                ["regionId"] = new OllamaToolProperty
                                {
                                    Type = "integer",
                                    Description = "Opcioni aktivni region korisnika.",
                                },
                                ["theme"] = new OllamaToolProperty
                                {
                                    Type = "string",
                                    Description = "Jedna od vrednosti: sightseeing, walk, food, family, events ili mixed.",
                                },
                                ["pageSize"] = new OllamaToolProperty
                                {
                                    Type = "integer",
                                    Description = "Koliko rezultata da se vrati, tipicno 5 ili 6.",
                                },
                            }
                        }
                    }
                }
            ];
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

        private AiToolSelection? TryParseToolSelection(OllamaMessage? message, AiChatRequestDto request)
        {
            if (message?.ToolCalls == null || message.ToolCalls.Count == 0)
            {
                return null;
            }

            foreach (var toolCall in message.ToolCalls)
            {
                var function = toolCall.Function;
                if (function == null || string.IsNullOrWhiteSpace(function.Name))
                {
                    continue;
                }

                if (string.Equals(function.Name, SearchPlacesToolName, StringComparison.OrdinalIgnoreCase))
                {
                    var parsed = DeserializeArguments<SearchPlacesToolArguments>(function.Arguments);
                    return new AiToolSelection
                    {
                        ToolName = SearchPlacesToolName,
                        SearchArguments = MergeSearchArgs(parsed, request, "mcp"),
                    };
                }

                if (string.Equals(function.Name, ExploreRegionToolName, StringComparison.OrdinalIgnoreCase))
                {
                    var parsed = DeserializeArguments<ExploreRegionToolArguments>(function.Arguments);
                    return new AiToolSelection
                    {
                        ToolName = ExploreRegionToolName,
                        ExploreArguments = MergeExploreArgs(parsed, request),
                    };
                }
            }

            return null;
        }

        private AiToolSelection? TryParseJsonPlan(string? rawContent, AiChatRequestDto request)
        {
            var planJson = ExtractJsonPayload(rawContent);
            if (string.IsNullOrWhiteSpace(planJson))
            {
                return null;
            }

            AiToolPlan? plan;
            try
            {
                plan = JsonSerializer.Deserialize<AiToolPlan>(planJson, JsonOptions);
            }
            catch
            {
                return null;
            }

            if (plan == null)
            {
                return null;
            }

            var tool = NormalizeText(plan.Tool);
            if (tool.Contains("explore"))
            {
                return new AiToolSelection
                {
                    ToolName = ExploreRegionToolName,
                    ExploreArguments = MergeExploreArgs(new ExploreRegionToolArguments
                    {
                        RegionId = request.RegionId,
                        RegionName = plan.RegionName,
                        Theme = plan.Theme,
                        PageSize = plan.PageSize,
                    }, request),
                };
            }

            if (tool.Contains("search") || !string.IsNullOrWhiteSpace(plan.Query))
            {
                return new AiToolSelection
                {
                    ToolName = SearchPlacesToolName,
                    SearchArguments = MergeSearchArgs(new SearchPlacesToolArguments
                    {
                        Query = string.IsNullOrWhiteSpace(plan.Query) ? request.Message : plan.Query,
                        PageSize = plan.PageSize,
                        RegionId = request.RegionId,
                        Latitude = request.Latitude,
                        Longitude = request.Longitude,
                    }, request, "mcp"),
                };
            }

            return null;
        }

        private static string? ExtractJsonPayload(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var trimmed = raw.Trim();
            if (trimmed.StartsWith("```", StringComparison.Ordinal))
            {
                var firstBrace = trimmed.IndexOf('{');
                var lastBrace = trimmed.LastIndexOf('}');
                if (firstBrace >= 0 && lastBrace > firstBrace)
                {
                    return trimmed[firstBrace..(lastBrace + 1)];
                }
            }

            return trimmed;
        }

        private static T? DeserializeArguments<T>(JsonElement element)
        {
            try
            {
                if (element.ValueKind == JsonValueKind.String)
                {
                    var raw = element.GetString();
                    if (string.IsNullOrWhiteSpace(raw))
                    {
                        return default;
                    }

                    return JsonSerializer.Deserialize<T>(raw, JsonOptions);
                }

                return element.Deserialize<T>(JsonOptions);
            }
            catch
            {
                return default;
            }
        }

        private SearchPlacesToolArguments BuildDefaultSearchArgs(AiChatRequestDto request, string mode)
        {
            return new SearchPlacesToolArguments
            {
                Query = request.Message.Trim(),
                PageSize = 6,
                RegionId = request.RegionId,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Mode = mode,
            };
        }

        private SearchPlacesToolArguments MergeSearchArgs(SearchPlacesToolArguments? parsed, AiChatRequestDto request, string defaultMode)
        {
            var defaults = BuildDefaultSearchArgs(request, defaultMode);
            if (parsed == null)
            {
                return defaults;
            }

            return new SearchPlacesToolArguments
            {
                Query = string.IsNullOrWhiteSpace(parsed.Query) ? defaults.Query : parsed.Query.Trim(),
                PageSize = parsed.PageSize is > 0 ? parsed.PageSize : defaults.PageSize,
                RegionId = parsed.RegionId ?? defaults.RegionId,
                Latitude = parsed.Latitude ?? defaults.Latitude,
                Longitude = parsed.Longitude ?? defaults.Longitude,
                Mode = string.IsNullOrWhiteSpace(parsed.Mode) ? defaults.Mode : parsed.Mode.Trim(),
            };
        }

        private ExploreRegionToolArguments MergeExploreArgs(ExploreRegionToolArguments? parsed, AiChatRequestDto request)
        {
            return new ExploreRegionToolArguments
            {
                RegionId = parsed?.RegionId ?? request.RegionId,
                RegionName = string.IsNullOrWhiteSpace(parsed?.RegionName) ? null : parsed.RegionName.Trim(),
                Theme = NormalizeTheme(parsed?.Theme ?? request.Message),
                PageSize = parsed?.PageSize is > 0 ? parsed.PageSize : 6,
            };
        }

        private async Task<AiToolExecution> ExecuteToolAsync(int? userId, AiChatRequestDto request, AiToolSelection selection, CancellationToken cancellationToken)
        {
            if (selection.ToolName == ExploreRegionToolName)
            {
                var exploreArguments = selection.ExploreArguments ?? MergeExploreArgs(null, request);
                var exploreExecution = await ExecuteExploreRegionToolAsync(exploreArguments, request.Message, cancellationToken);
                if (exploreExecution.RegionResolved)
                {
                    return exploreExecution;
                }

                var fallbackSearchResults = await ExecuteSearchToolAsync(userId, BuildDefaultSearchArgs(request, "mcp"), cancellationToken);
                return new AiToolExecution
                {
                    ToolName = SearchPlacesToolName,
                    Theme = NormalizeTheme(request.Message),
                    Results = fallbackSearchResults,
                };
            }

            var searchArguments = selection.SearchArguments ?? BuildDefaultSearchArgs(request, "mcp");
            var searchResults = await ExecuteSearchToolAsync(userId, searchArguments, cancellationToken);

            if (searchResults.Count == 0)
            {
                var exploreFallback = await TryExploreFallbackAsync(request, cancellationToken);
                if (exploreFallback != null)
                {
                    return exploreFallback;
                }
            }

            return new AiToolExecution
            {
                ToolName = SearchPlacesToolName,
                Theme = NormalizeTheme(searchArguments.Query),
                Results = searchResults,
            };
        }

        private async Task<AiToolExecution?> TryExploreFallbackAsync(AiChatRequestDto request, CancellationToken cancellationToken)
        {
            var region = await ResolveRegionAsync(request.RegionId, null, request.Message, cancellationToken);
            if (region == null)
            {
                return null;
            }

            return await ExecuteExploreRegionToolAsync(new ExploreRegionToolArguments
            {
                RegionId = region.Id,
                RegionName = region.Name,
                Theme = NormalizeTheme(request.Message),
                PageSize = 6,
            }, request.Message, cancellationToken);
        }

        private async Task<List<SmartSearchResultDto>> ExecuteSearchToolAsync(int? userId, SearchPlacesToolArguments args, CancellationToken cancellationToken)
        {
            var query = new SmartSearchQueryDto
            {
                Query = args.Query?.Trim() ?? string.Empty,
                Mode = string.IsNullOrWhiteSpace(args.Mode) ? "mcp" : args.Mode.Trim(),
                PageSize = Math.Clamp(args.PageSize ?? 6, 1, 8),
                RegionId = args.RegionId,
                Latitude = args.Latitude,
                Longitude = args.Longitude,
            };

            var results = await _smartSearchService.SearchAsync(userId, query);
            var localityResults = await SearchLocalitiesForAiAsync(args, cancellationToken);

            return results
                .Concat(localityResults)
                .GroupBy(x => $"{x.Category}:{x.Id}")
                .Select(g => g.OrderByDescending(x => x.Score).First())
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Name)
                .Take(6)
                .ToList();
        }

        private async Task<List<SmartSearchResultDto>> SearchLocalitiesForAiAsync(SearchPlacesToolArguments args, CancellationToken cancellationToken)
        {
            var normalizedQuery = NormalizeText(args.Query);
            var tokens = SplitTokens(normalizedQuery);
            if (tokens.Count == 0)
            {
                return [];
            }

            var localitiesQuery = _context.Localities
                .AsNoTracking()
                .Include(l => l.LocalityType)
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.Images)
                .Where(l => l.IsActive)
                .AsQueryable();

            if (args.RegionId is > 0)
            {
                localitiesQuery = localitiesQuery.Where(l => l.Destination.RegionId == args.RegionId.Value);
            }

            var localities = await localitiesQuery.ToListAsync(cancellationToken);

            return localities
                .Select(locality => new
                {
                    Locality = locality,
                    Score = ScoreLocalitySearch(locality, normalizedQuery, tokens),
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Locality.Name)
                .Take(4)
                .Select(x => new SmartSearchResultDto
                {
                    Id = x.Locality.Id,
                    Name = x.Locality.Name,
                    TypeName = x.Locality.LocalityType?.Name ?? "Lokalitet",
                    Location = ResolveLocalityLocation(x.Locality),
                    Category = "locality",
                    MarkerType = "destination",
                    Icon = "place",
                    ImageUrl = GetMainImageUrl(x.Locality.Images),
                    Latitude = x.Locality.Geolocation?.Y,
                    Longitude = x.Locality.Geolocation?.X,
                    MatchReason = "Matches locality",
                    Score = Math.Round(x.Score, 2),
                })
                .ToList();
        }

        private async Task<AiToolExecution> ExecuteExploreRegionToolAsync(ExploreRegionToolArguments args, string originalMessage, CancellationToken cancellationToken)
        {
            var region = await ResolveRegionAsync(args.RegionId, args.RegionName, originalMessage, cancellationToken);
            var theme = NormalizeTheme(args.Theme ?? originalMessage);

            if (region == null)
            {
                return new AiToolExecution
                {
                    ToolName = ExploreRegionToolName,
                    Theme = theme,
                    RegionName = args.RegionName,
                    RegionResolved = false,
                    Results = [],
                };
            }

            var pageSize = Math.Clamp(args.PageSize ?? 6, 1, 6);

            var destinationFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.DestinationId.HasValue)
                .GroupBy(f => f.DestinationId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

            var objectFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.ObjectId.HasValue)
                .GroupBy(f => f.ObjectId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

            var activityFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.ActivityId.HasValue)
                .GroupBy(f => f.ActivityId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

            var eventPlannerCounts = await _context.EventPlannerItems.AsNoTracking()
                .GroupBy(x => x.EventId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

            var destinations = await _context.Destinations
                .AsNoTracking()
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .Include(d => d.Objects)
                .Include(d => d.Events)
                .Include(d => d.Activities)
                .Where(d => d.IsActive && d.Status == ContentStatus.Approved && d.RegionId == region.Id)
                .ToListAsync(cancellationToken);

            var activities = await _context.Activities
                .AsNoTracking()
                .Include(a => a.ActivityType)
                .Include(a => a.Images)
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                .Where(a =>
                    a.IsActive &&
                    a.Status == ContentStatus.Approved &&
                    ((a.Destination != null && a.Destination.RegionId == region.Id) ||
                     (a.Destination == null &&
                      a.Locality != null &&
                      a.Locality.Destination != null &&
                     a.Locality.Destination.RegionId == region.Id)))
                .ToListAsync(cancellationToken);

            var localities = await _context.Localities
                .AsNoTracking()
                .Include(l => l.LocalityType)
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.Images)
                .Include(l => l.Objects)
                .Include(l => l.Events)
                .Include(l => l.Activities)
                .Where(l => l.IsActive && l.Destination.RegionId == region.Id)
                .ToListAsync(cancellationToken);

            var events = await _context.Events
                .AsNoTracking()
                .Include(e => e.EventType)
                .Include(e => e.Images)
                .Include(e => e.Destination)
                .Include(e => e.Locality)
                .Where(e =>
                    e.IsActive &&
                    e.Status == ContentStatus.Approved &&
                    e.StartDate >= DateTime.UtcNow.Date.AddDays(-1) &&
                    ((e.Destination != null && e.Destination.RegionId == region.Id) ||
                     (e.Destination == null &&
                      e.Locality != null &&
                      e.Locality.Destination != null &&
                      e.Locality.Destination.RegionId == region.Id)))
                .ToListAsync(cancellationToken);

            var objects = await _context.Objects
                .AsNoTracking()
                .Include(o => o.ObjectType)
                .Include(o => o.Images)
                .Include(o => o.Destination)
                .Include(o => o.Locality)
                .Where(o => o.IsActive && o.Status == ContentStatus.Approved && o.Destination.RegionId == region.Id)
                .ToListAsync(cancellationToken);

            var candidates = new List<ExploreCandidate>();

            foreach (var destination in destinations.Where(d => ShouldIncludeDestination(theme, d)))
            {
                candidates.Add(new ExploreCandidate
                {
                    Category = "destination",
                    Result = new SmartSearchResultDto
                    {
                        Id = destination.Id,
                        Name = destination.Name,
                        TypeName = destination.DestinationType?.Name ?? "Destination",
                        Location = region.Name,
                        Category = "destination",
                        MarkerType = "destination",
                        Icon = "place",
                        ImageUrl = GetMainImageUrl(destination.Images),
                        Latitude = destination.Geolocation?.Y,
                        Longitude = destination.Geolocation?.X,
                        MatchReason = ResolveDestinationReason(theme),
                        Score = Math.Round(ScoreDestination(destination, theme, destinationFavoriteCounts.GetValueOrDefault(destination.Id)), 2),
                    }
                });
            }

            foreach (var activity in activities.Where(a => ShouldIncludeActivity(theme, a)))
            {
                candidates.Add(new ExploreCandidate
                {
                    Category = "activity",
                    Result = new SmartSearchResultDto
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
                        MatchReason = ResolveActivityReason(theme),
                        Score = Math.Round(ScoreActivity(activity, theme, activityFavoriteCounts.GetValueOrDefault(activity.Id)), 2),
                    }
                });
            }

            foreach (var locality in localities.Where(l => ShouldIncludeLocality(theme, l)))
            {
                candidates.Add(new ExploreCandidate
                {
                    Category = "locality",
                    Result = new SmartSearchResultDto
                    {
                        Id = locality.Id,
                        Name = locality.Name,
                        TypeName = locality.LocalityType?.Name ?? "Lokalitet",
                        Location = ResolveLocalityLocation(locality),
                        Category = "locality",
                        MarkerType = "destination",
                        Icon = "place",
                        ImageUrl = GetMainImageUrl(locality.Images),
                        Latitude = locality.Geolocation?.Y,
                        Longitude = locality.Geolocation?.X,
                        MatchReason = ResolveLocalityReason(theme),
                        Score = Math.Round(ScoreLocality(locality, theme), 2),
                    }
                });
            }

            foreach (var evt in events.Where(e => ShouldIncludeEvent(theme, e)))
            {
                candidates.Add(new ExploreCandidate
                {
                    Category = "event",
                    Result = new SmartSearchResultDto
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
                        MatchReason = ResolveEventReason(theme),
                        Score = Math.Round(ScoreEvent(evt, theme, eventPlannerCounts.GetValueOrDefault(evt.Id)), 2),
                    }
                });
            }

            foreach (var obj in objects.Where(o => ShouldIncludeObject(theme, o)))
            {
                candidates.Add(new ExploreCandidate
                {
                    Category = "object",
                    Result = new SmartSearchResultDto
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
                        MatchReason = ResolveObjectReason(theme, obj),
                        Score = Math.Round(ScoreObject(obj, theme, objectFavoriteCounts.GetValueOrDefault(obj.Id)), 2),
                    }
                });
            }

            var ranked = SelectExploreResults(candidates, theme, pageSize);

            return new AiToolExecution
            {
                ToolName = ExploreRegionToolName,
                Theme = theme,
                RegionName = region.Name,
                RegionResolved = true,
                Results = ranked,
            };
        }

        private async Task<Region?> ResolveRegionAsync(int? regionId, string? regionName, string? originalMessage, CancellationToken cancellationToken)
        {
            var activeRegions = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .ToListAsync(cancellationToken);

            if (regionId is > 0)
            {
                var direct = activeRegions.FirstOrDefault(r => r.Id == regionId.Value);
                if (direct != null)
                {
                    return direct;
                }
            }

            var candidates = new List<string>();
            if (!string.IsNullOrWhiteSpace(regionName))
            {
                candidates.Add(regionName);
            }

            if (!string.IsNullOrWhiteSpace(originalMessage))
            {
                candidates.Add(originalMessage);
            }

            Region? bestRegion = null;
            var bestScore = 0;

            foreach (var candidate in candidates)
            {
                var normalizedCandidate = NormalizeText(candidate);
                var candidateTokens = SplitTokens(normalizedCandidate);

                foreach (var region in activeRegions)
                {
                    var score = ScoreRegionNameMatch(region, normalizedCandidate, candidateTokens);
                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestRegion = region;
                    }
                }
            }

            return bestScore >= 40 ? bestRegion : null;
        }

        private static int ScoreRegionNameMatch(Region region, string normalizedCandidate, List<string> candidateTokens)
        {
            if (string.IsNullOrWhiteSpace(normalizedCandidate))
            {
                return 0;
            }

            var normalizedName = NormalizeText(region.Name);
            var normalizedCode = NormalizeText(region.Code);
            var aliases = GetRegionAliases(normalizedName).ToList();

            if (normalizedCandidate == normalizedName || normalizedCandidate == normalizedCode)
            {
                return 120;
            }

            if (normalizedCandidate.Contains(normalizedName, StringComparison.Ordinal))
            {
                return 100;
            }

            if (aliases.Any(alias => normalizedCandidate.Contains(alias, StringComparison.Ordinal)))
            {
                return 95;
            }

            if (!string.IsNullOrWhiteSpace(normalizedCode) && candidateTokens.Contains(normalizedCode))
            {
                return 90;
            }

            var regionTokens = SplitTokens(normalizedName);
            if (regionTokens.Count == 0)
            {
                return 0;
            }

            var matchedTokens = 0;
            foreach (var regionToken in regionTokens)
            {
                if (candidateTokens.Any(candidateToken => SharesStem(candidateToken, regionToken)))
                {
                    matchedTokens++;
                }
            }

            if (matchedTokens == regionTokens.Count)
            {
                return 80;
            }

            if (matchedTokens > 0)
            {
                return matchedTokens * 20;
            }

            return 0;
        }

        private static IEnumerable<string> GetRegionAliases(string normalizedRegionName)
        {
            return normalizedRegionName switch
            {
                "crna gora" => ["montenegro", "crnoj gori", "crne gore", "cg"],
                "srbija" => ["serbia", "srbiji", "srbije", "rs"],
                "spanija" => ["spain", "spaniji", "spanije", "es"],
                "italija" => ["italy", "italiji", "italije", "it"],
                _ => [],
            };
        }

        private static bool SharesStem(string left, string right)
        {
            if (left.Length < 3 || right.Length < 3)
            {
                return left == right;
            }

            var stemLength = Math.Min(4, Math.Min(left.Length, right.Length));
            return string.Equals(left[..stemLength], right[..stemLength], StringComparison.Ordinal);
        }

        private static string NormalizeTheme(string? rawTheme)
        {
            var normalized = NormalizeText(rawTheme);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return "mixed";
            }

            if (normalized.Contains("food") || normalized.Contains("restoran") || normalized.Contains("restaurant") || normalized.Contains("ruc") || normalized.Contains("vecer") || normalized.Contains("hran"))
            {
                return "food";
            }

            if (normalized.Contains("uvece") || normalized.Contains("veceras") || normalized.Contains("night") ||
                normalized.Contains("izadj") || normalized.Contains("izlazak") || normalized.Contains("kafana") ||
                normalized.Contains("provod") || normalized.Contains("nocni") || normalized.Contains("club") ||
                normalized.Contains("cocktail") || normalized.Contains("zabava") ||
                // "bar" je validan signal SAMO ako se kombinuje sa kontekstom izlaska, inace je to ime grada
                (normalized.Contains("bar") && (normalized.Contains("uvece") || normalized.Contains("nocni") ||
                 normalized.Contains("izlaz") || normalized.Contains("provod") || normalized.Contains("druzenje"))))
            {
                return "nightlife";
            }

            if (normalized.Contains("family") || normalized.Contains("deca") || normalized.Contains("decom") || normalized.Contains("kids") || normalized.Contains("porod"))
            {
                return "family";
            }

            if (normalized.Contains("staza") || normalized.Contains("staze") ||
                normalized.Contains("planinar") || normalized.Contains("trekking") ||
                normalized.Contains("hiking") || normalized.Contains("uspon") ||
                normalized.Contains("nije strma") || normalized.Contains("nisu strme") ||
                normalized.Contains("blaga") || normalized.Contains("laka staza"))
            {
                // Planinarenje i staze -> tema "walk" sa naglaskom na aktivnosti
                return "walk";
            }

            if (normalized.Contains("walk") || normalized.Contains("set") || normalized.Contains("trail") || normalized.Contains("hike") || normalized.Contains("park") || normalized.Contains("prirod"))
            {
                return "walk";
            }

            if (normalized.Contains("event") || normalized.Contains("dogadj") || normalized.Contains("festival") || normalized.Contains("koncert") || normalized.Contains("concert"))
            {
                return "events";
            }

            if (normalized.Contains("zanim") || normalized.Contains("vid") || normalized.Contains("obid") || normalized.Contains("sight") || normalized.Contains("landmark"))
            {
                return "sightseeing";
            }

            return "mixed";
        }

        private static bool ShouldIncludeDestination(string theme, Destination destination)
        {
            if (theme == "food" || theme == "nightlife")
            {
                return false;
            }

            return destination.IsActive;
        }

        private static bool ShouldIncludeLocality(string theme, Locality locality)
        {
            if (theme == "food")
            {
                return locality.Objects.Any(IsFoodObjectCandidate);
            }

            if (theme == "nightlife")
            {
                return locality.Events.Count > 0 || locality.Objects.Any(IsNightlifeObjectCandidate);
            }

            if (theme == "events")
            {
                return locality.Events.Count > 0;
            }

            if (theme == "family")
            {
                return locality.Activities.Count > 0 || locality.Objects.Any(IsFamilyFriendlyObjectCandidate);
            }

            if (theme == "walk")
            {
                return locality.Activities.Count > 0 || ContainsThemeToken($"{locality.Name} {locality.Description} {locality.LocalityType?.Name}", "walk");
            }

            return true;
        }

        private static bool ShouldIncludeActivity(string theme, Activity activity)
        {
            if (theme == "food")
            {
                return ContainsThemeToken($"{activity.Name} {activity.Description} {activity.ActivityType?.Name}", "food");
            }

            if (theme == "nightlife")
            {
                return ContainsThemeToken($"{activity.Name} {activity.Description} {activity.ActivityType?.Name}", "nightlife");
            }

            if (theme == "events")
            {
                return false;
            }

            return true;
        }

        private static bool ShouldIncludeEvent(string theme, Event evt)
        {
            if (theme == "walk")
            {
                return ContainsThemeToken($"{evt.Name} {evt.Description} {evt.EventType?.Name}", "walk");
            }

            if (theme == "food")
            {
                return ContainsThemeToken($"{evt.Name} {evt.Description} {evt.EventType?.Name}", "food");
            }

            if (theme == "nightlife")
            {
                return true;
            }

            return true;
        }

        private static bool ShouldIncludeObject(string theme, TouristObject obj)
        {
            return theme switch
            {
                "food" => IsFoodObjectType(obj.ObjectType?.Name),
                "nightlife" => IsNightlifeObjectType(obj.ObjectType?.Name),
                "sightseeing" => IsSightseeingObjectType(obj.ObjectType?.Name),
                "walk" => IsSightseeingObjectType(obj.ObjectType?.Name) || IsOutdoorObject(obj),
                "family" => IsFamilyFriendlyObject(obj) || IsSightseeingObjectType(obj.ObjectType?.Name),
                "events" => false,
                _ => IsSightseeingObjectType(obj.ObjectType?.Name) || IsFoodObjectType(obj.ObjectType?.Name) || IsStayObjectType(obj.ObjectType?.Name),
            };
        }

        private static double ScoreDestination(Destination destination, string theme, int favoriteCount)
        {
            var score = 58d;
            score += favoriteCount * 4d;
            score += destination.Objects.Count * 1.5d;
            score += destination.Activities.Count * 2d;
            score += destination.Events.Count * 1.5d;

            if (destination.Images.Any())
            {
                score += 4d;
            }

            if (theme is "sightseeing" or "walk" or "family" or "mixed")
            {
                score += 10d;
            }

            return score;
        }

        private static double ScoreLocality(Locality locality, string theme)
        {
            var score = 50d;
            score += locality.Objects.Count * 2d;
            score += locality.Activities.Count * 2.5d;
            score += locality.Events.Count * 2d;

            if (locality.Images.Any())
            {
                score += 4d;
            }

            if (theme is "walk" or "family" or "sightseeing" or "mixed")
            {
                score += 10d;
            }

            if (theme == "food" && locality.Objects.Any(IsFoodObjectCandidate))
            {
                score += 8d;
            }

            if (theme == "nightlife" && locality.Objects.Any(IsNightlifeObjectCandidate))
            {
                score += 14d;
            }

            return score;
        }

        private static double ScoreLocalitySearch(Locality locality, string normalizedQuery, List<string> tokens)
        {
            var score = 0d;
            var name = NormalizeText(locality.Name);
            var description = NormalizeText(locality.Description);
            var type = NormalizeText(locality.LocalityType?.Name);
            var destination = NormalizeText(locality.Destination?.Name);
            var region = NormalizeText(locality.Destination?.Region?.Name);

            if (name.Contains(normalizedQuery, StringComparison.Ordinal))
            {
                score += 80d;
            }

            if (description.Contains(normalizedQuery, StringComparison.Ordinal))
            {
                score += 40d;
            }

            if (destination.Contains(normalizedQuery, StringComparison.Ordinal) || region.Contains(normalizedQuery, StringComparison.Ordinal))
            {
                score += 35d;
            }

            foreach (var token in tokens)
            {
                if (name.Contains(token, StringComparison.Ordinal))
                {
                    score += 20d;
                }

                if (type.Contains(token, StringComparison.Ordinal))
                {
                    score += 12d;
                }

                if (description.Contains(token, StringComparison.Ordinal))
                {
                    score += 8d;
                }

                if (destination.Contains(token, StringComparison.Ordinal) || region.Contains(token, StringComparison.Ordinal))
                {
                    score += 6d;
                }
            }

            return score;
        }

        private static double ScoreActivity(Activity activity, string theme, int favoriteCount)
        {
            var combined = NormalizeText($"{activity.Name} {activity.Description} {activity.ActivityType?.Name}");
            var score = 52d + favoriteCount * 5d;

            if (activity.Images.Any())
            {
                score += 4d;
            }

            if (theme == "walk" && ContainsThemeToken(combined, "walk"))
            {
                score += 22d;
            }

            if (theme == "family")
            {
                score += 14d;
                if (activity.DurationMinutes is >= 30 and <= 180)
                {
                    score += 4d;
                }
            }

            if (theme == "nightlife" && ContainsThemeToken(combined, "nightlife"))
            {
                score += 14d;
            }

            if (theme == "sightseeing")
            {
                score += 12d;
            }

            if (theme == "food" && ContainsThemeToken(combined, "food"))
            {
                score += 18d;
            }

            return score;
        }

        private static double ScoreEvent(Event evt, string theme, int plannerCount)
        {
            var combined = NormalizeText($"{evt.Name} {evt.Description} {evt.EventType?.Name}");
            var score = 45d + plannerCount * 4d;

            if (evt.Images.Any())
            {
                score += 4d;
            }

            var daysUntil = (evt.StartDate.Date - DateTime.UtcNow.Date).TotalDays;
            if (daysUntil is >= 0 and <= 14)
            {
                score += 10d;
            }
            else if (daysUntil is > 14 and <= 60)
            {
                score += 4d;
            }

            if (theme == "events")
            {
                score += 24d;
            }

            if (theme == "nightlife")
            {
                score += 18d;
            }

            if (theme == "food" && ContainsThemeToken(combined, "food"))
            {
                score += 14d;
            }

            if (theme == "walk" && ContainsThemeToken(combined, "walk"))
            {
                score += 10d;
            }

            return score;
        }

        private static double ScoreObject(TouristObject obj, string theme, int favoriteCount)
        {
            var score = (double)obj.AverageRating * 8d;
            score += Math.Log(obj.ReviewCount + 1, 2) * 6d;
            score += favoriteCount * 4d;

            if (obj.Images.Any())
            {
                score += 4d;
            }

            if (theme == "food" && IsFoodObjectType(obj.ObjectType?.Name))
            {
                score += 18d;
            }

            if (theme == "family" && IsFamilyFriendlyObject(obj))
            {
                score += 14d;
            }

            if (theme == "walk" && IsOutdoorObject(obj))
            {
                score += 10d;
            }

            if (theme == "sightseeing" && IsSightseeingObjectType(obj.ObjectType?.Name))
            {
                score += 16d;
            }

            if (theme == "mixed" && (IsSightseeingObjectType(obj.ObjectType?.Name) || IsFoodObjectType(obj.ObjectType?.Name)))
            {
                score += 8d;
            }

            if (theme == "nightlife" && IsNightlifeObjectType(obj.ObjectType?.Name))
            {
                score += 18d;
            }

            return score;
        }

        private static List<SmartSearchResultDto> SelectExploreResults(List<ExploreCandidate> candidates, string theme, int pageSize)
        {
            if (candidates.Count == 0)
            {
                return [];
            }

            var ordered = candidates
                .OrderByDescending(x => x.Result.Score)
                .ThenBy(x => x.Result.Name)
                .ToList();

            var selected = new List<ExploreCandidate>();
            var quotas = theme switch
            {
                "events" => new Dictionary<string, int>
                {
                    ["event"] = 3,
                    ["destination"] = 2,
                    ["activity"] = 1,
                },
                "food" => new Dictionary<string, int>
                {
                    ["object"] = 4,
                    ["destination"] = 1,
                    ["activity"] = 1,
                },
                "nightlife" => new Dictionary<string, int>
                {
                    ["object"] = 3,
                    ["event"] = 2,
                    ["locality"] = 1,
                },
                "family" => new Dictionary<string, int>
                {
                    ["destination"] = 2,
                    ["locality"] = 1,
                    ["activity"] = 2,
                    ["object"] = 2,
                },
                _ => new Dictionary<string, int>
                {
                    ["destination"] = 2,
                    ["locality"] = 1,
                    ["activity"] = 2,
                    ["event"] = 1,
                    ["object"] = 1,
                }
            };

            foreach (var quota in quotas)
            {
                selected.AddRange(ordered.Where(x => x.Category == quota.Key).Take(quota.Value));
            }

            foreach (var candidate in ordered)
            {
                if (selected.Count >= pageSize)
                {
                    break;
                }

                if (selected.Any(x => x.Category == candidate.Category && x.Result.Id == candidate.Result.Id))
                {
                    continue;
                }

                selected.Add(candidate);
            }

            return selected
                .DistinctBy(x => $"{x.Category}:{x.Result.Id}")
                .OrderByDescending(x => x.Result.Score)
                .ThenBy(x => x.Result.Name)
                .Take(pageSize)
                .Select(x => x.Result)
                .ToList();
        }

        private static bool ContainsThemeToken(string? value, string theme)
        {
            var normalized = NormalizeText(value);
            return theme switch
            {
                "food" => normalized.Contains("restoran") || normalized.Contains("restaurant") || normalized.Contains("food") || normalized.Contains("vino") || normalized.Contains("wine") || normalized.Contains("tapas") || normalized.Contains("dinner") || normalized.Contains("lunch") || normalized.Contains("cafe") || normalized.Contains("kafic"),
                "walk" => normalized.Contains("walk") || normalized.Contains("set") || normalized.Contains("trail") || normalized.Contains("park") || normalized.Contains("prirod") || normalized.Contains("bike") || normalized.Contains("boat"),
                "nightlife" => normalized.Contains("night") || normalized.Contains("bar") || normalized.Contains("kafana") || normalized.Contains("music") || normalized.Contains("party") || normalized.Contains("cocktail") || normalized.Contains("wine") || normalized.Contains("jazz") || normalized.Contains("sunset"),
                _ => false,
            };
        }

        private static bool IsFoodObjectType(string? typeName)
        {
            var normalized = NormalizeText(typeName);
            return normalized.Contains("restoran") ||
                   normalized.Contains("restaurant") ||
                   normalized.Contains("bar") ||
                   normalized.Contains("kafana") ||
                   normalized.Contains("kafic") ||
                   normalized.Contains("bistro") ||
                   normalized.Contains("cafe");
        }

        private static bool IsFoodObjectCandidate(TouristObject obj)
        {
            return IsFoodObjectType(obj.ObjectType?.Name);
        }

        private static bool IsNightlifeObjectType(string? typeName)
        {
            var normalized = NormalizeText(typeName);
            return normalized.Contains("bar") ||
                   normalized.Contains("kafana") ||
                   normalized.Contains("kafic") ||
                   normalized.Contains("restaurant") ||
                   normalized.Contains("restoran") ||
                   normalized.Contains("wine");
        }

        private static bool IsNightlifeObjectCandidate(TouristObject obj)
        {
            return IsNightlifeObjectType(obj.ObjectType?.Name);
        }

        private static bool IsStayObjectType(string? typeName)
        {
            var normalized = NormalizeText(typeName);
            return normalized.Contains("hotel") ||
                   normalized.Contains("apartman") ||
                   normalized.Contains("apartment") ||
                   normalized.Contains("resort") ||
                   normalized.Contains("suite") ||
                   normalized.Contains("pansion");
        }

        private static bool IsSightseeingObjectType(string? typeName)
        {
            var normalized = NormalizeText(typeName);
            return normalized.Contains("muzej") ||
                   normalized.Contains("museum") ||
                   normalized.Contains("galer") ||
                   normalized.Contains("park") ||
                   normalized.Contains("plaza") ||
                   normalized.Contains("beach") ||
                   normalized.Contains("tvrdj") ||
                   normalized.Contains("fort") ||
                   normalized.Contains("view") ||
                   normalized.Contains("crkva") ||
                   normalized.Contains("church");
        }

        private static bool IsFamilyFriendlyObject(TouristObject obj)
        {
            var combined = NormalizeText($"{obj.ObjectType?.Name} {obj.CuisineType} {obj.Description} {(obj.Amenities == null ? string.Empty : string.Join(' ', obj.Amenities))}");
            return combined.Contains("family") ||
                   combined.Contains("porod") ||
                   combined.Contains("kids") ||
                   combined.Contains("deca") ||
                   combined.Contains("parking") ||
                   combined.Contains("garden") ||
                   combined.Contains("basta") ||
                   combined.Contains("playground") ||
                   combined.Contains("igral");
        }

        private static bool IsFamilyFriendlyObjectCandidate(TouristObject obj)
        {
            return IsFamilyFriendlyObject(obj);
        }

        private static bool IsOutdoorObject(TouristObject obj)
        {
            var combined = NormalizeText($"{obj.ObjectType?.Name} {obj.Description} {(obj.Amenities == null ? string.Empty : string.Join(' ', obj.Amenities))}");
            return combined.Contains("terrace") ||
                   combined.Contains("terasa") ||
                   combined.Contains("garden") ||
                   combined.Contains("basta") ||
                   combined.Contains("view") ||
                   combined.Contains("plaza") ||
                   combined.Contains("beach");
        }

        private static string ResolveDestinationReason(string theme)
        {
            return theme switch
            {
                "walk" => "Dobar izbor za lagano istrazivanje regiona",
                "family" => "Zanimljivo za porodicni obilazak",
                "events" => "Vredi pogledati kao bazu za dogadjaje",
                "nightlife" => "Vredi pogledati za vecernji izlazak",
                _ => "Jedno od zanimljivijih mesta u regionu",
            };
        }

        private static string ResolveLocalityReason(string theme)
        {
            return theme switch
            {
                "walk" => "Lep deo regiona za setnju i obilazak",
                "family" => "Prijatan lokalitet za porodicni plan",
                "food" => "Dobar kraj ako trazis hranu i mesta za predah",
                "nightlife" => "Dobar kraj ako trazis vecernji izlazak",
                "events" => "Lokalitet koji ima zanimljiva desavanja ili sadrzaje",
                _ => "Jedan od zanimljivijih lokaliteta u regionu",
            };
        }

        private static string ResolveActivityReason(string theme)
        {
            return theme switch
            {
                "walk" => "Dobra opcija za setnju ili laganu aktivnost",
                "family" => "Prikladno za laganiji porodicni plan",
                "food" => "Aktivnost koja lepo dopunjuje gastro plan",
                "nightlife" => "Moze lepo da dopuni vecernji plan",
                _ => "Zanimljiva aktivnost u regionu",
            };
        }

        private static string ResolveLocalityLocation(Locality locality)
        {
            return locality.Destination?.Name
                ?? locality.Destination?.Region?.Name
                ?? locality.LocalityType?.Name
                ?? string.Empty;
        }

        private static string ResolveEventReason(string theme)
        {
            return theme switch
            {
                "events" => "Aktuelan dogadjaj u regionu",
                "food" => "Dogadjaj koji se uklapa u gastro plan",
                "nightlife" => "Dobar izbor za vecernji izlazak",
                _ => "Vredi ispratiti ako si u tom periodu u regionu",
            };
        }

        private static string ResolveObjectReason(string theme, TouristObject obj)
        {
            if (theme == "food" && IsFoodObjectType(obj.ObjectType?.Name))
            {
                return "Jedna od boljih gastro opcija";
            }

            if (theme == "nightlife" && IsNightlifeObjectType(obj.ObjectType?.Name))
            {
                return "Dobra opcija za vecernji izlazak";
            }

            if (theme == "family" && IsFamilyFriendlyObject(obj))
            {
                return "Deluje prijatno za porodicni obilazak";
            }

            if (theme == "sightseeing" && IsSightseeingObjectType(obj.ObjectType?.Name))
            {
                return "Spada medju zanimljivija mesta za obilazak";
            }

            return "Vredi pogledati u tom delu regiona";
        }

        private static string BuildHumanAnswer(AiChatRequestDto request, AiToolExecution execution)
        {
            if (execution.Results.Count == 0)
            {
                return BuildNoMatchAnswer(request, execution);
            }

            var top = execution.Results.Take(3).ToList();

            if (execution.ToolName == ExploreRegionToolName)
            {
                var intro = execution.Theme switch
                {
                    "walk" when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako hoces prijatnu setnju ili lagano istrazivanje u {execution.RegionName}, pogledaj",
                    "food" when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako trazis dobar gastro plan u {execution.RegionName}, izdvojila bih",
                    "nightlife" when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako trazis gde da izadjes uvece u {execution.RegionName}, pogledaj",
                    "family" when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako planiras nesto zanimljivo za porodicni obilazak u {execution.RegionName}, pogledaj",
                    "events" when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako te zanimaju aktuelna mesta i desavanja u {execution.RegionName}, izdvojila bih",
                    _ when !string.IsNullOrWhiteSpace(execution.RegionName) => $"Ako trazis sta je zanimljivo u {execution.RegionName}, vredi da pogledas",
                    _ => "Izdvojila bih",
                };

                return $"{intro} {FormatRecommendationList(top)}.";
            }

            if (top.Count == 1)
            {
                var first = top[0];
                return $"Za pitanje \"{request.Message}\" trenutno najvise smisla ima {first.Name} ({first.TypeName}) u {first.Location}. Deluje kao najbolji pogodak u dostupnim podacima.";
            }

            return $"Za pitanje \"{request.Message}\" najpre bih pogledala {FormatRecommendationList(top)}. To su trenutno najrelevantniji rezultati koje imamo u aplikaciji.";
        }

        private static string FormatRecommendationList(List<SmartSearchResultDto> results)
        {
            var formatted = results
                .Select(result => $"{result.Name} ({result.TypeName}) u {result.Location}")
                .ToList();

            return formatted.Count switch
            {
                0 => string.Empty,
                1 => formatted[0],
                2 => $"{formatted[0]} i {formatted[1]}",
                _ => $"{formatted[0]}, {formatted[1]} i {formatted[2]}",
            };
        }

        private static AiChatResponseDto BuildFallbackResponse(
            List<SmartSearchResultDto> results,
            AiChatRequestDto request,
            bool usedTool,
            string warning)
        {
            var execution = new AiToolExecution
            {
                ToolName = SearchPlacesToolName,
                Theme = NormalizeTheme(request.Message),
                Results = results,
            };

            return new AiChatResponseDto
            {
                Answer = results.Count > 0
                    ? BuildHumanAnswer(request, execution)
                    : BuildNoMatchAnswer(request, execution),
                Provider = "fallback",
                UsedTool = usedTool,
                UsedFallback = true,
                Warning = warning,
                Results = results,
            };
        }

        private static string BuildNoMatchAnswer(AiChatRequestDto request, AiToolExecution execution)
        {
            if (!string.IsNullOrWhiteSpace(execution.RegionName))
            {
                return $"Trenutno nemam dovoljno dobrih poklapanja za pitanje \"{request.Message}\" u regionu {execution.RegionName}. Probaj konkretnije, na primer restoran, setnju, dogadjaj ili neki odredjeni grad.";
            }

            return $"Trenutno nemam dovoljno precizno poklapanje za pitanje \"{request.Message}\" u dostupnim podacima. Probaj da navedes region, tip mesta ili neku konkretnu pogodnost koja ti je bitna.";
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

        private static string BuildOllamaFallbackWarning(Exception? ex)
        {
            var message = ex?.Message ?? string.Empty;

            if (message.Contains("requires more system memory", StringComparison.OrdinalIgnoreCase))
            {
                return "Lokalni AI model nema dovoljno slobodne memorije. Zatvori teze programe ili koristi manji Ollama model. Prikazan je fallback odgovor zasnovan na pretrazi.";
            }

            if (message.Contains("no configured ollama model", StringComparison.OrdinalIgnoreCase) ||
                ((message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                  message.Contains("pull", StringComparison.OrdinalIgnoreCase)) &&
                 message.Contains("model", StringComparison.OrdinalIgnoreCase)))
            {
                return "Nijedan od podesenih Ollama modela nije instaliran lokalno. Prikazan je fallback odgovor zasnovan na pretrazi.";
            }

            return "Lokalni AI model trenutno nije dostupan. Prikazan je fallback odgovor zasnovan na pretrazi.";
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

            var cleaned = new string(builder
                .ToString()
                .Select(ch => char.IsLetterOrDigit(ch) || char.IsWhiteSpace(ch) ? ch : ' ')
                .ToArray());

            return string.Join(' ', cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }

        private static List<string> SplitTokens(string normalizedText)
        {
            return normalizedText
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Distinct()
                .ToList();
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

            if (normalized.Contains("kafana") || normalized.Contains("bar") || normalized.Contains("kafic"))
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

        private sealed class SearchPlacesToolArguments
        {
            public string Query { get; set; } = string.Empty;
            public int? PageSize { get; set; }
            public int? RegionId { get; set; }
            public double? Latitude { get; set; }
            public double? Longitude { get; set; }
            public string? Mode { get; set; }
        }

        private sealed class ExploreRegionToolArguments
        {
            public string? RegionName { get; set; }
            public int? RegionId { get; set; }
            public string? Theme { get; set; }
            public int? PageSize { get; set; }
        }

        private sealed class AiToolPlan
        {
            public string Tool { get; set; } = string.Empty;
            public string? Query { get; set; }
            public string? RegionName { get; set; }
            public string? Theme { get; set; }
            public int? PageSize { get; set; }
        }

        private sealed class AiToolSelection
        {
            public string ToolName { get; set; } = SearchPlacesToolName;
            public SearchPlacesToolArguments? SearchArguments { get; set; }
            public ExploreRegionToolArguments? ExploreArguments { get; set; }
        }

        private sealed class AiToolExecution
        {
            public string ToolName { get; set; } = SearchPlacesToolName;
            public string Theme { get; set; } = "mixed";
            public string? RegionName { get; set; }
            public bool RegionResolved { get; set; }
            public List<SmartSearchResultDto> Results { get; set; } = [];
        }

        private sealed class ExploreCandidate
        {
            public string Category { get; set; } = string.Empty;
            public SmartSearchResultDto Result { get; set; } = new();
        }

        private sealed class OllamaChatRequest
        {
            public string Model { get; set; } = string.Empty;
            public bool Stream { get; set; }
            public string? Format { get; set; }
            public List<OllamaMessage> Messages { get; set; } = [];
            public List<OllamaToolDefinition> Tools { get; set; } = [];
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

            [JsonPropertyName("tool_name")]
            public string? ToolName { get; set; }

            [JsonPropertyName("tool_calls")]
            public List<OllamaToolCall> ToolCalls { get; set; } = [];
        }

        private sealed class OllamaToolDefinition
        {
            public string Type { get; set; } = "function";
            public OllamaToolSchema Function { get; set; } = new();
        }

        private sealed class OllamaToolSchema
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public OllamaToolParameters Parameters { get; set; } = new();
        }

        private sealed class OllamaToolParameters
        {
            public string Type { get; set; } = "object";
            public string[] Required { get; set; } = [];
            public Dictionary<string, OllamaToolProperty> Properties { get; set; } = [];
        }

        private sealed class OllamaToolProperty
        {
            public string Type { get; set; } = "string";
            public string Description { get; set; } = string.Empty;
        }

        private sealed class OllamaToolCall
        {
            public string Type { get; set; } = "function";
            public OllamaToolFunctionCall? Function { get; set; }
        }

        private sealed class OllamaToolFunctionCall
        {
            public int? Index { get; set; }
            public string Name { get; set; } = string.Empty;
            public JsonElement Arguments { get; set; }
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
                    Temperature = 0.1,
                    TopP = 0.9,
                    NumPredict = 180,
                };
            }
        }
    }
}
