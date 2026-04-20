using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System;
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


        public async Task<PagedResultDto<ActivityDto>> GetAllAsync(ActivityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var activitiesQuery = _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                .Include(a => a.Images)
                .Where(a => a.Status == ContentStatus.Approved)
                .Where(a => a.IsActive)
                .Where(a => a.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.ActivityType != null &&
                    a.ActivityType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.Destination != null &&
                    a.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.Name.ToLower().Contains(search) ||
                    (a.Description != null && a.Description.ToLower().Contains(search)));
            }

            activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<ActivityDto>>(items);

            return new PagedResultDto<ActivityDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ActivityDto>> GetNearbyAsync(NearbyActivityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var activitiesQuery = _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a => a.Status == ContentStatus.Approved)
                .Where(a => a.IsActive)
                .Where(a => a.Geolocation != null)
                .Where(a => a.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.ActivityType != null &&
                    a.ActivityType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.Destination != null &&
                    a.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.Name.ToLower().Contains(search) ||
                    (a.Description != null && a.Description.ToLower().Contains(search)));
            }

            var activities = await activitiesQuery.ToListAsync();

            var nearbyActivities = activities
                .Select(activity => new
                {
                    Activity = activity,
                    DistanceMeters = CalculateDistanceMeters(
                        query.Latitude,
                        query.Longitude,
                        activity.Geolocation!.Y,
                        activity.Geolocation.X)
                })
                .Where(x => x.DistanceMeters <= query.RadiusMeters)
                .ToList();

            var isDesc = string.Equals(query.SortOrder?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            nearbyActivities = isDesc
                ? nearbyActivities.OrderByDescending(x => x.DistanceMeters).ThenBy(x => x.Activity.Name).ToList()
                : nearbyActivities.OrderBy(x => x.DistanceMeters).ThenBy(x => x.Activity.Name).ToList();

            var totalCount = nearbyActivities.Count;

            var items = nearbyActivities
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x =>
                {
                    var dto = _mapper.Map<ActivityDto>(x.Activity);
                    dto.DistanceMeters = Math.Round(x.DistanceMeters, 2);
                    return dto;
                })
                .ToList();

            return new PagedResultDto<ActivityDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ActivityDto>> GetMyAsync(int userId, ActivityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var activitiesQuery = _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a => a.CreatedByUserId == userId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                activitiesQuery = activitiesQuery.Where(a =>
                    a.ActivityType != null &&
                    a.ActivityType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                activitiesQuery = activitiesQuery.Where(a =>
                    a.Destination != null &&
                    a.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();
                activitiesQuery = activitiesQuery.Where(a =>
                    a.Name.ToLower().Contains(search) ||
                    (a.Description != null && a.Description.ToLower().Contains(search)));
            }

            activitiesQuery = ApplyStatusFilter(activitiesQuery, query.Status);
            activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<ActivityDto>
            {
                Items = _mapper.Map<List<ActivityDto>>(items),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ActivityDto>> GetForManagerAsync(int userId, ActivityQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var destinationIds = await DestinationManagerHelper.GetResponsibleDestinationIdsAsync(_context, userId);

            var activitiesQuery = _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a =>
                    (a.DestinationId.HasValue && destinationIds.Contains(a.DestinationId.Value)) ||
                    (!a.DestinationId.HasValue && a.Locality != null && destinationIds.Contains(a.Locality.DestinationId)))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.ActivityType != null &&
                    a.ActivityType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    ((a.Destination != null && a.Destination.Name.ToLower().Contains(destination)) ||
                     (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                activitiesQuery = activitiesQuery.Where(a =>
                    a.Name.ToLower().Contains(search) ||
                    (a.Description != null && a.Description.ToLower().Contains(search)));
            }

            activitiesQuery = ApplyStatusFilter(activitiesQuery, query.Status);
            activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<ActivityDto>
            {
                Items = _mapper.Map<List<ActivityDto>>(items),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<ActivityDto?> GetByIdAsync(int id)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (activity.Status != ContentStatus.Approved || !activity.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ActivityId == activity.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            return _mapper.Map<ActivityDto>(activity);
        }

        public async Task<ActivityDto?> GetMineByIdAsync(int id, int userId)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id && a.CreatedByUserId == userId);

            return activity == null ? null : _mapper.Map<ActivityDto>(activity);
        }

        public async Task<ActivityDto?> GetForManagerByIdAsync(int id, int userId)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            var destination = activity.Destination ?? activity.Locality?.Destination;
            if (destination == null)
                return null;

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                return null;

            return _mapper.Map<ActivityDto>(activity);
        }

        // Samo ContentCreator kreira aktivnost – status uvek Pending, čeka odobrenje menadžera.
        // Aktivnost mora imati LocalityId ili DestinationId (validirano u DTO).
        // Ako je naveden LocalityId, DestinationId mora biti konzistentan.
        public async Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can create activities.");

            ValidateActivityPayload(dto.Price, dto.DurationMinutes, dto.Longitude, dto.Latitude);

            var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId);
            if (!activityTypeExists)
                throw new InvalidOperationException("Activity type not found.");

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);

                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                dto.DestinationId = locality.DestinationId;
            }
            else if (dto.DestinationId.HasValue)
            {
                var destinationExists = await _context.Destinations.AnyAsync(x => x.Id == dto.DestinationId.Value);
                if (!destinationExists)
                    throw new InvalidOperationException("Destination not found.");
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found.");
            }

            var activity = new Activity
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                Price = dto.Price,
                DurationMinutes = dto.DurationMinutes,
                ActivityTypeId = dto.ActivityTypeId,
                LocalityId = dto.LocalityId,
                DestinationId = dto.DestinationId,
                ObjectId = dto.ObjectId,
                CreatedByUserId = userId,
                Status = ContentStatus.Pending,
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
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(created);
        }

        // Samo ContentCreator može da menja svoju aktivnost.
        // Jednom odobrena aktivnost više ne mora biti Pending da bi bila izmenjena –
        // CC može da menja i Pending i Approved aktivnost.
        public async Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update activities.");

            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (activity.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update your own activities.");

            if ((dto.Longitude.HasValue && !dto.Latitude.HasValue) || (!dto.Longitude.HasValue && dto.Latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            if (dto.Price.HasValue && dto.Price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            if (dto.DurationMinutes.HasValue && dto.DurationMinutes.Value <= 0)
                throw new InvalidOperationException("DurationMinutes must be greater than 0.");

            // Validiraj i razreši LocalityId/DestinationId konzistentnost ako se menjaju
            if (dto.LocalityId.HasValue || dto.DestinationId.HasValue)
            {
                int? newLocalityId = dto.LocalityId ?? activity.LocalityId;
                int? newDestinationId = dto.DestinationId ?? activity.DestinationId;

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
                }
                else if (newDestinationId.HasValue)
                {
                    var destinationExists = await _context.Destinations.AnyAsync(d => d.Id == newDestinationId.Value);
                    if (!destinationExists)
                        throw new InvalidOperationException("Destination not found.");
                }

                activity.LocalityId = newLocalityId;
                activity.DestinationId = newDestinationId;
            }

            if (dto.ActivityTypeId.HasValue)
            {
                var activityTypeExists = await _context.ActivityTypes.AnyAsync(x => x.Id == dto.ActivityTypeId.Value);
                if (!activityTypeExists)
                    throw new InvalidOperationException("Activity type not found.");
                activity.ActivityTypeId = dto.ActivityTypeId.Value;
            }

            if (dto.ObjectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found.");
                activity.ObjectId = dto.ObjectId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) activity.Name = dto.Name;
            if (dto.Description != null) activity.Description = dto.Description;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                activity.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            if (dto.Price.HasValue) activity.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) activity.DurationMinutes = dto.DurationMinutes.Value;

            activity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        // Samo odgovorni menadžer može da odobri/odbije Pending aktivnost u svojoj destinaciji.
        public async Task<ActivityDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;
            if (dto.Approve)
            {
                var hasMainImage = await _context.Images
                    .AnyAsync(i => i.ActivityId == activity.Id && i.IsMain);

                if (!hasMainImage)
                    throw new InvalidOperationException("Activity must have a main image before approval.");
            }

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
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        // Samo ContentCreator može direktno da obriše svoju aktivnost koja nije Approved.
        // Approved aktivnost se briše isključivo kroz DeletionRequest koji odobrava menadžer.
        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can delete activities.");

            var activity = await _context.Activities
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return false;

            if (activity.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own activities.");

            if (activity.Status == ContentStatus.Approved)
                throw new InvalidOperationException("Approved activities cannot be deleted directly. Submit a deletion request instead.");

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

        private static void ValidateActivityPayload(decimal? price, int? durationMinutes, double? longitude, double? latitude)
        {
            if ((longitude.HasValue && !latitude.HasValue) || (!longitude.HasValue && latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            if (price.HasValue && price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            if (durationMinutes.HasValue && durationMinutes.Value <= 0)
                throw new InvalidOperationException("DurationMinutes must be greater than 0.");
        }

        public async Task<ActivityDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only managers can change activity visibility.");

            if (activity.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved activities can have visibility changed.");

            var destination = activity.Destination ?? activity.Locality?.Destination;
            if (destination == null)
                throw new InvalidOperationException("Cannot determine destination for this activity.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            activity.IsActive = isActive;
            activity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                .Include(a => a.Destination)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            return _mapper.Map<ActivityDto>(updated);
        }

        private static IQueryable<Activity> ApplyActivitySorting(IQueryable<Activity> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(a => a.ActivityType!.Name)
                    : query.OrderBy(a => a.ActivityType!.Name);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(a => a.Destination!.Name)
                    : query.OrderBy(a => a.Destination!.Name);
            }

            if (sortByValue == "price")
            {
                return isDesc
                    ? query.OrderByDescending(a => a.Price)
                    : query.OrderBy(a => a.Price);
            }

            if (sortByValue == "duration")
            {
                return isDesc
                    ? query.OrderByDescending(a => a.DurationMinutes)
                    : query.OrderBy(a => a.DurationMinutes);
            }

            if (sortByValue == "status")
            {
                return isDesc
                    ? query.OrderByDescending(a => a.Status)
                    : query.OrderBy(a => a.Status);
            }

            return isDesc
                ? query.OrderByDescending(a => a.Name)
                : query.OrderBy(a => a.Name);
        }

        private static IQueryable<Activity> ApplyStatusFilter(IQueryable<Activity> query, string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return query;

            if (!Enum.TryParse<ContentStatus>(status.Trim(), true, out var parsedStatus))
                return query.Where(_ => false);

            return query.Where(a => a.Status == parsedStatus);
        }
    }
}
