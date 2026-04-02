using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class ReviewService : IReviewService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ReviewService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ReviewDto>> GetAllAsync()
        {
            var reviews = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ReviewDto>>(reviews);
        }

        public async Task<ReviewDto?> GetByIdAsync(int id)
        {
            var review = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            return review == null ? null : _mapper.Map<ReviewDto>(review);
        }

        // Samo Tourist može da piše recenziju
        public async Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId, string roleName)
        {
            if (roleName != "Tourist")
                throw new UnauthorizedAccessException("Only tourists can write reviews.");

            var touristObject = await _context.Objects.FirstOrDefaultAsync(x => x.Id == dto.ObjectId);
            if (touristObject == null)
                throw new InvalidOperationException("Object not found.");

            if (touristObject.Status != ContentStatus.Approved)
                throw new InvalidOperationException("You can only review approved objects.");

            var alreadyExists = await _context.Reviews
                .AnyAsync(r => r.UserId == userId && r.ObjectId == dto.ObjectId);

            if (alreadyExists)
                throw new InvalidOperationException("You already have a review for this object.");

            var review = new Review
            {
                UserId = userId,
                ObjectId = dto.ObjectId,
                Rating = dto.Rating,
                Text = dto.Text,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            await UpdateObjectRatingAsync(dto.ObjectId);

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // Samo vlasnik recenzije može da je menja (Rating i Text)
        public async Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, int userId, string roleName)
        {
            var review = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.UserId != userId)
                throw new UnauthorizedAccessException("You can update only your own reviews.");

            if (dto.Rating.HasValue)
                review.Rating = dto.Rating.Value;

            if (!string.IsNullOrWhiteSpace(dto.Text))
                review.Text = dto.Text;

            await _context.SaveChangesAsync();
            await UpdateObjectRatingAsync(review.ObjectId);

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // ContentCreator odgovara na recenziju za objekat koji je kreirao
        public async Task<ReviewDto?> RespondAsync(int id, RespondToReviewDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can respond to reviews.");

            var review = await _context.Reviews
                .Include(r => r.Object)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.Object.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only respond to reviews on your own objects.");

            if (string.IsNullOrWhiteSpace(review.Text))
                throw new InvalidOperationException("Cannot respond to a review that has no comment.");

            review.CreatorResponse = dto.CreatorResponse;
            review.CreatorResponseAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // ContentCreator menja svoj odgovor na recenziju
        public async Task<ReviewDto?> UpdateResponseAsync(int id, RespondToReviewDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update review responses.");

            var review = await _context.Reviews
                .Include(r => r.Object)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.Object.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update responses on your own objects.");

            if (review.CreatorResponse == null)
                throw new InvalidOperationException("This review has no response to update. Use POST to add one.");

            review.CreatorResponse = dto.CreatorResponse;
            review.CreatorResponseAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // ContentCreator briše svoj odgovor na recenziju
        public async Task<ReviewDto?> DeleteResponseAsync(int id, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can delete review responses.");

            var review = await _context.Reviews
                .Include(r => r.Object)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.Object.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete responses on your own objects.");

            if (review.CreatorResponse == null)
                throw new InvalidOperationException("This review has no response to delete.");

            review.CreatorResponse = null;
            review.CreatorResponseAt = null;

            await _context.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // Menadžer (ili Admin ako nema menadžera) odobrava/odbija recenziju
        public async Task<ReviewDto?> ApproveAsync(int id, ApproveReviewDto dto, int userId, string roleName)
        {
            var review = await _context.Reviews
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (roleName == "Manager")
            {
                // Menadžer može da odobrava samo recenzije za objekte na svojoj destinaciji
                var destinationId = review.Object?.Locality?.DestinationId ?? review.Object?.DestinationId;
                var destination = destinationId.HasValue
                    ? await _context.Destinations.FindAsync(destinationId.Value)
                    : null;

                if (destination == null || destination.ManagedByUserId != userId)
                    throw new UnauthorizedAccessException("Manager can only approve reviews for objects in their destination.");
            }
            else if (roleName != "Admin")
            {
                throw new UnauthorizedAccessException("Only managers or admins can approve reviews.");
            }

            review.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            review.ReviewedByUserId = userId;

            await _context.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return false;

            // Tourist može da briše svoju, Admin može sve
            if (roleName != "Admin" && review.UserId != userId)
                throw new UnauthorizedAccessException("You can delete only your own reviews.");

            var objectId = review.ObjectId;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            await UpdateObjectRatingAsync(objectId);

            return true;
        }

        private async Task<Review> LoadReviewAsync(int id)
        {
            return await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == id);
        }

        private async Task UpdateObjectRatingAsync(int objectId)
        {
            var touristObject = await _context.Objects.FirstOrDefaultAsync(o => o.Id == objectId);

            if (touristObject == null)
                return;

            var ratings = await _context.Reviews
                .Where(r => r.ObjectId == objectId)
                .Select(r => r.Rating)
                .ToListAsync();

            touristObject.ReviewCount = ratings.Count;
            touristObject.AverageRating = ratings.Count == 0 ? 0 : Math.Round((decimal)ratings.Average(), 2);

            await _context.SaveChangesAsync();
        }
    }
}
