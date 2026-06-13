using TuristickiVodic.Core.Helpers;
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
        private readonly ITranslationService _translationService;

        public ActivityService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
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
                    .ThenInclude(d => d.Region)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Images)
                .Where(a => a.Status == ContentStatus.Approved)
                .Where(a => a.IsActive)
                .Where(a => a.Images.Any(i => i.IsMain))
                .AsNoTracking()
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

            if (query.RegionId.HasValue)
            {
                activitiesQuery = activitiesQuery.Where(a =>
                    (a.Destination != null && a.Destination.RegionId == query.RegionId.Value) ||
                    (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                activitiesQuery = ApplyActivitySearch(activitiesQuery, search);

            if (search == null)
                activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<ActivityDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

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
                    .ThenInclude(d => d.Region)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a => a.Status == ContentStatus.Approved)
                .Where(a => a.IsActive)
                .Where(a => a.Geolocation != null)
                .Where(a => a.Images.Any(i => i.IsMain))
                .AsNoTracking()
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

            if (query.RegionId.HasValue)
            {
                activitiesQuery = activitiesQuery.Where(a =>
                    (a.Destination != null && a.Destination.RegionId == query.RegionId.Value) ||
                    (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                activitiesQuery = ApplyActivitySearchFilter(activitiesQuery, search);

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

            await ApplyTranslationsAsync(items, nearbyActivities
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => x.Activity)
                .ToList(), query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(items);

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
                    .ThenInclude(d => d.Region)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a => a.CreatedByUserId == userId)
                .AsNoTracking()
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

            if (query.RegionId.HasValue)
            {
                activitiesQuery = activitiesQuery.Where(a =>
                    (a.Destination != null && a.Destination.RegionId == query.RegionId.Value) ||
                    (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.RegionId == query.RegionId.Value));
            }

            activitiesQuery = ApplyStatusFilter(activitiesQuery, query.Status);
            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                activitiesQuery = ApplyActivitySearchFilter(activitiesQuery, search);
            activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<ActivityDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<ActivityDto>
            {
                Items = mappedItems,
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
                    .ThenInclude(d => d.Region)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .Where(a =>
                    (a.DestinationId.HasValue && destinationIds.Contains(a.DestinationId.Value)) ||
                    (!a.DestinationId.HasValue && a.Locality != null && destinationIds.Contains(a.Locality.DestinationId)))
                .AsNoTracking()
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

            if (query.RegionId.HasValue)
            {
                activitiesQuery = activitiesQuery.Where(a =>
                    (a.Destination != null && a.Destination.RegionId == query.RegionId.Value) ||
                    (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.RegionId == query.RegionId.Value));
            }

            activitiesQuery = ApplyStatusFilter(activitiesQuery, query.Status);
            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                activitiesQuery = ApplyActivitySearchFilter(activitiesQuery, search);
            activitiesQuery = ApplyActivitySorting(activitiesQuery, query.SortBy, query.SortOrder);

            var totalCount = await activitiesQuery.CountAsync();

            var items = await activitiesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<ActivityDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<ActivityDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<ActivityDto?> GetByIdAsync(int id, string lang = "sr")
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.CreatedBy)
                .Include(a => a.ApprovedBy)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
                return null;

            if (activity.Status != ContentStatus.Approved || !activity.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ActivityId == activity.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            var dto = _mapper.Map<ActivityDto>(activity);
            await ApplyTranslationsAsync(dto, activity, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<ActivityDto?> GetMineByIdAsync(int id, int userId, string lang = "sr")
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.CreatedBy)
                .Include(a => a.ApprovedBy)
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id && a.CreatedByUserId == userId);

            if (activity == null)
                return null;

            var dto = _mapper.Map<ActivityDto>(activity);
            await ApplyTranslationsAsync(dto, activity, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<ActivityDto?> GetForManagerByIdAsync(int id, int userId, string lang = "sr")
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.CreatedBy)
                .Include(a => a.ApprovedBy)
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

            var dto = _mapper.Map<ActivityDto>(activity);
            await ApplyTranslationsAsync(dto, activity, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
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

            var geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            await GeoBoundaryHelper.EnsurePointWithinBoundsAsync(_context, geolocation, dto.LocalityId, dto.DestinationId);

            var activity = new Activity
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = geolocation,
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
            await CreateManagerPendingContentNotificationAsync(
                activity.DestinationId,
                "Nova aktivnost čeka odobrenje",
                $"Aktivnost \"{activity.Name}\" je poslata na odobrenje u tvojoj destinaciji.",
                $"/activities/{activity.Id}");

            // Save image if provided
            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                var image = new Image
                {
                    ActivityId = activity.Id,
                    Url = dto.ImageUrl,
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Images.Add(image);
                await _context.SaveChangesAsync();
            }

            var created = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            var result = _mapper.Map<ActivityDto>(created);
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Samo ContentCreator može da menja svoju aktivnost.
        // Jednom odobrena aktivnost više ne mora biti Pending da bi bila izmenjena –
        // CC može da menja i Pending i Approved aktivnost.
        private async Task CreateManagerPendingContentNotificationAsync(
            int? destinationId,
            string title,
            string message,
            string actionUrl)
        {
            if (!destinationId.HasValue)
                return;

            var managerId = await _context.Destinations
                .AsNoTracking()
                .Where(d => d.Id == destinationId.Value)
                .Select(d => d.ManagedByUserId)
                .FirstOrDefaultAsync();

            if (!managerId.HasValue)
                return;

            var manager = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == managerId.Value && u.IsActive && !u.IsBlacklisted);

            if (manager == null)
                return;

            _context.Notifications.Add(new Notification
            {
                UserId = managerId.Value,
                Type = NotificationType.ManagerNewPendingContent,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        public async Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update activities.");

            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
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

            await GeoBoundaryHelper.EnsurePointWithinBoundsAsync(_context, activity.Geolocation, activity.LocalityId, activity.DestinationId);

            if (dto.Price.HasValue) activity.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) activity.DurationMinutes = dto.DurationMinutes.Value;

            activity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            var result = _mapper.Map<ActivityDto>(updated);
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Samo odgovorni menadžer može da odobri/odbije Pending aktivnost u svojoj destinaciji.
        public async Task<ActivityDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var activity = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
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
            await CreateCreatorContentReviewedNotificationAsync(
                activity.CreatedByUserId,
                dto.Approve,
                "aktivnost",
                activity.Name,
                $"/activities/{activity.Id}");
            if (!dto.Approve)
            {
                await CreateAdminMultipleRejectedContentNotificationsAsync(activity.CreatedByUserId, activity.Name, $"/activities/{activity.Id}");
            }

            var updated = await _context.Activities
                .Include(a => a.ActivityType)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            var result = _mapper.Map<ActivityDto>(updated);
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Samo ContentCreator može direktno da obriše svoju aktivnost koja nije Approved.
        // Approved aktivnost se briše isključivo kroz DeletionRequest koji odobrava menadžer.
        private async Task CreateCreatorContentReviewedNotificationAsync(
            int creatorId,
            bool approved,
            string contentType,
            string contentName,
            string actionUrl)
        {
            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId && u.IsActive && !u.IsBlacklisted);

            if (creator == null)
                return;

            var statusText = approved ? "odobrena" : "odbijena";
            var title = $"Tvoja {contentType} je {statusText}";
            var message = $"Sadržaj \"{contentName}\" je {statusText}.";

            _context.Notifications.Add(new Notification
            {
                UserId = creatorId,
                Type = NotificationType.CreatorContentReviewed,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private async Task CreateAdminMultipleRejectedContentNotificationsAsync(
            int creatorId,
            string latestContentName,
            string actionUrl)
        {
            var rejectedCount =
                await _context.Objects.AsNoTracking().CountAsync(o => o.CreatedByUserId == creatorId && o.Status == ContentStatus.Rejected) +
                await _context.Events.AsNoTracking().CountAsync(e => e.CreatedByUserId == creatorId && e.Status == ContentStatus.Rejected) +
                await _context.Activities.AsNoTracking().CountAsync(a => a.CreatedByUserId == creatorId && a.Status == ContentStatus.Rejected);

            if (rejectedCount < 3)
                return;

            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId);

            if (creator == null)
                return;

            var adminIds = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role.Name == RoleType.Admin && u.IsActive && !u.IsBlacklisted)
                .Select(u => u.Id)
                .ToListAsync();

            if (adminIds.Count == 0)
                return;

            var creatorName = $"{creator.FirstName} {creator.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(creatorName))
                creatorName = creator.Email;

            var title = "ContentCreator ima više odbijenih sadržaja";
            var message = $"ContentCreator {creatorName} ima {rejectedCount} odbijenih sadržaja. Poslednje odbijeno: \"{latestContentName}\".";
            var createdAt = DateTime.UtcNow;

            var notifications = adminIds.Select(adminId => new Notification
            {
                UserId = adminId,
                Type = NotificationType.AdminCreatorMultipleRejectedContent,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = createdAt
            });

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

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

        private async Task ApplyPendingDeletionRequestFlagsAsync(List<ActivityDto> items)
        {
            if (items.Count == 0)
                return;

            var activityIds = items.Select(x => x.Id).Distinct().ToList();

            var pendingIds = await _context.DeletionRequests
                .AsNoTracking()
                .Where(dr => dr.ActivityId.HasValue
                    && activityIds.Contains(dr.ActivityId.Value)
                    && dr.Status == ContentStatus.Pending)
                .Select(dr => dr.ActivityId!.Value)
                .Distinct()
                .ToListAsync();

            var pendingIdSet = pendingIds.ToHashSet();

            foreach (var item in items)
            {
                item.HasPendingDeletionRequest = pendingIdSet.Contains(item.Id);
            }
        }

        private Task ApplyPendingDeletionRequestFlagsAsync(ActivityDto item)
        {
            return ApplyPendingDeletionRequestFlagsAsync(new List<ActivityDto> { item });
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
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
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
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Object)
                .Include(a => a.Images)
                .FirstAsync(a => a.Id == activity.Id);

            var result = _mapper.Map<ActivityDto>(updated);
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        private static string? NormalizeSearchTerm(string? search)
        {
            return string.IsNullOrWhiteSpace(search)
                ? null
                : search.Trim().ToLower();
        }

        private static IQueryable<Activity> ApplyActivitySearch(IQueryable<Activity> query, string search)
        {
            return ApplyActivitySearchFilter(query, search)
                .OrderBy(a => a.Name.ToLower().Contains(search) ? 0 :
                    (a.ActivityType != null && a.ActivityType.Name.ToLower().Contains(search) ? 1 :
                    (a.Description != null && a.Description.ToLower().Contains(search) ? 2 : 3)))
                .ThenBy(a => a.Name);
        }

        private static IQueryable<Activity> ApplyActivitySearchFilter(IQueryable<Activity> query, string search)
        {
            return query.Where(a =>
                a.Name.ToLower().Contains(search) ||
                (a.ActivityType != null && a.ActivityType.Name.ToLower().Contains(search)) ||
                (a.Description != null && a.Description.ToLower().Contains(search)));
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

        private async Task ApplyTranslationsAsync(List<ActivityDto> dtos, List<Activity> activities, string? lang)
        {
            if (dtos.Count == 0 || activities.Count == 0)
                return;

            var normalizedLang = LanguageHelper.Normalize(lang);
            if (normalizedLang == "sr")
                return;

            var activitiesById = activities.ToDictionary(a => a.Id);
            foreach (var dto in dtos)
            {
                if (activitiesById.TryGetValue(dto.Id, out var activity))
                    await ApplyTranslationsAsync(dto, activity, normalizedLang, true);
            }
        }

        private async Task ApplyTranslationsAsync(ActivityDto dto, Activity activity, string? lang, bool createMissing = true)
        {
            var normalizedLang = LanguageHelper.Normalize(lang);
            if (normalizedLang == "sr")
                return;

            dto.Description = createMissing
                ? await _translationService.GetOrCreateTextAsync(
                "Activity",
                activity.Id,
                "Description",
                activity.Description ?? string.Empty,
                normalizedLang)
                : await _translationService.GetTextAsync(
                "Activity",
                activity.Id,
                "Description",
                activity.Description ?? string.Empty,
                normalizedLang);

            if (activity.ActivityType != null && !string.IsNullOrWhiteSpace(activity.ActivityType.Name))
            {
                dto.ActivityTypeName = createMissing
                    ? await _translationService.GetOrCreateTextAsync(
                    "ActivityType",
                    activity.ActivityType.Id,
                    "Name",
                    activity.ActivityType.Name,
                    normalizedLang)
                    : await _translationService.GetTextAsync(
                    "ActivityType",
                    activity.ActivityType.Id,
                    "Name",
                    activity.ActivityType.Name,
                    normalizedLang);
            }
        }
    }
}
