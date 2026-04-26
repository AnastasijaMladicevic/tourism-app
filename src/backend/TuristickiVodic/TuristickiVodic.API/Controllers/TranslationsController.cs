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
                .Where(o => !string.IsNullOrWhiteSpace(o.Description))
                .ToListAsync();

            var languages = new[] { "it", "es" };

            foreach (var obj in objects)
            {
                await _translationService.GenerateIfMissingAsync(
                    "Object",
                    obj.Id,
                    "Description",
                    obj.Description,
                    languages);
            }

            return Ok(new
            {
                message = "Translations generated for all objects.",
                count = objects.Count
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
            var obj = await _context.Objects.FirstOrDefaultAsync(o => o.Id == objectId);

            if (obj == null)
                return NotFound();

            var languages = new[] { "es", "it" };

            await _translationService.GenerateIfMissingAsync(
                "Object",
                obj.Id,
                "Description",
                obj.Description,
                languages);

            return Ok(new { message = "Translations generated if missing." });
        }
    }
}
