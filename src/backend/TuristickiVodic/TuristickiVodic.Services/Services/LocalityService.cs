using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services
{
    public class LocalityService : ILocalityService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITranslationService _translationService;

        public LocalityService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
        }

        public async Task<IEnumerable<LocalityDto>> GetAllAsync()
        {
            var localities = await _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .Where(l => l.IsActive && l.Images.Any(i => i.IsMain))
                .OrderBy(l => l.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<LocalityDto>>(localities);
        }

        public async Task<LocalityDto?> GetByIdAsync(int id, string lang = "sr")
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return null;

            if (!locality.IsActive)
                return null;

            if (!locality.Images.Any(i => i.IsMain))
                return null;

            var dto = _mapper.Map<LocalityDto>(locality);
            await ApplyTranslationsAsync(dto, locality, lang);
            return dto;
        }

        public async Task<LocalityDto> CreateAsync(CreateLocalityDto dto, int userId, string roleName)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == dto.DestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            var localityTypeExists = await _context.LocalityTypes
                .AnyAsync(lt => lt.Id == dto.LocalityTypeId);

            if (!localityTypeExists)
                throw new InvalidOperationException("Locality type not found");

            // Samo menadžer upravlja lokalitetima.
            // Ako je destinacija ostala bez menadžera (izuzetna situacija),
            // odgovornost preuzima menadžer geografski najbliže destinacije – NE admin.
            if (roleName == "Manager")
            {
                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new InvalidOperationException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot manage localities directly. The responsible manager handles localities.");
            }

            var locality = new Core.Models.Locality
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                DestinationId = dto.DestinationId,
                LocalityTypeId = dto.LocalityTypeId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Localities.Add(locality);
            await _context.SaveChangesAsync();

            var created = await _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .FirstAsync(l => l.Id == locality.Id);

            return _mapper.Map<LocalityDto>(created);
        }

        public async Task<LocalityDto?> UpdateAsync(int id, UpdateLocalityDto dto, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return null;

            var targetDestinationId = dto.DestinationId ?? locality.DestinationId;

            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == targetDestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            // Samo menadžer može da menja lokalitete.
            // Menadžer može da menja samo lokalitete u svojoj destinaciji.
            // Ako se lokalitet premešta, menadžer mora biti odgovoran i za ciljnu destinaciju.
            if (roleName == "Manager")
            {
                var manager = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (manager == null)
                    throw new InvalidOperationException("User not found");

                if (manager.ManagedDestinationId != locality.DestinationId)
                    throw new InvalidOperationException("You are not the responsible manager for the current destination of this locality.");

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                {
                    if (manager.ManagedDestinationId != dto.DestinationId.Value)
                        throw new InvalidOperationException("You are not the responsible manager for the target destination.");
                }
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot manage localities directly. The responsible manager handles localities.");
            }

            if (dto.LocalityTypeId.HasValue)
            {
                var localityTypeExists = await _context.LocalityTypes
                    .AnyAsync(lt => lt.Id == dto.LocalityTypeId.Value);

                if (!localityTypeExists)
                    throw new InvalidOperationException("Locality type not found");

                locality.LocalityTypeId = dto.LocalityTypeId.Value;
            }

            if (dto.DestinationId.HasValue)
                locality.DestinationId = dto.DestinationId.Value;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                locality.Name = dto.Name;

            if (dto.Description != null)
                locality.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                locality.Geolocation = CreatePoint(dto.Longitude.Value, dto.Latitude.Value);

            locality.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .FirstAsync(l => l.Id == locality.Id);

            return _mapper.Map<LocalityDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return false;

            // Samo menadžer može da briše lokalitete.
            // Ako je destinacija ostala bez menadžera (izuzetna situacija),
            // odgovornost preuzima menadžer geografski najbliže destinacije – NE admin.
            if (roleName == "Manager")
            {
                if (locality.Destination == null)
                    throw new InvalidOperationException("Cannot determine destination of this locality.");

                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, locality.Destination, userId);
                if (!isResponsible)
                    throw new InvalidOperationException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot delete localities directly. The responsible manager handles localities.");
            }

            _context.Localities.Remove(locality);
            await _context.SaveChangesAsync();

            return true;
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        public async Task<LocalityDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return null;

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only managers can change locality visibility.");

            if (locality.Destination == null)
                throw new InvalidOperationException("Cannot determine destination of this locality.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, locality.Destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            locality.IsActive = isActive;
            locality.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .FirstAsync(l => l.Id == locality.Id);

            return _mapper.Map<LocalityDto>(updated);
        }

        public async Task<PagedResultDto<LocalityDto>> GetAllAsync(LocalityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var localitiesQuery = _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .Where(l => l.IsActive)
                .Where(l => l.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                localitiesQuery = localitiesQuery.Where(l =>
                    l.Destination != null &&
                    l.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                localitiesQuery = localitiesQuery.Where(l =>
                    l.LocalityType != null &&
                    l.LocalityType.Name.ToLower().Contains(type));
            }

            if (query.RegionId.HasValue)
            {
                localitiesQuery = localitiesQuery.Where(l =>
                    l.Destination != null &&
                    l.Destination.RegionId == query.RegionId.Value);
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                localitiesQuery = ApplyLocalitySearch(localitiesQuery, search);

            if (search == null)
                localitiesQuery = ApplyLocalitySorting(localitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await localitiesQuery.CountAsync();

            var items = await localitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<LocalityDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);

            return new PagedResultDto<LocalityDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<LocalityDto>> GetNearbyAsync(NearbyLocalityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var localitiesQuery = _context.Localities
                .Include(l => l.Destination)
                    .ThenInclude(d => d.Region)
                .Include(l => l.LocalityType)
                .Include(l => l.Images)
                .Where(l => l.IsActive)
                .Where(l => l.Geolocation != null)
                .Where(l => l.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                localitiesQuery = localitiesQuery.Where(l =>
                    l.Destination != null &&
                    l.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                localitiesQuery = localitiesQuery.Where(l =>
                    l.LocalityType != null &&
                    l.LocalityType.Name.ToLower().Contains(type));
            }

            if (query.RegionId.HasValue)
            {
                localitiesQuery = localitiesQuery.Where(l =>
                    l.Destination != null &&
                    l.Destination.RegionId == query.RegionId.Value);
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                localitiesQuery = ApplyLocalitySearchFilter(localitiesQuery, search);

            var localities = await localitiesQuery.ToListAsync();

            var nearbyLocalities = localities
                .Select(locality => new
                {
                    Locality = locality,
                    DistanceMeters = CalculateDistanceMeters(
                        query.Latitude,
                        query.Longitude,
                        locality.Geolocation!.Y,
                        locality.Geolocation.X)
                })
                .Where(x => x.DistanceMeters <= query.RadiusMeters)
                .ToList();

            var isDesc = string.Equals(query.SortOrder?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            nearbyLocalities = isDesc
                ? nearbyLocalities.OrderByDescending(x => x.DistanceMeters).ThenBy(x => x.Locality.Name).ToList()
                : nearbyLocalities.OrderBy(x => x.DistanceMeters).ThenBy(x => x.Locality.Name).ToList();

            var totalCount = nearbyLocalities.Count;

            var items = nearbyLocalities
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x =>
                {
                    var dto = _mapper.Map<LocalityDto>(x.Locality);
                    dto.DistanceMeters = Math.Round(x.DistanceMeters, 2);
                    return dto;
                })
                .ToList();

            await ApplyTranslationsAsync(items, nearbyLocalities
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => x.Locality)
                .ToList(), query.Lang);
            return new PagedResultDto<LocalityDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        private static string? NormalizeSearchTerm(string? search)
        {
            return string.IsNullOrWhiteSpace(search)
                ? null
                : search.Trim().ToLower();
        }

        private static IQueryable<Locality> ApplyLocalitySearch(IQueryable<Locality> query, string search)
        {
            return ApplyLocalitySearchFilter(query, search)
                .OrderBy(l => l.Name.ToLower().Contains(search) ? 0 :
                    (l.LocalityType != null && l.LocalityType.Name.ToLower().Contains(search) ? 1 :
                    (l.Description != null && l.Description.ToLower().Contains(search) ? 2 : 3)))
                .ThenBy(l => l.Name);
        }

        private static IQueryable<Locality> ApplyLocalitySearchFilter(IQueryable<Locality> query, string search)
        {
            return query.Where(l =>
                l.Name.ToLower().Contains(search) ||
                (l.LocalityType != null && l.LocalityType.Name.ToLower().Contains(search)) ||
                (l.Description != null && l.Description.ToLower().Contains(search)));
        }

        private static IQueryable<Locality> ApplyLocalitySorting(IQueryable<Locality> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(l => l.Destination!.Name)
                    : query.OrderBy(l => l.Destination!.Name);
            }

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(l => l.LocalityType!.Name)
                    : query.OrderBy(l => l.LocalityType!.Name);
            }

            if (sortByValue == "createdat")
            {
                return isDesc
                    ? query.OrderByDescending(l => l.CreatedAt)
                    : query.OrderBy(l => l.CreatedAt);
            }

            return isDesc
                ? query.OrderByDescending(l => l.Name)
                : query.OrderBy(l => l.Name);
        }

        private static double CalculateDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
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

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

        private async Task ApplyTranslationsAsync(List<LocalityDto> dtos, List<Locality> localities, string? lang)
        {
            if (dtos.Count == 0 || localities.Count == 0)
                return;

            var normalizedLang = NormalizeLanguage(lang);
            if (normalizedLang == "sr" || normalizedLang == "me")
                return;

            var localitiesById = localities.ToDictionary(l => l.Id);
            foreach (var dto in dtos)
            {
                if (localitiesById.TryGetValue(dto.Id, out var locality))
                    await ApplyTranslationsAsync(dto, locality, normalizedLang);
            }
        }

        private async Task ApplyTranslationsAsync(LocalityDto dto, Locality locality, string? lang)
        {
            var normalizedLang = NormalizeLanguage(lang);
            if (normalizedLang == "sr" || normalizedLang == "me")
                return;

            dto.Description = await _translationService.GetOrCreateTextAsync(
                "Locality",
                locality.Id,
                "Description",
                locality.Description ?? string.Empty,
                normalizedLang);

            if (locality.LocalityType != null && !string.IsNullOrWhiteSpace(locality.LocalityType.Name))
            {
                dto.LocalityTypeName = await _translationService.GetOrCreateTextAsync(
                    "LocalityType",
                    locality.LocalityType.Id,
                    "Name",
                    locality.LocalityType.Name,
                    normalizedLang);
            }
        }

        private static string NormalizeLanguage(string? lang)
        {
            return string.IsNullOrWhiteSpace(lang)
                ? "sr"
                : lang.Trim().ToLowerInvariant();
        }
    }
}
