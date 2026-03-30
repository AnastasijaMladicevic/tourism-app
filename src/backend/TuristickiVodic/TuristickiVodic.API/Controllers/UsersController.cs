using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpGet("email/{email}")]
        public async Task<IActionResult> GetByEmail(string email)
        {
            var user = await _userService.GetByEmailAsync(email);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] CreateUserDto createUserDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userService.CreateAsync(createUserDto);
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _userService.LoginAsync(loginDto);
                if (response == null)
                    return Unauthorized(new { message = "Invalid email or password" });

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto updateUserDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userService.UpdateAsync(id, updateUserDto);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _userService.ChangePasswordAsync(id, changePasswordDto);
                if (!result)
                    return NotFound();

                return Ok(new { message = "Password changed successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/request-creator")]
        public async Task<IActionResult> RequestCreatorRole(int id, [FromBody] string creatorType)
        {
            try
            {
                var result = await _userService.RequestCreatorRoleAsync(id, creatorType);
                if (!result)
                    return NotFound();

                return Ok(new { message = "Request sent successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve-creator")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveCreatorRole(int id)
        {
            try
            {
                var result = await _userService.ApproveCreatorRoleAsync(id);
                if (!result)
                    return NotFound();

                return Ok(new { message = "User approved as content creator successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id, [FromBody] bool isActive)
        {
            var result = await _userService.ToggleUserActiveAsync(id, isActive);
            if (!result)
                return NotFound();

            return Ok(new { message = $"User {(isActive ? "activated" : "deactivated")} successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _userService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}