using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace TuristickiVodic.Services.Services
{
    public class TouristObjectService : ITouristObjectService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public TouristObjectService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedResultDto<TouristObjectDto>> GetAllAsync(TouristObjectQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var objectsQuery = _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(o => o.Images)
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.IsActive)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.ObjectType != null &&
                    o.ObjectType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    ((o.Destination != null && o.Destination.Name.ToLower().Contains(destination)) ||
                     (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Locality))
            {
                var locality = query.Locality.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.Locality != null &&
                    o.Locality.Name.ToLower().Contains(locality));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination) && !string.IsNullOrWhiteSpace(query.Locality))
            {
                var destination = query.Destination.Trim().ToLower();
                var locality = query.Locality.Trim().ToLower();

                var localityEntity = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstOrDefaultAsync(l => l.Name.ToLower().Contains(locality));

                if (localityEntity != null &&
                    localityEntity.Destination != null &&
                    !localityEntity.Destination.Name.ToLower().Contains(destination))
                {
                    throw new InvalidOperationException("The selected locality does not belong to the selected destination.");
                }
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.Name.ToLower().Contains(search) ||
                    (o.Description != null && o.Description.ToLower().Contains(search)));
            }

            objectsQuery = ApplyObjectSorting(objectsQuery, query.SortBy, query.SortOrder);

            var totalCount = await objectsQuery.CountAsync();

            var items = await objectsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = items.Select(MapToDto).ToList();

            return new PagedResultDto<TouristObjectDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<TouristObjectDto?> GetByIdAsync(int id)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null)
                return null;

            if (obj.Status != ContentStatus.Approved || !obj.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            return MapToDto(obj);
        }

        // Samo CC može da kreira objekte; status uvek Pending, čeka odobrenje
        // Objekat mora imati destinaciju; lokalitet je opcioni, ali ako postoji mora pripadati toj destinaciji
        public async Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == dto.DestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found.");

            Locality? locality = null;
            if (dto.LocalityId.HasValue)
            {
                locality = await _context.Localities
                    .FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);

                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (locality.DestinationId != dto.DestinationId)
                    throw new InvalidOperationException("Selected locality does not belong to the selected destination.");
            }

            if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId))
                throw new InvalidOperationException("Object type not found.");

            var obj = new TouristObject
            {
                Name = dto.Name,
                Description = dto.Description,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Website = dto.Website,
                WorkingHours = dto.WorkingHours,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                ObjectTypeId = dto.ObjectTypeId,
                DestinationId = dto.DestinationId,
                LocalityId = dto.LocalityId,
                CreatedByUserId = userId,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Objects.Add(obj);
            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        // Samo CC može da menja objekte, i to samo svoje
        public async Task<TouristObjectDto?> UpdateAsync(int id, UpdateTouristObjectDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update objects.");

            if (obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update your own objects.");

            if (dto.ObjectTypeId.HasValue)
            {
                if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId.Value))
                    throw new InvalidOperationException("Object type not found.");
                obj.ObjectTypeId = dto.ObjectTypeId.Value;
            }

            var newDestinationId = dto.DestinationId ?? obj.DestinationId;
            var newLocalityId = dto.LocalityId.HasValue ? dto.LocalityId : obj.LocalityId;

            if (dto.DestinationId.HasValue)
            {
                if (!await _context.Destinations.AnyAsync(d => d.Id == dto.DestinationId.Value))
                    throw new InvalidOperationException("Destination not found.");
                obj.DestinationId = dto.DestinationId.Value;
            }

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities.FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);
                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (locality.DestinationId != newDestinationId)
                    throw new InvalidOperationException("Selected locality does not belong to the selected destination.");

                obj.LocalityId = dto.LocalityId.Value;
            }
            else if (dto.DestinationId.HasValue && obj.LocalityId.HasValue)
            {
                var currentLocality = await _context.Localities.FirstOrDefaultAsync(l => l.Id == obj.LocalityId.Value);
                if (currentLocality != null && currentLocality.DestinationId != obj.DestinationId)
                    obj.LocalityId = null;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) obj.Name = dto.Name;
            if (dto.Description != null) obj.Description = dto.Description;
            if (dto.Address != null) obj.Address = dto.Address;
            if (dto.PhoneNumber != null) obj.PhoneNumber = dto.PhoneNumber;
            if (dto.Website != null) obj.Website = dto.Website;
            if (dto.WorkingHours != null) obj.WorkingHours = dto.WorkingHours;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                obj.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        // Menadžer odobrava/odbija objekte u svojoj destinaciji
        // Ako destinacija nema Menadžera, odobrava Admin
        public async Task<TouristObjectDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            var hasMainImage = await _context.Images
                .AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);

            if (!hasMainImage)
                throw new InvalidOperationException("Object must have a main image before approval.");

            if (obj.Status != ContentStatus.Pending)
                throw new InvalidOperationException("Only pending objects can be approved or rejected.");

            var destination = obj.Destination ?? obj.Locality?.Destination;

            // Proverava ko je odgovoran menadžer za ovu destinaciju.
            // Ako destinacija ima svog menadžera – samo on može da odobri.
            // Ako je ostala bez menadžera (izuzetna situacija) – odgovornost preuzima
            // menadžer geografski najbliže destinacije, NE admin.
            if (roleName == "Manager")
            {
                var isResponsible = destination != null &&
                    await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new UnauthorizedAccessException("Admins do not directly approve tourist objects. The responsible manager handles approvals.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only the responsible manager can approve objects.");
            }

            obj.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            obj.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            obj.ApprovedByUserId = userId;
            obj.ApprovedAt = DateTime.UtcNow;
            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var obj = await _context.Objects
                .Include(o => o.Reviews)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (obj == null) return false;

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can delete objects directly.");

            if (obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own objects.");

            if (obj.Status == ContentStatus.Approved)
                throw new InvalidOperationException("Cannot delete an approved object directly. Submit a deletion request.");

            // Recenzije se brišu zajedno sa objektom (cascade)
            if (obj.Reviews != null && obj.Reviews.Any())
                _context.Reviews.RemoveRange(obj.Reviews);

            _context.Objects.Remove(obj);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<TouristObject> LoadObjectAsync(int id)
        {
            return await _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(o => o.Images)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        private static TouristObjectDto MapToDto(TouristObject o) => new()
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            MainImageUrl = o.Images?.FirstOrDefault(i => i.IsMain)?.Url,
            Address = o.Address,
            PhoneNumber = o.PhoneNumber,
            Website = o.Website,
            WorkingHours = o.WorkingHours,
            Longitude = o.Geolocation?.X,
            Latitude = o.Geolocation?.Y,
            AverageRating = o.AverageRating,
            ReviewCount = o.ReviewCount,
            Status = o.Status.ToString(),
            ObjectTypeId = o.ObjectTypeId,
            ObjectTypeName = o.ObjectType?.Name ?? string.Empty,
            LocalityId = o.LocalityId,
            LocalityName = o.Locality?.Name,
            DestinationId = o.DestinationId,
            DestinationName = o.Destination?.Name ?? o.Locality?.Destination?.Name ?? string.Empty,
            CreatedByUserId = o.CreatedByUserId,
            ApprovedByUserId = o.ApprovedByUserId,
            ApprovedAt = o.ApprovedAt,
            RejectionReason = o.RejectionReason,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt
        };

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue) return null;
            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        public async Task<TouristObjectDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName)
        {
            var obj = await _context.Objects
                .Include(o => o.Destination)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (obj == null)
                return null;

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only managers can change object visibility.");

            if (obj.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved objects can have visibility changed.");

            var destination = obj.Destination ?? obj.Locality?.Destination;
            if (destination == null)
                throw new InvalidOperationException("Cannot determine destination for this object.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            obj.IsActive = isActive;
            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        public async Task<PagedResultDto<TouristObjectDto>> SearchAsync(TouristObjectQueryDto query)
        {
            return await GetAllAsync(query);
        }

        private static IQueryable<TouristObject> ApplyObjectSorting(IQueryable<TouristObject> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.ObjectType!.Name)
                    : query.OrderBy(o => o.ObjectType!.Name);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Destination != null ? o.Destination.Name : string.Empty)
                    : query.OrderBy(o => o.Destination != null ? o.Destination.Name : string.Empty);
            }

            if (sortByValue == "locality")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Locality != null ? o.Locality.Name : string.Empty)
                    : query.OrderBy(o => o.Locality != null ? o.Locality.Name : string.Empty);
            }

            if (sortByValue == "rating")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.AverageRating)
                    : query.OrderBy(o => o.AverageRating);
            }

            if (sortByValue == "reviewcount")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.ReviewCount)
                    : query.OrderBy(o => o.ReviewCount);
            }

            return isDesc
                ? query.OrderByDescending(o => o.Name)
                : query.OrderBy(o => o.Name);
        }
    }
}
