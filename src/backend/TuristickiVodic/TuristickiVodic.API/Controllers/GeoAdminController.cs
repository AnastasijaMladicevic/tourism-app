using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/admin/geo")]
    [Authorize(Roles = "Admin")]
    public class GeoAdminController : ControllerBase
    {
        private readonly IGeoBoundaryService _geoBoundaryService;

        public GeoAdminController(IGeoBoundaryService geoBoundaryService)
        {
            _geoBoundaryService = geoBoundaryService;
        }

        [HttpPost("fetch-boundaries")]
        public async Task<IActionResult> FetchBoundaries([FromQuery] string? names, CancellationToken cancellationToken)
        {
            ISet<string>? nameFilter = string.IsNullOrWhiteSpace(names)
                ? null
                : names.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet();

            var failures = await _geoBoundaryService.FetchAndStoreBoundariesAsync(nameFilter, cancellationToken);
            return Ok(new { failures });
        }
    }
}
