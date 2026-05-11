using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NetTopologySuite.Geometries;
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
        private const int ResetSessionLifetimeMinutes = 5;
        private const int ShareLocationStaleMinutes = 30;
        private const int MaxVisitedHistoryPoints = 3000;
        private const double MaxVisitedPointAccuracyMeters = 250d;
        private const double LocalityVisitRadiusMeters = 250d;
        private const double DestinationVisitRadiusMeters = 700d;
        private const string DefaultPublicAppBaseUrl = "http://localhost:4200";
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public UserService(
            AppDbContext context,
            IMapper mapper,
            ITokenService tokenService,
            IEmailService emailService,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _context = context;
            _mapper = mapper;
            _tokenService = tokenService;
            _emailService = emailService;
            _environment = environment;
            _configuration = configuration;
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
                .Include(u => u.PreferredRegion)
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
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == id);

            return await MapUserDtoWithMetricsAsync(user);
        }

        public async Task<UserDto?> GetByEmailAsync(string email)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Email == email);

            return await MapUserDtoWithMetricsAsync(user);
        }

        public async Task<UserLocationDto?> GetCurrentLocationAsync(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null || user.LastKnownLocation == null || !user.LastLocationUpdatedAt.HasValue)
                return null;

            return new UserLocationDto
            {
                Longitude = user.LastKnownLocation.X,
                Latitude = user.LastKnownLocation.Y,
                AccuracyMeters = user.LastLocationAccuracyMeters,
                UpdatedAt = user.LastLocationUpdatedAt.Value
            };
        }

        public async Task<UserPreferredRegionDto?> GetPreferredRegionAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            var defaultRegion = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderByDescending(r => r.IsDefault)
                .ThenBy(r => r.Name)
                .FirstOrDefaultAsync();

            var effectiveRegion = user.PreferredRegion != null && user.PreferredRegion.IsActive
                ? user.PreferredRegion
                : defaultRegion;

            return new UserPreferredRegionDto
            {
                PreferredRegionId = user.PreferredRegionId,
                EffectiveRegionId = effectiveRegion?.Id,
                EffectiveRegionName = effectiveRegion?.Name,
                EffectiveRegionCode = effectiveRegion?.Code,
                CenterLongitude = effectiveRegion?.CenterLongitude,
                CenterLatitude = effectiveRegion?.CenterLatitude,
                DefaultMapZoom = effectiveRegion?.DefaultMapZoom,
                IsDefaultFallback = user.PreferredRegionId == null || user.PreferredRegion == null || !user.PreferredRegion.IsActive
            };
        }

        public async Task<UserPreferredRegionDto?> UpdatePreferredRegionAsync(int userId, UpdateUserPreferredRegionDto dto)
        {
            var user = await _context.Users
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            if (dto.RegionId.HasValue)
            {
                var region = await _context.Regions
                    .FirstOrDefaultAsync(r => r.Id == dto.RegionId.Value && r.IsActive);

                if (region == null)
                    throw new InvalidOperationException("Selected region not found.");

                user.PreferredRegionId = region.Id;
            }
            else
            {
                user.PreferredRegionId = null;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await GetPreferredRegionAsync(userId);
        }

        public async Task<UserLocationDto?> UpdateCurrentLocationAsync(int userId, UpdateUserLocationDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            ApplyCurrentLocation(
                user,
                dto.Longitude,
                dto.Latitude,
                dto.AccuracyMeters,
                dto.SpeedMetersPerSecond,
                dto.HeadingDegrees,
                dto.RecordedAtUtc);

            await _context.SaveChangesAsync();

            return MapCurrentLocation(user);
        }

        public async Task<PagedResultDto<UserLocationHistoryPointDto>> GetLocationHistoryAsync(int userId, UserLocationHistoryQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 100;

            if (query.PageSize > 1000)
                query.PageSize = 1000;

            var historyQuery = BuildUserLocationHistoryQuery(userId, query.FromUtc, query.ToUtc);

            var isDesc = !string.Equals(query.SortOrder?.Trim(), "asc", StringComparison.OrdinalIgnoreCase);
            historyQuery = isDesc
                ? historyQuery.OrderByDescending(x => x.RecordedAt).ThenByDescending(x => x.Id)
                : historyQuery.OrderBy(x => x.RecordedAt).ThenBy(x => x.Id);

            var totalCount = await historyQuery.CountAsync();

            var items = await historyQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => new UserLocationHistoryPointDto
                {
                    Id = x.Id,
                    Longitude = x.Location.X,
                    Latitude = x.Location.Y,
                    AccuracyMeters = x.AccuracyMeters,
                    SpeedMetersPerSecond = x.SpeedMetersPerSecond,
                    HeadingDegrees = x.HeadingDegrees,
                    RecordedAt = x.RecordedAt
                })
                .ToListAsync();

            return new PagedResultDto<UserLocationHistoryPointDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<UserLocationPathDto> GetLocationPathAsync(int userId, UserLocationPathQueryDto query)
        {
            var maxPoints = query.MaxPoints;

            if (maxPoints < 1)
                maxPoints = 500;

            if (maxPoints > 2000)
                maxPoints = 2000;

            var points = await BuildUserLocationHistoryQuery(userId, query.FromUtc, query.ToUtc)
                .OrderByDescending(x => x.RecordedAt)
                .ThenByDescending(x => x.Id)
                .Take(maxPoints)
                .Select(x => new UserLocationHistoryPointDto
                {
                    Id = x.Id,
                    Longitude = x.Location.X,
                    Latitude = x.Location.Y,
                    AccuracyMeters = x.AccuracyMeters,
                    SpeedMetersPerSecond = x.SpeedMetersPerSecond,
                    HeadingDegrees = x.HeadingDegrees,
                    RecordedAt = x.RecordedAt
                })
                .ToListAsync();

            points = points
                .OrderBy(x => x.RecordedAt)
                .ThenBy(x => x.Id)
                .ToList();

            return new UserLocationPathDto
            {
                Points = points,
                PointCount = points.Count,
                StartedAt = points.FirstOrDefault()?.RecordedAt,
                EndedAt = points.LastOrDefault()?.RecordedAt,
                ApproximateDistanceMeters = CalculateApproximateDistanceMeters(points)
            };
        }

        public async Task<bool> ClearCurrentLocationAsync(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            user.LastKnownLocation = null;
            user.LastLocationAccuracyMeters = null;
            user.LastLocationUpdatedAt = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ClearLocationHistoryAsync(int userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);

            if (!userExists)
                return false;

            var historyItems = await _context.UserLocationHistories
                .Where(x => x.UserId == userId)
                .ToListAsync();

            if (historyItems.Count > 0)
            {
                _context.UserLocationHistories.RemoveRange(historyItems);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<VisitedPlaceDto>> GetVisitedPlacesAsync(int userId, int limit)
        {
            if (limit < 1)
                limit = 12;

            if (limit > 50)
                limit = 50;

            var historyPoints = await _context.UserLocationHistories
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .Where(x => x.AccuracyMeters.HasValue && x.AccuracyMeters.Value <= MaxVisitedPointAccuracyMeters)
                .OrderByDescending(x => x.RecordedAt)
                .ThenByDescending(x => x.Id)
                .Take(MaxVisitedHistoryPoints)
                .Select(x => new VisitPointCandidate
                {
                    Latitude = x.Location.Y,
                    Longitude = x.Location.X,
                    AccuracyMeters = x.AccuracyMeters,
                    RecordedAt = x.RecordedAt
                })
                .ToListAsync();

            if (historyPoints.Count == 0)
                return new List<VisitedPlaceDto>();

            var localities = await _context.Localities
                .AsNoTracking()
                .Include(x => x.Destination)
                .ThenInclude(x => x.Region)
                .Where(x => x.Geolocation != null)
                .ToListAsync();

            var destinations = await _context.Destinations
                .AsNoTracking()
                .Include(x => x.Region)
                .Where(x => x.Geolocation != null)
                .ToListAsync();

            var visitedPlaces = new List<VisitedPlaceDto>();

            foreach (var locality in localities)
            {
                var visitedAt = FindLatestVisit(
                    historyPoints,
                    locality.Geolocation!.Y,
                    locality.Geolocation.X,
                    LocalityVisitRadiusMeters);

                if (!visitedAt.HasValue)
                    continue;

                visitedPlaces.Add(new VisitedPlaceDto
                {
                    Id = locality.Id,
                    Kind = "locality",
                    Name = locality.Name,
                    DestinationName = locality.Destination?.Name,
                    RegionName = locality.Destination?.Region?.Name,
                    Latitude = locality.Geolocation!.Y,
                    Longitude = locality.Geolocation.X,
                    VisitedAtUtc = visitedAt.Value
                });
            }

            foreach (var destination in destinations)
            {
                var visitedAt = FindLatestVisit(
                    historyPoints,
                    destination.Geolocation!.Y,
                    destination.Geolocation.X,
                    DestinationVisitRadiusMeters);

                if (!visitedAt.HasValue)
                    continue;

                visitedPlaces.Add(new VisitedPlaceDto
                {
                    Id = destination.Id,
                    Kind = "destination",
                    Name = destination.Name,
                    DestinationName = destination.Name,
                    RegionName = destination.Region?.Name,
                    Latitude = destination.Geolocation!.Y,
                    Longitude = destination.Geolocation.X,
                    VisitedAtUtc = visitedAt.Value
                });
            }

            return visitedPlaces
                .OrderByDescending(x => x.VisitedAtUtc)
                .ThenBy(x => x.Kind)
                .ThenBy(x => x.Name)
                .Take(limit)
                .ToList();
        }

        public async Task<LocationShareDto> CreateLocationShareAsync(int userId, CreateLocationShareDto dto)
        {
            if (dto.DurationHours != 1 && dto.DurationHours != 4 && dto.DurationHours != 24)
                throw new InvalidOperationException("Location can be shared only for 1h, 4h or 24h.");

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new InvalidOperationException("User not found.");

            var hasLocationPayload = dto.Longitude.HasValue || dto.Latitude.HasValue;
            if (hasLocationPayload && (!dto.Longitude.HasValue || !dto.Latitude.HasValue))
                throw new InvalidOperationException("Both latitude and longitude are required for location sharing.");

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
            {
                ApplyCurrentLocation(
                    user,
                    dto.Longitude.Value,
                    dto.Latitude.Value,
                    dto.AccuracyMeters,
                    null,
                    null,
                    dto.RecordedAtUtc);

                await _context.SaveChangesAsync();
            }

            if (user.LastKnownLocation == null || !user.LastLocationUpdatedAt.HasValue)
                throw new InvalidOperationException("Current location is not available for sharing.");

            if (user.LastLocationUpdatedAt.Value < DateTime.UtcNow.AddMinutes(-ShareLocationStaleMinutes))
                throw new InvalidOperationException("Current location is too old to be shared.");

            var expiresAtUtc = DateTime.UtcNow.AddHours(dto.DurationHours);
            var token = BuildLocationShareToken(user.Id, expiresAtUtc);
            var shareUrl = $"{ResolvePublicAppBaseUrl().TrimEnd('/')}/shared-location?token={Uri.EscapeDataString(token)}";

            return new LocationShareDto
            {
                ShareUrl = shareUrl,
                ExpiresAtUtc = expiresAtUtc
            };
        }

        public async Task<SharedLocationDto?> ResolveLocationShareAsync(string token)
        {
            if (!TryParseLocationShareToken(token, out var userId, out var expiresAtUtc))
                return null;

            if (expiresAtUtc <= DateTime.UtcNow)
                return null;

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsBlacklisted);

            if (user == null || user.LastKnownLocation == null || !user.LastLocationUpdatedAt.HasValue)
                return null;

            var displayName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(displayName))
                displayName = user.Email;

            return new SharedLocationDto
            {
                DisplayName = displayName,
                Longitude = user.LastKnownLocation.X,
                Latitude = user.LastKnownLocation.Y,
                AccuracyMeters = user.LastLocationAccuracyMeters,
                UpdatedAtUtc = user.LastLocationUpdatedAt.Value,
                ExpiresAtUtc = expiresAtUtc
            };
        }

        public async Task<UserDto> CreateAsync(CreateUserDto createUserDto)
        {
            return await CreateWithRoleAsync(createUserDto, RoleType.Tourist);
        }

        public async Task<UserDto?> UpdateProfileImageAsync(int id, IFormFile file)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
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

            return await MapExistingUserDtoWithMetricsAsync(user);
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

            return await MapExistingUserDtoWithMetricsAsync(user);
        }

        public async Task<UserDto?> UpdateAsync(int id, UpdateUserDto updateUserDto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return null;

            _mapper.Map(updateUserDto, user);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await MapExistingUserDtoWithMetricsAsync(user);
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

        public async Task<ResetPasswordVerificationDto> VerifyResetCodeAsync(VerifyResetCodeDto dto)
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

            var resetSessionToken = GenerateResetSessionToken();
            user.ResetToken = HashResetToken(resetSessionToken);
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(ResetSessionLifetimeMinutes);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new ResetPasswordVerificationDto
            {
                ResetSessionToken = resetSessionToken,
                ExpiresAt = user.ResetTokenExpiry.Value
            };
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var resetSessionTokenHash = HashResetToken(dto.ResetSessionToken.Trim());

            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.ResetToken == resetSessionTokenHash &&
                    u.ResetTokenExpiry.HasValue &&
                    u.ResetTokenExpiry.Value > DateTime.UtcNow);

            if (user == null || !user.IsActive || user.IsBlacklisted)
                throw new InvalidOperationException("Invalid or expired reset session.");

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
                .Include(u => u.PreferredRegion)
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
                .Include(u => u.PreferredRegion)
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
            await CreateAdminNewCreatorRoleRequestNotificationsAsync(user);
            return true;
        }

        private async Task CreateAdminNewCreatorRoleRequestNotificationsAsync(User requester)
        {
            var adminIds = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role.Name == RoleType.Admin && u.IsActive && !u.IsBlacklisted)
                .Select(u => u.Id)
                .ToListAsync();

            if (adminIds.Count == 0)
                return;

            var requesterName = $"{requester.FirstName} {requester.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(requesterName))
                requesterName = requester.Email;

            var notifications = adminIds.Select(adminId => new Notification
            {
                UserId = adminId,
                Type = NotificationType.AdminNewCreatorRoleRequest,
                Title = "Novi zahtev za ContentCreator ulogu",
                Message = $"Korisnik {requesterName} je poslao zahtev za ContentCreator ulogu.",
                ActionUrl = "/users/creator-requests",
                CreatedAt = DateTime.UtcNow
            });

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
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
                User = await MapExistingUserDtoWithMetricsAsync(user),
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

        private IQueryable<UserLocationHistory> BuildUserLocationHistoryQuery(int userId, DateTime? fromUtc, DateTime? toUtc)
        {
            var query = _context.UserLocationHistories
                .Where(x => x.UserId == userId)
                .AsQueryable();

            if (fromUtc.HasValue)
            {
                var normalizedFromUtc = NormalizeRecordedAtUtc(fromUtc);
                query = query.Where(x => x.RecordedAt >= normalizedFromUtc);
            }

            if (toUtc.HasValue)
            {
                var normalizedToUtc = NormalizeRecordedAtUtc(toUtc);
                query = query.Where(x => x.RecordedAt <= normalizedToUtc);
            }

            return query;
        }

        private void ApplyCurrentLocation(
            User user,
            double longitude,
            double latitude,
            double? accuracyMeters,
            double? speedMetersPerSecond,
            double? headingDegrees,
            DateTime? recordedAtUtc)
        {
            var normalizedRecordedAtUtc = NormalizeRecordedAtUtc(recordedAtUtc);
            user.LastKnownLocation = new Point(longitude, latitude) { SRID = 4326 };
            user.LastLocationAccuracyMeters = accuracyMeters;
            user.LastLocationUpdatedAt = normalizedRecordedAtUtc;
            user.UpdatedAt = DateTime.UtcNow;

            _context.UserLocationHistories.Add(new UserLocationHistory
            {
                UserId = user.Id,
                Location = new Point(longitude, latitude) { SRID = 4326 },
                AccuracyMeters = accuracyMeters,
                SpeedMetersPerSecond = speedMetersPerSecond,
                HeadingDegrees = headingDegrees,
                RecordedAt = normalizedRecordedAtUtc,
                CreatedAt = DateTime.UtcNow
            });
        }

        private static UserLocationDto MapCurrentLocation(User user)
        {
            return new UserLocationDto
            {
                Longitude = user.LastKnownLocation!.X,
                Latitude = user.LastKnownLocation.Y,
                AccuracyMeters = user.LastLocationAccuracyMeters,
                UpdatedAt = user.LastLocationUpdatedAt!.Value
            };
        }

        private static DateTime NormalizeRecordedAtUtc(DateTime? recordedAtUtc)
        {
            if (!recordedAtUtc.HasValue)
                return DateTime.UtcNow;

            var normalized = recordedAtUtc.Value.Kind == DateTimeKind.Utc
                ? recordedAtUtc.Value
                : recordedAtUtc.Value.ToUniversalTime();

            return normalized > DateTime.UtcNow ? DateTime.UtcNow : normalized;
        }

        private static double CalculateApproximateDistanceMeters(IReadOnlyList<UserLocationHistoryPointDto> points)
        {
            if (points.Count < 2)
                return 0;

            var distanceMeters = 0d;

            for (var i = 1; i < points.Count; i++)
            {
                distanceMeters += CalculateHaversineDistanceMeters(
                    points[i - 1].Latitude,
                    points[i - 1].Longitude,
                    points[i].Latitude,
                    points[i].Longitude);
            }

            return Math.Round(distanceMeters, 2);
        }

        private static double CalculateHaversineDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
        {
            const double earthRadiusMeters = 6371000d;

            var deltaLatitude = DegreesToRadians(latitude2 - latitude1);
            var deltaLongitude = DegreesToRadians(longitude2 - longitude1);
            var normalizedLatitude1 = DegreesToRadians(latitude1);
            var normalizedLatitude2 = DegreesToRadians(latitude2);

            var a =
                Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2) +
                Math.Cos(normalizedLatitude1) * Math.Cos(normalizedLatitude2) *
                Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private static DateTime? FindLatestVisit(
            IReadOnlyList<VisitPointCandidate> historyPoints,
            double targetLatitude,
            double targetLongitude,
            double radiusMeters)
        {
            foreach (var point in historyPoints)
            {
                var accuracyMeters = point.AccuracyMeters ?? 0d;
                var visitRadius = Math.Max(120d, Math.Min(radiusMeters, accuracyMeters + 60d));
                var distanceMeters = CalculateHaversineDistanceMeters(
                    point.Latitude,
                    point.Longitude,
                    targetLatitude,
                    targetLongitude);

                if (distanceMeters <= visitRadius)
                    return point.RecordedAt;
            }

            return null;
        }

        private string BuildLocationShareToken(int userId, DateTime expiresAtUtc)
        {
            var payload = $"v1|{userId}|{new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds()}";
            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            var signatureBytes = ComputeLocationShareSignature(payloadBytes);

            return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
        }

        private bool TryParseLocationShareToken(string token, out int userId, out DateTime expiresAtUtc)
        {
            userId = 0;
            expiresAtUtc = DateTime.MinValue;

            var parts = token.Split('.', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2)
                return false;

            byte[] payloadBytes;
            byte[] providedSignature;

            try
            {
                payloadBytes = Base64UrlDecode(parts[0]);
                providedSignature = Base64UrlDecode(parts[1]);
            }
            catch
            {
                return false;
            }

            var expectedSignature = ComputeLocationShareSignature(payloadBytes);
            if (!CryptographicOperations.FixedTimeEquals(providedSignature, expectedSignature))
                return false;

            var payload = Encoding.UTF8.GetString(payloadBytes);
            var segments = payload.Split('|', StringSplitOptions.None);
            if (segments.Length != 3 || !string.Equals(segments[0], "v1", StringComparison.Ordinal))
                return false;

            if (!int.TryParse(segments[1], out userId))
                return false;

            if (!long.TryParse(segments[2], out var expiresAtUnix))
                return false;

            expiresAtUtc = DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix).UtcDateTime;
            return true;
        }

        private byte[] ComputeLocationShareSignature(byte[] payloadBytes)
        {
            var secret = _configuration["Jwt:Key"] ?? "spirego-location-share-fallback-key";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return hmac.ComputeHash(payloadBytes);
        }

        private string ResolvePublicAppBaseUrl()
        {
            var configuredBaseUrl = _configuration["PublicApp:BaseUrl"];
            if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
                return configuredBaseUrl;

            return DefaultPublicAppBaseUrl;
        }

        private static string Base64UrlEncode(byte[] bytes)
        {
            return Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static byte[] Base64UrlDecode(string value)
        {
            var padded = value
                .Replace('-', '+')
                .Replace('_', '/');

            padded = padded.PadRight(padded.Length + ((4 - padded.Length % 4) % 4), '=');
            return Convert.FromBase64String(padded);
        }

        private sealed class VisitPointCandidate
        {
            public double Latitude { get; set; }
            public double Longitude { get; set; }
            public double? AccuracyMeters { get; set; }
            public DateTime RecordedAt { get; set; }
        }

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

        private static string HashResetToken(string resetCode)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(resetCode));
            return Convert.ToBase64String(bytes);
        }

        private static string GenerateResetCode()
        {
            return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        }

        private static string GenerateResetSessionToken()
        {
            return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
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
                .Include(u => u.PreferredRegion)
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

            return await MapExistingUserDtoWithMetricsAsync(user);
        }

        private async Task<UserDto?> MapUserDtoWithMetricsAsync(User? user)
        {
            if (user == null)
                return null;

            return await MapExistingUserDtoWithMetricsAsync(user);
        }

        private async Task<UserDto> MapExistingUserDtoWithMetricsAsync(User user)
        {
            var dto = _mapper.Map<UserDto>(user);
            await PopulateUserMetricsAsync(dto, user.Id);
            return dto;
        }

        private async Task PopulateUserMetricsAsync(UserDto dto, int userId)
        {
            dto.FavoritesCount = await _context.Favorites.CountAsync(f => f.UserId == userId);
            dto.PlansCount = await _context.EventPlannerItems.CountAsync(item => item.UserId == userId);
            dto.ReviewsCount = await _context.Reviews.CountAsync(review => review.UserId == userId);
        }
    }
}
