using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using ImageSharpImage = SixLabors.ImageSharp.Image;
using ImageSharpSize = SixLabors.ImageSharp.Size;

namespace TuristickiVodic.Services.Services
{
    public class ImageService : IImageService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;

        // Maksimalna širina slike u pikselima - visina se automatski skalira
        private const int MaxWidthPx = 1200;
        // Kvalitet JPEG kompresije (0-100). 75 daje ~150-250KB za tipičnu sliku.
        private const int JpegQuality = 75;
        private const int MaxImagesPerEntity = 8;

        public ImageService(AppDbContext context, IMapper mapper, IWebHostEnvironment environment)
        {
            _context = context;
            _mapper = mapper;
            _environment = environment;
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

            // Obriši fizički fajl sa diska
            DeletePhysicalFile(image.Url);

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
                .OrderByDescending(i => i.IsMain).ThenBy(i => i.Id)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForDestinationAsync(int destinationId)
        {
            await EnsureDestinationExistsAsync(destinationId);
            var image = await _context.Images.FirstOrDefaultAsync(i => i.DestinationId == destinationId && i.IsMain);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToDestinationAsync(int destinationId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageDestinationImagesAsync(destinationId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, destinationId: destinationId);

            var url = await SaveImageAsync(dto.File, "destinations");
            var image = BuildImage(url, dto, destinationId: destinationId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForLocalityAsync(int localityId)
        {
            await EnsureLocalityExistsAsync(localityId);
            var images = await _context.Images
                .Where(i => i.LocalityId == localityId)
                .OrderByDescending(i => i.IsMain).ThenBy(i => i.Id)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForLocalityAsync(int localityId)
        {
            await EnsureLocalityExistsAsync(localityId);
            var image = await _context.Images.FirstOrDefaultAsync(i => i.LocalityId == localityId && i.IsMain);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToLocalityAsync(int localityId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageLocalityImagesAsync(localityId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, localityId: localityId);

            var url = await SaveImageAsync(dto.File, "localities");
            var image = BuildImage(url, dto, localityId: localityId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForObjectAsync(int objectId)
        {
            await EnsureObjectExistsAsync(objectId);
            var images = await _context.Images
                .Where(i => i.ObjectId == objectId)
                .OrderByDescending(i => i.IsMain).ThenBy(i => i.Id)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForObjectAsync(int objectId)
        {
            await EnsureObjectExistsAsync(objectId);
            var image = await _context.Images.FirstOrDefaultAsync(i => i.ObjectId == objectId && i.IsMain);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToObjectAsync(int objectId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageObjectImagesAsync(objectId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, objectId: objectId);

            var url = await SaveImageAsync(dto.File, "objects");
            var image = BuildImage(url, dto, objectId: objectId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForActivityAsync(int activityId)
        {
            await EnsureActivityExistsAsync(activityId);
            var images = await _context.Images
                .Where(i => i.ActivityId == activityId)
                .OrderByDescending(i => i.IsMain).ThenBy(i => i.Id)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForActivityAsync(int activityId)
        {
            await EnsureActivityExistsAsync(activityId);
            var image = await _context.Images.FirstOrDefaultAsync(i => i.ActivityId == activityId && i.IsMain);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToActivityAsync(int activityId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageActivityImagesAsync(activityId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, activityId: activityId);

            var url = await SaveImageAsync(dto.File, "activities");
            var image = BuildImage(url, dto, activityId: activityId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        public async Task<IEnumerable<ImageDto>> GetForEventAsync(int eventId)
        {
            await EnsureEventExistsAsync(eventId);
            var images = await _context.Images
                .Where(i => i.EventId == eventId)
                .OrderByDescending(i => i.IsMain).ThenBy(i => i.Id)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetMainForEventAsync(int eventId)
        {
            await EnsureEventExistsAsync(eventId);
            var image = await _context.Images.FirstOrDefaultAsync(i => i.EventId == eventId && i.IsMain);
            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> AddToEventAsync(int eventId, AddImageDto dto, int userId, string roleName)
        {
            await EnsureCanManageEventImagesAsync(eventId, userId, roleName);
            await ValidateMainRuleOnAddAsync(dto.IsMain, eventId: eventId);

            var url = await SaveImageAsync(dto.File, "events");
            var image = BuildImage(url, dto, eventId: eventId);
            _context.Images.Add(image);
            await _context.SaveChangesAsync();
            return _mapper.Map<ImageDto>(image);
        }

        // ─── Čuvanje fajla na disk sa kompresijom ───────────────────────────────

        /// <summary>
        /// Čuva uploadovanu sliku u wwwroot/images/{subfolder}, kompresuje je na
        /// max 1200px širine i JPEG kvalitet 75 (~150-250KB).
        /// Vraća relativni URL koji se čuva u bazi, npr. "/images/destinations/abc123.jpg"
        /// </summary>
        private async Task<string> SaveImageAsync(IFormFile file, string subfolder)
        {
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var allowedContentTypes = new[] { "image/jpeg", "image/png", "image/webp" };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var contentType = file.ContentType?.ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
                throw new InvalidOperationException("Dozvoljeni formati su: JPG, PNG, WEBP.");

            if (string.IsNullOrWhiteSpace(contentType) || !allowedContentTypes.Contains(contentType))
                throw new InvalidOperationException("Dozvoljeni formati su: JPG, PNG, WEBP.");

            if (file.Length > 10 * 1024 * 1024)
                throw new InvalidOperationException("Slika ne sme biti veća od 10MB.");

            var folder = Path.Combine(_environment.WebRootPath, "images", subfolder);
            Directory.CreateDirectory(folder);

            // Uvek čuvamo kao .jpg nakon kompresije
            var fileName = $"{Guid.NewGuid():N}.jpg";
            var fullPath = Path.Combine(folder, fileName);

            using var inputStream = file.OpenReadStream();
            using var image = await ImageSharpImage.LoadAsync(inputStream);

            // Smanji samo ako je šira od MaxWidthPx, ne povećavaj male slike
            if (image.Width > MaxWidthPx)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new ImageSharpSize(MaxWidthPx, 0),
                    Mode = ResizeMode.Max
                }));
            }

            await image.SaveAsJpegAsync(fullPath, new JpegEncoder { Quality = JpegQuality });

            return $"/images/{subfolder}/{fileName}";
        }

        /// <summary>
        /// Briše fizički fajl sa diska ako postoji.
        /// Ignoriše greške - ne bi trebalo da blokira brisanje iz baze.
        /// </summary>
        private void DeletePhysicalFile(string relativeUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(relativeUrl))
                    return;

                var relativePath = relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var fullPath = Path.Combine(_environment.WebRootPath, relativePath);

                if (File.Exists(fullPath))
                    File.Delete(fullPath);
            }
            catch
            {
                // Ne prekidamo operaciju ako brisanje fajla ne uspe
            }
        }

        // ─── Pomoćne metode (nepromenjene) ──────────────────────────────────────

        private static TuristickiVodic.Core.Models.Image BuildImage(
            string url,
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

            return new TuristickiVodic.Core.Models.Image
            {
                Url = url,
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

            if (existingCount >= MaxImagesPerEntity)
                throw new InvalidOperationException($"An entity can have at most {MaxImagesPerEntity} images.");

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

        private async Task EnsureCanManageImageAsync(TuristickiVodic.Core.Models.Image image, int userId, string roleName)
        {
            if (image.DestinationId.HasValue) { await EnsureCanManageDestinationImagesAsync(image.DestinationId.Value, userId, roleName); return; }
            if (image.LocalityId.HasValue) { await EnsureCanManageLocalityImagesAsync(image.LocalityId.Value, userId, roleName); return; }
            if (image.ObjectId.HasValue) { await EnsureCanManageObjectImagesAsync(image.ObjectId.Value, userId, roleName); return; }
            if (image.ActivityId.HasValue) { await EnsureCanManageActivityImagesAsync(image.ActivityId.Value, userId, roleName); return; }
            if (image.EventId.HasValue) { await EnsureCanManageEventImagesAsync(image.EventId.Value, userId, roleName); return; }
            throw new InvalidOperationException("Image is not attached to a valid entity.");
        }

        private async Task EnsureCanManageDestinationImagesAsync(int destinationId, int userId, string roleName)
        {
            var destination = await _context.Destinations.FirstOrDefaultAsync(d => d.Id == destinationId);
            if (destination == null)
                throw new KeyNotFoundException($"Destination with id {destinationId} not found.");

            if (roleName != "Admin")
                throw new UnauthorizedAccessException("Only admin can manage destination images.");

            EnsureDestinationEditLockOwnership(destination, userId);
        }

        private static void EnsureDestinationEditLockOwnership(Destination destination, int requestingUserId)
        {
            var now = DateTime.UtcNow;
            var isLockActive = destination.EditLockedByUserId.HasValue &&
                               destination.EditLockExpiresAtUtc.HasValue &&
                               destination.EditLockExpiresAtUtc.Value > now;

            if (!isLockActive || destination.EditLockedByUserId == requestingUserId)
                return;

            throw new DestinationEditLockException(new DestinationEditLockDto
            {
                DestinationId = destination.Id,
                IsLocked = true,
                IsOwnedByCurrentUser = false,
                LockedByUserId = destination.EditLockedByUserId,
                AcquiredAtUtc = destination.EditLockAcquiredAtUtc,
                ExpiresAtUtc = destination.EditLockExpiresAtUtc,
                Message = "Another admin is currently editing this destination."
            });
        }

        private async Task EnsureCanManageLocalityImagesAsync(int localityId, int userId, string roleName)
        {
            var locality = await _context.Localities.Include(l => l.Destination).FirstOrDefaultAsync(l => l.Id == localityId);
            if (locality == null) throw new KeyNotFoundException($"Locality with id {localityId} not found.");
            if (roleName == "Admin") return;
            if (roleName != "Manager") throw new UnauthorizedAccessException("Only responsible manager can manage locality images.");
            if (locality.Destination == null || locality.Destination.ManagedByUserId != userId)
                throw new UnauthorizedAccessException("You are not the responsible manager for this locality's destination.");
        }

        private async Task EnsureCanManageObjectImagesAsync(int objectId, int userId, string roleName)
        {
            var obj = await _context.Objects.FirstOrDefaultAsync(o => o.Id == objectId);
            if (obj == null) throw new KeyNotFoundException($"Object with id {objectId} not found.");
            if (roleName != "ContentCreator") throw new UnauthorizedAccessException("Only content creator can manage object images.");
            if (obj.CreatedByUserId != userId) throw new UnauthorizedAccessException("You can manage images only for your own objects.");
        }

        private async Task EnsureCanManageActivityImagesAsync(int activityId, int userId, string roleName)
        {
            var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == activityId);
            if (activity == null) throw new KeyNotFoundException($"Activity with id {activityId} not found.");
            if (roleName != "ContentCreator") throw new UnauthorizedAccessException("Only content creator can manage activity images.");
            if (activity.CreatedByUserId != userId) throw new UnauthorizedAccessException("You can manage images only for your own activities.");
        }

        private async Task EnsureCanManageEventImagesAsync(int eventId, int userId, string roleName)
        {
            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null) throw new KeyNotFoundException($"Event with id {eventId} not found.");
            if (roleName != "ContentCreator") throw new UnauthorizedAccessException("Only content creator can manage event images.");
            if (ev.CreatedByUserId != userId) throw new UnauthorizedAccessException("You can manage images only for your own events.");
        }

        private async Task EnsureDestinationExistsAsync(int destinationId)
        {
            if (!await _context.Destinations.AnyAsync(d => d.Id == destinationId))
                throw new KeyNotFoundException($"Destination with id {destinationId} not found.");
        }

        private async Task EnsureLocalityExistsAsync(int localityId)
        {
            if (!await _context.Localities.AnyAsync(l => l.Id == localityId))
                throw new KeyNotFoundException($"Locality with id {localityId} not found.");
        }

        private async Task EnsureObjectExistsAsync(int objectId)
        {
            if (!await _context.Objects.AnyAsync(o => o.Id == objectId))
                throw new KeyNotFoundException($"Object with id {objectId} not found.");
        }

        private async Task EnsureActivityExistsAsync(int activityId)
        {
            if (!await _context.Activities.AnyAsync(a => a.Id == activityId))
                throw new KeyNotFoundException($"Activity with id {activityId} not found.");
        }

        private async Task EnsureEventExistsAsync(int eventId)
        {
            if (!await _context.Events.AnyAsync(e => e.Id == eventId))
                throw new KeyNotFoundException($"Event with id {eventId} not found.");
        }
    }
}
