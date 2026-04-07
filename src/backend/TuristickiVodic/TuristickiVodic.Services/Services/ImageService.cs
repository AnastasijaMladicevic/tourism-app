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

            if (!string.IsNullOrWhiteSpace(dto.Url))
                image.Url = dto.Url;

            if (dto.AltText != null)
                image.AltText = dto.AltText;

            if (dto.IsMain.HasValue)
                image.IsMain = dto.IsMain.Value;

            if (dto.ObjectId.HasValue)
                image.ObjectId = dto.ObjectId;

            if (dto.ActivityId.HasValue)
                image.ActivityId = dto.ActivityId;

            if (dto.EventId.HasValue)
                image.EventId = dto.EventId;

            if (dto.DestinationId.HasValue)
                image.DestinationId = dto.DestinationId;

            if (dto.LocalityId.HasValue)
                image.LocalityId = dto.LocalityId;

            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);
            if (image == null)
                return false;

            _context.Images.Remove(image);
            await _context.SaveChangesAsync();
            return true;
        }

        // Proverava da je popunjeno tačno jedno polje i da taj entitet zaista postoji u bazi
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

        // Za update: ako je naveden bilo koji ID, ne sme biti naveden nijedan drugi (i mora postojati)
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
    }
}
