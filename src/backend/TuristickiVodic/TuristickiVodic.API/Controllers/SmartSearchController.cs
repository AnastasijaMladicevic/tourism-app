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

        public SmartSearchController(ISmartSearchService smartSearchService)
        {
            _smartSearchService = smartSearchService;
        }

        [HttpGet("smart")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] SmartSearchQueryDto query)
        {
            var userId = TryGetCurrentUserId();
            var results = await _smartSearchService.SearchAsync(userId, query);
            return Ok(results);
        }

        private int? TryGetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var userId) ? userId : null;
        }
    }
}
