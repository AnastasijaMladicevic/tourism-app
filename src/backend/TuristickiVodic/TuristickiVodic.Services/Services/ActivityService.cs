using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services.Services
{
    public class ActivityService : IActivityService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ActivityService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ActivityDto>> GetAllAsync()
        {
            var activities = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .OrderBy(a => a.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ActivityDto>>(activities);
        }

        public async Task<ActivityDto?> GetByIdAsync(int id)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            return activity == null ? null : _mapper.Map<ActivityDto>(activity);
        }

        // Samo menadžer kreira aktivnosti – za svoju destinaciju (ili odgovornu destinaciju)
        public async Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId, string roleName)
        {
            var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId);
            if (!activityTypeExists)
                throw new InvalidOperationException("Activity type not found");

            Destination? destination = null;

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);

                if (locality == null)
                    throw new InvalidOperationException("Locality not found");

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                dto.DestinationId = locality.DestinationId;
                destination = locality.Destination;
            }
            else if (dto.DestinationId.HasValue)
            {
                destination = await _context.Destinations
                    .FirstOrDefaultAsync(x => x.Id == dto.DestinationId.Value);

                if (destination == null)
                    throw new InvalidOperationException("Destination not found");
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found");
            }

            if (roleName == "ContentCreator")
            {
                if (destination == null)
                    throw new InvalidOperationException("Cannot determine destination for this activity.");
            }
            else if (roleName == "Manager")
            {
                if (destination == null)
                    throw new InvalidOperationException("Cannot determine destination for this activity.");

                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only content creators and managers can create activities.");
            }

            var activity = new Activity
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                Price = dto.Price,
                DurationMinutes = dto.DurationMinutes,
                IsActive = dto.IsActive,
                ActivityTypeId = dto.ActivityTypeId,
                LocalityId = dto.LocalityId,
                DestinationId = dto.DestinationId,
                ObjectId = dto.ObjectId,
                CreatedByUserId = userId,
                Status = (roleName == "Manager") ? ContentStatus.Approved : ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();

            var created = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(created);
        }

        // Samo odgovorni menadžer može da menja aktivnosti u svojoj destinaciji
        public async Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (roleName == "ContentCreator")
            {
                if (activity.CreatedByUserId != userId)
                    throw new UnauthorizedAccessException("You can only update your own activities.");
                if (activity.Status != ContentStatus.Pending)
                    throw new InvalidOperationException("You can only update activities that are still pending approval.");
                return await UpdateActivityFieldsAsync(activity, dto);
            }
            else if (roleName != "Manager")
            {
                throw new UnauthorizedAccessException("Only content creators and managers can update activities.");
            }

            // Proveri odgovornost za trenutnu destinaciju
            var currentDestination = activity.Destination
                ?? (activity.LocalityId.HasValue
                    ? (await _context.Localities.Include(l => l.Destination)
                        .FirstOrDefaultAsync(l => l.Id == activity.LocalityId.Value))?.Destination
                    : null);

            if (currentDestination == null)
                throw new InvalidOperationException("Cannot determine destination for this activity.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, currentDestination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            if (dto.ActivityTypeId.HasValue)
            {
                var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId.Value);
                if (!activityTypeExists)
                    throw new InvalidOperationException("Activity type not found");
                activity.ActivityTypeId = dto.ActivityTypeId.Value;
            }

            int? newLocalityId = dto.LocalityId ?? activity.LocalityId;
            int? newDestinationId = dto.DestinationId ?? activity.DestinationId;

            if (dto.LocalityId.HasValue || dto.DestinationId.HasValue)
            {
                if (newLocalityId.HasValue)
                {
                    var locality = await _context.Localities
                        .Include(l => l.Destination)
                        .FirstOrDefaultAsync(l => l.Id == newLocalityId.Value);

                    if (locality == null)
                        throw new InvalidOperationException("Locality not found.");

                    if (newDestinationId.HasValue && newDestinationId.Value != locality.DestinationId)
                        throw new InvalidOperationException("Locality does not belong to the specified destination.");

                    newDestinationId = locality.DestinationId;

                    // Ako se premešta u drugu destinaciju, proveri i ciljnu
                    if (newDestinationId != currentDestination.Id)
                    {
                        var targetDestination = locality.Destination
                            ?? await _context.Destinations.FirstOrDefaultAsync(d => d.Id == newDestinationId);

                        if (targetDestination != null)
                        {
                            var isResponsibleForTarget = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, targetDestination, userId);
                            if (!isResponsibleForTarget)
                                throw new UnauthorizedAccessException("You are not the responsible manager for the target destination.");
                        }
                    }
                }
                else if (newDestinationId.HasValue)
                {
                    var targetDestination = await _context.Destinations
                        .FirstOrDefaultAsync(d => d.Id == newDestinationId.Value);

                    if (targetDestination == null)
                        throw new InvalidOperationException("Destination not found.");

                    if (newDestinationId != currentDestination.Id)
                    {
                        var isResponsibleForTarget = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, targetDestination, userId);
                        if (!isResponsibleForTarget)
                            throw new UnauthorizedAccessException("You are not the responsible manager for the target destination.");
                    }
                }

                activity.LocalityId = newLocalityId;
                activity.DestinationId = newDestinationId;
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found");
                activity.ObjectId = dto.ObjectId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) activity.Name = dto.Name;
            if (dto.Description != null) activity.Description = dto.Description;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                activity.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            if (dto.Price.HasValue) activity.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) activity.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.IsActive.HasValue) activity.IsActive = dto.IsActive.Value;

            activity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        // Samo odgovorni menadžer može da briše aktivnosti u svojoj destinaciji
        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return false;

            if (roleName == "ContentCreator")
            {
                if (activity.CreatedByUserId != userId)
                    throw new UnauthorizedAccessException("You can only delete your own activities.");
                if (activity.Status == ContentStatus.Approved)
                    throw new InvalidOperationException("Approved activities cannot be deleted directly.");
            }
            else if (roleName == "Manager")
            {
                var destination = activity.Destination
                    ?? activity.Locality?.Destination;

                if (destination == null)
                    throw new InvalidOperationException("Cannot determine destination for this activity.");

                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only content creators and managers can delete activities.");
            }

            _context.Activities.Remove(activity);
            await _context.SaveChangesAsync();
            return true;
        }

        // Menadžer odobrava/odbija aktivnost u svojoj destinaciji
        public async Task<ActivityDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (activity.Status != ContentStatus.Pending)
                throw new InvalidOperationException("Only pending activities can be approved or rejected.");

            var destination = activity.Destination
                ?? activity.Locality?.Destination;

            if (destination == null)
                throw new InvalidOperationException("Cannot determine destination for this activity.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            activity.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            activity.ApprovedByUserId = userId;
            activity.ApprovedAt = DateTime.UtcNow;
            activity.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            activity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        // Helper za CC update – samo polja, bez destinacione logike
        private async Task<ActivityDto?> UpdateActivityFieldsAsync(Activity activity, UpdateActivityDto dto)
        {
            if (dto.ActivityTypeId.HasValue)
            {
                var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId.Value);
                if (!activityTypeExists)
                    throw new InvalidOperationException("Activity type not found");
                activity.ActivityTypeId = dto.ActivityTypeId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) activity.Name = dto.Name;
            if (dto.Description != null) activity.Description = dto.Description;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                activity.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            if (dto.Price.HasValue) activity.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) activity.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.IsActive.HasValue) activity.IsActive = dto.IsActive.Value;

            activity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;
            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }
    }
}
