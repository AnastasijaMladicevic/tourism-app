using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using System.IO;
using System.Linq;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services
{
    public class UserService : IUserService
    {
        private const int ResetCodeLifetimeMinutes = 5;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;

        public UserService(
            AppDbContext context,
            IMapper mapper,
            ITokenService tokenService,
            IEmailService emailService,
            IWebHostEnvironment environment)
        {
            _context = context;
            _mapper = mapper;
            _tokenService = tokenService;
            _emailService = emailService;
            _environment = environment;
        }

        public async Task<PagedResultDto<UserDto>> GetAllAsync(UserQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var usersQuery = _context.Users
                .Include(u => u.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                usersQuery = usersQuery.Where(u =>
                    u.FirstName.ToLower().Contains(search) ||
                    u.LastName.ToLower().Contains(search) ||
                    u.Email.ToLower().Contains(search));
            }

            if (!string.IsNullOrWhiteSpace(query.Role))
            {
                var roleFilter = query.Role.Trim();

                if (Enum.TryParse<RoleType>(roleFilter, true, out var parsedRole))
                {
                    usersQuery = usersQuery.Where(u =>
                        u.Role != null &&
                        u.Role.Name == parsedRole);
                }
                else
                {
                    usersQuery = usersQuery.Where(_ => false);
                }
            }

            usersQuery = ApplyUserSorting(usersQuery, query.SortBy, query.SortOrder);

            var totalCount = await usersQuery.CountAsync();

            var users = await usersQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedUsers = _mapper.Map<List<UserDto>>(users);

            return new PagedResultDto<UserDto>
            {
                Items = mappedUsers,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
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
            return await CreateWithRoleAsync(createUserDto, RoleType.Tourist);
        }

        public async Task<UserDto?> UpdateProfileImageAsync(int id, IFormFile file)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return null;

            if (file == null || file.Length == 0)
                throw new InvalidOperationException("Image file is required.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new InvalidOperationException("Only .jpg, .jpeg, .png and .webp files are allowed.");

            var profilesFolder = Path.Combine(_environment.WebRootPath, "images", "profiles");
            Directory.CreateDirectory(profilesFolder);

            var fileName = $"user_{id}_{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(profilesFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            if (!string.IsNullOrWhiteSpace(user.ProfileImageUrl) &&
                user.ProfileImageUrl != "/images/profiles/default_icon.png")
            {
                var oldRelativePath = user.ProfileImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var oldFullPath = Path.Combine(_environment.WebRootPath, oldRelativePath);

                if (File.Exists(oldFullPath))
                    File.Delete(oldFullPath);
            }

            user.ProfileImageUrl = $"/images/profiles/{fileName}";
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto> CreateManagerAsync(CreateUserDto createUserDto)
        {
            return await CreateWithRoleAsync(createUserDto, RoleType.Manager);
        }

        public async Task<UserDto> CreateAdminAsync(CreateUserDto createUserDto)
        {
            return await CreateWithRoleAsync(createUserDto, RoleType.Admin);
        }

        private async Task<UserDto> CreateWithRoleAsync(CreateUserDto createUserDto, RoleType roleType)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == createUserDto.Email);

            if (existingUser != null)
                throw new InvalidOperationException("Email already exists");

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == roleType);

            if (role == null)
                throw new InvalidOperationException($"{roleType} role not found");

            var user = _mapper.Map<User>(createUserDto);
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password);
            user.RoleId = role.Id;
            user.Role = role;
            user.IsVerified = false;
            user.IsActive = true;
            user.IsBlacklisted = false;
            user.ProfileImageUrl = "/images/profiles/default_icon.png";
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

            if (user.ManagedDestinationId.HasValue)
                throw new InvalidOperationException("Manager who is assigned to a destination cannot be deleted until another manager is assigned.");

            await RevokeRefreshTokenAsync(user.Id);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto, int currentUserId, string roleName)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                throw new InvalidOperationException("User not found.");

            if (roleName != "Admin")
            {
                if (user.Id != currentUserId)
                    throw new UnauthorizedAccessException("You can change only your own password.");

                if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                    throw new InvalidOperationException("Current password is incorrect");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await RevokeRefreshTokenAsync(user.Id);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
                throw new InvalidOperationException("Korisnik sa ovom email adresom jos uvek nije registrovan.");

            if (!user.IsActive)
                throw new InvalidOperationException("Korisnicki nalog nije aktivan.");

            if (user.IsBlacklisted)
                throw new InvalidOperationException("Reset lozinke nije dostupan za ovaj nalog.");

            var resetCode = GenerateResetCode();

            user.ResetToken = HashResetToken(resetCode);
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(ResetCodeLifetimeMinutes);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _emailService.SendAsync(
                user.Email,
                "Kod za reset lozinke",
                BuildResetPasswordEmailBodyForFiveMinuteExpiry(user.FirstName, resetCode, user.ResetTokenExpiry.Value));
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !user.IsActive || user.IsBlacklisted)
                throw new InvalidOperationException("Invalid or expired reset code.");

            if (string.IsNullOrWhiteSpace(user.ResetToken) ||
                !user.ResetTokenExpiry.HasValue ||
                user.ResetTokenExpiry.Value <= DateTime.UtcNow)
            {
                throw new InvalidOperationException("Invalid or expired reset code.");
            }

            var providedCodeHash = HashResetToken(dto.Code.Trim());

            if (user.ResetToken != providedCodeHash)
                throw new InvalidOperationException("Invalid or expired reset code.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await RevokeRefreshTokenAsync(user.Id);
            await _context.SaveChangesAsync();
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

            return await IssueTokensAsync(user, loginDto.RememberMe);
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

            _context.RefreshTokens.Remove(storedRefreshToken);
            await _context.SaveChangesAsync();

            return await IssueTokensAsync(user, storedRefreshToken.RememberMe);
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

            if (user.IsBlacklisted)
                throw new InvalidOperationException("Blacklisted users cannot request creator role.");

            user.HasRequestedCreatorRole = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveCreatorRoleAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new KeyNotFoundException("User not found.");

            if (user.IsBlacklisted)
                throw new InvalidOperationException("User is blacklisted.");

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can be approved for content creator role.");

            if (!user.HasRequestedCreatorRole)
                throw new InvalidOperationException("User has not requested creator role.");

            var contentCreatorRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == RoleType.ContentCreator);

            if (contentCreatorRole == null)
                throw new KeyNotFoundException("Content creator role not found.");

            user.RoleId = contentCreatorRole.Id;
            user.Role = contentCreatorRole;
            user.HasRequestedCreatorRole = false;
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

        private async Task<AuthResponseDto> IssueTokensAsync(User user, bool rememberMe = false)
        {
            var token = _tokenService.GenerateToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();
            var refreshTokenHash = HashRefreshToken(refreshToken);

            var existingRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.UserId == user.Id);

            if (existingRefreshToken != null)
            {
                _context.RefreshTokens.Remove(existingRefreshToken);
            }

            var newRefreshToken = new RefreshToken
            {
                UserId = user.Id,
                RefreshTokenHash = refreshTokenHash,
                RefreshTokenExpiry = rememberMe
                    ? DateTime.UtcNow.AddDays(30)
                    : DateTime.UtcNow.AddDays(7),
                RememberMe = rememberMe
            };

            _context.RefreshTokens.Add(newRefreshToken);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = _mapper.Map<UserDto>(user),
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };
        }

        public async Task<bool> LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiryUtc)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return false;

            await RevokeRefreshTokenAsync(user.Id);

            await CleanupExpiredRevokedTokensAsync();

            if (!string.IsNullOrWhiteSpace(jti) && accessTokenExpiryUtc.HasValue && accessTokenExpiryUtc.Value > DateTime.UtcNow)
            {
                var alreadyRevoked = await _context.RevokedTokens
                    .AnyAsync(x => x.Jti == jti);

                if (!alreadyRevoked)
                {
                    _context.RevokedTokens.Add(new RevokedToken
                    {
                        Jti = jti,
                        ExpiresAt = accessTokenExpiryUtc.Value,
                        RevokedAt = DateTime.UtcNow
                    });
                }
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
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

        private async Task CleanupExpiredRevokedTokensAsync()
        {
            var expiredTokens = await _context.RevokedTokens
                .Where(x => x.ExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            if (expiredTokens.Count > 0)
            {
                _context.RevokedTokens.RemoveRange(expiredTokens);
            }
        }

        private static string HashRefreshToken(string refreshToken)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
            return Convert.ToBase64String(bytes);
        }

        private static string HashResetToken(string resetCode)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(resetCode));
            return Convert.ToBase64String(bytes);
        }

        private static string GenerateResetCode()
        {
            return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        }

        private static string BuildResetPasswordEmailBodyForFiveMinuteExpiry(string firstName, string resetCode, DateTime expiresAtUtc)
        {
            return $@"
                <div style=""font-family: Arial, sans-serif; line-height: 1.6;"">
                    <h2>Reset lozinke</h2>
                    <p>Zdravo {System.Net.WebUtility.HtmlEncode(firstName)},</p>
                    <p>Tvoj kod za reset lozinke je:</p>
                    <p style=""font-size: 28px; font-weight: bold; letter-spacing: 4px;"">{resetCode}</p>
                    <p>Kod vazi 5 minuta, odnosno do {expiresAtUtc.ToLocalTime():dd.MM.yyyy. HH:mm}.</p>
                    <p>Ako nisi ti trazio reset lozinke, slobodno ignorisi ovu poruku.</p>
                </div>";
        }

        private static string BuildResetPasswordEmailBody(string firstName, string resetCode, DateTime expiresAtUtc)
        {
            return $@"
                <div style=""font-family: Arial, sans-serif; line-height: 1.6;"">
                    <h2>Reset lozinke</h2>
                    <p>Zdravo {System.Net.WebUtility.HtmlEncode(firstName)},</p>
                    <p>Tvoj kod za reset lozinke je:</p>
                    <p style=""font-size: 28px; font-weight: bold; letter-spacing: 4px;"">{resetCode}</p>
                    <p>Kod važi do {expiresAtUtc.ToLocalTime():dd.MM.yyyy. HH:mm}.</p>
                    <p>Ako nisi ti tražio reset lozinke, slobodno ignoriši ovu poruku.</p>
                </div>";
        }

        public async Task<PagedResultDto<CreatorRoleRequestDto>> GetCreatorRequestsAsync(CreatorRoleRequestQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var usersQuery = _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role != null)
                .Where(u => u.Role.Name == RoleType.Tourist && u.HasRequestedCreatorRole)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                usersQuery = usersQuery.Where(u =>
                    u.FirstName.ToLower().Contains(search) ||
                    u.LastName.ToLower().Contains(search) ||
                    u.Email.ToLower().Contains(search));
            }

            if (query.IsActive.HasValue)
            {
                usersQuery = usersQuery.Where(u => u.IsActive == query.IsActive.Value);
            }

            if (query.IsVerified.HasValue)
            {
                usersQuery = usersQuery.Where(u => u.IsVerified == query.IsVerified.Value);
            }

            usersQuery = ApplyCreatorRequestSorting(usersQuery, query.SortBy, query.SortOrder);

            var totalCount = await usersQuery.CountAsync();

            var users = await usersQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<CreatorRoleRequestDto>>(users);

            return new PagedResultDto<CreatorRoleRequestDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        private static IQueryable<User> ApplyUserSorting(IQueryable<User> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "firstname")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.FirstName)
                    : query.OrderBy(u => u.FirstName);
            }

            if (sortByValue == "lastname")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.LastName)
                    : query.OrderBy(u => u.LastName);
            }

            if (sortByValue == "email")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email);
            }

            if (sortByValue == "role" || sortByValue == "rolename")
            {
                var roleSortOrder = query.Select(u => new
                {
                    User = u,
                    RoleSortOrder = u.Role == null
                        ? 0
                        : u.Role.Name == RoleType.Admin
                            ? 4
                            : u.Role.Name == RoleType.Manager
                                ? 3
                                : u.Role.Name == RoleType.ContentCreator
                                    ? 2
                                    : 1
                });

                return isDesc
                    ? roleSortOrder.OrderByDescending(x => x.RoleSortOrder).Select(x => x.User)
                    : roleSortOrder.OrderBy(x => x.RoleSortOrder).Select(x => x.User);
            }

            if (sortByValue == "createdat")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.CreatedAt)
                    : query.OrderBy(u => u.CreatedAt);
            }

            return isDesc
                ? query.OrderByDescending(u => u.Id)
                : query.OrderBy(u => u.Id);
        }

        private static IQueryable<User> ApplyCreatorRequestSorting(IQueryable<User> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "firstname")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.FirstName)
                    : query.OrderBy(u => u.FirstName);
            }

            if (sortByValue == "lastname")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.LastName)
                    : query.OrderBy(u => u.LastName);
            }

            if (sortByValue == "email")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email);
            }

            if (sortByValue == "isactive")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.IsActive)
                    : query.OrderBy(u => u.IsActive);
            }

            if (sortByValue == "isverified")
            {
                return isDesc
                    ? query.OrderByDescending(u => u.IsVerified)
                    : query.OrderBy(u => u.IsVerified);
            }

            return isDesc
                ? query.OrderByDescending(u => u.CreatedAt)
                : query.OrderBy(u => u.CreatedAt);
        }

        public async Task<UserDto?> RemoveProfileImageAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return null;

            if (!string.IsNullOrWhiteSpace(user.ProfileImageUrl) &&
                user.ProfileImageUrl != "/images/profiles/default_icon.png")
            {
                var oldRelativePath = user.ProfileImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var oldFullPath = Path.Combine(_environment.WebRootPath, oldRelativePath);

                if (File.Exists(oldFullPath))
                    File.Delete(oldFullPath);
            }

            user.ProfileImageUrl = "/images/profiles/default_icon.png";
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }
    }
}
