using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/deletion-requests")]
    public class DeletionRequestsController : ControllerBase
    {
        private readonly IDeletionRequestService _deletionRequestService;

        public DeletionRequestsController(IDeletionRequestService deletionRequestService)
        {
            _deletionRequestService = deletionRequestService;
        }

        // CC podnosi zahtev za brisanje svog Approved objekta
        [HttpPost("/api/objects/{objectId}/deletion-request")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> CreateForObject(int objectId, [FromBody] CreateDeletionRequestDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await _deletionRequestService.CreateForObjectAsync(objectId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // CC podnosi zahtev za brisanje svog Approved eventa
        [HttpPost("/api/events/{eventId}/deletion-request")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> CreateForEvent(int eventId, [FromBody] CreateDeletionRequestDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await _deletionRequestService.CreateForEventAsync(eventId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // CC vidi samo svoje zahteve
        [HttpGet("my")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> GetMyRequests()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _deletionRequestService.GetByUserIdAsync(userId);
            return Ok(result);
        }

        // CC vidi samo svoj konkretan zahtev
        [HttpGet("{id}")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var request = await _deletionRequestService.GetByIdForUserAsync(id, userId);

            if (request == null)
                return NotFound();

            return Ok(request);
        }

        // Menadžer vidi zahteve za svoju destinaciju
        // Admin može da vidi zahteve za destinacije koje (izuzetno) nemaju menadžera
        [HttpGet]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> GetAll()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var roleName = User.FindFirstValue(ClaimTypes.Role)!;
            var requests = await _deletionRequestService.GetAllAsync(userId, roleName);
            return Ok(requests);
        }

        // Samo menadžer (ili odgovorni menadžer za destinacije bez menadžera) odobrava ili odbija zahtev
        [HttpPost("{requestId}/review")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Review(int requestId, [FromBody] ApproveDeletionRequestDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var result = await _deletionRequestService.ReviewAsync(requestId, dto, userId, roleName);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}