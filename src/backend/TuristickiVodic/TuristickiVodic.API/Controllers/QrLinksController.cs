using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/qr-links")]
    [AllowAnonymous]
    public class QrLinksController : ControllerBase
    {
        private const string DefaultPublicAppBaseUrl = "http://localhost:4200";

        private readonly IEventService _eventService;
        private readonly ITouristObjectService _touristObjectService;
        private readonly IConfiguration _configuration;

        public QrLinksController(
            IEventService eventService,
            ITouristObjectService touristObjectService,
            IConfiguration configuration)
        {
            _eventService = eventService;
            _touristObjectService = touristObjectService;
            _configuration = configuration;
        }

        [HttpGet("platform")]
        public ActionResult<QrLinkDto> GetPlatformQr()
        {
            return Ok(BuildQrLink("Turisticka aplikacija", "/home"));
        }

        [HttpGet("events/{id:int}")]
        public async Task<ActionResult<QrLinkDto>> GetEventQr(int id)
        {
            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null)
                return NotFound();

            return Ok(BuildQrLink($"Event: {ev.Name}", $"/event/{id}"));
        }

        [HttpGet("objects/{id:int}")]
        public async Task<ActionResult<QrLinkDto>> GetObjectQr(int id)
        {
            var obj = await _touristObjectService.GetByIdAsync(id);
            if (obj == null)
                return NotFound();

            return Ok(BuildQrLink($"Objekat: {obj.Name}", $"/object/{id}"));
        }

        private QrLinkDto BuildQrLink(string label, string relativePath)
        {
            var baseUrl = ResolvePublicAppBaseUrl();
            var targetUrl = $"{baseUrl}/{relativePath.TrimStart('/')}";

            return new QrLinkDto
            {
                Label = label,
                TargetUrl = targetUrl,
                QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=280x280&data={Uri.EscapeDataString(targetUrl)}"
            };
        }

        private string ResolvePublicAppBaseUrl()
        {
            var configuredBaseUrl = _configuration["PublicApp:BaseUrl"];

            if (string.IsNullOrWhiteSpace(configuredBaseUrl))
                return DefaultPublicAppBaseUrl;

            return configuredBaseUrl.Trim().TrimEnd('/');
        }
    }
}
