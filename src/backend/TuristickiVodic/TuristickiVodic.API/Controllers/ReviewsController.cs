using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var reviews = await _reviewService.GetAllAsync();
            return Ok(reviews);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var review = await _reviewService.GetByIdAsync(id);
            if (review == null) return NotFound();
            return Ok(review);
        }

        // Samo Tourist može da piše recenziju
        [HttpPost]
        [Authorize(Roles = "Tourist")]
        public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var created = await _reviewService.CreateAsync(dto, userId, roleName);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Tourist menja svoju recenziju (rating/tekst)
        [HttpPut("{id}")]
        [Authorize(Roles = "Tourist")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _reviewService.UpdateAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // ContentCreator odgovara na recenziju za svoj objekat
        [HttpPost("{id}/respond")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> Respond(int id, [FromBody] RespondToReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _reviewService.RespondAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ContentCreator menja odgovor na recenziju za svoj objekat
        [HttpPut("{id}/respond")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> UpdateResponse(int id, [FromBody] RespondToReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _reviewService.UpdateResponseAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ContentCreator briše odgovor na recenziju za svoj objekat
        [HttpDelete("{id}/respond")]
        [Authorize(Roles = "ContentCreator")]
        public async Task<IActionResult> DeleteResponse(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _reviewService.DeleteResponseAsync(id, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Menadžer (ili Admin ako nema menadžera) odobrava/odbija recenziju
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var updated = await _reviewService.ApproveAsync(id, dto, userId, roleName);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // Tourist briše svoju, Admin briše bilo koju
        [HttpDelete("{id}")]
        [Authorize(Roles = "Tourist,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var deleted = await _reviewService.DeleteAsync(id, userId, roleName);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
