using TuristickiVodic.Core.Helpers;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
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
        private readonly ITranslationService _translationService;

        public ReviewService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
        }

        public async Task<PagedResultDto<ReviewDto>> GetAllAsync(ReviewQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var reviewsQuery = ApplyReviewFilters(BuildReviewsQuery(), query);
            reviewsQuery = ApplyReviewSorting(reviewsQuery, query.SortBy, query.SortOrder);

            var totalCount = await reviewsQuery.CountAsync();

            var reviews = await reviewsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var items = _mapper.Map<List<ReviewDto>>(reviews);
            await ApplyTranslationsAsync(items, query.LanguageCode, createMissing: false);

            return new PagedResultDto<ReviewDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ReviewDto>> GetMineAsync(int userId, ReviewQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var reviewsQuery = ApplyReviewFilters(BuildReviewsQuery().Where(r => r.UserId == userId), query);
            reviewsQuery = ApplyReviewSorting(reviewsQuery, query.SortBy, query.SortOrder);

            var totalCount = await reviewsQuery.CountAsync();

            var reviews = await reviewsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var items = _mapper.Map<List<ReviewDto>>(reviews);
            await ApplyTranslationsAsync(items, query.LanguageCode, createMissing: true);

            return new PagedResultDto<ReviewDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<ReviewDto?> GetByIdAsync(int id, string? languageCode = null)
        {
            var review = await _context.Reviews
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Destination)
                        .ThenInclude(d => d.Region)
                .Include(r => r.Object)
                    .ThenInclude(o => o.ObjectType)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null) return null;

            var dto = _mapper.Map<ReviewDto>(review);
            await ApplyTranslationsAsync(new List<ReviewDto> { dto }, languageCode, createMissing: true);

            return dto;
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
                Status = ContentStatus.Approved,
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

            _context.Notifications.Add(new Notification
            {
                UserId = review.UserId,
                Type = NotificationType.ReviewReply,
                Title = "Stigao je odgovor na tvoju recenziju",
                Message = $"Dobio/la si odgovor na recenziju za objekat \"{review.Object.Name}\".",
                ActionUrl = $"/object/{review.ObjectId}",
                ReviewId = review.Id,
                CreatedAt = DateTime.UtcNow
            });

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

        // ContentCreator briše svoj odgovor na recenziju za svoj objekat
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

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var review = await _context.Reviews
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return false;

            if (roleName != "Tourist")
                throw new UnauthorizedAccessException("Only tourists can delete reviews.");

            if (review.UserId != userId)
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
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Destination)
                        .ThenInclude(d => d.Region)
                .Include(r => r.Object)
                    .ThenInclude(o => o.ObjectType)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                .Include(r => r.ReviewedBy)
                .FirstAsync(r => r.Id == id);
        }

        private async Task UpdateObjectRatingAsync(int objectId)
        {
            var touristObject = await _context.Objects.FirstOrDefaultAsync(o => o.Id == objectId);

            if (touristObject == null)
                return;

            var ratings = await _context.Reviews
                .Where(r => r.ObjectId == objectId && r.Status == ContentStatus.Approved)
                .Select(r => r.Rating)
                .ToListAsync();

            touristObject.ReviewCount = ratings.Count;
            touristObject.AverageRating = ratings.Count == 0 ? 0 : Math.Round((decimal)ratings.Average(), 2);

            await _context.SaveChangesAsync();
        }

        private IQueryable<Review> BuildReviewsQuery()
        {
            return _context.Reviews
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Destination)
                        .ThenInclude(d => d.Region)
                .Include(r => r.Object)
                    .ThenInclude(o => o.ObjectType)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                .Include(r => r.ReviewedBy)
                .AsQueryable();
        }

        private static IQueryable<Review> ApplyReviewFilters(IQueryable<Review> reviewsQuery, ReviewQueryDto query)
        {
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                reviewsQuery = reviewsQuery.Where(r =>
                    r.Text.ToLower().Contains(search) ||
                    (r.CreatorResponse != null && r.CreatorResponse.ToLower().Contains(search)) ||
                    (r.Object != null && r.Object.Name.ToLower().Contains(search)) ||
                    (r.User != null && (
                        r.User.FirstName.ToLower().Contains(search) ||
                        r.User.LastName.ToLower().Contains(search) ||
                        (r.User.FirstName + " " + r.User.LastName).ToLower().Contains(search))));
            }

            if (!string.IsNullOrWhiteSpace(query.Object))
            {
                var objectValue = query.Object.Trim().ToLower();

                reviewsQuery = reviewsQuery.Where(r =>
                    r.Object != null &&
                    r.Object.Name.ToLower().Contains(objectValue));
            }

            if (!string.IsNullOrWhiteSpace(query.User))
            {
                var userValue = query.User.Trim().ToLower();

                reviewsQuery = reviewsQuery.Where(r =>
                    r.User != null && (
                        r.User.FirstName.ToLower().Contains(userValue) ||
                        r.User.LastName.ToLower().Contains(userValue) ||
                        (r.User.FirstName + " " + r.User.LastName).ToLower().Contains(userValue)));
            }

            if (query.RegionId.HasValue)
            {
                reviewsQuery = reviewsQuery.Where(r =>
                    r.Object != null &&
                    ((r.Object.Destination != null && r.Object.Destination.RegionId == query.RegionId.Value) ||
                     (r.Object.Destination == null && r.Object.Locality != null && r.Object.Locality.Destination != null && r.Object.Locality.Destination.RegionId == query.RegionId.Value)));
            }

            if (query.MinRating.HasValue)
            {
                reviewsQuery = reviewsQuery.Where(r => r.Rating >= query.MinRating.Value);
            }

            if (query.MaxRating.HasValue)
            {
                reviewsQuery = reviewsQuery.Where(r => r.Rating <= query.MaxRating.Value);
            }

            if (query.HasResponse.HasValue)
            {
                reviewsQuery = query.HasResponse.Value
                    ? reviewsQuery.Where(r => r.CreatorResponse != null)
                    : reviewsQuery.Where(r => r.CreatorResponse == null);
            }

            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                var statusFilter = query.Status.Trim();

                if (Enum.TryParse<ContentStatus>(statusFilter, true, out var parsedStatus))
                {
                    reviewsQuery = reviewsQuery.Where(r => r.Status == parsedStatus);
                }
                else
                {
                    reviewsQuery = reviewsQuery.Where(_ => false);
                }
            }

            return reviewsQuery;
        }

        private async Task ApplyTranslationsAsync(List<ReviewDto> items, string? languageCode, bool createMissing)
        {
            var normalizedLanguage = LanguageHelper.Normalize(languageCode);
            if (normalizedLanguage == "sr" || items.Count == 0)
                return;

            foreach (var item in items)
            {
                item.Text = await TranslateFieldAsync(item.Id, "Text", item.Text, normalizedLanguage, createMissing);

                if (!string.IsNullOrWhiteSpace(item.CreatorResponse))
                {
                    item.CreatorResponse = await TranslateFieldAsync(
                        item.Id,
                        "CreatorResponse",
                        item.CreatorResponse,
                        normalizedLanguage,
                        createMissing);
                }
            }
        }

        private async Task<string> TranslateFieldAsync(int reviewId, string fieldName, string originalText, string languageCode, bool createMissing)
        {
            return createMissing
                ? await _translationService.GetOrCreateTextAsync("Review", reviewId, fieldName, originalText, languageCode)
                : await _translationService.GetTextAsync("Review", reviewId, fieldName, originalText, languageCode);
        }

        private static IQueryable<Review> ApplyReviewSorting(IQueryable<Review> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "rating")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Rating)
                    : query.OrderBy(r => r.Rating);
            }

            if (sortByValue == "user")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.User != null ? r.User.FirstName : string.Empty)
                        .ThenByDescending(r => r.User != null ? r.User.LastName : string.Empty)
                    : query.OrderBy(r => r.User != null ? r.User.FirstName : string.Empty)
                        .ThenBy(r => r.User != null ? r.User.LastName : string.Empty);
            }

            if (sortByValue == "object")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Object != null ? r.Object.Name : string.Empty)
                    : query.OrderBy(r => r.Object != null ? r.Object.Name : string.Empty);
            }

            return isDesc
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt);
        }
    }
}
