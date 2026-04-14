using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoutesController : ControllerBase
    {
        private readonly IRouteService _routeService;

        public RoutesController(IRouteService routeService)
        {
            _routeService = routeService;
        }

        // Svi mogu da vide rute
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] RouteQueryDto query)
        {
            var routes = await _routeService.GetAllAsync(query);
            return Ok(routes);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var route = await _routeService.GetByIdAsync(id);
            if (route == null) return NotFound();
            return Ok(route);
        }

        // Svaki ulogovani korisnik može da kreira rutu
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] CreateRouteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var created = await _routeService.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Samo vlasnik može da menja rutu
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRouteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var updated = await _routeService.UpdateAsync(id, dto, userId);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Samo vlasnik može da obriše rutu
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var deleted = await _routeService.DeleteAsync(id, userId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
