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

        // CC podnosi zahtev za brisanje svog Approved objekta
        public async Task<DeletionRequestDto> CreateForObjectAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var obj = await _context.Objects
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
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

            return await LoadDtoAsync(request.Id);
        }

        // CC podnosi zahtev za brisanje svog Approved eventa
        public async Task<DeletionRequestDto> CreateForEventAsync(int eventId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var ev = await _context.Events
                .Include(e => e.Destination)
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

            return await LoadDtoAsync(request.Id);
        }

        // CC podnosi zahtev za brisanje svoje Approved aktivnosti
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

            return await LoadDtoAsync(request.Id);
        }

        // Menadžer vidi zahteve za svoju destinaciju, Admin vidi zahteve za destinacije bez menadžera
        public async Task<IEnumerable<DeletionRequestDto>> GetAllAsync(int userId, string roleName)
        {
            var query = _context.DeletionRequests
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .AsQueryable();

            if (roleName == "Manager")
            {
                query = query.Where(r =>
                    (r.ObjectId != null && r.Object.Locality.Destination.ManagedByUserId == userId) ||
                    (r.EventId != null && r.Event.Destination.ManagedByUserId == userId) ||
                    (r.ActivityId != null && (
                        r.Activity.Destination.ManagedByUserId == userId ||
                        (r.Activity.Locality != null && r.Activity.Locality.Destination.ManagedByUserId == userId))));
            }
            else if (roleName == "Admin")
            {
                query = query.Where(r =>
                    (r.ObjectId != null && r.Object.Locality.Destination.ManagedByUserId == null) ||
                    (r.EventId != null && r.Event.Destination.ManagedByUserId == null) ||
                    (r.ActivityId != null && (
                        r.Activity.Destination.ManagedByUserId == null ||
                        (r.Activity.Locality != null && r.Activity.Locality.Destination.ManagedByUserId == null))));
            }

            var requests = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
            return requests.Select(MapToDto);
        }

        public async Task<IEnumerable<DeletionRequestDto>> GetByUserIdAsync(int userId)
        {
            var requests = await _context.DeletionRequests
                .Include(dr => dr.Object)
                .Include(dr => dr.Event)
                .Include(dr => dr.Activity)
                .Include(dr => dr.RequestedBy)
                .Include(dr => dr.ReviewedBy)
                .Where(dr => dr.RequestedByUserId == userId)
                .OrderByDescending(dr => dr.CreatedAt)
                .ToListAsync();

            return requests.Select(MapToDto);
        }

        public async Task<DeletionRequestDto?> GetByIdAsync(int id)
        {
            var request = await _context.DeletionRequests
                .Include(dr => dr.Object)
                .Include(dr => dr.Event)
                .Include(dr => dr.Activity)
                .Include(dr => dr.RequestedBy)
                .Include(dr => dr.ReviewedBy)
                .FirstOrDefaultAsync(dr => dr.Id == id);

            if (request == null)
                return null;

            return MapToDto(request);
        }


        // Menadžer/Admin odobrava ili odbija; ako je odobren → objekat/event se briše
        public async Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName)
        {
            var request = await _context.DeletionRequests
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.Event)
                    .ThenInclude(e => e.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Destination)
                .Include(r => r.Activity)
                    .ThenInclude(a => a.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
                return null;

            if (request.Status != ContentStatus.Pending)
                throw new InvalidOperationException("This request has already been reviewed.");

            // Odredi destinaciju iz objekta, eventa ili aktivnosti
            var destination = request.ObjectId != null
                ? request.Object?.Locality?.Destination
                : request.EventId != null
                    ? request.Event?.Destination
                    : request.Activity?.Destination ?? request.Activity?.Locality?.Destination;

            // Proverava ko je odgovoran menadžer za ovu destinaciju.
            // Ako destinacija ima svog menadžera – samo on može da obradi zahtev.
            // Ako je ostala bez menadžera (izuzetna situacija) – odgovornost preuzima
            // menadžer geografski najbliže destinacije, NE admin.
            if (roleName == "Manager")
            {
                var isResponsible = destination != null &&
                    await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, reviewedByUserId);
                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new UnauthorizedAccessException("Admins do not directly process deletion requests. The responsible manager handles them.");
            }

            request.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            request.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            request.ReviewedByUserId = reviewedByUserId;
            request.ReviewedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            if (dto.Approve)
            {
                if (request.ObjectId != null)
                    _context.Objects.Remove(request.Object!);
                else if (request.EventId != null)
                    _context.Events.Remove(request.Event!);
                else if (request.ActivityId != null)
                    _context.Activities.Remove(request.Activity!);
            }

            await _context.SaveChangesAsync();

            return MapToDto(request);
        }

        private async Task<DeletionRequestDto> LoadDtoAsync(int requestId)
        {
            var request = await _context.DeletionRequests
                .Include(r => r.Object)
                .Include(r => r.Event)
                .Include(r => r.Activity)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == requestId);

            return MapToDto(request);
        }

        public async Task<DeletionRequestDto?> GetByIdForUserAsync(int id, int userId)
        {
            var request = await _context.DeletionRequests
                .Include(dr => dr.Object)
                .Include(dr => dr.Event)
                .Include(dr => dr.Activity)
                .Include(dr => dr.RequestedBy)
                .Include(dr => dr.ReviewedBy)
                .FirstOrDefaultAsync(dr => dr.Id == id && dr.RequestedByUserId == userId);

            if (request == null)
                return null;

            return MapToDto(request);
        }

        private static DeletionRequestDto MapToDto(DeletionRequest r) => new()
        {
            Id = r.Id,
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
    }
}
