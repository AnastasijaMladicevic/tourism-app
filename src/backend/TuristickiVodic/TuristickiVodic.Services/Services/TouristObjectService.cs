using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

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

        public async Task<IEnumerable<TouristObjectDto>> GetAllAsync()
        {
            var objects = await _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Location)
                    .ThenInclude(l => l.Destination)
                .OrderBy(o => o.Id)
                .ToListAsync();

            return objects.Select(MapToDto);
        }

        public async Task<TouristObjectDto?> GetByIdAsync(int id)
        {
            var obj = await LoadObjectAsync(id);
            return obj == null ? null : MapToDto(obj);
        }

        // CC i Menadžer mogu da kreiraju objekte
        // Objekat mora imati lokaciju; DestinationId se automatski preuzima iz lokacije
        public async Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName)
        {
            var location = await _context.Locations
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == dto.LocationId);

            if (location == null)
                throw new InvalidOperationException("Location not found.");

            if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId))
                throw new InvalidOperationException("Object type not found.");

            // Menadžer može da kreira objekte samo u svojoj destinaciji
            if (roleName == "Manager" && location.Destination?.ManagedByUserId != userId)
                throw new UnauthorizedAccessException("Manager can only create objects in their destination.");

            var obj = new TouristObject
            {
                Name = dto.Name,
                Description = dto.Description,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Website = dto.Website,
                WorkingHours = dto.WorkingHours,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                IsActive = dto.IsActive,
                ObjectTypeId = dto.ObjectTypeId,
                LocationId = dto.LocationId,
                // DestinationId se automatski preuzima iz lokacije
                DestinationId = location.DestinationId,
                CreatedByUserId = userId,
                // Menadžer/Admin automatski odobrava, CC čeka
                Status = roleName == "Manager" || roleName == "Admin"
                    ? ContentStatus.Approved
                    : ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (obj.Status == ContentStatus.Approved)
            {
                obj.ApprovedByUserId = userId;
                obj.ApprovedAt = DateTime.UtcNow;
            }

            _context.Objects.Add(obj);
            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        // CC menja samo svoje objekte; Menadžer menja objekte u svojoj destinaciji; Admin sve
        public async Task<TouristObjectDto?> UpdateAsync(int id, UpdateTouristObjectDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            if (roleName == "ContentCreator" && obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update your own objects.");

            if (roleName == "Manager" && obj.Location?.Destination?.ManagedByUserId != userId)
                throw new UnauthorizedAccessException("Manager can only update objects in their destination.");

            if (dto.ObjectTypeId.HasValue)
            {
                if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId.Value))
                    throw new InvalidOperationException("Object type not found.");
                obj.ObjectTypeId = dto.ObjectTypeId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) obj.Name = dto.Name;
            if (dto.Description != null) obj.Description = dto.Description;
            if (dto.Address != null) obj.Address = dto.Address;
            if (dto.PhoneNumber != null) obj.PhoneNumber = dto.PhoneNumber;
            if (dto.Website != null) obj.Website = dto.Website;
            if (dto.WorkingHours != null) obj.WorkingHours = dto.WorkingHours;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                obj.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            if (dto.IsActive.HasValue) obj.IsActive = dto.IsActive.Value;

            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        // Menadžer odobrava/odbija objekte u svojoj destinaciji; Admin sve
        public async Task<TouristObjectDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            if (roleName == "Manager")
            {
                if (obj.Location?.Destination?.ManagedByUserId != userId)
                    throw new UnauthorizedAccessException("Manager can only approve objects in their destination.");
            }
            else if (roleName != "Admin")
            {
                throw new UnauthorizedAccessException("Only managers or admins can approve objects.");
            }

            obj.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            obj.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            obj.ApprovedByUserId = userId;
            obj.ApprovedAt = DateTime.UtcNow;
            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(await LoadObjectAsync(obj.Id));
        }

        // CC briše samo svoje objekte koji su Pending; Menadžer/Admin mogu sve
        // Ne može se obrisati objekat koji ima recenzije
        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var obj = await _context.Objects
                .Include(o => o.Reviews)
                .Include(o => o.Location)
                    .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (obj == null) return false;

            if (roleName == "ContentCreator")
            {
                if (obj.CreatedByUserId != userId)
                    throw new UnauthorizedAccessException("You can only delete your own objects.");

                if (obj.Status == ContentStatus.Approved)
                    throw new InvalidOperationException("Cannot delete an approved object. Contact the manager.");
            }

            if (roleName == "Manager" && obj.Location?.Destination?.ManagedByUserId != userId)
                throw new UnauthorizedAccessException("Manager can only delete objects in their destination.");

            if (obj.Reviews.Any())
                throw new InvalidOperationException("Cannot delete an object that has reviews.");

            _context.Objects.Remove(obj);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<TouristObject> LoadObjectAsync(int id)
        {
            return await _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Location)
                    .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        private static TouristObjectDto MapToDto(TouristObject o) => new()
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            Address = o.Address,
            PhoneNumber = o.PhoneNumber,
            Website = o.Website,
            WorkingHours = o.WorkingHours,
            Longitude = o.Geolocation?.X,
            Latitude = o.Geolocation?.Y,
            AverageRating = o.AverageRating,
            ReviewCount = o.ReviewCount,
            Status = o.Status.ToString(),
            IsActive = o.IsActive,
            ObjectTypeId = o.ObjectTypeId,
            ObjectTypeName = o.ObjectType?.Name ?? string.Empty,
            LocationId = o.LocationId,
            LocationName = o.Location?.Name ?? string.Empty,
            DestinationId = o.Location?.DestinationId ?? o.DestinationId,
            DestinationName = o.Location?.Destination?.Name ?? string.Empty,
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
    }
}
