using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;

        public EventsController(IEventService eventService)
        {
            _eventService = eventService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] EventQueryDto query)
        {
            try
            {
                var result = await _eventService.GetAllAsync(query);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("nearby")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNearby([FromQuery] NearbyEventQueryDto query)
        {
            try
            {
                var result = await _eventService.GetNearbyAsync(query);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /*[HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] EventQueryDto query)
        {
            var result = await _eventService.SearchAsync(query);
            return Ok(result);
        }*/

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var roleName = User.FindFirstValue(ClaimTypes.Role);
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

                if (string.Equals(roleName, "ContentCreator", StringComparison.OrdinalIgnoreCase))
                {
                    var ownEvent = await _eventService.GetMineByIdAsync(id, userId);
                    if (ownEvent != null)
                        return Ok(ownEvent);
                }
                else if (string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase))
                {
                    var managedEvent = await _eventService.GetForManagerByIdAsync(id, userId);
                    if (managedEvent != null)
                        return Ok(managedEvent);
                }
            }

            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound();
            return Ok(ev);
        }

        [HttpGet("my")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> GetMy([FromQuery] EventQueryDto query)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _eventService.GetMyAsync(userId, query);
            return Ok(result);
        }

        [HttpGet("manager")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> GetForManager([FromQuery] EventQueryDto query)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _eventService.GetForManagerAsync(userId, query);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Create([FromBody] CreateEventDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var created = await _eventService.CreateAsync(dto, userId, roleName);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _eventService.UpdateAsync(id, dto, userId, roleName);
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
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _eventService.ApproveAsync(id, dto, userId, roleName);
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

                var updated = await _eventService.ToggleActiveAsync(id, dto.IsActive, userId, roleName);
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
                var deleted = await _eventService.DeleteAsync(id, userId, roleName);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
