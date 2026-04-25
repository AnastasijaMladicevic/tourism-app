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
        public async Task<IActionResult> Search([FromQuery] SmartSearchQueryDto query)
        {
            _logger.LogWarning("SEARCH DEBUG: Query='{Query}' Mode='{Mode}'", query.Query, query.Mode);
            var userId = TryGetCurrentUserId();
            var results = await _smartSearchService.SearchAsync(userId, query);
            _logger.LogWarning("SEARCH DEBUG: Returned {Count} results", results.Count);
            return Ok(results);
        }

        [HttpGet("mcp")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchMcp([FromQuery] SmartSearchQueryDto query)
        {
            query.Mode = "mcp";
            _logger.LogWarning("MCP DEBUG: Query='{Query}' Mode='{Mode}'", query.Query, query.Mode);
            var userId = TryGetCurrentUserId();
            var results = await _smartSearchService.SearchAsync(userId, query);
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