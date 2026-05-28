using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/objects/{objectId}/images")]
    public class ObjectImagesController : ControllerBase
    {
        private readonly IImageService _service;

        public ObjectImagesController(IImageService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int objectId)
        {
            try
            {
                return Ok(await _service.GetForObjectAsync(objectId));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("main")]
        public async Task<IActionResult> GetMain(int objectId)
        {
            try
            {
                var img = await _service.GetMainForObjectAsync(objectId);
                return img == null ? NotFound(new { message = "No main image found for this object." }) : Ok(img);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "ContentCreator")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Add(int objectId, [FromForm] AddImageDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.AddToObjectAsync(objectId, dto, GetUserId(), GetRole());
                return CreatedAtAction(nameof(ImagesController.GetById), "Image", new { id = result.Id }, result);
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
