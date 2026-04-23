using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegionsController : ControllerBase
    {
        private readonly IRegionService _regionService;

        public RegionsController(IRegionService regionService)
        {
            _regionService = regionService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var regions = await _regionService.GetAllAsync(includeInactive);
            return Ok(regions);
        }

        [HttpGet("default")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDefault()
        {
            var region = await _regionService.GetDefaultAsync();
            if (region == null)
                return NotFound();

            return Ok(region);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var region = await _regionService.GetByIdAsync(id);
            if (region == null)
                return NotFound();

            return Ok(region);
        }
    }
}
