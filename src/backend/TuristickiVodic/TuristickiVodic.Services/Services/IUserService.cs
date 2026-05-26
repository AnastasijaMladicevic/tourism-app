using Microsoft.AspNetCore.Http;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services
{
    public interface IUserService
    {
        Task<PagedResultDto<UserDto>> GetAllAsync(UserQueryDto query, int? requestingUserId = null);
        Task<UserDto?> GetByIdAsync(int id, int? requestingUserId = null);
        Task<UserDto?> GetByEmailAsync(string email);
        Task<UserDto> CreateAsync(CreateUserDto createUserDto);
        Task<UserDto> CreateManagerAsync(CreateUserDto createUserDto);
        Task<UserDto> CreateAdminAsync(CreateUserDto createUserDto);
        Task<UserDto?> UpdateAsync(int id, UpdateUserDto updateUserDto, int currentUserId, string roleName);
        Task<bool> DeleteAsync(int id);
        Task ChangePasswordAsync(int userId, ChangePasswordDto dto, int currentUserId, string roleName);
        Task<UserEditLockDto?> AcquireEditLockAsync(int userId, int requestingUserId);
        Task<UserEditLockDto?> RefreshEditLockAsync(int userId, int requestingUserId);
        Task<bool> ReleaseEditLockAsync(int userId, int requestingUserId);
        Task ForgotPasswordAsync(ForgotPasswordDto dto);
        Task<ResetPasswordVerificationDto> VerifyResetCodeAsync(VerifyResetCodeDto dto);
        Task ResetPasswordAsync(ResetPasswordDto dto);
        Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
        Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto);
        Task<AuthResponseDto> VerifyTwoFactorLoginAsync(VerifyTwoFactorLoginDto dto);
        Task<AuthResponseDto> ResendTwoFactorLoginCodeAsync(ResendTwoFactorLoginCodeDto dto);
        Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto refreshTokenDto);
        Task<TwoFactorSettingsDto?> GetTwoFactorSettingsAsync(int userId);
        Task<TwoFactorSettingsDto?> UpdateTwoFactorSettingsAsync(int userId, UpdateTwoFactorSettingsDto dto);
        Task<bool> RequestCreatorRoleAsync(int userId, string creatorType);
        Task<bool> ApproveCreatorRoleAsync(int userId);
        Task<bool> RejectCreatorRoleAsync(int userId);
        Task<bool> DemoteCreatorRoleAsync(int userId);
        Task<UserDto?> BanUserAsync(int userId, BanUserDto dto);
        Task<UserDto?> UnbanUserAsync(int userId);
        Task<bool> ToggleUserActiveAsync(int userId, bool isActive);
        Task<bool> LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiryUtc);
        Task<PagedResultDto<CreatorRoleRequestDto>> GetCreatorRequestsAsync(CreatorRoleRequestQueryDto query);
        Task<UserDto?> UpdateProfileImageAsync(int id, IFormFile file);
        Task<UserDto?> RemoveProfileImageAsync(int id);
        Task<UserLocationDto?> GetCurrentLocationAsync(int userId);
        Task<UserPreferredRegionDto?> GetPreferredRegionAsync(int userId);
        Task<UserPreferredRegionDto?> UpdatePreferredRegionAsync(int userId, UpdateUserPreferredRegionDto dto);
        Task<UserLocationDto?> UpdateCurrentLocationAsync(int userId, UpdateUserLocationDto dto);
        Task<bool> ClearCurrentLocationAsync(int userId);
        Task<PagedResultDto<UserLocationHistoryPointDto>> GetLocationHistoryAsync(int userId, UserLocationHistoryQueryDto query);
        Task<UserLocationPathDto> GetLocationPathAsync(int userId, UserLocationPathQueryDto query);
        Task<bool> ClearLocationHistoryAsync(int userId);
        Task<List<VisitedPlaceDto>> GetVisitedPlacesAsync(int userId, int limit);
        Task<LocationShareDto> CreateLocationShareAsync(int userId, CreateLocationShareDto dto);
        Task<SharedLocationDto?> ResolveLocationShareAsync(string token);
    }
}
