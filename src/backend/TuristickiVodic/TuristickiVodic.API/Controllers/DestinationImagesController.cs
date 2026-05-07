using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/destinations/{destinationId}/images")]
    public class DestinationImagesController : ControllerBase
    {
        private readonly IImageService _service;

        public DestinationImagesController(IImageService service)
        {
            _service = service;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int destinationId)
        {
            try
            {
                var images = await _service.GetForDestinationAsync(destinationId);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("main")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMain(int destinationId)
        {
            try
            {
                var image = await _service.GetMainForDestinationAsync(destinationId);
                if (image == null)
                    return NotFound(new { message = "No main image found for this destination." });
                return Ok(image);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Add(int destinationId, [FromForm] AddImageDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var created = await _service.AddToDestinationAsync(destinationId, dto, GetUserId(), GetRole());
                return CreatedAtAction(nameof(ImagesController.GetById), "Image", new { id = created.Id }, created);
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
        private string GetRole() => User.FindFirstValue(ClaimTypes.Role)!;
    }
}
