using TuristickiVodic.Core.Helpers;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services
{
    public class DestinationService : IDestinationService
    {
        private static readonly TimeSpan EditLockDuration = TimeSpan.FromMinutes(3);
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITranslationService _translationService;

        public DestinationService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
        }

        public async Task<PagedResultDto<DestinationDto>> GetAllAsync(int? userId, string? role, DestinationQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var destinationsQuery = _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .Where(d => d.Images.Any(i => i.IsMain))
                .AsNoTracking()
                .AsQueryable();

            if (role != null && role == RoleType.Manager.ToString())
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.ManagedDestinationId == null)
                {
                    return new PagedResultDto<DestinationDto>
                    {
                        Items = new List<DestinationDto>(),
                        Page = query.Page,
                        PageSize = query.PageSize,
                        TotalCount = 0,
                        TotalPages = 0
                    };
                }

                destinationsQuery = destinationsQuery.Where(d => d.Id == user.ManagedDestinationId);
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                destinationsQuery = destinationsQuery.Where(d =>
                    d.DestinationType != null &&
                    d.DestinationType.Name.ToLower().Contains(type));
            }

            if (query.RegionId.HasValue)
            {
                destinationsQuery = destinationsQuery.Where(d => d.RegionId == query.RegionId.Value);
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                destinationsQuery = ApplyDestinationSearch(destinationsQuery, search);

            if (search == null)
                destinationsQuery = ApplyDestinationSorting(destinationsQuery, query.SortBy, query.SortOrder);

            var totalCount = await destinationsQuery.CountAsync();

            var destinations = await destinationsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<DestinationDto>>(destinations);
            await ApplyTranslationsAsync(mappedItems, destinations, query.Lang);
            if (role == RoleType.Admin.ToString() && userId.HasValue)
                await ApplyEditLocksAsync(mappedItems, destinations, userId.Value);

            return new PagedResultDto<DestinationDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<DestinationDto?> GetByIdAsync(int id, int? userId, string? role, string lang = "sr")
        {
            var destination = await _context.Destinations
                .AsNoTracking()
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return null;

            if (!destination.Images.Any(i => i.IsMain))
                return null;

            if (role == RoleType.Manager.ToString())
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.ManagedDestinationId != destination.Id)
                    throw new UnauthorizedAccessException();
            }

            var dto = _mapper.Map<DestinationDto>(destination);
            await ApplyTranslationsAsync(dto, destination, lang);
            if (role == RoleType.Admin.ToString() && userId.HasValue)
                dto.EditLock = await BuildEditLockDtoAsync(destination, userId.Value);
            return dto;
        }

        public async Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId)
        {
            var destinationTypeExists = await _context.DestinationTypes
                .AnyAsync(dt => dt.Id == dto.DestinationTypeId);

            if (!destinationTypeExists)
                throw new InvalidOperationException("Destination type not found");

            var regionExists = await _context.Regions
                .AnyAsync(r => r.Id == dto.RegionId && r.IsActive);

            if (!regionExists)
                throw new InvalidOperationException("Region not found.");

            if (dto.ManagedByUserId == null)
                throw new InvalidOperationException("Destination must have a manager.");

            var manager = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == dto.ManagedByUserId.Value);

            if (manager == null)
                throw new InvalidOperationException("Manager user not found.");

            if (manager.Role?.Name != RoleType.Manager)
                throw new InvalidOperationException("The assigned user does not have the Manager role.");

            if (manager.ManagedDestinationId != null)
                throw new InvalidOperationException("This manager already manages another destination. Each manager can manage only one destination.");

            var destination = new Destination
            {
                Name = dto.Name,
                DisplayTitle = string.IsNullOrWhiteSpace(dto.DisplayTitle) ? null : dto.DisplayTitle.Trim(),
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                Status = ContentStatus.Approved,
                DestinationTypeId = dto.DestinationTypeId,
                RegionId = dto.RegionId,
                ManagedByUserId = dto.ManagedByUserId.Value,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();

            manager.ManagedDestinationId = destination.Id;
            await _context.SaveChangesAsync();

            var created = await _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(created);
        }

        public async Task<DestinationEditLockDto?> AcquireEditLockAsync(int destinationId, int requestingUserId)
        {
            return await UpsertEditLockAsync(destinationId, requestingUserId);
        }

        public async Task<DestinationEditLockDto?> RefreshEditLockAsync(int destinationId, int requestingUserId)
        {
            return await UpsertEditLockAsync(destinationId, requestingUserId);
        }

        public async Task<bool> ReleaseEditLockAsync(int destinationId, int requestingUserId)
        {
            var affected = await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE ""Destinations""
                SET ""EditLockedByUserId"" = NULL,
                    ""EditLockAcquiredAtUtc"" = NULL,
                    ""EditLockExpiresAtUtc"" = NULL
                WHERE ""Id"" = {destinationId}
                  AND ""EditLockedByUserId"" = {requestingUserId};
            ");

            return affected > 0;
        }

        // Samo Admin može da menja destinacije.
        // Promena menadžera ide kroz AssignManagerAsync - odvojeni Admin endpoint.
        public async Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName)
        {
            var destination = await _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return null;

            EnsureDestinationEditable(destination, requestingUserId);

            if (dto.DestinationTypeId.HasValue)
            {
                var destinationTypeExists = await _context.DestinationTypes
                    .AnyAsync(dt => dt.Id == dto.DestinationTypeId.Value);

                if (!destinationTypeExists)
                    throw new InvalidOperationException("Destination type not found");

                destination.DestinationTypeId = dto.DestinationTypeId.Value;
            }

            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions
                    .AnyAsync(r => r.Id == dto.RegionId.Value && r.IsActive);

                if (!regionExists)
                    throw new InvalidOperationException("Region not found.");

                destination.RegionId = dto.RegionId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                destination.Name = dto.Name;

            if (dto.DisplayTitle != null)
                destination.DisplayTitle = string.IsNullOrWhiteSpace(dto.DisplayTitle) ? null : dto.DisplayTitle.Trim();

            if (dto.Description != null)
                destination.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                destination.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            destination.UpdatedAt = DateTime.UtcNow;
            destination.EditLockExpiresAtUtc = DateTime.UtcNow.Add(EditLockDuration);

            await _context.SaveChangesAsync();

            var updated = await _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(updated);
        }

        /// Samo Admin može da promeni menadžera destinacije.
        /// Novi menadžer mora da ima rolu Manager i ne sme već da vodi drugu destinaciju.
        /// Stari menadžer se oslobađa (ManagedDestinationId -> null).
        public async Task<DestinationDto?> AssignManagerAsync(int destinationId, int newManagerUserId, int requestingUserId)
        {
            var destination = await _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == destinationId);

            if (destination == null)
                return null;

            EnsureDestinationEditable(destination, requestingUserId);

            var newManager = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == newManagerUserId);

            if (newManager == null)
                throw new InvalidOperationException("User not found.");

            if (newManager.Role?.Name != RoleType.Manager)
                throw new InvalidOperationException("The assigned user does not have the Manager role.");

            if (newManager.ManagedDestinationId != null && newManager.ManagedDestinationId != destinationId)
                throw new InvalidOperationException("This manager already manages another destination.");

            // Oslobodi starog menadžera ako postoji
            if (destination.ManagedByUserId.HasValue && destination.ManagedByUserId != newManagerUserId)
            {
                var oldManager = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == destination.ManagedByUserId.Value);

                if (oldManager != null)
                {
                    oldManager.ManagedDestinationId = null;
                    oldManager.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Dodeli novog menadžera
            destination.ManagedByUserId = newManagerUserId;
            destination.UpdatedAt = DateTime.UtcNow;
            destination.EditLockExpiresAtUtc = DateTime.UtcNow.Add(EditLockDuration);

            newManager.ManagedDestinationId = destinationId;
            newManager.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Destinations
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .FirstAsync(d => d.Id == destinationId);

            return _mapper.Map<DestinationDto>(updated);
        }

        // Brisanjem destinacije kaskadno se brišu njeni lokaliteti i objekti.
        public async Task<bool> DeleteAsync(int id)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return false;

            _context.Destinations.Remove(destination);
            await _context.SaveChangesAsync();

            return true;
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        private static string? NormalizeSearchTerm(string? search)
        {
            return string.IsNullOrWhiteSpace(search)
                ? null
                : search.Trim().ToLower();
        }

        private static IQueryable<Destination> ApplyDestinationSearch(IQueryable<Destination> query, string search)
        {
            return query
                .Where(d =>
                    d.Name.ToLower().Contains(search) ||
                    (d.DestinationType != null && d.DestinationType.Name.ToLower().Contains(search)) ||
                    (d.Description != null && d.Description.ToLower().Contains(search)))
                .OrderBy(d => d.Name.ToLower().Contains(search) ? 0 :
                    (d.DestinationType != null && d.DestinationType.Name.ToLower().Contains(search) ? 1 :
                    (d.Description != null && d.Description.ToLower().Contains(search) ? 2 : 3)))
                .ThenBy(d => d.Name);
        }

        private static IQueryable<Destination> ApplyDestinationSorting(IQueryable<Destination> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(d => d.DestinationType!.Name)
                    : query.OrderBy(d => d.DestinationType!.Name);
            }

            if (sortByValue == "createdat")
            {
                return isDesc
                    ? query.OrderByDescending(d => d.CreatedAt)
                    : query.OrderBy(d => d.CreatedAt);
            }

            return isDesc
                ? query.OrderByDescending(d => d.Name)
                : query.OrderBy(d => d.Name);
        }

        private async Task<DestinationEditLockDto?> UpsertEditLockAsync(int destinationId, int requestingUserId)
        {
            var exists = await _context.Destinations
                .AsNoTracking()
                .AnyAsync(d => d.Id == destinationId);

            if (!exists)
                return null;

            var now = DateTime.UtcNow;
            var expiresAt = now.Add(EditLockDuration);

            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE ""Destinations""
                SET ""EditLockedByUserId"" = {requestingUserId},
                    ""EditLockAcquiredAtUtc"" = CASE
                        WHEN ""EditLockedByUserId"" = {requestingUserId} AND ""EditLockAcquiredAtUtc"" IS NOT NULL
                            THEN ""EditLockAcquiredAtUtc""
                        ELSE {now}
                    END,
                    ""EditLockExpiresAtUtc"" = {expiresAt}
                WHERE ""Id"" = {destinationId}
                  AND (
                      ""EditLockedByUserId"" IS NULL
                      OR ""EditLockedByUserId"" = {requestingUserId}
                      OR ""EditLockExpiresAtUtc"" IS NULL
                      OR ""EditLockExpiresAtUtc"" <= {now}
                  );
            ");

            return await BuildEditLockDtoAsync(destinationId, requestingUserId);
        }

        private void EnsureDestinationEditable(Destination destination, int requestingUserId)
        {
            var now = DateTime.UtcNow;
            if (!IsLockActive(destination, now))
            {
                destination.EditLockedByUserId = requestingUserId;
                destination.EditLockAcquiredAtUtc = now;
                destination.EditLockExpiresAtUtc = now.Add(EditLockDuration);
                return;
            }

            if (destination.EditLockedByUserId == requestingUserId)
                return;

            throw new DestinationEditLockException(BuildEditLockDto(destination, requestingUserId, null, now));
        }

        private async Task<DestinationEditLockDto> BuildEditLockDtoAsync(int destinationId, int requestingUserId)
        {
            var lockProjection = await _context.Destinations
                .AsNoTracking()
                .Where(d => d.Id == destinationId)
                .Select(d => new
                {
                    d.Id,
                    d.EditLockedByUserId,
                    d.EditLockAcquiredAtUtc,
                    d.EditLockExpiresAtUtc
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

            var destination = new Destination
            {
                Id = lockProjection.Id,
                EditLockedByUserId = lockProjection.EditLockedByUserId,
                EditLockAcquiredAtUtc = lockProjection.EditLockAcquiredAtUtc,
                EditLockExpiresAtUtc = lockProjection.EditLockExpiresAtUtc
            };

            return BuildEditLockDto(destination, requestingUserId, displayName, DateTime.UtcNow);
        }

        private async Task<DestinationEditLockDto> BuildEditLockDtoAsync(Destination destination, int requestingUserId)
        {
            if (!destination.EditLockedByUserId.HasValue)
                return BuildEditLockDto(destination, requestingUserId, null, DateTime.UtcNow);

            var displayName = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == destination.EditLockedByUserId.Value)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync();

            return BuildEditLockDto(destination, requestingUserId, displayName, DateTime.UtcNow);
        }

        private static DestinationEditLockDto BuildEditLockDto(
            Destination destination,
            int requestingUserId,
            string? lockedByDisplayName,
            DateTime now)
        {
            var isLocked = IsLockActive(destination, now);
            var isOwnedByCurrentUser = isLocked && destination.EditLockedByUserId == requestingUserId;
            var displayName = string.IsNullOrWhiteSpace(lockedByDisplayName) ? "Another admin" : lockedByDisplayName;

            var message = !isLocked
                ? "This destination is available for editing."
                : isOwnedByCurrentUser
                    ? "You are currently editing this destination."
                    : $"{displayName} is currently editing this destination. Try again after the lock expires.";

            return new DestinationEditLockDto
            {
                DestinationId = destination.Id,
                IsLocked = isLocked,
                IsOwnedByCurrentUser = isOwnedByCurrentUser,
                LockedByUserId = isLocked ? destination.EditLockedByUserId : null,
                LockedByDisplayName = isLocked ? displayName : null,
                AcquiredAtUtc = isLocked ? destination.EditLockAcquiredAtUtc : null,
                ExpiresAtUtc = isLocked ? destination.EditLockExpiresAtUtc : null,
                Message = message
            };
        }

        private static bool IsLockActive(Destination destination, DateTime now)
        {
            return destination.EditLockedByUserId.HasValue &&
                   destination.EditLockExpiresAtUtc.HasValue &&
                   destination.EditLockExpiresAtUtc.Value > now;
        }

        private async Task ApplyEditLocksAsync(List<DestinationDto> dtos, List<Destination> destinations, int requestingUserId)
        {
            if (dtos.Count == 0 || destinations.Count == 0)
                return;

            var now = DateTime.UtcNow;
            var destinationsById = destinations.ToDictionary(d => d.Id);
            var activeLockUserIds = destinations
                .Where(d => IsLockActive(d, now) && d.EditLockedByUserId.HasValue)
                .Select(d => d.EditLockedByUserId!.Value)
                .Distinct()
                .ToList();

            var displayNamesByUserId = activeLockUserIds.Count == 0
                ? new Dictionary<int, string>()
                : await _context.Users
                    .AsNoTracking()
                    .Where(u => activeLockUserIds.Contains(u.Id))
                    .ToDictionaryAsync(
                        u => u.Id,
                        u => (u.FirstName + " " + u.LastName).Trim());

            foreach (var dto in dtos)
            {
                if (!destinationsById.TryGetValue(dto.Id, out var destination))
                    continue;

                string? displayName = null;
                if (destination.EditLockedByUserId.HasValue)
                    displayNamesByUserId.TryGetValue(destination.EditLockedByUserId.Value, out displayName);

                dto.EditLock = BuildEditLockDto(destination, requestingUserId, displayName, now);
            }
        }

        private async Task ApplyTranslationsAsync(List<DestinationDto> dtos, List<Destination> destinations, string? lang)
        {
            if (dtos.Count == 0 || destinations.Count == 0)
                return;

            var normalizedLang = LanguageHelper.Normalize(lang);
            if (normalizedLang == "sr")
                return;

            var destinationsById = destinations.ToDictionary(d => d.Id);
            foreach (var dto in dtos)
            {
                if (!destinationsById.TryGetValue(dto.Id, out var destination))
                    continue;

                await ApplyTranslationsAsync(dto, destination, normalizedLang, true);
            }
        }

        private async Task ApplyTranslationsAsync(DestinationDto dto, Destination destination, string? lang, bool createMissing = true)
        {
            var normalizedLang = LanguageHelper.Normalize(lang);
            if (normalizedLang == "sr")
                return;

            if (!string.IsNullOrWhiteSpace(destination.DisplayTitle))
            {
                dto.DisplayTitle = createMissing
                    ? await _translationService.GetOrCreateTextAsync(
                    "Destination",
                    destination.Id,
                    "DisplayTitle",
                    destination.DisplayTitle,
                    normalizedLang)
                    : await _translationService.GetTextAsync(
                    "Destination",
                    destination.Id,
                    "DisplayTitle",
                    destination.DisplayTitle,
                    normalizedLang);
            }

            dto.Description = createMissing
                ? await _translationService.GetOrCreateTextAsync(
                "Destination",
                destination.Id,
                "Description",
                destination.Description ?? string.Empty,
                normalizedLang)
                : await _translationService.GetTextAsync(
                "Destination",
                destination.Id,
                "Description",
                destination.Description ?? string.Empty,
                normalizedLang);

            if (destination.DestinationType != null && !string.IsNullOrWhiteSpace(destination.DestinationType.Name))
            {
                dto.DestinationTypeName = createMissing
                    ? await _translationService.GetOrCreateTextAsync(
                    "DestinationType",
                    destination.DestinationType.Id,
                    "Name",
                    destination.DestinationType.Name,
                    normalizedLang)
                    : await _translationService.GetTextAsync(
                    "DestinationType",
                    destination.DestinationType.Id,
                    "Name",
                    destination.DestinationType.Name,
                    normalizedLang);
            }
        }
    }
}
