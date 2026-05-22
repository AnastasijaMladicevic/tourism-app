using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/manager/dashboard")]
    [Authorize(Roles = "Manager")]
    public class ManagerDashboardController : ControllerBase
    {
        private readonly IManagerDashboardService _managerDashboardService;

        public ManagerDashboardController(IManagerDashboardService managerDashboardService)
        {
            _managerDashboardService = managerDashboardService;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview([FromQuery] string? period = null, [FromQuery] int? days = null)
        {
            var managerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var overview = await _managerDashboardService.GetOverviewAsync(managerId, period, days);
            return Ok(overview);
        }
    }
}
