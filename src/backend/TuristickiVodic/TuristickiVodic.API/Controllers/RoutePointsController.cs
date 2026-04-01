using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/routes/{routeId}/points")]
    public class RoutePointsController : ControllerBase
    {
        private readonly IRoutePointService _routePointService;

        public RoutePointsController(IRoutePointService routePointService)
        {
            _routePointService = routePointService;
        }

        // Svi mogu da vide tačke rute
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetByRoute(int routeId)
        {
            try
            {
                var points = await _routePointService.GetByRouteAsync(routeId);
                return Ok(points);
            }
            catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
        }

        // Svi mogu da vide pojedinačnu tačku
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int routeId, int id)
        {
            var point = await _routePointService.GetByIdAsync(id);
            if (point == null || point.RouteId != routeId) return NotFound();
            return Ok(point);
        }

        // Samo vlasnik rute može da dodaje tačke
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Add(int routeId, [FromBody] CreateRoutePointDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var created = await _routePointService.AddAsync(routeId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { routeId, id = created.Id }, created);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Samo vlasnik rute može da menja tačku
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int routeId, int id, [FromBody] UpdateRoutePointDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var updated = await _routePointService.UpdateAsync(id, dto, userId);
                if (updated == null || updated.RouteId != routeId) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Samo vlasnik rute može da briše tačku
        // Ruta mora imati minimum 2 tačke
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int routeId, int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var deleted = await _routePointService.DeleteAsync(id, userId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
