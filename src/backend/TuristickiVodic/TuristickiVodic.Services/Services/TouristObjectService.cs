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

        public async Task<IEnumerable<TouristObjectDto>> GetAllAsync()
        {
            var objects = await _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                .Where(o => _context.Images.Any(i => i.ObjectId == o.Id && i.IsMain))
                .OrderBy(o => o.Id)
                .ToListAsync();

            return objects.Select(MapToDto);
        }

        public async Task<TouristObjectDto?> GetByIdAsync(int id)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            return MapToDto(obj);
        }

        // Samo CC može da kreira objekte; status uvek Pending, čeka odobrenje
        // Objekat mora imati lokalitet; DestinationId se automatski preuzima iz lokaliteta
        public async Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == dto.LocalityId);

            if (locality == null)
                throw new InvalidOperationException("Locality not found.");

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
                IsActive = dto.IsActive,
                ObjectTypeId = dto.ObjectTypeId,
                LocalityId = dto.LocalityId,
                // DestinationId se automatski preuzima iz lokacije
                DestinationId = locality.DestinationId,
                CreatedByUserId = userId,
                // CC uvek čeka odobrenje
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

            var destination = obj.Locality?.Destination;

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
                .Include(o => o.Locality)
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
            LocalityId = o.LocalityId,
            LocalityName = o.Locality?.Name ?? string.Empty,
            DestinationId = o.Locality?.DestinationId ?? o.DestinationId,
            DestinationName = o.Locality?.Destination?.Name ?? string.Empty,
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
