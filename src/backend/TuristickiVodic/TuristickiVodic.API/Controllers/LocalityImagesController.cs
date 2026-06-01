using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/localities/{localityId}/images")]
    public class LocalityImagesController : ControllerBase
    {
        private readonly IImageService _imageService;

        public LocalityImagesController(IImageService imageService)
        {
            _imageService = imageService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int localityId)
        {
            try
            {
                var images = await _imageService.GetForLocalityAsync(localityId);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("main")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMain(int localityId)
        {
            try
            {
                var image = await _imageService.GetMainForLocalityAsync(localityId);
                if (image == null)
                    return NotFound(new { message = "No main image found for this locality." });
                return Ok(image);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "ContentCreator,Manager,Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Add(int localityId, [FromForm] AddImageDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var created = await _imageService.AddToLocalityAsync(localityId, dto, GetUserId(), GetRoleName());
                return Created($"/api/images/{created.Id}", created);
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

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetRoleName() => User.FindFirstValue(ClaimTypes.Role)!;
    }
}
