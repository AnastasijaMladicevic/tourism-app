using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.API.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/reviews/{reviewId}/images")]
    public class ReviewImagesController : ControllerBase
    {
        private readonly IReviewImageService _reviewImageService;

        public ReviewImagesController(IReviewImageService reviewImageService)
        {
            _reviewImageService = reviewImageService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int reviewId)
        {
            try
            {
                return Ok(await _reviewImageService.GetForReviewAsync(reviewId));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Tourist")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Add(int reviewId, [FromForm] UploadReviewImagesDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var role = User.FindFirstValue(ClaimTypes.Role)!;
                var result = await _reviewImageService.AddAsync(reviewId, dto.Files, userId, role);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
