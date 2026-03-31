using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ObjectsController : ControllerBase
    {
        private readonly ITouristObjectService _objectService;

        public ObjectsController(ITouristObjectService objectService)
        {
            _objectService = objectService;
        }

        // Svi mogu da vide objekte
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var objects = await _objectService.GetAllAsync();
            return Ok(objects);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var obj = await _objectService.GetByIdAsync(id);
            if (obj == null) return NotFound();
            return Ok(obj);
        }

        // Samo CC može da dodaje objekte
        [HttpPost]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Create([FromBody] CreateTouristObjectDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var created = await _objectService.CreateAsync(dto, userId, roleName);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Samo CC može da menja objekte, i to samo svoje
        [HttpPut("{id}")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTouristObjectDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _objectService.UpdateAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Menadžer odobrava/odbija objekte u svojoj destinaciji
        // Ako destinacija nema Menadžera, odobrava Admin
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveContentDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _objectService.ApproveAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // CC briše samo svoje Pending objekte; Menadžer/Admin mogu sve (bez recenzija)
        [HttpDelete("{id}")]
        [Authorize(Roles = "ContentCreator,Manager,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var deleted = await _objectService.DeleteAsync(id, userId, roleName);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
