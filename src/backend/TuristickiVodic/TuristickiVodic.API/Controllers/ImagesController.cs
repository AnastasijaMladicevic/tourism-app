using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/images")]
    [Authorize]
    public class ImagesController : ControllerBase
    {
        private readonly IImageService _service;

        public ImagesController(IImageService service)
        {
            _service = service;
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var image = await _service.GetByIdAsync(id);
            if (image == null)
                return NotFound();

            return Ok(image);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ContentCreator,Manager,Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateImageDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var updated = await _service.UpdateAsync(id, dto, GetUserId(), GetRoleName());
                if (updated == null)
                    return NotFound();

                return Ok(updated);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (DestinationEditLockException ex)
            {
                return Conflict(ex.LockState);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "ContentCreator,Manager,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _service.DeleteAsync(id, GetUserId(), GetRoleName());
                if (!success)
                    return NotFound();

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (DestinationEditLockException ex)
            {
                return Conflict(ex.LockState);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/set-main")]
        [Authorize(Roles = "ContentCreator,Manager,Admin")]
        public async Task<IActionResult> SetMain(int id)
        {
            try
            {
                var updated = await _service.SetMainImageAsync(id, GetUserId(), GetRoleName());
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (DestinationEditLockException ex)
            {
                return Conflict(ex.LockState);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(value!);
        }

        private string GetRoleName()
        {
            return User.FindFirstValue(ClaimTypes.Role)!;
        }
    }
}
