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

        public async Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId)
        {
            var userExists = await _context.Users.AnyAsync(x => x.Id == userId);
            if (!userExists)
                throw new InvalidOperationException("User not found.");

            var objectExists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId);
            if (!objectExists)
                throw new InvalidOperationException("Object not found.");

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

            var created = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == review.Id);

            return _mapper.Map<ReviewDto>(created);
        }

        public async Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, int userId, string roleName)
        {
            var review = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (roleName != "Admin" && review.UserId != userId)
                throw new UnauthorizedAccessException("You can update only your own reviews.");

            if (dto.Rating.HasValue)
                review.Rating = dto.Rating.Value;

            if (!string.IsNullOrWhiteSpace(dto.Text))
                review.Text = dto.Text;

            await _context.SaveChangesAsync();
            await UpdateObjectRatingAsync(review.ObjectId);

            var updated = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Object)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == review.Id);

            return _mapper.Map<ReviewDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return false;

            if (roleName != "Admin" && review.UserId != userId)
                throw new UnauthorizedAccessException("You can delete only your own reviews.");

            var objectId = review.ObjectId;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            await UpdateObjectRatingAsync(objectId);

            return true;
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

            if (ratings.Count == 0)
            {
                touristObject.AverageRating = 0;
            }
            else
            {
                touristObject.AverageRating = Math.Round((decimal)ratings.Average(), 2);
            }

            await _context.SaveChangesAsync();
        }
    }
}