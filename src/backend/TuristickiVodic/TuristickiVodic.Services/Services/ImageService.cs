using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class ImageService : IImageService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ImageService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<ImageDto?> GetByIdAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto?> UpdateAsync(int id, UpdateImageDto dto, int userId, string roleName)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                return null;

            await EnsureCanManageImageAsync(image, userId, roleName);

            if (dto.IsMain.HasValue && dto.IsMain.Value != image.IsMain)
                throw new InvalidOperationException("Use SetMainImage operation to change the main image.");

            if (!string.IsNullOrWhiteSpace(dto.Url))
                image.Url = dto.Url;

            if (dto.AltText != null)
                image.AltText = dto.AltText;

            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                return false;

            await EnsureCanManageImageAsync(image, userId, roleName);

            bool isOnlyMainForEntity = image.IsMain &&
                           !await ExistsAnotherMainForSameEntityAsync(
                               image.Id,
                               image.ObjectId,
                               image.ActivityId,
                               image.EventId,
                               image.DestinationId,
                               image.LocalityId);

            if (isOnlyMainForEntity)
                throw new InvalidOperationException("Entity must always have a main image.");

            _context.Images.Remove(image);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ImageDto> SetMainImageAsync(int id, int userId, string roleName)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                throw new KeyNotFoundException($"Image with id {id} not found.");

            await EnsureCanManageImageAsync(image, userId, roleName);

            if (image.IsMain)
                return _mapper.Map<ImageDto>(image);

            var currentMain = await _context.Images.FirstOrDefaultAsync(i =>
                i.Id != image.Id &&
                i.IsMain &&
                (
                    (image.ObjectId.HasValue && i.ObjectId == image.ObjectId) ||
                    (image.ActivityId.HasValue && i.ActivityId == image.ActivityId) ||
                    (image.EventId.HasValue && i.EventId == image.EventId) ||
                    (image.DestinationId.HasValue && i.DestinationId == image.DestinationId) ||
                    (image.LocalityId.HasValue && i.LocalityId == image.LocalityId)
                ));

            if (currentMain == null)
                throw new InvalidOperationException("Current entity does not have an existing main image to replace.");

            currentMain.IsMain = false;
            image.IsMain = true;

            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForDestinationAsync(int destinationId)
        {
            await EnsureDestinationExistsAsync(destinationId);

            var images = await _context.Images
                .Where(i => i.DestinationId == destinationId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForDestinationAsync(int destinationId)
        {
            await EnsureDestinationExistsAsync(destinationId);

            var image = await _context.Images
                .FirstOrDefaultAsync(i => i.DestinationId == destinationId && i.IsMain);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToDestinationAsync(int destinationId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageDestinationImagesAsync(destinationId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, destinationId: destinationId);

            var image = BuildImage(dto, destinationId: destinationId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForLocalityAsync(int localityId)
        {
            await EnsureLocalityExistsAsync(localityId);

            var images = await _context.Images
                .Where(i => i.LocalityId == localityId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForLocalityAsync(int localityId)
        {
            await EnsureLocalityExistsAsync(localityId);

            var image = await _context.Images
                .FirstOrDefaultAsync(i => i.LocalityId == localityId && i.IsMain);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToLocalityAsync(int localityId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageLocalityImagesAsync(localityId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, localityId: localityId);

            var image = BuildImage(dto, localityId: localityId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForObjectAsync(int objectId)
        {
            await EnsureObjectExistsAsync(objectId);

            var images = await _context.Images
                .Where(i => i.ObjectId == objectId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForObjectAsync(int objectId)
        {
            await EnsureObjectExistsAsync(objectId);

            var image = await _context.Images
                .FirstOrDefaultAsync(i => i.ObjectId == objectId && i.IsMain);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToObjectAsync(int objectId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageObjectImagesAsync(objectId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, objectId: objectId);

            var image = BuildImage(dto, objectId: objectId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForActivityAsync(int activityId)
        {
            await EnsureActivityExistsAsync(activityId);

            var images = await _context.Images
                .Where(i => i.ActivityId == activityId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForActivityAsync(int activityId)
        {
            await EnsureActivityExistsAsync(activityId);

            var image = await _context.Images
                .FirstOrDefaultAsync(i => i.ActivityId == activityId && i.IsMain);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToActivityAsync(int activityId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageActivityImagesAsync(activityId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, activityId: activityId);

            var image = BuildImage(dto, activityId: activityId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForEventAsync(int eventId)
        {
            await EnsureEventExistsAsync(eventId);

            var images = await _context.Images
                .Where(i => i.EventId == eventId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForEventAsync(int eventId)
        {
            await EnsureEventExistsAsync(eventId);

            var image = await _context.Images
                .FirstOrDefaultAsync(i => i.EventId == eventId && i.IsMain);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToEventAsync(int eventId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageEventImagesAsync(eventId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, eventId: eventId);

            var image = BuildImage(dto, eventId: eventId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        private static Image BuildImage(
            AddImageDto dto,
            int? destinationId = null,
            int? localityId = null,
            int? objectId = null,
            int? activityId = null,
            int? eventId = null)
        {
            var linkedEntityCount =
                (destinationId.HasValue ? 1 : 0) +
                (localityId.HasValue ? 1 : 0) +
                (objectId.HasValue ? 1 : 0) +
                (activityId.HasValue ? 1 : 0) +
                (eventId.HasValue ? 1 : 0);

            if (linkedEntityCount != 1)
                throw new InvalidOperationException("Image must belong to exactly one entity.");

            return new Image
            {
                Url = dto.Url,
                AltText = dto.AltText,
                IsMain = dto.IsMain,
                DestinationId = destinationId,
                LocalityId = localityId,
                ObjectId = objectId,
                ActivityId = activityId,
                EventId = eventId,
                CreatedAt = DateTime.UtcNow
            };
        }

        private async Task ValidateMainRuleOnAddAsync(
            bool isMain,
            int? destinationId = null,
            int? localityId = null,
            int? objectId = null,
            int? activityId = null,
            int? eventId = null)
        {
            int existingCount = await _context.Images.CountAsync(i =>
                (destinationId.HasValue && i.DestinationId == destinationId) ||
                (localityId.HasValue && i.LocalityId == localityId) ||
                (objectId.HasValue && i.ObjectId == objectId) ||
                (activityId.HasValue && i.ActivityId == activityId) ||
                (eventId.HasValue && i.EventId == eventId));

            if (existingCount == 0 && !isMain)
                throw new InvalidOperationException("First image for an entity must be set as main.");

            if (isMain && existingCount > 0)
            {
                bool mainExists = await _context.Images.AnyAsync(i =>
                    i.IsMain &&
                    (
                        (destinationId.HasValue && i.DestinationId == destinationId) ||
                        (localityId.HasValue && i.LocalityId == localityId) ||
                        (objectId.HasValue && i.ObjectId == objectId) ||
                        (activityId.HasValue && i.ActivityId == activityId) ||
                        (eventId.HasValue && i.EventId == eventId)
                    ));

                if (mainExists)
                    throw new InvalidOperationException("Entity already has a main image. Update the existing main image first.");
            }
        }

        private async Task<bool> ExistsAnotherMainForSameEntityAsync(
            int currentImageId,
            int? objectId,
            int? activityId,
            int? eventId,
            int? destinationId,
            int? localityId)
        {
            return await _context.Images.AnyAsync(i =>
                i.Id != currentImageId &&
                i.IsMain &&
                (
                    (objectId.HasValue && i.ObjectId == objectId) ||
                    (activityId.HasValue && i.ActivityId == activityId) ||
                    (eventId.HasValue && i.EventId == eventId) ||
                    (destinationId.HasValue && i.DestinationId == destinationId) ||
                    (localityId.HasValue && i.LocalityId == localityId)
                ));
        }

        private async Task EnsureCanManageImageAsync(Image image, int userId, string roleName)
        {
            if (image.DestinationId.HasValue)
            {
                await EnsureCanManageDestinationImagesAsync(image.DestinationId.Value, userId, roleName);
                return;
            }

            if (image.LocalityId.HasValue)
            {
                await EnsureCanManageLocalityImagesAsync(image.LocalityId.Value, userId, roleName);
                return;
            }

            if (image.ObjectId.HasValue)
            {
                await EnsureCanManageObjectImagesAsync(image.ObjectId.Value, userId, roleName);
                return;
            }

            if (image.ActivityId.HasValue)
            {
                await EnsureCanManageActivityImagesAsync(image.ActivityId.Value, userId, roleName);
                return;
            }

            if (image.EventId.HasValue)
            {
                await EnsureCanManageEventImagesAsync(image.EventId.Value, userId, roleName);
                return;
            }

            throw new InvalidOperationException("Image is not attached to a valid entity.");
        }

        private async Task EnsureCanManageDestinationImagesAsync(int destinationId, int userId, string roleName)
        {
            await EnsureDestinationExistsAsync(destinationId);

            if (roleName != "Admin")
                throw new UnauthorizedAccessException("Only admin can manage destination images.");
        }

        private async Task EnsureCanManageLocalityImagesAsync(int localityId, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == localityId);

            if (locality == null)
                throw new KeyNotFoundException($"Locality with id {localityId} not found.");

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only responsible manager can manage locality images.");

            if (locality.Destination == null || locality.Destination.ManagedByUserId != userId)
                throw new UnauthorizedAccessException("You are not the responsible manager for this locality's destination.");
        }

        private async Task EnsureCanManageObjectImagesAsync(int objectId, int userId, string roleName)
        {
            var obj = await _context.Objects.FirstOrDefaultAsync(o => o.Id == objectId);
            if (obj == null)
                throw new KeyNotFoundException($"Object with id {objectId} not found.");

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creator can manage object images.");

            if (obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can manage images only for your own objects.");
        }

        private async Task EnsureCanManageActivityImagesAsync(int activityId, int userId, string roleName)
        {
            var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == activityId);
            if (activity == null)
                throw new KeyNotFoundException($"Activity with id {activityId} not found.");

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creator can manage activity images.");

            if (activity.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can manage images only for your own activities.");
        }

        private async Task EnsureCanManageEventImagesAsync(int eventId, int userId, string roleName)
        {
            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null)
                throw new KeyNotFoundException($"Event with id {eventId} not found.");

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creator can manage event images.");

            if (ev.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can manage images only for your own events.");
        }

        private async Task EnsureDestinationExistsAsync(int destinationId)
        {
            var exists = await _context.Destinations.AnyAsync(d => d.Id == destinationId);
            if (!exists)
                throw new KeyNotFoundException($"Destination with id {destinationId} not found.");
        }

        private async Task EnsureLocalityExistsAsync(int localityId)
        {
            var exists = await _context.Localities.AnyAsync(l => l.Id == localityId);
            if (!exists)
                throw new KeyNotFoundException($"Locality with id {localityId} not found.");
        }

        private async Task EnsureObjectExistsAsync(int objectId)
        {
            var exists = await _context.Objects.AnyAsync(o => o.Id == objectId);
            if (!exists)
                throw new KeyNotFoundException($"Object with id {objectId} not found.");
        }

        private async Task EnsureActivityExistsAsync(int activityId)
        {
            var exists = await _context.Activities.AnyAsync(a => a.Id == activityId);
            if (!exists)
                throw new KeyNotFoundException($"Activity with id {activityId} not found.");
        }

        private async Task EnsureEventExistsAsync(int eventId)
        {
            var exists = await _context.Events.AnyAsync(e => e.Id == eventId);
            if (!exists)
                throw new KeyNotFoundException($"Event with id {eventId} not found.");
        }
    }
}
