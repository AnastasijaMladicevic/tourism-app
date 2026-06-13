using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
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
        private const int TwoFactorCodeLifetimeMinutes = 5;
        private const int ShareLocationStaleMinutes = 30;
        private const int MaxVisitedHistoryPoints = 3000;
        private const double MaxVisitedPointAccuracyMeters = 250d;
        private const double LocalityVisitRadiusMeters = 250d;
        private const double DestinationVisitRadiusMeters = 700d;
        private static readonly TimeSpan EditLockDuration = TimeSpan.FromMinutes(3);
        private const string DefaultPublicAppBaseUrl = "http://localhost:4200";
        private const string DefaultAdminAppBaseUrl = "http://localhost:4200";
        private static readonly DateTime DefaultGoogleUserDateOfBirth = new(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        private static readonly ConfigurationManager<OpenIdConnectConfiguration> GoogleConfigurationManager = new(
            "https://accounts.google.com/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly ITranslationService _translationService;

        public UserService(
            AppDbContext context,
            IMapper mapper,
            ITokenService tokenService,
            IEmailService emailService,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            ITranslationService translationService)
        {
            _context = context;
            _mapper = mapper;
            _tokenService = tokenService;
            _emailService = emailService;
            _environment = environment;
            _configuration = configuration;
            _translationService = translationService;
        }

        public async Task<PagedResultDto<UserDto>> GetAllAsync(UserQueryDto query, int? requestingUserId = null)
        {
            await ReleaseExpiredBansAsync();

            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var usersQuery = _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .Include(u => u.RefreshToken)
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
            var now = DateTime.UtcNow;
            for (var i = 0; i < users.Count; i++)
            {
                ApplyBanStatus(mappedUsers[i], users[i]);
                ApplyActiveSessionStatus(mappedUsers[i], users[i], now);
            }

            if (requestingUserId.HasValue)
            {
                await ApplyEditLocksAsync(mappedUsers, users, requestingUserId.Value);
            }

            return new PagedResultDto<UserDto>
            {
                Items = mappedUsers,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<UserDto?> GetByIdAsync(int id, int? requestingUserId = null)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .Include(u => u.RefreshToken)
                .FirstOrDefaultAsync(u => u.Id == id);

            return await MapUserDtoWithMetricsAsync(user, requestingUserId);
        }

        public async Task<UserDto?> GetByEmailAsync(string email)
        {
            await ReleaseExpiredBansAsync();
            var normalizedEmail = email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

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
            var normalizedEmail = createUserDto.Email.Trim().ToLowerInvariant();

            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

            if (existingUser != null)
                throw new InvalidOperationException("Email already exists. If this account was created with Google sign-in, continue with Google or reset the password.");

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == roleType);

            if (role == null)
                throw new InvalidOperationException($"{roleType} role not found");

            var user = _mapper.Map<User>(createUserDto);
            user.Email = normalizedEmail;
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

        public async Task<UserDto?> UpdateAsync(int id, UpdateUserDto updateUserDto, int currentUserId, string roleName)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .Include(u => u.RefreshToken)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return null;

            if (string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase) && currentUserId != id)
            {
                EnsureUserEditable(user, currentUserId);
            }

            _mapper.Map(updateUserDto, user);
            user.UpdatedAt = DateTime.UtcNow;

            if (IsUserEditLockActive(user, DateTime.UtcNow) && user.EditLockedByUserId == currentUserId)
            {
                user.EditLockExpiresAtUtc = DateTime.UtcNow.Add(EditLockDuration);
            }

            await _context.SaveChangesAsync();

            return await MapExistingUserDtoWithMetricsAsync(user, currentUserId);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.ManagedDestination)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return false;

            if (user.ManagedDestinationId.HasValue)
            {
                var destinationName = user.ManagedDestination?.Name?.Trim();
                throw new InvalidOperationException(
                    string.IsNullOrWhiteSpace(destinationName)
                        ? "Manager who is assigned to a destination cannot be deleted until another manager is assigned."
                        : $"Manager for destination '{destinationName}' cannot be deleted until another manager is assigned.");
            }

            await RevokeRefreshTokenAsync(user.Id);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<UserEditLockDto?> AcquireEditLockAsync(int userId, int requestingUserId)
        {
            return await UpsertEditLockAsync(userId, requestingUserId);
        }

        public async Task<UserEditLockDto?> RefreshEditLockAsync(int userId, int requestingUserId)
        {
            return await UpsertEditLockAsync(userId, requestingUserId);
        }

        public async Task<bool> ReleaseEditLockAsync(int userId, int requestingUserId)
        {
            var affected = await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE ""Users""
                SET ""EditLockedByUserId"" = NULL,
                    ""EditLockAcquiredAtUtc"" = NULL,
                    ""EditLockExpiresAtUtc"" = NULL
                WHERE ""Id"" = {userId}
                  AND ""EditLockedByUserId"" = {requestingUserId};
            ");

            return affected > 0;
        }

        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto, int currentUserId, string roleName)
        {
            var user = await _context.Users
                .Include(u => u.RefreshToken)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new InvalidOperationException("User not found.");

            if (user.Id == currentUserId)
            {
                if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                    throw new InvalidOperationException("Current password is incorrect");
            }
            else
            {
                if (!string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase))
                    throw new UnauthorizedAccessException("You can change only your own password.");

                EnsureUserEditable(user, currentUserId);

                if (HasActiveSession(user, DateTime.UtcNow))
                    throw new InvalidOperationException("This user is currently logged in. Ask them to log out before changing the password.");

                if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                    throw new InvalidOperationException("Current password is incorrect");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await RevokeRefreshTokenAsync(user.Id);
            user.UpdatedAt = DateTime.UtcNow;

            if (IsUserEditLockActive(user, DateTime.UtcNow) && user.EditLockedByUserId == currentUserId)
            {
                user.EditLockExpiresAtUtc = DateTime.UtcNow.Add(EditLockDuration);
            }

            await _context.SaveChangesAsync();
        }

        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            await ReleaseExpiredBansAsync();

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

            if (user == null)
                throw new InvalidOperationException("Korisnik sa ovom email adresom jos uvek nije registrovan.");

            if (!user.IsActive)
                throw new InvalidOperationException("Korisnicki nalog nije aktivan.");

            await EnsureUserNotBannedAsync(user);

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
            await ReleaseExpiredBansAsync();

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

            if (user == null || !user.IsActive)
                throw new InvalidOperationException("Invalid or expired reset code.");

            await EnsureUserNotBannedAsync(user);

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
            await ReleaseExpiredBansAsync();

            var resetSessionTokenHash = HashResetToken(dto.ResetSessionToken.Trim());

            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.ResetToken == resetSessionTokenHash &&
                    u.ResetTokenExpiry.HasValue &&
                    u.ResetTokenExpiry.Value > DateTime.UtcNow);

            if (user == null || !user.IsActive)
                throw new InvalidOperationException("Invalid or expired reset session.");

            await EnsureUserNotBannedAsync(user);

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await RevokeRefreshTokenAsync(user.Id);
            await _context.SaveChangesAsync();
        }

        public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
        {
            await ReleaseExpiredBansAsync();

            var normalizedEmail = loginDto.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                return null;

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            if (ShouldRequireTwoFactor(user))
                return await CreateTwoFactorChallengeAsync(user, loginDto.RememberMe);

            return await IssueTokensAsync(user, loginDto.RememberMe);
        }

        public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto)
        {
            await ReleaseExpiredBansAsync();

            var googleIdentity = await ValidateGoogleIdTokenAsync(dto.IdToken);
            var normalizedEmail = googleIdentity.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);

            if (user == null)
            {
                var touristRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Name == RoleType.Tourist);

                if (touristRole == null)
                    throw new InvalidOperationException("Tourist role not found");

                var now = DateTime.UtcNow;
                user = new User
                {
                    FirstName = NormalizeGoogleName(googleIdentity.GivenName, "Google"),
                    LastName = NormalizeGoogleName(googleIdentity.FamilyName, "User"),
                    DateOfBirth = DefaultGoogleUserDateOfBirth,
                    Email = normalizedEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(GenerateOpaqueToken()),
                    Country = null,
                    PhoneNumber = null,
                    Language = NormalizeGoogleLanguage(dto.Language),
                    IsVerified = true,
                    IsActive = true,
                    IsBlacklisted = false,
                    ProfileImageUrl = "/images/profiles/default_icon.png",
                    RoleId = touristRole.Id,
                    Role = touristRole,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                var hasChanges = false;

                if (!user.IsVerified)
                {
                    user.IsVerified = true;
                    hasChanges = true;
                }

                if (string.IsNullOrWhiteSpace(user.FirstName))
                {
                    user.FirstName = NormalizeGoogleName(googleIdentity.GivenName, "Google");
                    hasChanges = true;
                }

                if (string.IsNullOrWhiteSpace(user.LastName))
                {
                    user.LastName = NormalizeGoogleName(googleIdentity.FamilyName, "User");
                    hasChanges = true;
                }

                if (hasChanges)
                {
                    user.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            if (ShouldRequireTwoFactor(user))
                return await CreateTwoFactorChallengeAsync(user, dto.RememberMe);

            return await IssueTokensAsync(user, dto.RememberMe);
        }

        public async Task<AuthResponseDto> VerifyTwoFactorLoginAsync(VerifyTwoFactorLoginDto dto)
        {
            await ReleaseExpiredBansAsync();

            var challengeTokenHash = HashOpaqueToken(dto.ChallengeToken);

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.TwoFactorChallengeTokenHash == challengeTokenHash);

            if (user == null || !user.TwoFactorChallengeExpiryUtc.HasValue || user.TwoFactorChallengeExpiryUtc.Value <= DateTime.UtcNow)
                throw new InvalidOperationException("Two-step verification session expired. Please log in again.");

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            if (string.IsNullOrWhiteSpace(user.TwoFactorCodeHash) ||
                !user.TwoFactorCodeExpiryUtc.HasValue ||
                user.TwoFactorCodeExpiryUtc.Value <= DateTime.UtcNow)
            {
                throw new InvalidOperationException("Verification code expired. Please request a new code.");
            }

            if (!string.Equals(user.TwoFactorCodeHash, HashOpaqueToken(dto.Code.Trim()), StringComparison.Ordinal))
                throw new InvalidOperationException("Invalid verification code.");

            var rememberMe = user.TwoFactorRememberMe ?? false;
            ClearTwoFactorChallenge(user);
            return await IssueTokensAsync(user, rememberMe);
        }

        public async Task<AuthResponseDto> ResendTwoFactorLoginCodeAsync(ResendTwoFactorLoginCodeDto dto)
        {
            await ReleaseExpiredBansAsync();

            var challengeTokenHash = HashOpaqueToken(dto.ChallengeToken);

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.TwoFactorChallengeTokenHash == challengeTokenHash);

            if (user == null || !user.TwoFactorChallengeExpiryUtc.HasValue || user.TwoFactorChallengeExpiryUtc.Value <= DateTime.UtcNow)
                throw new InvalidOperationException("Two-step verification session expired. Please log in again.");

            if (!ShouldRequireTwoFactor(user))
                throw new InvalidOperationException("Two-step verification is not enabled for this account.");

            var code = GenerateTwoFactorCode();
            var now = DateTime.UtcNow;

            user.TwoFactorCodeHash = HashOpaqueToken(code);
            user.TwoFactorCodeExpiryUtc = now.AddMinutes(TwoFactorCodeLifetimeMinutes);
            user.TwoFactorChallengeExpiryUtc = now.AddMinutes(TwoFactorCodeLifetimeMinutes);
            user.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await SendTwoFactorCodeEmailAsync(user, code);

            return new AuthResponseDto
            {
                RequiresTwoFactor = true,
                TwoFactorChallengeToken = dto.ChallengeToken,
                TwoFactorExpiresAt = user.TwoFactorChallengeExpiryUtc,
                TwoFactorDeliveryTarget = MaskEmailAddress(user.Email)
            };
        }

        public async Task<TwoFactorSettingsDto?> GetTwoFactorSettingsAsync(int userId)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            return new TwoFactorSettingsDto
            {
                IsEnabled = user.IsTwoFactorEnabled,
                DeliveryMethod = "email",
                MaskedEmailAddress = MaskEmailAddress(user.Email)
            };
        }

        public async Task<TwoFactorSettingsDto?> UpdateTwoFactorSettingsAsync(int userId, UpdateTwoFactorSettingsDto dto)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            user.IsTwoFactorEnabled = dto.IsEnabled;
            user.UpdatedAt = DateTime.UtcNow;

            if (!dto.IsEnabled)
            {
                ClearTwoFactorChallenge(user);
            }

            await _context.SaveChangesAsync();

            return new TwoFactorSettingsDto
            {
                IsEnabled = user.IsTwoFactorEnabled,
                DeliveryMethod = "email",
                MaskedEmailAddress = MaskEmailAddress(user.Email)
            };
        }

        public async Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto refreshTokenDto)
        {
            await ReleaseExpiredBansAsync();

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

            if (!user.IsActive)
                throw new InvalidOperationException("Account is deactivated");

            _context.RefreshTokens.Remove(storedRefreshToken);
            await _context.SaveChangesAsync();

            return await IssueTokensAsync(user, storedRefreshToken.RememberMe);
        }

        public async Task<bool> RequestCreatorRoleAsync(int userId, string creatorType)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can request creator role");

            await EnsureUserNotBannedAsync(user);

            if (HasPendingCreatorRoleRequest(user))
                throw new InvalidOperationException("User already has a pending creator role request.");

            user.HasRequestedCreatorRole = true;
            user.CreatorRoleRequestStatus = CreatorRoleRequestStatus.Pending;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await CreateAdminNewCreatorRoleRequestNotificationsAsync(user);
            return true;
        }

        private async Task CreateAdminNewCreatorRoleRequestNotificationsAsync(User requester)
        {
            var admins = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role.Name == RoleType.Admin && u.IsActive && !u.IsBlacklisted)
                .Select(u => new { u.Id, u.Language })
                .ToListAsync();

            if (admins.Count == 0)
                return;

            var requesterName = $"{requester.FirstName} {requester.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(requesterName))
                requesterName = requester.Email;

            var title = "Novi zahtev za ContentCreator ulogu";
            var message = $"Korisnik {requesterName} je poslao zahtev za ContentCreator ulogu.";

            var notifications = new List<Notification>();
            foreach (var admin in admins)
            {
                var (translatedTitle, translatedMessage) = await _translationService.TranslateNotificationAsync(title, message, admin.Language);
                notifications.Add(new Notification
                {
                    UserId = admin.Id,
                    Type = NotificationType.AdminNewCreatorRoleRequest,
                    Title = translatedTitle,
                    Message = translatedMessage,
                    ActionUrl = "/users/creator-requests",
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ApproveCreatorRoleAsync(int userId)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            await EnsureUserNotBannedAsync(user);

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can be approved for content creator role.");

            var hadPendingRequest = HasPendingCreatorRoleRequest(user);

            var contentCreatorRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == RoleType.ContentCreator);

            if (contentCreatorRole == null)
                throw new KeyNotFoundException("Content creator role not found.");

            user.RoleId = contentCreatorRole.Id;
            user.Role = contentCreatorRole;
            user.HasRequestedCreatorRole = false;
            user.CreatorRoleRequestStatus = CreatorRoleRequestStatus.Approved;
            user.UpdatedAt = DateTime.UtcNow;
            _context.Notifications.Add(hadPendingRequest
                ? await CreateCreatorRoleDecisionNotificationAsync(user, approved: true)
                : await CreateCreatorRolePromotedByAdminNotificationAsync(user));

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectCreatorRoleAsync(int userId)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (user.Role.Name != RoleType.Tourist)
                throw new InvalidOperationException("Only tourists can have creator role requests rejected.");

            if (!HasPendingCreatorRoleRequest(user))
                throw new InvalidOperationException("User has not requested creator role.");

            user.HasRequestedCreatorRole = false;
            user.CreatorRoleRequestStatus = CreatorRoleRequestStatus.Rejected;
            user.UpdatedAt = DateTime.UtcNow;
            _context.Notifications.Add(await CreateCreatorRoleDecisionNotificationAsync(user, approved: false));

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DemoteCreatorRoleAsync(int userId)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (user.Role.Name != RoleType.ContentCreator)
                throw new InvalidOperationException("Only content creators can be moved back to tourist role.");

            var touristRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == RoleType.Tourist);

            if (touristRole == null)
                throw new KeyNotFoundException("Tourist role not found.");

            user.RoleId = touristRole.Id;
            user.Role = touristRole;
            user.HasRequestedCreatorRole = false;
            user.CreatorRoleRequestStatus = CreatorRoleRequestStatus.None;
            user.UpdatedAt = DateTime.UtcNow;
            _context.Notifications.Add(await CreateCreatorRoleRevokedNotificationAsync(user));

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<UserDto?> BanUserAsync(int userId, BanUserDto dto)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            if (user.Role?.Name != RoleType.Tourist && user.Role?.Name != RoleType.ContentCreator)
                throw new InvalidOperationException("Only tourist and content creator accounts can be banned.");

            var normalizedReason = dto.Reason?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedReason))
                throw new InvalidOperationException("Ban reason is required.");

            var normalizedExpiry = dto.BanExpiresAtUtc?.ToUniversalTime();
            if (normalizedExpiry.HasValue && normalizedExpiry.Value <= DateTime.UtcNow)
                throw new InvalidOperationException("Ban end date must be in the future.");

            user.IsBlacklisted = true;
            user.BanReason = normalizedReason;
            user.BanExpiresAtUtc = normalizedExpiry;
            user.BannedAtUtc = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await MapExistingUserDtoWithMetricsAsync(user);
        }

        public async Task<UserDto?> UnbanUserAsync(int userId)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.PreferredRegion)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return null;

            ClearBan(user, DateTime.UtcNow);
            await _context.SaveChangesAsync();

            return await MapExistingUserDtoWithMetricsAsync(user);
        }

        public async Task<bool> ToggleUserActiveAsync(int userId, bool isActive)
        {
            await ReleaseExpiredBansAsync();

            var user = await _context.Users
                .Include(u => u.ManagedDestination)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            if (!isActive && user.ManagedDestinationId.HasValue)
            {
                var destinationName = user.ManagedDestination?.Name?.Trim();
                throw new InvalidOperationException(
                    string.IsNullOrWhiteSpace(destinationName)
                        ? "A destination manager cannot be deactivated until another manager is assigned."
                        : $"Manager for destination '{destinationName}' cannot be deactivated until another manager is assigned.");
            }

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

            var banException = HasActiveBan(user) ? CreateAccountBannedException(user) : null;

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = await MapExistingUserDtoWithMetricsAsync(user),
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                IsBanned = banException != null,
                BanMessage = banException?.Message,
                BanReason = banException?.Reason,
                BanExpiresAtUtc = banException?.ExpiresAtUtc
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

        private static string HashOpaqueToken(string value)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
            return Convert.ToBase64String(bytes);
        }

        private static bool ShouldRequireTwoFactor(User user)
            => user.IsTwoFactorEnabled && user.Role?.Name == RoleType.Tourist;

        private async Task<AuthResponseDto> CreateTwoFactorChallengeAsync(User user, bool rememberMe)
        {
            var now = DateTime.UtcNow;
            var code = GenerateTwoFactorCode();
            var challengeToken = GenerateOpaqueToken();

            user.TwoFactorCodeHash = HashOpaqueToken(code);
            user.TwoFactorCodeExpiryUtc = now.AddMinutes(TwoFactorCodeLifetimeMinutes);
            user.TwoFactorChallengeTokenHash = HashOpaqueToken(challengeToken);
            user.TwoFactorChallengeExpiryUtc = now.AddMinutes(TwoFactorCodeLifetimeMinutes);
            user.TwoFactorRememberMe = rememberMe;
            user.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await SendTwoFactorCodeEmailAsync(user, code);

            return new AuthResponseDto
            {
                RequiresTwoFactor = true,
                TwoFactorChallengeToken = challengeToken,
                TwoFactorExpiresAt = user.TwoFactorChallengeExpiryUtc,
                TwoFactorDeliveryTarget = MaskEmailAddress(user.Email)
            };
        }

        private async Task SendTwoFactorCodeEmailAsync(User user, string code)
        {
            var subject = ResolveTwoFactorEmailSubject(user.Language);
            var htmlBody = BuildTwoFactorEmailBody(user.FirstName, code, user.Language);
            await _emailService.SendAsync(user.Email, subject, htmlBody);
        }

        private static string ResolveTwoFactorEmailSubject(string? language)
        {
            return language?.Trim().ToLowerInvariant() switch
            {
                "sr" or "me" or "cnr" => "SpireGO kod za potvrdu prijave",
                _ => "SpireGO login verification code"
            };
        }

        private static string BuildTwoFactorEmailBody(string? firstName, string code, string? language)
        {
            var safeName = string.IsNullOrWhiteSpace(firstName) ? "there" : firstName.Trim();

            return language?.Trim().ToLowerInvariant() switch
            {
                "sr" or "me" or "cnr" => $"""
                    <p>Zdravo {safeName},</p>
                    <p>Tvoj kod za potvrdu prijave je:</p>
                    <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">{code}</p>
                    <p>Kod važi {TwoFactorCodeLifetimeMinutes} minuta.</p>
                    <p>Ako nisi pokušala prijavu, slobodno ignoriši ovu poruku.</p>
                    """,
                _ => $"""
                    <p>Hello {safeName},</p>
                    <p>Your login verification code is:</p>
                    <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">{code}</p>
                    <p>This code is valid for {TwoFactorCodeLifetimeMinutes} minutes.</p>
                    <p>If this was not you, you can safely ignore this email.</p>
                    """
            };
        }

        private static string GenerateTwoFactorCode()
            => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        private async Task<GoogleIdentityPayload> ValidateGoogleIdTokenAsync(string idToken)
        {
            var clientId = _configuration["GoogleAuth:ClientId"]?.Trim();
            if (string.IsNullOrWhiteSpace(clientId))
                throw new InvalidOperationException("Google login is not configured.");

            var configuration = await GoogleConfigurationManager.GetConfigurationAsync(CancellationToken.None);
            var tokenHandler = new JsonWebTokenHandler();

            var validationResult = await tokenHandler.ValidateTokenAsync(idToken, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = new[]
                {
                    "https://accounts.google.com",
                    "accounts.google.com"
                },
                ValidateAudience = true,
                ValidAudience = clientId,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = configuration.SigningKeys,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2)
            });

            if (!validationResult.IsValid || validationResult.ClaimsIdentity == null)
                throw new InvalidOperationException("Google login failed.");

            var identity = validationResult.ClaimsIdentity;
            var email = identity.FindFirst("email")?.Value;
            var isEmailVerified = string.Equals(
                identity.FindFirst("email_verified")?.Value,
                "true",
                StringComparison.OrdinalIgnoreCase);

            if (string.IsNullOrWhiteSpace(email) || !isEmailVerified)
                throw new InvalidOperationException("Google account email is not verified.");

            return new GoogleIdentityPayload(
                email,
                identity.FindFirst("given_name")?.Value,
                identity.FindFirst("family_name")?.Value);
        }

        private static string GenerateOpaqueToken()
        {
            Span<byte> bytes = stackalloc byte[32];
            RandomNumberGenerator.Fill(bytes);
            return Base64UrlEncode(bytes.ToArray());
        }

        private static string NormalizeGoogleName(string? value, string fallback)
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
            return normalized.Length <= 100 ? normalized : normalized[..100];
        }

        private static string NormalizeGoogleLanguage(string? language)
        {
            return language?.Trim().ToLowerInvariant() switch
            {
                "en" => "en",
                "es" => "es",
                "it" => "it",
                "me" or "cnr" or "sr" => "sr",
                _ => "sr"
            };
        }

        private static string MaskEmailAddress(string? email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return string.Empty;

            var parts = email.Split('@', 2, StringSplitOptions.TrimEntries);
            if (parts.Length != 2)
                return email;

            var local = parts[0];
            var domain = parts[1];

            if (local.Length <= 2)
                return $"{local[0]}*@{domain}";

            return $"{local[0]}{new string('*', Math.Max(1, local.Length - 2))}{local[^1]}@{domain}";
        }

        private static void ClearTwoFactorChallenge(User user)
        {
            user.TwoFactorCodeHash = null;
            user.TwoFactorCodeExpiryUtc = null;
            user.TwoFactorChallengeTokenHash = null;
            user.TwoFactorChallengeExpiryUtc = null;
            user.TwoFactorRememberMe = null;
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
                return configuredBaseUrl.Trim().TrimEnd('/');

            return DefaultPublicAppBaseUrl;
        }

        private string ResolvePublicAppHomeUrl()
            => $"{ResolvePublicAppBaseUrl()}{PublicAppSettings.HomePath}";

        private string ResolveAdminAppBaseUrl()
        {
            var configuredBaseUrl = _configuration["AdminApp:BaseUrl"];
            if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
                return configuredBaseUrl.Trim().TrimEnd('/');

            return DefaultAdminAppBaseUrl;
        }

        private string ResolveAdminAppLoginUrl()
            => $"{ResolveAdminAppBaseUrl()}{AdminAppSettings.LoginPath}";

        private sealed record GoogleIdentityPayload(
            string Email,
            string? GivenName,
            string? FamilyName);

        private static bool HasPendingCreatorRoleRequest(User user)
            => user.HasRequestedCreatorRole || user.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending;

        private static CreatorRoleRequestStatus ResolveCreatorRoleRequestStatus(User user)
        {
            if (user.CreatorRoleRequestStatus != CreatorRoleRequestStatus.None)
                return user.CreatorRoleRequestStatus;

            if (user.HasRequestedCreatorRole)
                return CreatorRoleRequestStatus.Pending;

            if (user.Role?.Name == RoleType.ContentCreator)
                return CreatorRoleRequestStatus.Approved;

            return CreatorRoleRequestStatus.None;
        }

        private async Task<Notification> CreateCreatorRoleDecisionNotificationAsync(User user, bool approved)
        {
            var targetLoginUrl = ResolveAdminAppLoginUrl();
            var title = approved
                ? "Zahtev za ContentCreator ulogu je odobren"
                : "Zahtev za ContentCreator ulogu je odbijen";
            var message = approved
                ? "Tvoj zahtev za ContentCreator ulogu je odobren. Prijavi se u admin aplikaciju da nastaviš."
                : "Tvoj zahtev za ContentCreator ulogu je odbijen. Možeš poslati novi zahtev kasnije.";

            var (translatedTitle, translatedMessage) = await _translationService.TranslateNotificationAsync(title, message, user.Language);

            return new Notification
            {
                UserId = user.Id,
                Type = approved
                    ? NotificationType.CreatorRoleRequestApproved
                    : NotificationType.CreatorRoleRequestRejected,
                Title = translatedTitle,
                Message = translatedMessage,
                ActionUrl = approved ? targetLoginUrl : null,
                CreatedAt = DateTime.UtcNow
            };
        }

        private async Task<Notification> CreateCreatorRolePromotedByAdminNotificationAsync(User user)
        {
            var targetLoginUrl = ResolveAdminAppLoginUrl();
            var title = "Dodeljena je ContentCreator uloga";
            var message = "Administrator ti je dodelio ContentCreator ulogu. Prijavi se u admin aplikaciju da nastaviš.";

            var (translatedTitle, translatedMessage) = await _translationService.TranslateNotificationAsync(title, message, user.Language);

            return new Notification
            {
                UserId = user.Id,
                Type = NotificationType.CreatorRoleRequestApproved,
                Title = translatedTitle,
                Message = translatedMessage,
                ActionUrl = targetLoginUrl,
                CreatedAt = DateTime.UtcNow
            };
        }

        private async Task<Notification> CreateCreatorRoleRevokedNotificationAsync(User user)
        {
            var title = "ContentCreator uloga je uklonjena";
            var message = "Tvoja ContentCreator uloga je uklonjena. Vraćamo te na turističku aplikaciju.";

            var (translatedTitle, translatedMessage) = await _translationService.TranslateNotificationAsync(title, message, user.Language);

            return new Notification
            {
                UserId = user.Id,
                Type = NotificationType.CreatorRoleAccessRevoked,
                Title = translatedTitle,
                Message = translatedMessage,
                ActionUrl = ResolvePublicAppHomeUrl(),
                CreatedAt = DateTime.UtcNow
            };
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
                .Where(u => u.Role.Name == RoleType.Tourist &&
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending ||
                     (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.None && u.HasRequestedCreatorRole)))
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
            for (var i = 0; i < users.Count; i++)
            {
                mappedItems[i].HasRequestedCreatorRole = HasPendingCreatorRoleRequest(users[i]);
                mappedItems[i].CreatorRoleRequestStatus = ResolveCreatorRoleRequestStatus(users[i]).ToString();
            }

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

        private async Task<UserDto?> MapUserDtoWithMetricsAsync(User? user, int? requestingUserId = null)
        {
            if (user == null)
                return null;

            return await MapExistingUserDtoWithMetricsAsync(user, requestingUserId);
        }

        private async Task<UserDto> MapExistingUserDtoWithMetricsAsync(User user, int? requestingUserId = null)
        {
            var dto = _mapper.Map<UserDto>(user);
            dto.HasRequestedCreatorRole = HasPendingCreatorRoleRequest(user);
            dto.CreatorRoleRequestStatus = ResolveCreatorRoleRequestStatus(user).ToString();
            dto.AdminAppLoginUrl = ResolveAdminAppLoginUrl();
            dto.PublicAppHomeUrl = ResolvePublicAppHomeUrl();
            ApplyBanStatus(dto, user);
            ApplyActiveSessionStatus(dto, user, DateTime.UtcNow);
            if (requestingUserId.HasValue)
            {
                dto.EditLock = await BuildEditLockDtoAsync(user, requestingUserId.Value);
            }
            await PopulateUserMetricsAsync(dto, user.Id);
            return dto;
        }

        private async Task PopulateUserMetricsAsync(UserDto dto, int userId)
        {
            dto.FavoritesCount = await _context.Favorites.CountAsync(f => f.UserId == userId);
            dto.PlansCount = await _context.EventPlannerItems.CountAsync(item => item.UserId == userId);
            dto.ReviewsCount = await _context.Reviews.CountAsync(review => review.UserId == userId);
        }

        private void ApplyBanStatus(UserDto dto, User user)
        {
            var isBanned = HasActiveBan(user);
            dto.IsBanned = isBanned;
            dto.BanReason = isBanned ? user.BanReason : null;
            dto.BanExpiresAtUtc = isBanned ? user.BanExpiresAtUtc : null;
            dto.BannedAtUtc = isBanned ? user.BannedAtUtc : null;
        }

        private static void ApplyActiveSessionStatus(UserDto dto, User user, DateTime now)
        {
            var hasActiveSession = HasActiveSession(user, now);
            dto.HasActiveSession = hasActiveSession;
            dto.ActiveSessionExpiresAtUtc = hasActiveSession ? user.RefreshToken?.RefreshTokenExpiry : null;
        }

        private async Task ReleaseExpiredBansAsync()
        {
            var now = DateTime.UtcNow;
            var expiredUsers = await _context.Users
                .Where(u => u.IsBlacklisted && u.BanExpiresAtUtc.HasValue && u.BanExpiresAtUtc.Value <= now)
                .ToListAsync();

            if (expiredUsers.Count == 0)
                return;

            foreach (var user in expiredUsers)
            {
                ClearBan(user, now);
            }

            await _context.SaveChangesAsync();
        }

        private async Task EnsureUserNotBannedAsync(User user)
        {
            if (TryLiftExpiredBan(user))
            {
                await _context.SaveChangesAsync();
                return;
            }

            if (HasActiveBan(user))
                throw CreateAccountBannedException(user);
        }

        private static bool HasActiveBan(User user)
        {
            if (!user.IsBlacklisted)
                return false;

            return !user.BanExpiresAtUtc.HasValue || user.BanExpiresAtUtc.Value > DateTime.UtcNow;
        }

        private static bool HasActiveSession(User user, DateTime now)
        {
            return user.RefreshToken != null && user.RefreshToken.RefreshTokenExpiry > now;
        }

        private async Task<UserEditLockDto?> UpsertEditLockAsync(int userId, int requestingUserId)
        {
            var exists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == userId);

            if (!exists)
                return null;

            var now = DateTime.UtcNow;
            var expiresAt = now.Add(EditLockDuration);

            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE ""Users""
                SET ""EditLockedByUserId"" = {requestingUserId},
                    ""EditLockAcquiredAtUtc"" = CASE
                        WHEN ""EditLockedByUserId"" = {requestingUserId} AND ""EditLockAcquiredAtUtc"" IS NOT NULL
                            THEN ""EditLockAcquiredAtUtc""
                        ELSE {now}
                    END,
                    ""EditLockExpiresAtUtc"" = {expiresAt}
                WHERE ""Id"" = {userId}
                  AND (
                      ""EditLockedByUserId"" IS NULL
                      OR ""EditLockedByUserId"" = {requestingUserId}
                      OR ""EditLockExpiresAtUtc"" IS NULL
                      OR ""EditLockExpiresAtUtc"" <= {now}
                  );
            ");

            return await BuildEditLockDtoAsync(userId, requestingUserId);
        }

        private void EnsureUserEditable(User user, int requestingUserId)
        {
            var now = DateTime.UtcNow;
            if (!IsUserEditLockActive(user, now))
            {
                user.EditLockedByUserId = requestingUserId;
                user.EditLockAcquiredAtUtc = now;
                user.EditLockExpiresAtUtc = now.Add(EditLockDuration);
                return;
            }

            if (user.EditLockedByUserId == requestingUserId)
                return;

            throw new UserEditLockException(BuildEditLockDto(user, requestingUserId, null, now));
        }

        private async Task<UserEditLockDto> BuildEditLockDtoAsync(int userId, int requestingUserId)
        {
            var lockProjection = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new
                {
                    u.Id,
                    u.EditLockedByUserId,
                    u.EditLockAcquiredAtUtc,
                    u.EditLockExpiresAtUtc
                })
                .FirstAsync();

            string? displayName = null;
            if (lockProjection.EditLockedByUserId.HasValue)
            {
                displayName = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Id == lockProjection.EditLockedByUserId.Value)
                    .Select(u => (u.FirstName + " " + u.LastName).Trim())
                    .FirstOrDefaultAsync();
            }

            var user = new User
            {
                Id = lockProjection.Id,
                EditLockedByUserId = lockProjection.EditLockedByUserId,
                EditLockAcquiredAtUtc = lockProjection.EditLockAcquiredAtUtc,
                EditLockExpiresAtUtc = lockProjection.EditLockExpiresAtUtc
            };

            return BuildEditLockDto(user, requestingUserId, displayName, DateTime.UtcNow);
        }

        private async Task<UserEditLockDto> BuildEditLockDtoAsync(User user, int requestingUserId)
        {
            if (!user.EditLockedByUserId.HasValue)
                return BuildEditLockDto(user, requestingUserId, null, DateTime.UtcNow);

            var displayName = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == user.EditLockedByUserId.Value)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync();

            return BuildEditLockDto(user, requestingUserId, displayName, DateTime.UtcNow);
        }

        private static UserEditLockDto BuildEditLockDto(
            User user,
            int requestingUserId,
            string? lockedByDisplayName,
            DateTime now)
        {
            var isLocked = IsUserEditLockActive(user, now);
            var isOwnedByCurrentUser = isLocked && user.EditLockedByUserId == requestingUserId;
            var displayName = string.IsNullOrWhiteSpace(lockedByDisplayName) ? "Another admin" : lockedByDisplayName;

            var message = !isLocked
                ? "This user is available for editing."
                : isOwnedByCurrentUser
                    ? "You are currently editing this user."
                    : $"{displayName} is currently editing this user. Try again after the lock expires.";

            return new UserEditLockDto
            {
                UserId = user.Id,
                IsLocked = isLocked,
                IsOwnedByCurrentUser = isOwnedByCurrentUser,
                LockedByUserId = isLocked ? user.EditLockedByUserId : null,
                LockedByDisplayName = isLocked ? displayName : null,
                AcquiredAtUtc = isLocked ? user.EditLockAcquiredAtUtc : null,
                ExpiresAtUtc = isLocked ? user.EditLockExpiresAtUtc : null,
                Message = message
            };
        }

        private static bool IsUserEditLockActive(User user, DateTime now)
        {
            return user.EditLockedByUserId.HasValue &&
                   user.EditLockExpiresAtUtc.HasValue &&
                   user.EditLockExpiresAtUtc.Value > now;
        }

        private async Task ApplyEditLocksAsync(List<UserDto> dtos, List<User> users, int requestingUserId)
        {
            if (dtos.Count == 0 || users.Count == 0)
                return;

            var now = DateTime.UtcNow;
            var usersById = users.ToDictionary(u => u.Id);
            var activeLockUserIds = users
                .Where(u => IsUserEditLockActive(u, now) && u.EditLockedByUserId.HasValue)
                .Select(u => u.EditLockedByUserId!.Value)
                .Distinct()
                .ToList();

            var displayNamesByUserId = activeLockUserIds.Count == 0
                ? new Dictionary<int, string>()
                : await _context.Users
                    .AsNoTracking()
                    .Where(u => activeLockUserIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => (u.FirstName + " " + u.LastName).Trim());

            foreach (var dto in dtos)
            {
                if (!usersById.TryGetValue(dto.Id, out var user))
                    continue;

                string? displayName = null;
                if (user.EditLockedByUserId.HasValue)
                    displayNamesByUserId.TryGetValue(user.EditLockedByUserId.Value, out displayName);

                dto.EditLock = BuildEditLockDto(user, requestingUserId, displayName, now);
            }
        }

        private static bool TryLiftExpiredBan(User user)
        {
            if (!user.IsBlacklisted || !user.BanExpiresAtUtc.HasValue || user.BanExpiresAtUtc.Value > DateTime.UtcNow)
                return false;

            ClearBan(user, DateTime.UtcNow);
            return true;
        }

        private static void ClearBan(User user, DateTime now)
        {
            user.IsBlacklisted = false;
            user.BanReason = null;
            user.BanExpiresAtUtc = null;
            user.BannedAtUtc = null;
            user.UpdatedAt = now;
        }

        private AccountBannedException CreateAccountBannedException(User user)
        {
            var reason = string.IsNullOrWhiteSpace(user.BanReason)
                ? "Krsenje pravila platforme."
                : user.BanReason.Trim();

            var message = user.BanExpiresAtUtc.HasValue
                ? $"Ovaj nalog je banovan do {user.BanExpiresAtUtc.Value:dd.MM.yyyy. HH:mm} UTC. Razlog: {reason}"
                : $"Ovaj nalog je trajno banovan. Razlog: {reason}";

            return new AccountBannedException(message, reason, user.BanExpiresAtUtc, user.Role?.Name.ToString());
        }
    }
}
