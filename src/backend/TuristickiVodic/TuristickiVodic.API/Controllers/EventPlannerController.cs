using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/event-planner")]
    [Authorize(Roles = "Tourist")]
    public class EventPlannerController : ControllerBase
    {
        private readonly IEventPlannerService _eventPlannerService;

        public EventPlannerController(IEventPlannerService eventPlannerService)
        {
            _eventPlannerService = eventPlannerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyPlanner()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var items = await _eventPlannerService.GetMyPlannerAsync(userId);
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] CreateEventPlannerDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var created = await _eventPlannerService.AddAsync(dto, userId);
                return CreatedAtAction(nameof(GetMyPlanner), created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remove(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var removed = await _eventPlannerService.RemoveAsync(id, userId);

            if (!removed)
                return NotFound(new { message = "Planner item not found or does not belong to you." });

            return NoContent();
        }
    }
}
