using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/debug")]
    [AllowAnonymous]
    public class DebugController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ISmartSearchService _smartSearchService;

        public DebugController(AppDbContext context, ISmartSearchService smartSearchService)
        {
            _context = context;
            _smartSearchService = smartSearchService;
        }

        [HttpGet("score-test")]
        public async Task<IActionResult> ScoreTest([FromQuery] string query = "gde sa decom u setnju")
        {
            var stopWords = new HashSet<string> {
                "gde","mogu","moze","mozete","da","na","sa","u","uz","za","od","do","i","ili",
                "the","a","an","to","for","with","nisu","nije","je","su","koje","koji","koja","nesto",
                "ima","imaju","blizu","oko","hteo","bih","zelim","trazim","imate","mi","me",
                "ne","li","bi","manje","vise","bez","dobro","lepo","kako","sta","kada","zasto",
                "neka","neko","neku","one","oni","ona","ovo","ova","ove","ovaj","ovde","can",
                "in","of","on","at","by","is","are","was","be","some","any","not","mnogo","malo","malom","mala","male","mali","skupa","skupo","skup","skupu","hrana","hranu"
            };

            var normalized = query.Trim().ToLower()
                .Replace('č', 'c').Replace('ć', 'c')
                .Replace('š', 's').Replace('ž', 'z').Replace('đ', 'd');

            var tokens = normalized
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 2 && !stopWords.Contains(t))
                .Distinct().ToList();

            var familyHints = new[] { "deca","decom","decu","dete","kids","kid","children","child",
                "family","porodicno","porodicni","porodicna","porodica","porodican" };
            var hikingHints = new[] { "staza","staze","hiking","planinar","setnja","setnje","setnju",
                "setalistem","seta","trail","priroda","park","pecanje","ribolov","fishing",
                "bicikl","outdoor","sport","pesacka","pesacki","peske","pesacenje" };

            bool wantsFamily = familyHints.Any(h => normalized.Contains(h));
            bool wantsOutdoor = hikingHints.Any(h => normalized.Contains(h));

            var objects = await _context.Objects
                .Include(o => o.ObjectType)
                .Where(o => o.IsActive && o.Status == ContentStatus.Approved)
                .Select(o => new {
                    o.Id,
                    o.Name,
                    Type = o.ObjectType != null ? o.ObjectType.Name : "",
                    o.CuisineType,
                    Amenities = o.Amenities,
                    Desc = o.Description != null ? o.Description.Substring(0, Math.Min(100, o.Description.Length)) : ""
                }).ToListAsync();

            var scored = objects.Select(o => {
                var score = 0;
                var reasons = new List<string>();
                var amenitiesRaw = o.Amenities == null ? "" : string.Join(' ', o.Amenities).ToLower();
                var typeLow = o.Type.ToLower();
                var descLow = o.Desc.ToLower();
                var combined = $"{typeLow} {amenitiesRaw} {descLow} {o.Name.ToLower()}";

                if (wantsFamily)
                {
                    if (amenitiesRaw.Contains("porodicno") || amenitiesRaw.Contains("family"))
                    {
                        score += 40; reasons.Add("+40 Porodicno/family u amenities");
                    }
                    else if (familyHints.Any(h => combined.Contains(h)))
                    {
                        score += 24; reasons.Add("+24 family hint u combined");
                    }
                    else if (typeLow.Contains("restoran") || typeLow.Contains("hotel"))
                    {
                        score += 10; reasons.Add("+10 restoran/hotel");
                    }
                }
                if (wantsOutdoor)
                {
                    if (hikingHints.Any(h => combined.Contains(h)))
                    {
                        score += 30; reasons.Add("+30 outdoor match u: " + string.Join(",", hikingHints.Where(h => combined.Contains(h)).Take(3)));
                    }
                    if (typeLow.Contains("planinar") || typeLow.Contains("park"))
                    {
                        score += 20; reasons.Add("+20 outdoor tip");
                    }
                }

                return new { o.Name, o.Type, AmenitiesRaw = amenitiesRaw, score, reasons };
            })
            .OrderByDescending(x => x.score)
            .ToList();

            return Ok(new
            {
                Query = query,
                Normalized = normalized,
                Tokeni = tokens,
                WantsFamily = wantsFamily,
                WantsOutdoor = wantsOutdoor,
                TopRezultati = scored.Where(x => x.score > 0).ToList(),
                SviSaScore0 = scored.Where(x => x.score == 0).Select(x => new { x.Name, x.Type }).ToList()
            });
        }

        [HttpGet("search-service-test")]
        public async Task<IActionResult> SearchServiceTest([FromQuery] string query = "gde mogu da izadjem na veceru sa malom decom", [FromQuery] string mode = "mcp")
        {
            var dto = new SmartSearchQueryDto
            {
                Query = query,
                Mode = mode,
                PageSize = 10
            };

            var results = await _smartSearchService.SearchAsync(null, dto);
            var objectCount = await _context.Objects.CountAsync(o => o.IsActive && o.Status == ContentStatus.Approved);

            return Ok(new
            {
                Query = query,
                Mode = mode,
                ApprovedObjectCount = objectCount,
                ResultsCount = results.Count,
                Results = results
            });
        }

        [HttpGet("events-raw")]
        public async Task<IActionResult> EventsRaw([FromQuery] string? destination = null, [FromQuery] string? search = null)
        {
            var query = _context.Events
                .Include(e => e.Images)
                .Include(e => e.Destination)
                .Include(e => e.Locality)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(destination))
            {
                var normalizedDestination = destination.Trim().ToLower();
                query = query.Where(e =>
                    (e.Destination != null && e.Destination.Name.ToLower().Contains(normalizedDestination)) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.Name.ToLower().Contains(normalizedDestination)));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLower();
                query = query.Where(e => e.Name.ToLower().Contains(normalizedSearch));
            }

            var items = await query
                .OrderBy(e => e.Name)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    Destination = e.Destination != null ? e.Destination.Name : null,
                    Locality = e.Locality != null ? e.Locality.Name : null,
                    Status = e.Status.ToString(),
                    e.IsActive,
                    ImageCount = e.Images.Count,
                    HasMainImage = e.Images.Any(i => i.IsMain)
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("italy-event-seed-check")]
        public async Task<IActionResult> ItalyEventSeedCheck()
        {
            var source = new[]
            {
                new { Name = "Bari veče fokače", EventTypeName = "Proslava", LocalityName = "Bari Vecchia", DestinationName = "Bari", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.bari@spirego.com" },
                new { Name = "Palermo noć pijaca", EventTypeName = "Festival", LocalityName = "Mercato Ballaro Palermo", DestinationName = "Palermo", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.palermo@spirego.com" },
                new { Name = "Trieste morske priče", EventTypeName = "Okupljanje", LocalityName = "Piazza Unita Trieste", DestinationName = "Trieste", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.trieste@spirego.com" },
                new { Name = "Matera svetla u kamenu", EventTypeName = "Izlozba", LocalityName = "Sassi di Matera", DestinationName = "Matera", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.matera@spirego.com" },
                new { Name = "Sorrento veče limuna", EventTypeName = "Proslava", LocalityName = "Corso Italia Sorrento", DestinationName = "Sorrento", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.sorrento@spirego.com" },
                new { Name = "Stand-up pod baroknim svetlima Lečea", EventTypeName = "Stand-up", LocalityName = "Piazza Sant'Oronzo Lecce", DestinationName = "Lecce", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.lecce@spirego.com" },
                new { Name = "Parma gurmanski susret", EventTypeName = "Sajam", LocalityName = "Piazza Duomo Parma", DestinationName = "Parma", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.parma@spirego.com" },
                new { Name = "Regata zaliva Sardinije", EventTypeName = "Sportski dogadjaj", LocalityName = "Costa Smeralda Sardinija", DestinationName = "Sardinija", CreatorEmail = "lorenzo.creator@spirego.com", ManagerEmail = "manager.sardinia@spirego.com" }
            };

            static string Normalize(string value) =>
                value.Trim().ToLowerInvariant()
                    .Replace('đ', 'd')
                    .Replace('š', 's')
                    .Replace('ž', 'z')
                    .Replace('č', 'c')
                    .Replace('ć', 'c');

            var eventTypes = await _context.EventTypes.AsNoTracking().ToListAsync();
            var localities = await _context.Localities.AsNoTracking().ToListAsync();
            var destinations = await _context.Destinations.AsNoTracking().ToListAsync();
            var users = await _context.Users.AsNoTracking().ToListAsync();

            var result = source.Select(item => new
            {
                item.Name,
                HasType = eventTypes.Any(et => Normalize(et.Name) == Normalize(item.EventTypeName)),
                HasLocality = localities.Any(l => l.Name == item.LocalityName),
                HasDestination = destinations.Any(d => d.Name == item.DestinationName),
                HasCreator = users.Any(u => u.Email == item.CreatorEmail),
                HasManager = users.Any(u => u.Email == item.ManagerEmail)
            });

            return Ok(result);
        }
    }
}
