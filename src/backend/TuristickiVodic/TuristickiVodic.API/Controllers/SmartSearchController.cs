using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/search")]
    public class SmartSearchController : ControllerBase
    {
        private readonly ISmartSearchService _smartSearchService;
        private readonly ILogger<SmartSearchController> _logger;

        public SmartSearchController(ISmartSearchService smartSearchService, ILogger<SmartSearchController> logger)
        {
            _smartSearchService = smartSearchService;
            _logger = logger;
        }

        [HttpGet("smart")]
        [AllowAnonymous]
        public async Task<IActionResult> Search(
        [FromQuery(Name = "query")] string query,
        [FromQuery] string mode = "smart",
        [FromQuery] int pageSize = 8,
        [FromQuery] int? regionId = null,
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null)
            {
                var dto = new SmartSearchQueryDto
                {
                    Query = query ?? string.Empty,
                    Mode = mode,
                    PageSize = pageSize,
                    RegionId = regionId,
                    Latitude = latitude,
                    Longitude = longitude
                };

                _logger.LogWarning("SEARCH DEBUG: Query='{Query}' Mode='{Mode}'", dto.Query, dto.Mode);

                var userId = TryGetCurrentUserId();

                var results = await _smartSearchService.SearchAsync(userId, dto);

                _logger.LogWarning("SEARCH DEBUG: Returned {Count} results", results.Count);

                return Ok(results);
            }

        [HttpGet("mcp")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchMcp(
        [FromQuery(Name = "query")] string query,
        [FromQuery] int pageSize = 8,
        [FromQuery] int? regionId = null,
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null)
            {
                var dto = new SmartSearchQueryDto
                {
                    Query = query ?? string.Empty,
                    Mode = "mcp",
                    PageSize = pageSize,
                    RegionId = regionId,
                    Latitude = latitude,
                    Longitude = longitude
                };

                _logger.LogWarning("MCP DEBUG: Query='{Query}' Mode='{Mode}'", dto.Query, dto.Mode);

                var userId = TryGetCurrentUserId();

                var results = await _smartSearchService.SearchAsync(userId, dto);

                _logger.LogWarning("MCP DEBUG: Returned {Count} results", results.Count);

                return Ok(results);
            }

        private int? TryGetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var userId) ? userId : null;
        }
    }
}