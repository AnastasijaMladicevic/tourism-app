using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/admin/geo")]
    [AllowAnonymous] // TEMP for one-time boundary import - restore [Authorize(Roles = "Admin")] before commit
    public class GeoAdminController : ControllerBase
    {
        private readonly IGeoBoundaryService _geoBoundaryService;

        public GeoAdminController(IGeoBoundaryService geoBoundaryService)
        {
            _geoBoundaryService = geoBoundaryService;
        }

        [HttpPost("fetch-boundaries")]
        public async Task<IActionResult> FetchBoundaries(CancellationToken cancellationToken)
        {
            var failures = await _geoBoundaryService.FetchAndStoreBoundariesAsync(cancellationToken);
            return Ok(new { failures });
        }
    }
}
