using TuristickiVodic.Core.DTOs;

namespace TuristickiVodic.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllAsync();
        Task<UserDto?> GetByIdAsync(int id);
        Task<UserDto?> GetByEmailAsync(string email);
        Task<UserDto> CreateAsync(CreateUserDto createUserDto);
        Task<UserDto?> UpdateAsync(int id, UpdateUserDto updateUserDto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto);
        Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
        Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto refreshTokenDto);
        Task<bool> RequestCreatorRoleAsync(int userId, string creatorType);
        Task<bool> ApproveCreatorRoleAsync(int userId);
        Task<bool> ToggleUserActiveAsync(int userId, bool isActive);
        Task<bool> LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiryUtc);
    }
}