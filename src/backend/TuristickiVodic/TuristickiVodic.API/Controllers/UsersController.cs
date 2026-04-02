using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Services;
using System.IdentityModel.Tokens.Jwt;

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

        // Samo Admin može da vidi sve korisnike
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        // Korisnik može da vidi samo sebe; Admin može svakoga
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && currentUserId != id)
                return Forbid();

            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        // Samo Admin može da traži korisnika po emailu
        [HttpGet("email/{email}")]
        [Authorize(Roles = "Admin")]
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

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto refreshTokenDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _userService.RefreshTokenAsync(refreshTokenDto);
                if (response == null)
                    return Unauthorized(new { message = "Invalid or expired refresh token" });

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

            var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;
            DateTime? expiresAtUtc = null;

            if (long.TryParse(expClaim, out var expUnix))
            {
                expiresAtUtc = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            }

            var success = await _userService.LogoutAsync(userId, jti, expiresAtUtc);

            if (!success)
                return NotFound();

            return Ok(new { message = "Logged out successfully." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto updateUserDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && currentUserId != id)
                return Forbid();

            var user = await _userService.UpdateAsync(id, updateUserDto);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        // Korisnik može da menja lozinku samo sebi; Admin može svakome
        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && currentUserId != id)
                return Forbid();

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

        // Samo Tourist može da pošalje zahtev, i to samo u svoje ime
        [HttpPost("{id}/request-creator")]
        [Authorize(Roles = "Tourist")]
        public async Task<IActionResult> RequestCreatorRole(int id, [FromBody] string creatorType)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            if (currentUserId != id)
                return Forbid();

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

        // Samo Admin može da odobri ContentCreator ulogu
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

        // Samo Admin može da aktivira/deaktivira korisnike
        [HttpPost("{id}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id, [FromBody] bool isActive)
        {
            var result = await _userService.ToggleUserActiveAsync(id, isActive);
            if (!result)
                return NotFound();

            return Ok(new { message = $"User {(isActive ? "activated" : "deactivated")} successfully" });
        }

        // Samo Admin može da briše korisnike, ali ne i sam sebe
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            if (currentUserId == id)
                return BadRequest(new { message = "Admin cannot delete their own account" });

            var result = await _userService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}
