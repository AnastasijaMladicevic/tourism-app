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

        public async Task<DeletionRequestDto> CreateAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId)
        {
            var obj = await _context.Objects
                .Include(o => o.Location)
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

        public async Task<IEnumerable<DeletionRequestDto>> GetAllAsync(int userId, string roleName)
        {
            var query = _context.DeletionRequests
                .Include(r => r.Object)
                    .ThenInclude(o => o.Location)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .AsQueryable();

            if (roleName == "Manager")
                query = query.Where(r => r.Object.Location.Destination.ManagedByUserId == userId);
            else if (roleName == "Admin")
                query = query.Where(r => r.Object.Location.Destination.ManagedByUserId == null);

            var requests = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
            return requests.Select(MapToDto);
        }

        public async Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName)
        {
            var request = await _context.DeletionRequests
                .Include(r => r.Object)
                    .ThenInclude(o => o.Location)
                        .ThenInclude(l => l.Destination)
                .Include(r => r.Object.Reviews)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
                return null;

            if (request.Status != ContentStatus.Pending)
                throw new InvalidOperationException("This request has already been reviewed.");

            var destination = request.Object.Location?.Destination;

            if (roleName == "Manager")
            {
                if (destination?.ManagedByUserId != reviewedByUserId)
                    throw new UnauthorizedAccessException("Manager can only review deletion requests for their destination.");
            }
            else if (roleName == "Admin")
            {
                if (destination?.ManagedByUserId != null)
                    throw new UnauthorizedAccessException("This destination has a manager. The manager must review this request.");
            }

            request.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            request.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            request.ReviewedByUserId = reviewedByUserId;
            request.ReviewedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            if (dto.Approve)
            {
                if (request.Object.Reviews.Any())
                    throw new InvalidOperationException("Cannot delete an object that has reviews.");

                _context.Objects.Remove(request.Object);
            }

            await _context.SaveChangesAsync();

            return MapToDto(request);
        }

        private async Task<DeletionRequestDto> LoadDtoAsync(int requestId)
        {
            var request = await _context.DeletionRequests
                .Include(r => r.Object)
                .Include(r => r.RequestedBy)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == requestId);

            return MapToDto(request);
        }

        private static DeletionRequestDto MapToDto(DeletionRequest r) => new()
        {
            Id = r.Id,
            ObjectId = r.ObjectId,
            ObjectName = r.Object?.Name ?? string.Empty,
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
