using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

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
                .Include(a => a.Location)
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
                .Include(a => a.Location)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            return activity == null ? null : _mapper.Map<ActivityDto>(activity);
        }

        public async Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId)
        {
            var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId);
            if (!activityTypeExists)
                throw new InvalidOperationException("Activity type not found");

            if (dto.LocationId.HasValue)
            {
                var locationExists = await _context.Locations.AnyAsync(x => x.Id == dto.LocationId.Value);
                if (!locationExists)
                    throw new InvalidOperationException("Location not found");
            }

            if (dto.DestinationId.HasValue)
            {
                var destinationExists = await _context.Destinations.AnyAsync(x => x.Id == dto.DestinationId.Value);
                if (!destinationExists)
                    throw new InvalidOperationException("Destination not found");
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found");
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
                LocationId = dto.LocationId,
                DestinationId = dto.DestinationId,
                ObjectId = dto.ObjectId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();

            var created = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Location)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(created);
        }

        public async Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Location)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (dto.ActivityTypeId.HasValue)
            {
                var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId.Value);
                if (!activityTypeExists)
                    throw new InvalidOperationException("Activity type not found");

                activity.ActivityTypeId = dto.ActivityTypeId.Value;
            }

            if (dto.LocationId.HasValue)
            {
                var locationExists = await _context.Locations.AnyAsync(x => x.Id == dto.LocationId.Value);
                if (!locationExists)
                    throw new InvalidOperationException("Location not found");

                activity.LocationId = dto.LocationId.Value;
            }

            if (dto.DestinationId.HasValue)
            {
                var destinationExists = await _context.Destinations.AnyAsync(x => x.Id == dto.DestinationId.Value);
                if (!destinationExists)
                    throw new InvalidOperationException("Destination not found");

                activity.DestinationId = dto.DestinationId.Value;
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found");

                activity.ObjectId = dto.ObjectId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                activity.Name = dto.Name;

            if (dto.Description != null)
                activity.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                activity.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            if (dto.Price.HasValue)
                activity.Price = dto.Price.Value;

            if (dto.DurationMinutes.HasValue)
                activity.DurationMinutes = dto.DurationMinutes.Value;

            if (dto.IsActive.HasValue)
                activity.IsActive = dto.IsActive.Value;

            activity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Location)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return false;

            _context.Activities.Remove(activity);
            await _context.SaveChangesAsync();

            return true;
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }
    }
}