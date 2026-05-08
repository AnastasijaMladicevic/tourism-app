using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class DeletionRequestService : IDeletionRequestService
    {
        private readonly AppDbContext _context;

        public DeletionRequestService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DeletionRequestDto> CreateForObjectAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var obj = await _context.Objects
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(o => o.Destination)
                .FirstOrDefaultAsync(o => o.Id == objectId);

            if (obj == null)
                throw new InvalidOperationException("Object not found.");

            if (obj.CreatedByUserId != requestedByUserId)
                throw new UnauthorizedAccessException("You can only request deletion of your own objects.");

            if (obj.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved objects require a deletion request. Pending objects can be deleted directly.");

            var existing = await _context.DeletionRequests
                .FirstOrDefaultAsync(r => r.ObjectId == objectId && r.Status == ContentStatus.Pending);

            if (existing != null)
                throw new InvalidOperationException("A deletion request for this object is already pending.");

            var request = new DeletionRequest
            {
                ObjectId = objectId,
                RequestedByUserId = requestedByUserId,
                Reason = dto.Reason,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DeletionRequests.Add(request);
            await _context.SaveChangesAsync();
            await CreateManagerDeletionRequestNotificationAsync(
                obj.Destination ?? obj.Locality?.Destination,
                "Novi zahtev za brisanje",
                $"Stigao je zahtev za brisanje objekta \"{obj.Name}\".",
                $"/deletion-requests/{request.Id}");

            return await LoadDtoAsync(request.Id);
        }

        public async Task<DeletionRequestDto> CreateForEventAsync(int eventId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var ev = await _context.Events
                .Include(e => e.Destination)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Destination)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(e => e.Id == eventId);

            if (ev == null)
                throw new InvalidOperationException("Event not found.");

            if (ev.CreatedByUserId != requestedByUserId)
                throw new UnauthorizedAccessException("You can only request deletion of your own events.");

            if (ev.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved events require a deletion request. Pending events can be deleted directly.");

            var existing = await _context.DeletionRequests
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.Status == ContentStatus.Pending);

            if (existing != null)
                throw new InvalidOperationException("A deletion request for this event is already pending.");

            var request = new DeletionRequest
            {
                EventId = eventId,
                RequestedByUserId = requestedByUserId,
                Reason = dto.Reason,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DeletionRequests.Add(request);
            await _context.SaveChangesAsync();
            await CreateManagerDeletionRequestNotificationAsync(
                ev.Destination ?? ev.Locality?.Destination ?? ev.Object?.Destination ?? ev.Object?.Locality?.Destination,
                "Novi zahtev za brisanje",
                $"Stigao je zahtev za brisanje dogadjaja \"{ev.Name}\".",
                $"/deletion-requests/{request.Id}");

            return await LoadDtoAsync(request.Id);
        }

        public async Task<DeletionRequestDto> CreateForActivityAsync(int activityId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var activity = await _context.Activities
                .Include(a => a.Destination)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(a => a.Id == activityId);

            if (activity == null)
                throw new InvalidOperationException("Activity not found.");

            if (activity.CreatedByUserId != requestedByUserId)
                throw new UnauthorizedAccessException("You can only request deletion of your own activities.");

            if (activity.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved activities require a deletion request. Pending activities can be deleted directly.");

            var existing = await _context.DeletionRequests
                .FirstOrDefaultAsync(r => r.ActivityId == activityId && r.Status == ContentStatus.Pending);

            if (existing != null)
                throw new InvalidOperationException("A deletion request for this activity is already pending.");

            var request = new DeletionRequest
            {
                ActivityId = activityId,
                RequestedByUserId = requestedByUserId,
                Reason = dto.Reason,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DeletionRequests.Add(request);
            await _context.SaveChangesAsync();
            await CreateManagerDeletionRequestNotificationAsync(
                activity.Destination ?? activity.Locality?.Destination,
                "Novi zahtev za brisanje",
                $"Stigao je zahtev za brisanje aktivnosti \"{activity.Name}\".",
                $"/deletion-requests/{request.Id}");

            return await LoadDtoAsync(request.Id);
        }

        public async Task<PagedResultDto<DeletionRequestDto>> GetAllAsync(int userId, string roleName, DeletionRequestQueryDto query)
        {
            NormalizeQuery(query);

            if (!string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Only managers can view deletion requests.");

            var requestsQuery = BuildRequestsQuery()
                .Where(r =>
                    (r.ObjectId != null && (
                        (r.Object != null && r.Object.Destination != null && r.Object.Destination.ManagedByUserId == userId) ||
                        (r.Object != null && r.Object.Locality != null && r.Object.Locality.Destination.ManagedByUserId == userId))) ||
                    (r.EventId != null && (
                        (r.Event != null && r.Event.Destination != null && r.Event.Destination.ManagedByUserId == userId) ||
                        (r.Event != null && r.Event.Locality != null && r.Event.Locality.Destination.ManagedByUserId == userId) ||
                        (r.Event != null && r.Event.Object != null && r.Event.Object.Destination != null && r.Event.Object.Destination.ManagedByUserId == userId) ||
                        (r.Event != null && r.Event.Object != null && r.Event.Object.Locality != null && r.Event.Object.Locality.Destination.ManagedByUserId == userId))) ||
                    (r.ActivityId != null && (
                        (r.Activity != null && r.Activity.Destination != null && r.Activity.Destination.ManagedByUserId == userId) ||
                        (r.Activity != null && r.Activity.Locality != null && r.Activity.Locality.Destination.ManagedByUserId == userId))));

            requestsQuery = ApplyFilters(requestsQuery, query);
            requestsQuery = ApplySorting(requestsQuery, query.SortBy, query.SortOrder);

            var totalCount = await requestsQuery.CountAsync();

            var requests = await requestsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<DeletionRequestDto>
            {
                Items = requests.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<DeletionRequestDto>> GetByUserIdAsync(int userId, DeletionRequestQueryDto query)
        {
            NormalizeQuery(query);

            var requestsQuery = BuildRequestsQuery()
                .Where(dr => dr.RequestedByUserId == userId);

            requestsQuery = ApplyFilters(requestsQuery, query);
            requestsQuery = ApplySorting(requestsQuery, query.SortBy, query.SortOrder);

            var totalCount = await requestsQuery.CountAsync();

            var requests = await requestsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<DeletionRequestDto>
            {
                Items = requests.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<DeletionRequestDto?> GetByIdAsync(int id)
        {
            var request = await BuildRequestsQuery()
                .FirstOrDefaultAsync(dr => dr.Id == id);

            return request == null ? null : MapToDto(request);
        }

        public async Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName)
        {
            var request = await BuildRequestsQuery()
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
                return null;

            if (request.Status != ContentStatus.Pending)
                throw new InvalidOperationException("This request has already been reviewed.");

            var destination = ResolveDestination(request);

            if (!string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Only managers process deletion requests.");

            var isResponsible = destination != null &&
                await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, reviewedByUserId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            request.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            request.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            request.ReviewedByUserId = reviewedByUserId;
            request.ReviewedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            if (dto.Approve)
            {
                if (request.ObjectId != null)
                {
                    _context.Objects.Remove(request.Object!);
                }
                else if (request.EventId != null)
                {
                    await CreatePlannerEventNotificationsAsync(
                        request.EventId.Value,
                        NotificationType.PlannerEventUnavailable,
                        "Dogadjaj iz tvog planera je otkazan",
                        $"Dogadjaj \"{request.Event?.Name ?? "Dogadjaj"}\" iz tvog planera vise nije dostupan.",
                        "/planner");
                    _context.Events.Remove(request.Event!);
                }
                else if (request.ActivityId != null)
                {
                    _context.Activities.Remove(request.Activity!);
                }
            }

            await _context.SaveChangesAsync();
            await CreateCreatorDeletionRequestReviewedNotificationAsync(request);

            return MapToDto(request);
        }

        public async Task<DeletionRequestDto?> GetByIdForUserAsync(int id, int userId)
        {
            var request = await BuildRequestsQuery()
                .FirstOrDefaultAsync(dr => dr.Id == id && dr.RequestedByUserId == userId);

            return request == null ? null : MapToDto(request);
        }

        private async Task<DeletionRequestDto> LoadDtoAsync(int requestId)
        {
            var request = await BuildRequestsQuery()
                .FirstAsync(r => r.Id == requestId);

            return MapToDto(request);
        }

        private IQueryable<DeletionRequest> BuildRequestsQuery()
        {
            return _context.DeletionRequests
                .Include(r => r.Object)
                    .ThenInclude(o => o.Destination)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Object)
                        .ThenInclude(o => o.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Object)
                        .ThenInclude(o => o.Locality)
                            .ThenInclude(l => l.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .AsQueryable();
        }

        private static void NormalizeQuery(DeletionRequestQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;
        }

        private static IQueryable<DeletionRequest> ApplyFilters(IQueryable<DeletionRequest> query, DeletionRequestQueryDto filters)
        {
            if (!string.IsNullOrWhiteSpace(filters.Search))
            {
                var search = filters.Search.Trim().ToLower();

                query = query.Where(r =>
                    (r.Reason != null && r.Reason.ToLower().Contains(search)) ||
                    (r.RejectionReason != null && r.RejectionReason.ToLower().Contains(search)) ||
                    (r.Object != null && r.Object.Name.ToLower().Contains(search)) ||
                    (r.Event != null && r.Event.Name.ToLower().Contains(search)) ||
                    (r.Activity != null && r.Activity.Name.ToLower().Contains(search)) ||
                    (r.RequestedBy != null && (
                        r.RequestedBy.FirstName.ToLower().Contains(search) ||
                        r.RequestedBy.LastName.ToLower().Contains(search) ||
                        (r.RequestedBy.FirstName + " " + r.RequestedBy.LastName).ToLower().Contains(search))) ||
                    (r.ReviewedBy != null && (
                        r.ReviewedBy.FirstName.ToLower().Contains(search) ||
                        r.ReviewedBy.LastName.ToLower().Contains(search) ||
                        (r.ReviewedBy.FirstName + " " + r.ReviewedBy.LastName).ToLower().Contains(search))) ||
                    (
                        (
                            r.Object != null
                                ? (r.Object.Destination != null
                                    ? r.Object.Destination.Name
                                    : r.Object.Locality != null
                                        ? r.Object.Locality.Destination.Name
                                        : string.Empty)
                                : r.Event != null
                                    ? (r.Event.Destination != null
                                        ? r.Event.Destination.Name
                                        : r.Event.Locality != null
                                            ? r.Event.Locality.Destination.Name
                                            : r.Event.Object != null && r.Event.Object.Destination != null
                                                ? r.Event.Object.Destination.Name
                                                : r.Event.Object != null && r.Event.Object.Locality != null
                                                    ? r.Event.Object.Locality.Destination.Name
                                                    : string.Empty)
                                    : r.Activity != null
                                        ? (r.Activity.Destination != null
                                            ? r.Activity.Destination.Name
                                            : r.Activity.Locality != null
                                                ? r.Activity.Locality.Destination.Name
                                                : string.Empty)
                                        : string.Empty
                        ).ToLower().Contains(search)
                    ));
            }

            if (!string.IsNullOrWhiteSpace(filters.Status))
            {
                var statusFilter = filters.Status.Trim();

                if (Enum.TryParse<ContentStatus>(statusFilter, true, out var parsedStatus))
                {
                    query = query.Where(r => r.Status == parsedStatus);
                }
                else
                {
                    query = query.Where(_ => false);
                }
            }

            if (!string.IsNullOrWhiteSpace(filters.ContentType))
            {
                var contentType = filters.ContentType.Trim().ToLower();

                if (contentType == "object")
                    query = query.Where(r => r.ObjectId != null);
                else if (contentType == "event")
                    query = query.Where(r => r.EventId != null);
                else if (contentType == "activity")
                    query = query.Where(r => r.ActivityId != null);
                else
                    query = query.Where(_ => false);
            }

            if (!string.IsNullOrWhiteSpace(filters.RequestedBy))
            {
                var requestedBy = filters.RequestedBy.Trim().ToLower();

                query = query.Where(r =>
                    r.RequestedBy != null && (
                        r.RequestedBy.FirstName.ToLower().Contains(requestedBy) ||
                        r.RequestedBy.LastName.ToLower().Contains(requestedBy) ||
                        (r.RequestedBy.FirstName + " " + r.RequestedBy.LastName).ToLower().Contains(requestedBy)));
            }

            if (!string.IsNullOrWhiteSpace(filters.ReviewedBy))
            {
                var reviewedBy = filters.ReviewedBy.Trim().ToLower();

                query = query.Where(r =>
                    r.ReviewedBy != null && (
                        r.ReviewedBy.FirstName.ToLower().Contains(reviewedBy) ||
                        r.ReviewedBy.LastName.ToLower().Contains(reviewedBy) ||
                        (r.ReviewedBy.FirstName + " " + r.ReviewedBy.LastName).ToLower().Contains(reviewedBy)));
            }

            if (!string.IsNullOrWhiteSpace(filters.Destination))
            {
                var destination = filters.Destination.Trim().ToLower();
                query = query.Where(r =>
                    (
                        r.Object != null
                            ? (r.Object.Destination != null
                                ? r.Object.Destination.Name
                                : r.Object.Locality != null
                                    ? r.Object.Locality.Destination.Name
                                    : string.Empty)
                            : r.Event != null
                                ? (r.Event.Destination != null
                                    ? r.Event.Destination.Name
                                    : r.Event.Locality != null
                                        ? r.Event.Locality.Destination.Name
                                        : r.Event.Object != null && r.Event.Object.Destination != null
                                            ? r.Event.Object.Destination.Name
                                            : r.Event.Object != null && r.Event.Object.Locality != null
                                                ? r.Event.Object.Locality.Destination.Name
                                                : string.Empty)
                                : r.Activity != null
                                    ? (r.Activity.Destination != null
                                        ? r.Activity.Destination.Name
                                        : r.Activity.Locality != null
                                            ? r.Activity.Locality.Destination.Name
                                            : string.Empty)
                                    : string.Empty
                    ).ToLower().Contains(destination));
            }

            return query;
        }

        private static IQueryable<DeletionRequest> ApplySorting(IQueryable<DeletionRequest> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "requestedby")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.RequestedBy != null ? r.RequestedBy.FirstName : string.Empty)
                        .ThenByDescending(r => r.RequestedBy != null ? r.RequestedBy.LastName : string.Empty)
                    : query.OrderBy(r => r.RequestedBy != null ? r.RequestedBy.FirstName : string.Empty)
                        .ThenBy(r => r.RequestedBy != null ? r.RequestedBy.LastName : string.Empty);
            }

            if (sortByValue == "reviewedby")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.ReviewedBy != null ? r.ReviewedBy.FirstName : string.Empty)
                        .ThenByDescending(r => r.ReviewedBy != null ? r.ReviewedBy.LastName : string.Empty)
                    : query.OrderBy(r => r.ReviewedBy != null ? r.ReviewedBy.FirstName : string.Empty)
                        .ThenBy(r => r.ReviewedBy != null ? r.ReviewedBy.LastName : string.Empty);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(r =>
                        r.Object != null
                            ? (r.Object.Destination != null
                                ? r.Object.Destination.Name
                                : r.Object.Locality != null
                                    ? r.Object.Locality.Destination.Name
                                    : string.Empty)
                            : r.Event != null
                                ? (r.Event.Destination != null
                                    ? r.Event.Destination.Name
                                    : r.Event.Locality != null
                                        ? r.Event.Locality.Destination.Name
                                        : r.Event.Object != null && r.Event.Object.Destination != null
                                            ? r.Event.Object.Destination.Name
                                            : r.Event.Object != null && r.Event.Object.Locality != null
                                                ? r.Event.Object.Locality.Destination.Name
                                                : string.Empty)
                                : r.Activity != null
                                    ? (r.Activity.Destination != null
                                        ? r.Activity.Destination.Name
                                        : r.Activity.Locality != null
                                            ? r.Activity.Locality.Destination.Name
                                            : string.Empty)
                                    : string.Empty)
                    : query.OrderBy(r =>
                        r.Object != null
                            ? (r.Object.Destination != null
                                ? r.Object.Destination.Name
                                : r.Object.Locality != null
                                    ? r.Object.Locality.Destination.Name
                                    : string.Empty)
                            : r.Event != null
                                ? (r.Event.Destination != null
                                    ? r.Event.Destination.Name
                                    : r.Event.Locality != null
                                        ? r.Event.Locality.Destination.Name
                                        : r.Event.Object != null && r.Event.Object.Destination != null
                                            ? r.Event.Object.Destination.Name
                                            : r.Event.Object != null && r.Event.Object.Locality != null
                                                ? r.Event.Object.Locality.Destination.Name
                                                : string.Empty)
                                : r.Activity != null
                                    ? (r.Activity.Destination != null
                                        ? r.Activity.Destination.Name
                                        : r.Activity.Locality != null
                                            ? r.Activity.Locality.Destination.Name
                                            : string.Empty)
                                    : string.Empty);
            }

            if (sortByValue == "status")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Status)
                    : query.OrderBy(r => r.Status);
            }

            if (sortByValue == "contenttype")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.ObjectId != null ? "Object" : r.EventId != null ? "Event" : "Activity")
                    : query.OrderBy(r => r.ObjectId != null ? "Object" : r.EventId != null ? "Event" : "Activity");
            }

            return isDesc
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt);
        }

        private static string GetDestinationNameForQuery(DeletionRequest request)
        {
            return request.Object != null
                ? request.Object.Destination != null
                    ? request.Object.Destination.Name
                    : request.Object.Locality != null
                        ? request.Object.Locality.Destination.Name
                        : string.Empty
                : request.Event != null
                    ? request.Event.Destination != null
                        ? request.Event.Destination.Name
                        : request.Event.Locality != null
                            ? request.Event.Locality.Destination.Name
                            : request.Event.Object != null && request.Event.Object.Destination != null
                                ? request.Event.Object.Destination.Name
                                : request.Event.Object != null && request.Event.Object.Locality != null
                                    ? request.Event.Object.Locality.Destination.Name
                                    : string.Empty
                    : request.Activity != null
                        ? request.Activity.Destination != null
                            ? request.Activity.Destination.Name
                            : request.Activity.Locality != null
                                ? request.Activity.Locality.Destination.Name
                                : string.Empty
                        : string.Empty;
        }

        private static Destination? ResolveDestination(DeletionRequest request)
        {
            if (request.Object != null)
                return request.Object.Destination ?? request.Object.Locality?.Destination;

            if (request.Event != null)
                return request.Event.Destination
                    ?? request.Event.Locality?.Destination
                    ?? request.Event.Object?.Destination
                    ?? request.Event.Object?.Locality?.Destination;

            if (request.Activity != null)
                return request.Activity.Destination ?? request.Activity.Locality?.Destination;

            return null;
        }

        private static DeletionRequestDto MapToDto(DeletionRequest r) => new()
        {
            Id = r.Id,
            ContentType = r.ObjectId != null ? "Object" : r.EventId != null ? "Event" : "Activity",
            DestinationName = GetDestinationNameForQuery(r),
            ObjectId = r.ObjectId,
            ObjectName = r.Object?.Name,
            EventId = r.EventId,
            EventName = r.Event?.Name,
            ActivityId = r.ActivityId,
            ActivityName = r.Activity?.Name,
            RequestedByUserId = r.RequestedByUserId,
            RequestedByName = r.RequestedBy != null
                ? $"{r.RequestedBy.FirstName} {r.RequestedBy.LastName}"
                : string.Empty,
            Reason = r.Reason,
            Status = r.Status.ToString(),
            ReviewedByUserId = r.ReviewedByUserId,
            ReviewedByName = r.ReviewedBy != null
                ? $"{r.ReviewedBy.FirstName} {r.ReviewedBy.LastName}"
                : null,
            RejectionReason = r.RejectionReason,
            ReviewedAt = r.ReviewedAt,
            CreatedAt = r.CreatedAt
        };

        private async Task CreatePlannerEventNotificationsAsync(
            int eventId,
            NotificationType type,
            string title,
            string message,
            string actionUrl)
        {
            var plannerUsers = await _context.EventPlannerItems
                .AsNoTracking()
                .Where(item => item.EventId == eventId)
                .Join(
                    _context.Users.AsNoTracking().Where(u => u.IsActive && !u.IsBlacklisted),
                    item => item.UserId,
                    user => user.Id,
                    (item, user) => item.UserId)
                .Distinct()
                .ToListAsync();

            if (plannerUsers.Count == 0)
                return;

            var createdAt = DateTime.UtcNow;
            var notifications = plannerUsers
                .Select(userId => new Notification
                {
                    UserId = userId,
                    Type = type,
                    Title = title,
                    Message = message,
                    ActionUrl = actionUrl,
                    EventId = eventId,
                    CreatedAt = createdAt
                })
                .ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        private async Task CreateManagerDeletionRequestNotificationAsync(
            Destination? destination,
            string title,
            string message,
            string actionUrl)
        {
            if (destination?.ManagedByUserId == null)
                return;

            var managerId = destination.ManagedByUserId.Value;
            var managerCanReceive = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == managerId && u.IsActive && !u.IsBlacklisted);

            if (!managerCanReceive)
                return;

            _context.Notifications.Add(new Notification
            {
                UserId = managerId,
                Type = NotificationType.ManagerNewDeletionRequest,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private async Task CreateCreatorDeletionRequestReviewedNotificationAsync(DeletionRequest request)
        {
            var creatorCanReceive = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == request.RequestedByUserId && u.IsActive && !u.IsBlacklisted);

            if (!creatorCanReceive)
                return;

            var approved = request.Status == ContentStatus.Approved;
            var statusText = approved ? "odobren" : "odbijen";
            var contentName = request.Object?.Name
                ?? request.Event?.Name
                ?? request.Activity?.Name
                ?? "sadrzaj";

            _context.Notifications.Add(new Notification
            {
                UserId = request.RequestedByUserId,
                Type = NotificationType.CreatorDeletionRequestReviewed,
                Title = $"Zahtev za brisanje je {statusText}",
                Message = $"Tvoj zahtev za brisanje sadrzaja \"{contentName}\" je {statusText}.",
                ActionUrl = $"/deletion-requests/{request.Id}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }
    }
}
