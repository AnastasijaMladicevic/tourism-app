using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/translations")]
    public class TranslationsController : ControllerBase
    {
        private static readonly string[] GeneratedLanguages = new[] { "en", "es", "it" };

        private readonly AppDbContext _context;
        private readonly ITranslationService _translationService;

        public TranslationsController(
            AppDbContext context,
            ITranslationService translationService)
        {
            _context = context;
            _translationService = translationService;
        }

        // GET api/translations?entityType=Object&entityId=15
        [HttpGet]
        public async Task<IActionResult> GetForEntity(
            [FromQuery] string entityType,
            [FromQuery] int entityId)
        {
            var translations = await _context.Translations
                .Where(t => t.EntityType == entityType && t.EntityId == entityId)
                .Select(t => new TranslationDto
                {
                    Id = t.Id,
                    EntityType = t.EntityType,
                    EntityId = t.EntityId,
                    FieldName = t.FieldName,
                    LanguageCode = t.LanguageCode,
                    TranslatedText = t.TranslatedText,
                    IsAutoTranslated = t.IsAutoTranslated
                })
                .ToListAsync();

            return Ok(translations);
        }

        [HttpPost("generate-all-objects")]
        public async Task<IActionResult> GenerateAllObjects()
        {
            var objects = await _context.Objects
                .Include(o => o.ObjectType)
                .Where(o => !string.IsNullOrWhiteSpace(o.Description))
                .ToListAsync();

            foreach (var obj in objects)
            {
                await _translationService.GenerateIfMissingAsync(
                    "Object",
                    obj.Id,
                    "Description",
                    obj.Description,
                    GeneratedLanguages);

                if (!string.IsNullOrWhiteSpace(obj.CuisineType))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "Object",
                        obj.Id,
                        "CuisineType",
                        obj.CuisineType,
                        GeneratedLanguages);
                }

                if (obj.Amenities != null && obj.Amenities.Length > 0)
                {
                    for (var index = 0; index < obj.Amenities.Length; index++)
                    {
                        var amenity = obj.Amenities[index];
                        if (string.IsNullOrWhiteSpace(amenity))
                            continue;

                        await _translationService.GenerateIfMissingAsync(
                            "Object",
                            obj.Id,
                            $"Amenity:{index}",
                            amenity,
                            GeneratedLanguages);
                    }
                }
            }

            var objectTypes = await _context.ObjectTypes
                .Where(o => !string.IsNullOrWhiteSpace(o.Name))
                .ToListAsync();

            foreach (var objectType in objectTypes)
            {
                await _translationService.GenerateIfMissingAsync(
                    "ObjectType",
                    objectType.Id,
                    "Name",
                    objectType.Name,
                    GeneratedLanguages);
            }

            return Ok(new
            {
                message = "Translations generated for all objects.",
                count = objects.Count
            });
        }

        [HttpPost("generate-all-content")]
        public async Task<IActionResult> GenerateAllContent()
        {
            var result = new
            {
                destinations = await GenerateDestinationTranslationsAsync(),
                localities = await GenerateLocalityTranslationsAsync(),
                activities = await GenerateActivityTranslationsAsync(),
                events = await GenerateEventTranslationsAsync(),
                objects = await GenerateObjectTranslationsAsync()
            };

            return Ok(new
            {
                message = "Translations generated for all supported content.",
                languages = new[] { "sr", "en", "es", "it" },
                result
            });
        }

        [HttpDelete("clear-auto")]
        public async Task<IActionResult> ClearAutoTranslations()
        {
            var items = _context.Translations
                .Where(t => t.IsAutoTranslated);

            _context.Translations.RemoveRange(items);
            await _context.SaveChangesAsync();

            return Ok("Deleted auto translations");
        }

        // POST api/translations/generate-object/15
        // Example helper endpoint for one Object.
        [HttpPost("generate-object/{objectId:int}")]
        public async Task<IActionResult> GenerateForObject(int objectId)
        {
            var obj = await _context.Objects
                .Include(o => o.ObjectType)
                .FirstOrDefaultAsync(o => o.Id == objectId);

            if (obj == null)
                return NotFound();

            await _translationService.GenerateIfMissingAsync(
                "Object",
                obj.Id,
                "Description",
                obj.Description,
                GeneratedLanguages);

            if (!string.IsNullOrWhiteSpace(obj.CuisineType))
            {
                await _translationService.GenerateIfMissingAsync(
                    "Object",
                    obj.Id,
                    "CuisineType",
                    obj.CuisineType,
                    GeneratedLanguages);
            }

            if (obj.Amenities != null && obj.Amenities.Length > 0)
            {
                for (var index = 0; index < obj.Amenities.Length; index++)
                {
                    var amenity = obj.Amenities[index];
                    if (string.IsNullOrWhiteSpace(amenity))
                        continue;

                    await _translationService.GenerateIfMissingAsync(
                        "Object",
                        obj.Id,
                        $"Amenity:{index}",
                        amenity,
                        GeneratedLanguages);
                }
            }

            if (obj.ObjectType != null && !string.IsNullOrWhiteSpace(obj.ObjectType.Name))
            {
                await _translationService.GenerateIfMissingAsync(
                    "ObjectType",
                    obj.ObjectType.Id,
                    "Name",
                    obj.ObjectType.Name,
                    GeneratedLanguages);
            }

            return Ok(new { message = "Translations generated if missing." });
        }

        private async Task<int> GenerateDestinationTranslationsAsync()
        {
            var destinations = await _context.Destinations
                .Include(d => d.DestinationType)
                .Where(d => !string.IsNullOrWhiteSpace(d.Description) || !string.IsNullOrWhiteSpace(d.DisplayTitle))
                .ToListAsync();

            foreach (var destination in destinations)
            {
                if (!string.IsNullOrWhiteSpace(destination.DisplayTitle))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "Destination",
                        destination.Id,
                        "DisplayTitle",
                        destination.DisplayTitle,
                        GeneratedLanguages);
                }

                if (!string.IsNullOrWhiteSpace(destination.Description))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "Destination",
                        destination.Id,
                        "Description",
                        destination.Description,
                        GeneratedLanguages);
                }

                if (destination.DestinationType != null && !string.IsNullOrWhiteSpace(destination.DestinationType.Name))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "DestinationType",
                        destination.DestinationType.Id,
                        "Name",
                        destination.DestinationType.Name,
                        GeneratedLanguages);
                }
            }

            return destinations.Count;
        }

        private async Task<int> GenerateLocalityTranslationsAsync()
        {
            var localities = await _context.Localities
                .Include(l => l.LocalityType)
                .Where(l => !string.IsNullOrWhiteSpace(l.Description))
                .ToListAsync();

            foreach (var locality in localities)
            {
                await _translationService.GenerateIfMissingAsync(
                    "Locality",
                    locality.Id,
                    "Description",
                    locality.Description,
                    GeneratedLanguages);

                if (locality.LocalityType != null && !string.IsNullOrWhiteSpace(locality.LocalityType.Name))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "LocalityType",
                        locality.LocalityType.Id,
                        "Name",
                        locality.LocalityType.Name,
                        GeneratedLanguages);
                }
            }

            return localities.Count;
        }

        private async Task<int> GenerateActivityTranslationsAsync()
        {
            var activities = await _context.Activities
                .Include(a => a.ActivityType)
                .Where(a => !string.IsNullOrWhiteSpace(a.Description))
                .ToListAsync();

            foreach (var activity in activities)
            {
                await _translationService.GenerateIfMissingAsync(
                    "Activity",
                    activity.Id,
                    "Description",
                    activity.Description,
                    GeneratedLanguages);

                if (activity.ActivityType != null && !string.IsNullOrWhiteSpace(activity.ActivityType.Name))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "ActivityType",
                        activity.ActivityType.Id,
                        "Name",
                        activity.ActivityType.Name,
                        GeneratedLanguages);
                }
            }

            return activities.Count;
        }

        private async Task<int> GenerateEventTranslationsAsync()
        {
            var events = await _context.Events
                .Include(e => e.EventType)
                .Where(e => !string.IsNullOrWhiteSpace(e.Description))
                .ToListAsync();

            foreach (var ev in events)
            {
                await _translationService.GenerateIfMissingAsync(
                    "Event",
                    ev.Id,
                    "Description",
                    ev.Description,
                    GeneratedLanguages);

                if (ev.EventType != null && !string.IsNullOrWhiteSpace(ev.EventType.Name))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "EventType",
                        ev.EventType.Id,
                        "Name",
                        ev.EventType.Name,
                        GeneratedLanguages);
                }
            }

            return events.Count;
        }

        private async Task<int> GenerateObjectTranslationsAsync()
        {
            var objects = await _context.Objects
                .Include(o => o.ObjectType)
                .Where(o =>
                    !string.IsNullOrWhiteSpace(o.Description) ||
                    !string.IsNullOrWhiteSpace(o.CuisineType) ||
                    (o.Amenities != null && o.Amenities.Length > 0))
                .ToListAsync();

            foreach (var obj in objects)
            {
                if (!string.IsNullOrWhiteSpace(obj.Description))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "Object",
                        obj.Id,
                        "Description",
                        obj.Description,
                        GeneratedLanguages);
                }

                if (!string.IsNullOrWhiteSpace(obj.CuisineType))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "Object",
                        obj.Id,
                        "CuisineType",
                        obj.CuisineType,
                        GeneratedLanguages);
                }

                if (obj.Amenities != null && obj.Amenities.Length > 0)
                {
                    for (var index = 0; index < obj.Amenities.Length; index++)
                    {
                        var amenity = obj.Amenities[index];
                        if (string.IsNullOrWhiteSpace(amenity))
                            continue;

                        await _translationService.GenerateIfMissingAsync(
                            "Object",
                            obj.Id,
                            $"Amenity:{index}",
                            amenity,
                            GeneratedLanguages);
                    }
                }

                if (obj.ObjectType != null && !string.IsNullOrWhiteSpace(obj.ObjectType.Name))
                {
                    await _translationService.GenerateIfMissingAsync(
                        "ObjectType",
                        obj.ObjectType.Id,
                        "Name",
                        obj.ObjectType.Name,
                        GeneratedLanguages);
                }
            }

            return objects.Count;
        }
    }
}
