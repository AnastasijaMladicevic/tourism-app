using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Core.DTO;
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

        public async Task<IEnumerable<ImageDto>> GetAllAsync()
        {
            var images = await _context.Images
                .OrderBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetByIdAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> CreateAsync(CreateImageDto dto)
        {
            await ValidateCreateRelationAsync(dto);
            await ValidateMainRuleOnCreateAsync(dto);

            var image = new Image
            {
                Url = dto.Url,
                AltText = dto.AltText,
                IsMain = dto.IsMain,
                ObjectId = dto.ObjectId,
                ActivityId = dto.ActivityId,
                EventId = dto.EventId,
                DestinationId = dto.DestinationId,
                LocalityId = dto.LocalityId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto?> UpdateAsync(int id, UpdateImageDto dto)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                return null;

            await ValidateUpdateRelationAsync(dto);

            int? targetObjectId = image.ObjectId;
            int? targetActivityId = image.ActivityId;
            int? targetEventId = image.EventId;
            int? targetDestinationId = image.DestinationId;
            int? targetLocalityId = image.LocalityId;

            bool relationChanged =
                dto.ObjectId.HasValue ||
                dto.ActivityId.HasValue ||
                dto.EventId.HasValue ||
                dto.DestinationId.HasValue ||
                dto.LocalityId.HasValue;

            if (relationChanged)
            {
                targetObjectId = null;
                targetActivityId = null;
                targetEventId = null;
                targetDestinationId = null;
                targetLocalityId = null;

                if (dto.ObjectId.HasValue) targetObjectId = dto.ObjectId.Value;
                if (dto.ActivityId.HasValue) targetActivityId = dto.ActivityId.Value;
                if (dto.EventId.HasValue) targetEventId = dto.EventId.Value;
                if (dto.DestinationId.HasValue) targetDestinationId = dto.DestinationId.Value;
                if (dto.LocalityId.HasValue) targetLocalityId = dto.LocalityId.Value;
            }

            var targetIsMain = dto.IsMain ?? image.IsMain;

            await ValidateMainRuleOnUpdateAsync(
                image.Id,
                targetIsMain,
                targetObjectId,
                targetActivityId,
                targetEventId,
                targetDestinationId,
                targetLocalityId);

            if (!string.IsNullOrWhiteSpace(dto.Url))
                image.Url = dto.Url;

            if (dto.AltText != null)
                image.AltText = dto.AltText;

            image.IsMain = targetIsMain;
            image.ObjectId = targetObjectId;
            image.ActivityId = targetActivityId;
            image.EventId = targetEventId;
            image.DestinationId = targetDestinationId;
            image.LocalityId = targetLocalityId;

            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                return false;

            bool isOnlyMainForEntity = image.IsMain &&
                                       !await ExistsAnotherMainForSameEntityAsync(
                                           image.Id,
                                           image.ObjectId,
                                           image.ActivityId,
                                           image.EventId,
                                           image.DestinationId,
                                           image.LocalityId);

            bool hasOtherImagesForSameEntity = await ExistsAnotherImageForSameEntityAsync(
                image.Id,
                image.ObjectId,
                image.ActivityId,
                image.EventId,
                image.DestinationId,
                image.LocalityId);

            if (isOnlyMainForEntity && hasOtherImagesForSameEntity)
                throw new InvalidOperationException("Entity must always have exactly one main image.");

            _context.Images.Remove(image);
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task ValidateCreateRelationAsync(CreateImageDto dto)
        {
            int count = 0;
            if (dto.ObjectId.HasValue) count++;
            if (dto.ActivityId.HasValue) count++;
            if (dto.EventId.HasValue) count++;
            if (dto.DestinationId.HasValue) count++;
            if (dto.LocalityId.HasValue) count++;

            if (count != 1)
                throw new InvalidOperationException("Image must be linked to exactly one entity (Object, Activity, Event, Destination, or Locality).");

            await VerifyReferencedEntityExistsAsync(
                dto.ObjectId, dto.ActivityId, dto.EventId, dto.DestinationId, dto.LocalityId);
        }

        private async Task ValidateUpdateRelationAsync(UpdateImageDto dto)
        {
            int count = 0;
            if (dto.ObjectId.HasValue) count++;
            if (dto.ActivityId.HasValue) count++;
            if (dto.EventId.HasValue) count++;
            if (dto.DestinationId.HasValue) count++;
            if (dto.LocalityId.HasValue) count++;

            if (count > 1)
                throw new InvalidOperationException("Image can only be re-linked to one entity at a time.");

            if (count == 1)
                await VerifyReferencedEntityExistsAsync(
                    dto.ObjectId, dto.ActivityId, dto.EventId, dto.DestinationId, dto.LocalityId);
        }

        private async Task VerifyReferencedEntityExistsAsync(
            int? objectId, int? activityId, int? eventId, int? destinationId, int? localityId)
        {
            if (objectId.HasValue)
            {
                var exists = await _context.Objects.AnyAsync(o => o.Id == objectId.Value);
                if (!exists)
                    throw new InvalidOperationException($"Object with id {objectId.Value} not found.");
            }
            else if (activityId.HasValue)
            {
                var exists = await _context.Activities.AnyAsync(a => a.Id == activityId.Value);
                if (!exists)
                    throw new InvalidOperationException($"Activity with id {activityId.Value} not found.");
            }
            else if (eventId.HasValue)
            {
                var exists = await _context.Events.AnyAsync(e => e.Id == eventId.Value);
                if (!exists)
                    throw new InvalidOperationException($"Event with id {eventId.Value} not found.");
            }
            else if (destinationId.HasValue)
            {
                var exists = await _context.Destinations.AnyAsync(d => d.Id == destinationId.Value);
                if (!exists)
                    throw new InvalidOperationException($"Destination with id {destinationId.Value} not found.");
            }
            else if (localityId.HasValue)
            {
                var exists = await _context.Localities.AnyAsync(l => l.Id == localityId.Value);
                if (!exists)
                    throw new InvalidOperationException($"Locality with id {localityId.Value} not found.");
            }
        }

        private async Task ValidateMainRuleOnCreateAsync(CreateImageDto dto)
        {
            int existingCount = await CountImagesForEntityAsync(
                dto.ObjectId, dto.ActivityId, dto.EventId, dto.DestinationId, dto.LocalityId);

            if (existingCount == 0)
            {
                if (!dto.IsMain)
                    throw new InvalidOperationException("First image for an entity must be main.");
                return;
            }

            if (dto.IsMain)
            {
                bool mainExists = await ExistsMainForEntityAsync(
                    dto.ObjectId, dto.ActivityId, dto.EventId, dto.DestinationId, dto.LocalityId);

                if (mainExists)
                    throw new InvalidOperationException("Only one main image allowed per entity.");
            }
        }

        private async Task ValidateMainRuleOnUpdateAsync(
            int currentImageId,
            bool targetIsMain,
            int? objectId,
            int? activityId,
            int? eventId,
            int? destinationId,
            int? localityId)
        {
            bool anotherMainExists = await ExistsAnotherMainForSameEntityAsync(
                currentImageId, objectId, activityId, eventId, destinationId, localityId);

            if (targetIsMain)
            {
                if (anotherMainExists)
                    throw new InvalidOperationException("Only one main image allowed per entity.");
            }
            else
            {
                if (!anotherMainExists)
                    throw new InvalidOperationException("Entity must always have exactly one main image.");
            }
        }

        private async Task<int> CountImagesForEntityAsync(
            int? objectId, int? activityId, int? eventId, int? destinationId, int? localityId)
        {
            return await _context.Images.CountAsync(i =>
                (objectId.HasValue && i.ObjectId == objectId) ||
                (activityId.HasValue && i.ActivityId == activityId) ||
                (eventId.HasValue && i.EventId == eventId) ||
                (destinationId.HasValue && i.DestinationId == destinationId) ||
                (localityId.HasValue && i.LocalityId == localityId));
        }

        private async Task<bool> ExistsMainForEntityAsync(
            int? objectId, int? activityId, int? eventId, int? destinationId, int? localityId)
        {
            return await _context.Images.AnyAsync(i =>
                i.IsMain &&
                (
                    (objectId.HasValue && i.ObjectId == objectId) ||
                    (activityId.HasValue && i.ActivityId == activityId) ||
                    (eventId.HasValue && i.EventId == eventId) ||
                    (destinationId.HasValue && i.DestinationId == destinationId) ||
                    (localityId.HasValue && i.LocalityId == localityId)
                ));
        }

        private async Task<bool> ExistsAnotherMainForSameEntityAsync(
            int currentImageId,
            int? objectId, int? activityId, int? eventId, int? destinationId, int? localityId)
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

        private async Task<bool> ExistsAnotherImageForSameEntityAsync(
            int currentImageId,
            int? objectId, int? activityId, int? eventId, int? destinationId, int? localityId)
        {
            return await _context.Images.AnyAsync(i =>
                i.Id != currentImageId &&
                (
                    (objectId.HasValue && i.ObjectId == objectId) ||
                    (activityId.HasValue && i.ActivityId == activityId) ||
                    (eventId.HasValue && i.EventId == eventId) ||
                    (destinationId.HasValue && i.DestinationId == destinationId) ||
                    (localityId.HasValue && i.LocalityId == localityId)
                ));
        }
    }
}