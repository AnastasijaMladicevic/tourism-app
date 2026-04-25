using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using System.Text;
using System.Text.RegularExpressions;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class SmartSearchService : ISmartSearchService
    {
        private static readonly string[] NearbyHints = ["blizu", "blizini", "near", "nearby", "close", "oko mene", "u blizini", "near me", "nije daleko", "ne daleko", "nedaleko", "blizu mene"];
        private static readonly string[] CheapHints = ["jeftin", "cheap", "budget", "povoljno", "affordable"];
        private static readonly string[] FreeHints = ["free", "besplatno", "without ticket", "bez karte"];
        private static readonly string[] PremiumHints = ["luxury", "luksuz", "premium", "romantic", "exclusive"];
        private static readonly string[] TopRatedHints = ["best", "najbolje", "top", "popular", "preporuci", "preporuka", "recommended"];
        private static readonly string[] FamilyHints = ["deca", "decom", "decu", "dete", "kids", "kid", "children", "child", "family", "porodicno", "porodicni", "porodicna", "porodica", "porodican"];
        private static readonly string[] DinnerHints = ["vecera", "veceru", "dinner", "supper", "dine", "izadjem", "izaci", "izlazak"];
        private static readonly string[] PoolHints = ["bazen", "pool", "swimming"];
        private static readonly string[] EventHints = ["event", "dogadjaj", "događaj", "festival", "concert", "koncert", "party", "zur", "music"];
        private static readonly string[] DestinationHints = ["destination", "destinacija", "city", "grad", "island", "ostrvo", "beach", "plaza", "plaža", "mountain", "planina"];
        private static readonly string[] ObjectHints = ["hotel", "restoran", "restaurant", "kafic", "kafić", "bar", "kafana", "museum", "muzej", "spa", "apartment", "apartman"];
        private static readonly string[] FamilyFriendlyFeatureHints = ["kids", "family", "deca", "child", "children", "playground", "igraliste", "parking", "terasa", "terrace", "garden", "basta", "mirno", "quiet", "porodicno", "porodican", "porodicni"];
        private static readonly string[] HikingHints = ["staza", "staze", "hiking", "planinar", "setnja", "setnje", "setnju", "setalistem", "seta", "trail", "priroda", "park", "pecanje", "ribolov", "fishing", "bicikl", "outdoor", "sport", "pesacka", "pesacki", "peske", "pesacenje", "strma", "strme", "strmo", "lagana", "lagane", "lagano", "laka", "lake"];
        private static readonly string[] FoodTypeHints = ["kineska", "kineski", "japanese", "japanska", "italijanska", "italian", "grcka", "greek", "srpska", "balkan", "meksicka", "mexican"];
        private static readonly HashSet<string> SearchStopWords = ["gde", "mogu", "moze", "mozete", "da", "na", "sa", "u", "uz", "za", "od", "do", "i", "ili", "daleko", "daleka", "daleki", "udaljeno", "udaljena",
"izadjem", "izadjem", "izaci", "izaći","the", "a", "an", "to", "for", "with", "nisu", "nije", "je", "su", "koje", "koji", "koja", "nesto", "ima", "imaju", "blizu", "oko", "hteo", "bih", "zelim", "trazim", "imate", "mi", "me", "ne", "li", "bi", "manje", "vise", "bez", "dobro", "lepo", "kako", "sta", "kada", "zasto", 
            "neka", "neko", "neku", "one", "oni", "ona", "ovo", "ova", "ove", "ovaj", "ovde", "can", "in", "of", "on", "at", "by", "is", "are", "was", "be", "some", "any", "not", "mnogo", "jako", "previse", "malo", "malom", "mala", "male", "mali", "malu", "maloj", "nikakve", "nikako", "tacno", "bas", "mozda", "uvek", 
            "nikad", "skupa", "skupo", "skup", "skupu", "skupoj", "skupim", "hrana", "hranu", "hrane"];

        private readonly AppDbContext _context;
        private readonly ILogger<SmartSearchService> _logger;
        public SmartSearchService(
        AppDbContext _context,
        ILogger<SmartSearchService> logger)
        {
            this._context = _context;
            _logger = logger;
        }

        public async Task<List<SmartSearchResultDto>> SearchAsync(int? userId, SmartSearchQueryDto query)
        {
            var normalizedQuery = NormalizeText(query.Query);

            if (string.IsNullOrWhiteSpace(normalizedQuery) || normalizedQuery.Length < 2)
            {
                return [];
            }

            var searchMode = NormalizeText(query.Mode);
            var strictMode = searchMode == "strict" || searchMode == "map";
            var pageSize = Math.Clamp(query.PageSize <= 0 ? 8 : query.PageSize, 1, 50);

            var context = await BuildContextAsync(userId, query, normalizedQuery);
            var intent = BuildIntent(normalizedQuery, context.EffectiveRegionId);

            var destinationQuery = _context.Destinations
                .AsNoTracking()
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .Where(d => d.IsActive && d.Status == ContentStatus.Approved)
                .AsQueryable();

            var objectQuery = _context.Objects
                .AsNoTracking()
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Where(o =>
                    o.IsActive &&
                    o.Status == ContentStatus.Approved)
                .AsQueryable();

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

            if (context.EffectiveRegionId.HasValue)
            {
                var regionId = context.EffectiveRegionId.Value;

                destinationQuery = destinationQuery.Where(d => d.RegionId == regionId);

                objectQuery = objectQuery.Where(o =>
                    o.Destination.RegionId == regionId ||
                    (o.Locality != null &&
                     o.Locality.Destination != null &&
                     o.Locality.Destination.RegionId == regionId));

                eventQuery = eventQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == regionId) ||
                    (e.Destination == null &&
                     e.Locality != null &&
                     e.Locality.Destination != null &&
                     e.Locality.Destination.RegionId == regionId));
            }

            var destinations = await destinationQuery.ToListAsync();
            var objects = await objectQuery.ToListAsync();
            var events = await eventQuery.ToListAsync();

            _logger.LogWarning(
                "SERVICE DEBUG: Query='{Query}' Mode='{Mode}' Normalized='{Normalized}' Tokens='{Tokens}'",
                query.Query,
                query.Mode,
                normalizedQuery,
                string.Join(", ", intent.Tokens)
            );

            _logger.LogWarning(
                "SERVICE DEBUG: Loaded counts destinations={Destinations}, objects={Objects}, events={Events}",
                destinations.Count,
                objects.Count,
                events.Count
            );

            var destinationFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.DestinationId.HasValue)
                .GroupBy(f => f.DestinationId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var objectFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.ObjectId.HasValue)
                .GroupBy(f => f.ObjectId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var eventPlannerCounts = await _context.EventPlannerItems.AsNoTracking()
                .GroupBy(x => x.EventId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var results = new List<SmartSearchCandidate>();

            foreach (var destination in destinations)
            {
                if (strictMode && !MatchesStrictDestination(destination, intent))
                {
                    continue;
                }

                var score = ScoreDestination(
                    destination,
                    intent,
                    context,
                    destinationFavoriteCounts.GetValueOrDefault(destination.Id),
                    out var reason
                );

                if (strictMode && score <= 0)
                {
                    continue;
                }

                results.Add(new SmartSearchCandidate
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
                    Score = score,
                    MatchReason = reason,
                });
            }

            foreach (var obj in objects)
            {
                if (strictMode && !MatchesStrictObject(obj, intent))
                {
                    continue;
                }

                var score = ScoreObject(
                    obj,
                    intent,
                    context,
                    objectFavoriteCounts.GetValueOrDefault(obj.Id),
                    out var reason
                );

                if (strictMode && score <= 0)
                {
                    continue;
                }

                results.Add(new SmartSearchCandidate
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
                    Score = score,
                    MatchReason = reason,
                });
            }

            foreach (var evt in events)
            {
                if (strictMode && !MatchesStrictEvent(evt, intent))
                {
                    continue;
                }

                var score = ScoreEvent(
                    evt,
                    intent,
                    context,
                    eventPlannerCounts.GetValueOrDefault(evt.Id),
                    out var reason
                );

                if (strictMode && score <= 0)
                {
                    continue;
                }

                results.Add(new SmartSearchCandidate
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
                    Score = score,
                    MatchReason = reason,
                });
            }

            var rankedResults = results
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Name)
                .Take(pageSize)
                .Select(x => new SmartSearchResultDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    TypeName = x.TypeName,
                    Location = x.Location,
                    Category = x.Category,
                    MarkerType = x.MarkerType,
                    Icon = x.Icon,
                    ImageUrl = x.ImageUrl,
                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    MatchReason = x.MatchReason,
                    Score = Math.Round(x.Score, 2),
                })
                .ToList();

            if (rankedResults.Count > 0)
            {
                return rankedResults;
            }

            return strictMode
                ? await BuildStrictObjectFallbackAsync(context, intent, pageSize)
                : await BuildMcpObjectFallbackAsync(context, intent, pageSize);
        }

        private async Task<SearchContext> BuildContextAsync(int? userId, SmartSearchQueryDto query, string normalizedQuery)
        {
            var context = new SearchContext
            {
                EffectiveRegionId = query.RegionId,
            };

            User? user = null;
            if (userId.HasValue)
            {
                user = await _context.Users
                    .AsNoTracking()
                    .Include(u => u.PreferredRegion)
                    .FirstOrDefaultAsync(u => u.Id == userId.Value);
            }

            var regions = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .ToListAsync();

            var explicitRegion = ResolveRegionIdFromQuery(normalizedQuery, regions);
            context.EffectiveRegionId = explicitRegion ?? context.EffectiveRegionId ?? user?.PreferredRegionId;

            if (query.Latitude.HasValue && query.Longitude.HasValue)
            {
                context.Origin = new GeoPoint(query.Latitude.Value, query.Longitude.Value);
            }
            else if (user?.LastKnownLocation != null)
            {
                context.Origin = new GeoPoint(user.LastKnownLocation.Y, user.LastKnownLocation.X);
            }
            else if (context.EffectiveRegionId.HasValue)
            {
                var region = regions.FirstOrDefault(r => r.Id == context.EffectiveRegionId.Value);
                if (region?.CenterLatitude != null && region.CenterLongitude != null)
                {
                    context.Origin = new GeoPoint(region.CenterLatitude.Value, region.CenterLongitude.Value);
                }
            }

            if (!userId.HasValue)
            {
                return context;
            }

            var favoriteObjects = await _context.Favorites
                .AsNoTracking()
                .Include(f => f.Object)
                .Where(f => f.UserId == userId.Value && f.ObjectId.HasValue && f.Object != null)
                .Select(f => f.Object!)
                .ToListAsync();

            foreach (var obj in favoriteObjects)
            {
                context.FavoriteObjectTypeWeights[obj.ObjectTypeId] =
                    context.FavoriteObjectTypeWeights.GetValueOrDefault(obj.ObjectTypeId) + 1;
            }

            var reviews = await _context.Reviews
                .AsNoTracking()
                .Include(r => r.Object)
                    .ThenInclude(o => o.ObjectType)
                .Where(r => r.UserId == userId.Value && r.Status == ContentStatus.Approved && r.Object != null)
                .ToListAsync();

            context.ObjectTypeAverageRatings = reviews
                .Where(r => r.Object != null)
                .GroupBy(r => r.Object!.ObjectTypeId)
                .ToDictionary(g => g.Key, g => g.Average(r => (double)r.Rating));

            return context;
        }

        private static SearchIntent BuildIntent(string normalizedQuery, int? effectiveRegionId)
        {
            var intent = new SearchIntent
            {
                NormalizedQuery = normalizedQuery,
                Tokens = SplitTokens(normalizedQuery),
                WantsNearby = ContainsAny(normalizedQuery, NearbyHints),
                WantsCheap = ContainsAny(normalizedQuery, CheapHints),
                WantsFree = ContainsAny(normalizedQuery, FreeHints),
                WantsPremium = ContainsAny(normalizedQuery, PremiumHints),
                WantsTopRated = ContainsAny(normalizedQuery, TopRatedHints),
                WantsFamilyFriendly = ContainsAny(normalizedQuery, FamilyHints),
                WantsDinner = ContainsAny(normalizedQuery, DinnerHints),
                WantsPool = ContainsAny(normalizedQuery, PoolHints),
                EventFocused = ContainsAny(normalizedQuery, EventHints),
                DestinationFocused = ContainsAny(normalizedQuery, DestinationHints),
                ObjectFocused = ContainsAny(normalizedQuery, ObjectHints),
                EffectiveRegionId = effectiveRegionId,
            };

            intent.WantsOutdoor = ContainsAny(normalizedQuery, HikingHints);
            intent.FoodTypeFocused = ContainsAny(normalizedQuery, FoodTypeHints);

            // Negation cheap: "nije skupa/skupo/skup" -> treat as cheap intent
            if (!intent.WantsCheap)
            {
                var negationCheapPatterns = new[] { "nije skup", "nisu skup", "ne skup", "ne mora biti skup", "nije preskup", "nije skupo", "nije skupа" };
                if (negationCheapPatterns.Any(normalizedQuery.Contains))
                {
                    intent.WantsCheap = true;
                }
            }
            if (!intent.WantsCheap &&
                (Regex.IsMatch(normalizedQuery, @"\bnije\b.*\bskup\w*\b") ||
                 Regex.IsMatch(normalizedQuery, @"\bne\b.*\bskup\w*\b")))
            {
                intent.WantsCheap = true;
            }

            intent.TodayPreferred = normalizedQuery.Contains("today") || normalizedQuery.Contains("danas");
            intent.TonightPreferred = normalizedQuery.Contains("tonight") || normalizedQuery.Contains("veceras") || normalizedQuery.Contains("večeras");
            intent.TomorrowPreferred = normalizedQuery.Contains("tomorrow") || normalizedQuery.Contains("sutra");
            intent.WeekendPreferred = normalizedQuery.Contains("weekend") || normalizedQuery.Contains("vikend");

            return intent;
        }

        private static bool MatchesStrictDestination(Destination destination, SearchIntent intent)
        {
            var fields = new[]
            {
                NormalizeText(destination.Name),
                NormalizeText(destination.DisplayTitle),
                NormalizeText(destination.Description),
                NormalizeText(destination.DestinationType?.Name),
                NormalizeText(destination.Region?.Name),
            };

            return MatchesStrictFields(fields, intent.Tokens);
        }

        private static bool MatchesStrictObject(TouristObject obj, SearchIntent intent)
        {
            var fields = new[]
            {
                NormalizeText(obj.Name),
                NormalizeText(obj.Description),
                NormalizeText(obj.ObjectType?.Name),
                NormalizeText(obj.CuisineType),
                NormalizeText(obj.Amenities == null ? null : string.Join(' ', obj.Amenities)),
                NormalizeText(obj.Locality?.Name),
                NormalizeText(obj.Destination?.Name),
                NormalizeText(obj.Destination?.Region?.Name ?? obj.Locality?.Destination?.Region?.Name),
            };

            return MatchesStrictFields(fields, intent.Tokens);
        }

        private static bool MatchesStrictEvent(Event evt, SearchIntent intent)
        {
            var fields = new[]
            {
                NormalizeText(evt.Name),
                NormalizeText(evt.Description),
                NormalizeText(evt.EventType?.Name),
                NormalizeText(evt.Locality?.Name),
                NormalizeText(evt.Destination?.Name ?? evt.Locality?.Destination?.Name),
                NormalizeText(evt.Destination?.Region?.Name ?? evt.Locality?.Destination?.Region?.Name),
                NormalizeText(evt.Object?.Name),
            };

            return MatchesStrictFields(fields, intent.Tokens);
        }

        private static bool MatchesStrictFields(IEnumerable<string> fields, IEnumerable<string> tokens)
        {
            var normalizedFields = fields
                .Where(field => !string.IsNullOrWhiteSpace(field))
                .ToList();

            if (normalizedFields.Count == 0)
            {
                return false;
            }

            foreach (var token in tokens)
            {
                var expandedTokens = ExpandToken(token);
                var matched = expandedTokens.Any(expanded =>
                    normalizedFields.Any(field => field.Contains(expanded)));

                if (!matched)
                {
                    return false;
                }
            }

            return true;
        }

        private static IEnumerable<string> ExpandToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return [];
            }

            return token switch
            {
                // Voda / sport
                "bazen" => ["bazen", "bazena", "bazeni", "bazenom", "pool", "swimming"],
                "bazena" => ["bazena", "bazen", "bazeni", "bazenom", "pool", "swimming"],
                "bazeni" => ["bazeni", "bazena", "bazen", "bazenom", "pool", "swimming"],
                "bazenom" => ["bazenom", "bazen", "bazena", "bazeni", "pool", "swimming"],
                "pool" => ["pool", "bazen", "swimming"],
                "pecanje" => ["pecanje", "ribolov", "fishing", "riba"],
                "fishing" => ["fishing", "pecanje", "ribolov"],
                "ribolov" => ["ribolov", "pecanje", "fishing"],
                // Staze / priroda
                "staza" => ["staza", "staze", "trail", "hiking", "planinar", "setnja", "setnje", "setalistem", "seta"],
                "staze" => ["staze", "staza", "trail", "hiking", "planinar", "setnja"],
                "trail" => ["trail", "staza", "staze", "hiking"],
                "hiking" => ["hiking", "staza", "staze", "planinar"],
                "setnja" => ["setnja", "setnje", "setnju", "setalistem", "seta", "staza", "staze", "park", "priroda", "pesacka", "peske"],
                "setnju" => ["setnju", "setnja", "setnje", "setalistem", "seta", "pesacki", "peske", "park"],
                "setnje" => ["setnje", "setnja", "park", "staza", "priroda"],
                "planinar" => ["planinar", "planina", "staza", "staze", "hiking"],
                "planina" => ["planina", "planinar", "hiking", "staza"],
                // Kineska / etnicka hrana
                "kineska" => ["kineska", "kineski", "kineskа", "chinese", "kina", "wok", "sushi"],
                "kineski" => ["kineski", "kineska", "chinese", "kina"],
                "chinese" => ["chinese", "kineska", "kineski"],
                "japanska" => ["japanska", "japanese", "sushi", "ramen"],
                "italijanska" => ["italijanska", "italian", "pizza", "pasta"],
                "grcka" => ["grcka", "greek", "meze"],
                // Deca / porodica
                "deca" => ["deca", "decom", "decu", "dete", "kids", "children", "family", "porodicno", "porodican", "playground", "igraliste"],
                "decom" => ["decom", "deca", "decu", "kids", "family", "porodicno", "children", "playground"],
                "kids" => ["kids", "deca", "children", "family", "playground"],
                // Smestaj
                "hotel" => ["hotel", "hotels", "hotelu", "hotela", "hoteli", "smestaj"],
                "hotelu" => ["hotelu", "hotel", "hotela", "hoteli", "smestaj"],
                "hotela" => ["hotela", "hotel", "hotelu", "hoteli", "smestaj"],
                "hoteli" => ["hoteli", "hotel", "hotela", "hotelu", "smestaj"],
                "apartman" => ["apartman", "apartmana", "apartmani", "apartment", "smestaj"],
                "apartmana" => ["apartmana", "apartman", "apartmani", "apartment", "smestaj"],
                // Hrana/pice
                "hrana" => ["hrana", "food", "restoran", "restaurant", "kitchen", "cuisine", "vecera", "dinner"],
                "food" => ["food", "hrana", "restoran", "restaurant", "cuisine", "dinner"],
                "vecera" => ["vecera", "veceru", "dinner", "restoran", "restaurant", "food"],
                "veceru" => ["veceru", "vecera", "dinner", "restoran", "restaurant", "food"],
                "restoran" => ["restoran", "restoranu", "restorana", "restorani", "restaurant"],
                "restoranu" => ["restoranu", "restoran", "restorana", "restorani", "restaurant"],
                "restorana" => ["restorana", "restoran", "restoranu", "restorani", "restaurant"],
                "restaurant" => ["restaurant", "restoran", "restoranu", "restorana"],
                "kafana" => ["kafana", "kafane", "bar", "kafic"],
                "bar" => ["bar", "baru", "barovi", "kafana", "kafic"],
                "baru" => ["baru", "bar", "barovi", "kafana", "kafic"],
                "kafa" => ["kafa", "kafic", "cafe", "coffee"],
                "kafic" => ["kafic", "kaficu", "kafa", "cafe", "coffee"],
                "kaficu" => ["kaficu", "kafic", "kafa", "cafe", "coffee"],
                // Sport
                "tenis" => ["tenis", "tennis", "teren"],
                "fitnes" => ["fitnes", "fitness", "gym", "teretana"],
                "teretana" => ["teretana", "gym", "fitness", "fitnes"],
                "bicikl" => ["bicikl", "bicikli", "cycling", "bike"],
                // Ostalo
                "parking" => ["parking", "garage", "garaza"],
                "spa" => ["spa", "wellness", "relaksacija"],
                "wellness" => ["wellness", "spa", "relaksacija"],
                "muzej" => ["muzej", "museum", "galerija", "kultura"],
                "museum" => ["museum", "muzej", "galerija"],
                // Staze tezina
                "strme" => ["strma", "strme", "strmo", "steep"],
                "strma" => ["strma", "strme", "strmo", "steep"],
                "lagane" => ["lagana", "lagane", "lagano", "laka", "lake", "easy", "gentle"],
                "lagana" => ["lagana", "lagane", "lagano", "laka", "lake", "easy"],
                // Pecanje
                "pecanjem" => ["pecanje", "ribolov", "fishing"],
                "pecanja" => ["pecanje", "ribolov", "fishing"],
                // Hrana ethnic
                "kinesku" => ["kineska", "kineski", "chinese", "kina"],
                "japansku" => ["japanska", "japanese", "sushi"],
                "italijansku" => ["italijanska", "italian", "pizza", "pasta"],
                _ => [token],
            };
        }

        private double ScoreDestination(Destination destination, SearchIntent intent, SearchContext context, int favoriteCount, out string reason)
        {
            var score = 0d;
            reason = "Smart match";

            var name = NormalizeText(destination.Name);
            var title = NormalizeText(destination.DisplayTitle);
            var description = NormalizeText(destination.Description);
            var type = NormalizeText(destination.DestinationType?.Name);
            var region = NormalizeText(destination.Region?.Name);

            score += FieldScore(name, intent, 110, 20, ref reason, "Matches destination name");
            score += FieldScore(type, intent, 70, 16, ref reason, "Matches destination type");
            score += FieldScore(title, intent, 60, 12, ref reason, "Matches destination title");
            score += FieldScore(description, intent, 40, 6, ref reason, "Matches destination description");
            score += FieldScore(region, intent, 40, 8, ref reason, "Matches selected region");

            if (intent.DestinationFocused)
            {
                score += 18;
            }

            score += favoriteCount * 4;

            if (context.EffectiveRegionId.HasValue && destination.RegionId == context.EffectiveRegionId.Value)
            {
                score += 24;
            }

            if (intent.WantsTopRated)
            {
                score += favoriteCount * 2;
            }

            score += DistanceBoost(
                CalculateDistanceFromContext(context.Origin, destination.Geolocation),
                intent.WantsNearby ? 140_000d : 220_000d,
                intent.WantsNearby ? 36d : 12d);

            return score;
        }

        private double ScoreObject(
            TouristObject obj,
            SearchIntent intent,
            SearchContext context,
            int favoriteCount,
            out string reason)
        {
            var score = 0d;
            reason = "Smart match";

            var name = NormalizeText(obj.Name);
            var description = NormalizeText(obj.Description);
            var type = NormalizeText(obj.ObjectType?.Name);
            var cuisine = NormalizeText(obj.CuisineType);
            var amenities = NormalizeText(obj.Amenities == null ? null : string.Join(' ', obj.Amenities));
            var locality = NormalizeText(obj.Locality?.Name);
            var destination = NormalizeText(obj.Destination?.Name);
            var region = NormalizeText(obj.Destination?.Region?.Name ?? obj.Locality?.Destination?.Region?.Name);
            var combinedFeatures = $"{type} {cuisine} {amenities} {description}";

            score += FieldScore(name, intent, 120, 20, ref reason, "Matches object name");
            score += FieldScore(type, intent, 85, 22, ref reason, "Matches object type");
            score += FieldScore(cuisine, intent, 80, 18, ref reason, "Matches cuisine");
            score += FieldScore(amenities, intent, 70, 18, ref reason, "Matches amenities");
            score += FieldScore(description, intent, 45, 7, ref reason, "Matches description");
            score += FieldScore(locality, intent, 35, 6, ref reason, "Matches locality");
            score += FieldScore(destination, intent, 35, 6, ref reason, "Matches destination");
            score += FieldScore(region, intent, 35, 6, ref reason, "Matches region");

            if (intent.ObjectFocused)
            {
                score += 20;
            }

            if (intent.WantsDinner)
            {
                if (type.Contains("restoran") || type.Contains("restaurant"))
                {
                    score += 28;
                    reason = "Matches dinner intent";
                }
                else if (type.Contains("kafana") || type.Contains("bar") || type.Contains("kafic"))
                {
                    score += 18;
                    reason = "Matches dinner intent";
                }
                else if (type.Contains("hotel"))
                {
                    score += 10;
                }
            }

            if (intent.WantsFamilyFriendly)
            {
                var amenitiesRaw = obj.Amenities == null ? "" : string.Join(' ', obj.Amenities).ToLowerInvariant();
                if (amenitiesRaw.Contains("porodicno") || amenitiesRaw.Contains("porodican") || amenitiesRaw.Contains("family"))
                {
                    score += 40;
                    reason = "Porodicno prikladno";
                }
                else if (ContainsAny(combinedFeatures, FamilyFriendlyFeatureHints))
                {
                    score += 24;
                    reason = "Matches family-friendly search";
                }
                else if (type.Contains("hotel") || type.Contains("restoran") || type.Contains("restaurant"))
                {
                    score += 10;
                }

                if (type.Contains("bar") || type.Contains("kafana"))
                {
                    score -= 6;
                }
            }

            if (intent.WantsPool)
            {
                if (amenities.Contains("bazen") || amenities.Contains("pool"))
                {
                    score += 36;
                    reason = "Matches amenities";
                }
                else if (type.Contains("hotel") || type.Contains("spa") || type.Contains("wellness"))
                {
                    score += 10;
                }
            }

            if (intent.WantsOutdoor)
            {
                var outdoorFields = $"{type} {amenities} {description} {name}";
                if (ContainsAny(outdoorFields, HikingHints))
                {
                    score += 30;
                    reason = "Matches outdoor/activity search";
                }
                if (type.Contains("planinar") || type.Contains("nacionalni") || type.Contains("park"))
                {
                    score += 20;
                    reason = "Outdoor lokacija";
                }
            }

            if (intent.WantsCheap)
            {
                score += PricePreferenceScore(obj.Price, 0, 25, 10, 0);
            }

            if (intent.WantsPremium)
            {
                score += PricePreferenceScore(obj.Price, 80, 0, 10, 26);
            }

            if (intent.WantsFree)
            {
                score += obj.Price == null || obj.Price <= 0 ? 18 : 0;
            }

            score += (double)obj.AverageRating * (intent.WantsTopRated ? 12d : 8d);
            score += Math.Log(obj.ReviewCount + 1, 2) * 5d;
            score += favoriteCount * 3d;

            if (context.FavoriteObjectTypeWeights.TryGetValue(obj.ObjectTypeId, out var favoriteTypeCount))
            {
                score += Math.Min(10, favoriteTypeCount * 4);
            }

            if (context.ObjectTypeAverageRatings.TryGetValue(obj.ObjectTypeId, out var avgUserRating))
            {
                score += (avgUserRating - 3d) * 12d;
            }

            score += DistanceBoost(
                CalculateDistanceFromContext(context.Origin, obj.Geolocation),
                intent.WantsNearby ? 80_000d : 140_000d,
                intent.WantsNearby ? 34d : 8d);

            return score;
        }

        private double ScoreEvent(
            Event evt,
            SearchIntent intent,
            SearchContext context,
            int plannerCount,
            out string reason)
        {
            var score = 0d;
            reason = "Smart match";

            var name = NormalizeText(evt.Name);
            var description = NormalizeText(evt.Description);
            var type = NormalizeText(evt.EventType?.Name);
            var locality = NormalizeText(evt.Locality?.Name);
            var destination = NormalizeText(evt.Destination?.Name ?? evt.Locality?.Destination?.Name);
            var region = NormalizeText(evt.Destination?.Region?.Name ?? evt.Locality?.Destination?.Region?.Name);
            var linkedObject = NormalizeText(evt.Object?.Name);

            score += FieldScore(name, intent, 120, 20, ref reason, "Matches event name");
            score += FieldScore(type, intent, 90, 20, ref reason, "Matches event type");
            score += FieldScore(description, intent, 45, 7, ref reason, "Matches event description");
            score += FieldScore(locality, intent, 35, 6, ref reason, "Matches locality");
            score += FieldScore(destination, intent, 35, 6, ref reason, "Matches destination");
            score += FieldScore(region, intent, 35, 6, ref reason, "Matches region");
            score += FieldScore(linkedObject, intent, 25, 5, ref reason, "Matches place");

            if (intent.EventFocused)
            {
                score += 24;
            }

            score += plannerCount * 4;

            if (intent.WantsCheap)
            {
                score += PricePreferenceScore(evt.Price, 0, 24, 8, 0);
            }

            if (intent.WantsPremium)
            {
                score += PricePreferenceScore(evt.Price, 50, 0, 10, 20);
            }

            if (intent.WantsFree)
            {
                score += evt.Price == null || evt.Price <= 0 ? 20 : 0;
            }

            score += DateIntentBoost(evt, intent, ref reason);

            score += DistanceBoost(
                CalculateDistanceFromContext(context.Origin, evt.Geolocation),
                intent.WantsNearby ? 90_000d : 160_000d,
                intent.WantsNearby ? 30d : 6d);

            return score;
        }

        private static int? ResolveRegionIdFromQuery(string normalizedQuery, List<Region> regions)
        {
            foreach (var region in regions)
            {
                var normalizedName = NormalizeText(region.Name);
                var normalizedCode = NormalizeText(region.Code);
                if ((!string.IsNullOrWhiteSpace(normalizedName) && normalizedQuery.Contains(normalizedName)) ||
                    (!string.IsNullOrWhiteSpace(normalizedCode) && normalizedQuery.Contains(normalizedCode)))
                {
                    return region.Id;
                }

                foreach (var alias in GetRegionAliases(normalizedName))
                {
                    if (normalizedQuery.Contains(alias))
                    {
                        return region.Id;
                    }
                }
            }

            return null;
        }

        private static IEnumerable<string> GetRegionAliases(string normalizedRegionName)
        {
            return normalizedRegionName switch
            {
                "crna gora" => ["montenegro", "cg"],
                "srbija" => ["serbia", "rs"],
                "grcka" => ["greece", "gr"],
                "spanija" => ["spain", "es"],
                "italija" => ["italy", "it"],
                _ => [],
            };
        }

        private static double FieldScore(
            string field,
            SearchIntent intent,
            double fullMatchScore,
            double tokenMatchScore,
            ref string reason,
            string reasonText)
        {
            if (string.IsNullOrWhiteSpace(field))
            {
                return 0;
            }

            var score = 0d;
            if (field.Contains(intent.NormalizedQuery))
            {
                reason = reasonText;
                score += fullMatchScore;
            }

            foreach (var token in intent.Tokens)
            {
                // Expand token to synonyms so MCP mode also matches e.g. "setnju" -> "setnja","staza","park"...
                var expandedTokens = ExpandToken(token);
                if (expandedTokens.Any(field.Contains))
                {
                    score += tokenMatchScore;
                    reason = reasonText;
                }
            }

            return score;
        }

        private static double PricePreferenceScore(decimal? price, decimal premiumThreshold, double cheapBoost, double midBoost, double premiumBoost)
        {
            if (!price.HasValue)
            {
                return cheapBoost > 0 ? cheapBoost * 0.4d : 0;
            }

            if (cheapBoost > 0)
            {
                if (price.Value <= 20) return cheapBoost;
                if (price.Value <= 50) return midBoost;
                return 0;
            }

            return price.Value >= premiumThreshold ? premiumBoost : 0;
        }

        private static double DateIntentBoost(Event evt, SearchIntent intent, ref string reason)
        {
            var score = 0d;
            var today = DateTime.UtcNow.Date;
            var eventDate = evt.StartDate.Date;

            if (intent.TodayPreferred && eventDate == today)
            {
                reason = "Matches requested date";
                score += 60;
            }

            if (intent.TomorrowPreferred && eventDate == today.AddDays(1))
            {
                reason = "Matches requested date";
                score += 58;
            }

            if (intent.TonightPreferred && eventDate == today && evt.StartDate.Hour >= 17)
            {
                reason = "Matches tonight";
                score += 56;
            }

            if (intent.WeekendPreferred &&
                (eventDate.DayOfWeek == DayOfWeek.Saturday || eventDate.DayOfWeek == DayOfWeek.Sunday))
            {
                reason = "Matches weekend";
                score += 52;
            }

            return score;
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

        private static bool ContainsAny(string source, IEnumerable<string> hints)
        {
            return hints.Any(source.Contains);
        }

        private static List<string> SplitTokens(string normalizedQuery)
        {
            return normalizedQuery
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(token => token.Length >= 2 && !SearchStopWords.Contains(token))
                .Distinct()
                .ToList();
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

        private static string ResolveObjectMarkerType(string? objectTypeName)
        {
            var normalized = NormalizeText(objectTypeName);
            if (normalized.Contains("hotel") || normalized.Contains("apartman") || normalized.Contains("pansion"))
            {
                return "hotel";
            }

            if (normalized.Contains("kafana") || normalized.Contains("bar") || normalized.Contains("kafic") || normalized.Contains("kafic"))
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

        private async Task<List<SmartSearchResultDto>> BuildStrictObjectFallbackAsync(SearchContext context, SearchIntent intent, int pageSize)
        {
            var objects = await BuildFallbackObjectQuery(context).ToListAsync();

            return objects
                .Select(obj => new
                {
                    Object = obj,
                    Score = ScoreStrictFallbackObject(obj, intent),
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Object.Name)
                .Take(pageSize)
                .Select(x => MapFallbackObject(x.Object, x.Score, "Matches object fields"))
                .ToList();
        }

        private async Task<List<SmartSearchResultDto>> BuildMcpObjectFallbackAsync(SearchContext context, SearchIntent intent, int pageSize)
        {
            var objects = await BuildFallbackObjectQuery(context).ToListAsync();

            return objects
                .Select(obj => new
                {
                    Object = obj,
                    Score = ScoreMcpFallbackObject(obj, intent, context),
                    Reason = ResolveMcpFallbackReason(obj, intent),
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Object.Name)
                .Take(pageSize)
                .Select(x => MapFallbackObject(x.Object, x.Score, x.Reason))
                .ToList();
        }

        private IQueryable<TouristObject> BuildFallbackObjectQuery(SearchContext context)
        {
            var query = _context.Objects
                .AsNoTracking()
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                .Include(o => o.Images)
                .Where(o =>
                        o.IsActive &&
                        o.Status == ContentStatus.Approved &&
                        o.Images.Any(i => i.IsMain));

            if (context.EffectiveRegionId.HasValue)
            {
                var regionId = context.EffectiveRegionId.Value;
                query = query.Where(o => o.Destination.RegionId == regionId);
            }

            return query;
        }

        private double ScoreStrictFallbackObject(TouristObject obj, SearchIntent intent)
        {
            var name = NormalizeText(obj.Name);
            var type = NormalizeText(obj.ObjectType?.Name);
            var description = NormalizeText(obj.Description);
            var cuisine = NormalizeText(obj.CuisineType);
            var amenities = NormalizeText(obj.Amenities == null ? null : string.Join(' ', obj.Amenities));

            double score = 0d;
            foreach (var token in intent.Tokens)
            {
                var expandedTokens = ExpandToken(token);
                if (expandedTokens.Any(name.Contains)) score += 12d;
                if (expandedTokens.Any(type.Contains)) score += 10d;
                if (expandedTokens.Any(cuisine.Contains)) score += 8d;
                if (expandedTokens.Any(amenities.Contains)) score += 8d;
                if (expandedTokens.Any(description.Contains)) score += 5d;
            }

            return score;
        }

        private double ScoreMcpFallbackObject(TouristObject obj, SearchIntent intent, SearchContext context)
        {
            var type = NormalizeText(obj.ObjectType?.Name);
            var description = NormalizeText(obj.Description);
            var cuisine = NormalizeText(obj.CuisineType);
            var amenities = NormalizeText(obj.Amenities == null ? null : string.Join(' ', obj.Amenities));
            var name = NormalizeText(obj.Name);
            var combined = $"{name} {type} {description} {cuisine} {amenities}";

            var score = (double)obj.AverageRating * 8d + Math.Log(obj.ReviewCount + 1, 2) * 5d;

            foreach (var token in intent.Tokens)
            {
                var expandedTokens = ExpandToken(token);
                if (expandedTokens.Any(combined.Contains))
                {
                    score += 10d;
                }
            }

            if (intent.WantsDinner)
            {
                if (type.Contains("restoran") || type.Contains("restaurant"))
                {
                    score += 32d;
                }
                else if (type.Contains("kafana") || type.Contains("bar") || type.Contains("kafic"))
                {
                    score += 20d;
                }
                else if (type.Contains("hotel"))
                {
                    score += 8d;
                }
            }

            if (intent.WantsFamilyFriendly)
            {
                if (ContainsAny(combined, FamilyFriendlyFeatureHints))
                {
                    score += 28d;
                }
                else if (type.Contains("restoran") || type.Contains("restaurant") || type.Contains("hotel"))
                {
                    score += 10d;
                }
            }

            if (intent.WantsPool && (amenities.Contains("bazen") || amenities.Contains("pool")))
            {
                score += 30d;
            }

            if (intent.WantsCheap)
            {
                score += PricePreferenceScore(obj.Price, 0, 25, 10, 0);
            }

            score += DistanceBoost(
                CalculateDistanceFromContext(context.Origin, obj.Geolocation),
                intent.WantsNearby ? 80_000d : 180_000d,
                intent.WantsNearby ? 30d : 8d);

            return score;
        }

        private static string ResolveMcpFallbackReason(TouristObject obj, SearchIntent intent)
        {
            var type = NormalizeText(obj.ObjectType?.Name);
            var amenities = NormalizeText(obj.Amenities == null ? null : string.Join(' ', obj.Amenities));

            if (intent.WantsPool && (amenities.Contains("bazen") || amenities.Contains("pool")))
            {
                return "Matches amenities";
            }

            if (intent.WantsFamilyFriendly && ContainsAny($"{type} {amenities}", FamilyFriendlyFeatureHints))
            {
                return "Matches family-friendly search";
            }

            if (intent.WantsDinner && (type.Contains("restoran") || type.Contains("restaurant") || type.Contains("bar") || type.Contains("kafana") || type.Contains("kafic")))
            {
                return "Matches dinner intent";
            }

            if (intent.WantsCheap)
            {
                return "Matches budget preference";
            }

            return "Popular choice";
        }

        private static SmartSearchResultDto MapFallbackObject(TouristObject obj, double score, string reason)
        {
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
                MatchReason = reason,
                Score = Math.Round(score, 2),
            };
        }

        private sealed class SearchContext
        {
            public int? EffectiveRegionId { get; set; }
            public GeoPoint? Origin { get; set; }
            public Dictionary<int, int> FavoriteObjectTypeWeights { get; set; } = new();
            public Dictionary<int, double> ObjectTypeAverageRatings { get; set; } = new();
        }

        private sealed class SearchIntent
        {
            public string NormalizedQuery { get; set; } = string.Empty;
            public List<string> Tokens { get; set; } = [];
            public bool WantsNearby { get; set; }
            public bool WantsCheap { get; set; }
            public bool WantsFree { get; set; }
            public bool WantsPremium { get; set; }
            public bool WantsTopRated { get; set; }
            public bool WantsFamilyFriendly { get; set; }
            public bool WantsDinner { get; set; }
            public bool WantsPool { get; set; }
            public bool EventFocused { get; set; }
            public bool DestinationFocused { get; set; }
            public bool ObjectFocused { get; set; }
            public bool TodayPreferred { get; set; }
            public bool TonightPreferred { get; set; }
            public bool TomorrowPreferred { get; set; }
            public bool WeekendPreferred { get; set; }
            public bool WantsOutdoor { get; set; }
            public bool FoodTypeFocused { get; set; }
            public int? EffectiveRegionId { get; set; }
        }

        private sealed class SmartSearchCandidate
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string TypeName { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string MarkerType { get; set; } = string.Empty;
            public string Icon { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public double? Latitude { get; set; }
            public double? Longitude { get; set; }
            public string MatchReason { get; set; } = string.Empty;
            public double Score { get; set; }
        }

        private sealed record GeoPoint(double Latitude, double Longitude);
    }
}
