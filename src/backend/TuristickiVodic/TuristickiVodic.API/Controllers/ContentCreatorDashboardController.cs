using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/content-creator/dashboard")]
    [Authorize(Roles = "ContentCreator")]
    public class ContentCreatorDashboardController : ControllerBase
    {
        private readonly IContentCreatorDashboardService _contentCreatorDashboardService;

        public ContentCreatorDashboardController(IContentCreatorDashboardService contentCreatorDashboardService)
        {
            _contentCreatorDashboardService = contentCreatorDashboardService;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview([FromQuery] string? period = null, [FromQuery] int? days = null)
        {
            var creatorId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var overview = await _contentCreatorDashboardService.GetOverviewAsync(creatorId, period, days);
            return Ok(overview);
        }
    }
}
