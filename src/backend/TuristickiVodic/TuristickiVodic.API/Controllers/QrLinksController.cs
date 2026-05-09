using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/qr-links")]
    [AllowAnonymous]
    public class QrLinksController : ControllerBase
    {
        private const string DefaultPublicAppBaseUrl = "http://localhost:4200";

        private readonly IDestinationService _destinationService;
        private readonly ILocalityService _localityService;
        private readonly IEventService _eventService;
        private readonly IActivityService _activityService;
        private readonly ITouristObjectService _touristObjectService;
        private readonly IConfiguration _configuration;

        public QrLinksController(
            IDestinationService destinationService,
            ILocalityService localityService,
            IEventService eventService,
            IActivityService activityService,
            ITouristObjectService touristObjectService,
            IConfiguration configuration)
        {
            _destinationService = destinationService;
            _localityService = localityService;
            _eventService = eventService;
            _activityService = activityService;
            _touristObjectService = touristObjectService;
            _configuration = configuration;
        }

        [HttpGet("platform")]
        public ActionResult<QrLinkDto> GetPlatformQr()
        {
            return Ok(BuildQrLink("Turisticka aplikacija", "/home"));
        }

        [HttpGet("destinations/{id:int}")]
        public async Task<ActionResult<QrLinkDto>> GetDestinationQr(int id)
        {
            var destination = await _destinationService.GetByIdAsync(id, null, "Tourist");
            if (destination == null)
                return NotFound();

            return Ok(BuildQrLink(
                $"Destinacija: {destination.Name}",
                $"/destination/{id}"));
        }

        [HttpGet("localities/{id:int}")]
        public async Task<ActionResult<QrLinkDto>> GetLocalityQr(int id)
        {
            var locality = await _localityService.GetByIdAsync(id);
            if (locality == null)
                return NotFound();

            return Ok(BuildQrLink(
                $"Lokalitet: {locality.Name}",
                $"/locality/{id}"));
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

        [HttpGet("activities/{id:int}")]
        public async Task<ActionResult<QrLinkDto>> GetActivityQr(int id)
        {
            var activity = await _activityService.GetByIdAsync(id);
            if (activity == null)
                return NotFound();

            return Ok(BuildQrLink($"Aktivnost: {activity.Name}", $"/activity/{id}"));
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

            if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
                return configuredBaseUrl.Trim().TrimEnd('/');

            var autoDetectLocalNetworkBaseUrl = _configuration.GetValue<bool>("PublicApp:AutoDetectLocalNetworkBaseUrl");
            if (autoDetectLocalNetworkBaseUrl)
            {
                var frontendPort = _configuration.GetValue<int?>("PublicApp:FrontendPort") ?? 4200;
                var detectedLocalNetworkIp = DetectLocalNetworkIpv4();

                if (!string.IsNullOrWhiteSpace(detectedLocalNetworkIp))
                    return $"http://{detectedLocalNetworkIp}:{frontendPort}";
            }

            return DefaultPublicAppBaseUrl;
        }

        private static string? DetectLocalNetworkIpv4()
        {
            var candidate = NetworkInterface.GetAllNetworkInterfaces()
                .Where(network =>
                    network.OperationalStatus == OperationalStatus.Up &&
                    network.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    network.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                .Select(network => new
                {
                    Network = network,
                    Properties = network.GetIPProperties()
                })
                .SelectMany(item => item.Properties.UnicastAddresses.Select(address => new
                {
                    Address = address.Address,
                    Score = CalculateNetworkScore(item.Network, item.Properties, address.Address)
                }))
                .Where(item =>
                    item.Address.AddressFamily == AddressFamily.InterNetwork &&
                    !IPAddress.IsLoopback(item.Address) &&
                    !item.Address.ToString().StartsWith("169.254."))
                .OrderByDescending(item => item.Score)
                .FirstOrDefault();

            return candidate?.Address.ToString();
        }

        private static int CalculateNetworkScore(NetworkInterface network, IPInterfaceProperties properties, IPAddress address)
        {
            var score = 0;

            if (properties.GatewayAddresses.Any(gateway => gateway.Address.AddressFamily == AddressFamily.InterNetwork))
                score += 100;

            if (network.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                score += 50;

            if (network.NetworkInterfaceType == NetworkInterfaceType.Ethernet)
                score += 40;

            if (!network.Description.Contains("Virtual", StringComparison.OrdinalIgnoreCase))
                score += 20;

            if (address.ToString().StartsWith("192.168.") || address.ToString().StartsWith("10.") || address.ToString().StartsWith("172."))
                score += 10;

            return score;
        }
    }
}
