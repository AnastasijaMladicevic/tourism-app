using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActivitiesController : ControllerBase
    {
        private readonly IActivityService _activityService;

        public ActivitiesController(IActivityService activityService)
        {
            _activityService = activityService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var activities = await _activityService.GetAllAsync();
            return Ok(activities);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var activity = await _activityService.GetByIdAsync(id);
            if (activity == null) return NotFound();
            return Ok(activity);
        }

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] ActivityQueryDto query)
        {
            var result = await _activityService.SearchAsync(query);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Create([FromBody] CreateActivityDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var created = await _activityService.CreateAsync(dto, userId, roleName);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateActivityDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _activityService.UpdateAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveContentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _activityService.ApproveAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/toggle-active")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> ToggleActive(int id, [FromBody] ToggleActiveDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;

                var updated = await _activityService.ToggleActiveAsync(id, dto.IsActive, userId, roleName);
                if (updated == null) return NotFound();

                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var deleted = await _activityService.DeleteAsync(id, userId, roleName);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}