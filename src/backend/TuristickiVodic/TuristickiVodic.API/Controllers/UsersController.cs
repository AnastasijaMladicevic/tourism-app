using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using System.IdentityModel.Tokens.Jwt;
using SixLabors.ImageSharp;

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

        // Samo Admin može da vidi sve korisnike + paginacija
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] UserQueryDto query)
        {
            var users = await _userService.GetAllAsync(query);
            return Ok(NormalizeUsers(users));
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

            return Ok(NormalizeUser(user));
        }

        [HttpGet("me/location")]
        public async Task<IActionResult> GetMyLocation()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var location = await _userService.GetCurrentLocationAsync(currentUserId);

            if (location == null)
                return NotFound();

            return Ok(location);
        }

        [HttpGet("me/preferred-region")]
        public async Task<IActionResult> GetMyPreferredRegion()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var region = await _userService.GetPreferredRegionAsync(currentUserId);

            if (region == null)
                return NotFound();

            return Ok(region);
        }

        [HttpGet("me/two-factor-settings")]
        public async Task<IActionResult> GetMyTwoFactorSettings()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var settings = await _userService.GetTwoFactorSettingsAsync(currentUserId);

            if (settings == null)
                return NotFound();

            return Ok(settings);
        }

        [HttpPut("me/two-factor-settings")]
        public async Task<IActionResult> UpdateMyTwoFactorSettings([FromBody] UpdateTwoFactorSettingsDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var settings = await _userService.UpdateTwoFactorSettingsAsync(currentUserId, dto);

            if (settings == null)
                return NotFound();

            return Ok(settings);
        }

        [HttpPut("me/preferred-region")]
        public async Task<IActionResult> UpdateMyPreferredRegion([FromBody] UpdateUserPreferredRegionDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var region = await _userService.UpdatePreferredRegionAsync(currentUserId, dto);
                if (region == null)
                    return NotFound();

                return Ok(region);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("me/location")]
        public async Task<IActionResult> UpdateMyLocation([FromBody] UpdateUserLocationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var location = await _userService.UpdateCurrentLocationAsync(currentUserId, dto);

            if (location == null)
                return NotFound();

            return Ok(location);
        }

        [HttpGet("me/location/history")]
        public async Task<IActionResult> GetMyLocationHistory([FromQuery] UserLocationHistoryQueryDto query)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var history = await _userService.GetLocationHistoryAsync(currentUserId, query);
            return Ok(history);
        }

        [HttpGet("me/location/path")]
        public async Task<IActionResult> GetMyLocationPath([FromQuery] UserLocationPathQueryDto query)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var path = await _userService.GetLocationPathAsync(currentUserId, query);
            return Ok(path);
        }

        [HttpDelete("me/location")]
        public async Task<IActionResult> ClearMyLocation()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var cleared = await _userService.ClearCurrentLocationAsync(currentUserId);

            if (!cleared)
                return NotFound();

            return NoContent();
        }

        [HttpGet("me/visited-places")]
        public async Task<IActionResult> GetMyVisitedPlaces([FromQuery] int limit = 12)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var visitedPlaces = await _userService.GetVisitedPlacesAsync(currentUserId, limit);
            return Ok(visitedPlaces);
        }

        [HttpPost("me/location-share")]
        public async Task<IActionResult> CreateLocationShare([FromBody] CreateLocationShareDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var share = await _userService.CreateLocationShareAsync(currentUserId, dto);
                return Ok(share);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpGet("location-share")]
        public async Task<IActionResult> GetSharedLocation([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "Token is required." });

            var location = await _userService.ResolveLocationShareAsync(token);
            if (location == null)
                return NotFound(new { message = "Shared location is not available." });

            return Ok(location);
        }

        [HttpDelete("me/location/history")]
        public async Task<IActionResult> ClearMyLocationHistory()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var cleared = await _userService.ClearLocationHistoryAsync(currentUserId);

            if (!cleared)
                return NotFound();

            return NoContent();
        }

        // Samo Admin može da traži korisnika po emailu
        [HttpGet("email/{email}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetByEmail(string email)
        {
            var user = await _userService.GetByEmailAsync(email);
            if (user == null)
                return NotFound();

            return Ok(NormalizeUser(user));
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
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, NormalizeUser(user));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("register-manager")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterManager([FromBody] CreateUserDto createUserDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var user = await _userService.CreateManagerAsync(createUserDto);
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, NormalizeUser(user));
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("register-admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterAdmin([FromBody] CreateUserDto createUserDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var user = await _userService.CreateAdminAsync(createUserDto);
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, NormalizeUser(user));
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
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

                return Ok(NormalizeAuthResponse(response));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login/verify-2fa")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyTwoFactorLogin([FromBody] VerifyTwoFactorLoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _userService.VerifyTwoFactorLoginAsync(dto);
                return Ok(NormalizeAuthResponse(response));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login/resend-2fa")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendTwoFactorLoginCode([FromBody] ResendTwoFactorLoginCodeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _userService.ResendTwoFactorLoginCodeAsync(dto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _userService.ForgotPasswordAsync(forgotPasswordDto);
                return Ok(new { message = "Reset code has been sent to the provided email address." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("verify-reset-code")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyResetCode([FromBody] VerifyResetCodeDto verifyResetCodeDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _userService.VerifyResetCodeAsync(verifyResetCodeDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _userService.ResetPasswordAsync(resetPasswordDto);
                return Ok(new { message = "Password reset successfully." });
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

                return Ok(NormalizeAuthResponse(response));
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

            return Ok(NormalizeUser(user));
        }

        // Korisnik može da menja lozinku samo sebi; Admin može svakome
        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var roleName = User.FindFirst(ClaimTypes.Role)!.Value;
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && currentUserId != id)
                return Forbid();

            try
            {
                await _userService.ChangePasswordAsync(id, changePasswordDto, currentUserId, roleName);
                return Ok(new { message = "Password changed successfully" });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/profile-image")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> UpdateProfileImage(int id, [FromForm] UploadProfileImageDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            if (currentUserId != id)
                return Forbid();

            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { message = "Image file is required." });

            if (dto.File.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Image size must not exceed 5MB." });

            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg" };
            var allowedContentTypes = new[] { "image/png", "image/jpeg" };

            var extension = Path.GetExtension(dto.File.FileName).ToLowerInvariant();
            var contentType = dto.File.ContentType?.ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Only PNG, JPG and JPEG formats are allowed." });

            if (string.IsNullOrWhiteSpace(contentType) || !allowedContentTypes.Contains(contentType))
                return BadRequest(new { message = "Only PNG, JPG and JPEG formats are allowed." });

            try
            {
                using var image = await Image.LoadAsync(dto.File.OpenReadStream());
            }
            catch
            {
                return BadRequest(new { message = "Fajl nije ispravna slika." });
            }

            try
            {
                var user = await _userService.UpdateProfileImageAsync(id, dto.File);
                if (user == null)
                    return NotFound();

                return Ok(NormalizeUser(user));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}/profile-image")]
        public async Task<IActionResult> RemoveProfileImage(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            if (currentUserId != id)
                return Forbid();

            var user = await _userService.RemoveProfileImageAsync(id);
            if (user == null)
                return NotFound();

            return Ok(NormalizeUser(user));
        }

        [HttpGet("creator-requests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetCreatorRequests([FromQuery] CreatorRoleRequestQueryDto query)
        {
            var requests = await _userService.GetCreatorRequestsAsync(query);
            return Ok(requests);
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reject-creator")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectCreatorRole(int id)
        {
            try
            {
                var result = await _userService.RejectCreatorRoleAsync(id);
                if (!result)
                    return NotFound();

                return Ok(new { message = "Creator role request rejected successfully" });
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

        [HttpPost("{id}/demote-creator")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DemoteCreatorRole(int id)
        {
            try
            {
                var result = await _userService.DemoteCreatorRoleAsync(id);
                if (!result)
                    return NotFound();

                return Ok(new { message = "Content creator moved back to tourist role successfully" });
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

        // Samo Admin može da aktivira/deaktivira korisnike
        [HttpPost("{id}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id, [FromBody] ToggleUserActiveDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var isActive = dto.State == UserAccountState.Active;
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

            try
            {
                var result = await _userService.DeleteAsync(id);
                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private PagedResultDto<UserDto> NormalizeUsers(PagedResultDto<UserDto> result)
        {
            foreach (var user in result.Items)
            {
                NormalizeUser(user);
            }

            return result;
        }

        private AuthResponseDto NormalizeAuthResponse(AuthResponseDto response)
        {
            NormalizeUser(response.User);
            return response;
        }

        private UserDto? NormalizeUser(UserDto? user)
        {
            if (user == null)
                return null;

            user.ProfileImageUrl = BuildAbsoluteProfileImageUrl(user.ProfileImageUrl);
            return user;
        }

        private string? BuildAbsoluteProfileImageUrl(string? profileImageUrl)
        {
            if (string.IsNullOrWhiteSpace(profileImageUrl))
                return profileImageUrl;

            if (Uri.IsWellFormedUriString(profileImageUrl, UriKind.Absolute))
                return profileImageUrl;

            if (!Request.Host.HasValue || !profileImageUrl.StartsWith("/"))
                return profileImageUrl;

            return $"{Request.Scheme}://{Request.Host.Value}{profileImageUrl}";
        }
    }
}
