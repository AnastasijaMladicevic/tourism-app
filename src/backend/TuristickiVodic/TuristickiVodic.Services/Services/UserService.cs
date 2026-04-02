using AutoMapper;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITokenService _tokenService;

        public UserService(AppDbContext context, IMapper mapper, ITokenService tokenService)
        {
            _context = context;
            _mapper = mapper;
            _tokenService = tokenService;
        }

        public async Task<IEnumerable<UserDto>> GetAllAsync()
        {
            var users = await _context.Users
                .Include(u => u.Role)
                .OrderBy(u => u.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<UserDto>>(users);
        }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            return user == null ? null : _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto?> GetByEmailAsync(string email)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);

            return user == null ? null : _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto> CreateAsync(CreateUserDto createUserDto)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == createUserDto.Email);

            if (existingUser != null)
                throw new InvalidOperationException("Email already exists");

            var touristRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == RoleType.Tourist);

            if (touristRole == null)
                throw new InvalidOperationException("Tourist role not found");

            var user = _mapper.Map<User>(createUserDto);
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password);
            user.RoleId = touristRole.Id;
            user.Role = touristRole;
            user.IsVerified = false;
            user.IsActive = true;
            user.IsBlacklisted = false;
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto?> UpdateAsync(int id, UpdateUserDto updateUserDto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return null;

            _mapper.Map(updateUserDto, user);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return false;

            await RevokeRefreshTokenAsync(user.Id);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return false;

            if (!BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash))
                throw new InvalidOperationException("Current password is incorrect");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            await RevokeRefreshTokenAsync(user.Id);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                return null;

            if (user.IsBlacklisted)
                throw new InvalidOperationException("User is blacklisted");

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            return await IssueTokensAsync(user);
        }

        public async Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto refreshTokenDto)
        {
            var refreshTokenHash = HashRefreshToken(refreshTokenDto.RefreshToken);

            var storedRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.RefreshTokenHash == refreshTokenHash);

            if (storedRefreshToken == null)
                return null;

            if (storedRefreshToken.RefreshTokenExpiry <= DateTime.UtcNow)
                return null;

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == storedRefreshToken.UserId);

            if (user == null)
                return null;

            if (user.IsBlacklisted)
                throw new InvalidOperationException("User is blacklisted");

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            return await IssueTokensAsync(user);
        }

        public async Task<bool> LogoutAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return false;

            await RevokeRefreshTokenAsync(user.Id);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> RequestCreatorRoleAsync(int userId, string creatorType)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can request creator role");

            return true;
        }

        public async Task<bool> ApproveCreatorRoleAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can be approved for content creator role");

            var contentCreatorRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == RoleType.ContentCreator);

            if (contentCreatorRole == null)
                throw new InvalidOperationException("Content creator role not found");

            user.RoleId = contentCreatorRole.Id;
            user.Role = contentCreatorRole;
            await RevokeRefreshTokenAsync(user.Id);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ToggleUserActiveAsync(int userId, bool isActive)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return false;

            user.IsActive = isActive;

            if (!isActive)
            {
                await RevokeRefreshTokenAsync(user.Id);
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<AuthResponseDto> IssueTokensAsync(User user)
        {
            var accessToken = _tokenService.GenerateToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.UserId == user.Id);

            if (refreshTokenEntity == null)
            {
                refreshTokenEntity = new RefreshToken
                {
                    UserId = user.Id
                };

                _context.RefreshTokens.Add(refreshTokenEntity);
            }

            refreshTokenEntity.RefreshTokenHash = HashRefreshToken(refreshToken);
            refreshTokenEntity.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                Token = accessToken,
                RefreshToken = refreshToken,
                User = _mapper.Map<UserDto>(user),
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };
        }

        private async Task RevokeRefreshTokenAsync(int userId)
        {
            var refreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.UserId == userId);

            if (refreshToken != null)
            {
                _context.RefreshTokens.Remove(refreshToken);
            }
        }

        private static string HashRefreshToken(string refreshToken)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
            return Convert.ToBase64String(bytes);
        }
    }
}