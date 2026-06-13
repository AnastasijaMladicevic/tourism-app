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
            await ApplyTranslationsAsync(items, reviews, query.LanguageCode, createMissing: false);

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
            await ApplyTranslationsAsync(items, reviews, query.LanguageCode, createMissing: true);

            return new PagedResultDto<ReviewDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ReviewDto>> GetForCreatorAsync(int creatorUserId, ReviewQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var reviewsQuery = BuildReviewsQuery()
                .Where(r => r.Object != null && r.Object.CreatedByUserId == creatorUserId);

            reviewsQuery = ApplyReviewFilters(reviewsQuery, query);
            reviewsQuery = ApplyReviewSorting(reviewsQuery, query.SortBy, query.SortOrder);

            var totalCount = await reviewsQuery.CountAsync();

            var reviews = await reviewsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var items = _mapper.Map<List<ReviewDto>>(reviews);
            await ApplyTranslationsAsync(items, reviews, query.LanguageCode, createMissing: true);

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
                .Include(r => r.Images)
                .Include(r => r.ReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null) return null;

            var dto = _mapper.Map<ReviewDto>(review);
            await ApplyTranslationsAsync(new List<ReviewDto> { dto }, new List<Review> { review }, languageCode, createMissing: true);

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
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            await CreateCreatorNewObjectReviewNotificationAsync(
                touristObject.CreatedByUserId,
                touristObject.Name,
                review.Id,
                $"/objects/{touristObject.Id}");

            await UpdateObjectRatingAsync(dto.ObjectId);

            return _mapper.Map<ReviewDto>(await LoadReviewAsync(review.Id));
        }

        // Samo vlasnik recenzije može da je menja (Rating i Text)
        private async Task CreateCreatorNewObjectReviewNotificationAsync(
            int creatorId,
            string objectName,
            int reviewId,
            string actionUrl)
        {
            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId && u.IsActive && !u.IsBlacklisted);

            if (creator == null)
                return;

            var title = "Nova recenzija na tvom objektu";
            var message = $"Objekat \"{objectName}\" je dobio novu recenziju.";

            _context.Notifications.Add(new Notification
            {
                UserId = creatorId,
                Type = NotificationType.CreatorNewObjectReview,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                ReviewId = reviewId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
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
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.Object.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only respond to reviews on your own objects.");

            if (string.IsNullOrWhiteSpace(review.Text))
                throw new InvalidOperationException("Cannot respond to a review that has no comment.");

            var isFirstResponse = string.IsNullOrWhiteSpace(review.CreatorResponse);

            review.CreatorResponse = dto.CreatorResponse;
            review.CreatorResponseAt = DateTime.UtcNow;

            if (isFirstResponse)
            {
                var title = "Stigao je odgovor na tvoju recenziju";
                var message = $"Dobio/la si odgovor na recenziju za objekat \"{review.Object.Name}\".";

                _context.Notifications.Add(new Notification
                {
                    UserId = review.UserId,
                    Type = NotificationType.ReviewReply,
                    Title = title,
                    Message = message,
                    ActionUrl = $"/object/{review.ObjectId}",
                    ReviewId = review.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

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
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return null;

            if (review.Object.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update responses on your own objects.");

            if (review.CreatorResponse == null)
                throw new InvalidOperationException("This review has no response to update. Use POST to add one.");

            review.CreatorResponse = dto.CreatorResponse;
            review.CreatorResponseAt = DateTime.UtcNow;

            var title = "Odgovor na tvoju recenziju je izmenjen";
            var message = $"Odgovor na tvoju recenziju za objekat \"{review.Object.Name}\" je ažuriran.";

            _context.Notifications.Add(new Notification
            {
                UserId = review.UserId,
                Type = NotificationType.ReviewReplyUpdated,
                Title = title,
                Message = message,
                ActionUrl = $"/object/{review.ObjectId}",
                ReviewId = review.Id,
                CreatedAt = DateTime.UtcNow
            });

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
                .Include(r => r.Object)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                return false;

            if (roleName != "Tourist")
                throw new UnauthorizedAccessException("Only tourists can delete reviews.");

            if (review.UserId != userId)
                throw new UnauthorizedAccessException("You can delete only your own reviews.");

            var objectId = review.ObjectId;
            await CreateCreatorObjectReviewDeletedNotificationAsync(
                review.Object.CreatedByUserId,
                review.Object.Name,
                objectId);

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            await UpdateObjectRatingAsync(objectId);

            return true;
        }

        private async Task CreateCreatorObjectReviewDeletedNotificationAsync(
            int creatorId,
            string objectName,
            int objectId)
        {
            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId && u.IsActive && !u.IsBlacklisted);

            if (creator == null)
                return;

            var title = "Recenzija na tvom objektu je obrisana";
            var message = $"Turista je obrisao/la recenziju za objekat \"{objectName}\".";

            _context.Notifications.Add(new Notification
            {
                UserId = creatorId,
                Type = NotificationType.CreatorObjectReviewDeleted,
                Title = title,
                Message = message,
                ActionUrl = $"/objects/{objectId}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
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
                .Include(r => r.Images)
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
                .Include(r => r.Images)
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

            if (query.ObjectId.HasValue)
            {
                reviewsQuery = reviewsQuery.Where(r => r.ObjectId == query.ObjectId.Value);
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

            if (!string.IsNullOrWhiteSpace(query.Ratings))
            {
                var allowedRatings = query.Ratings
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(value => int.TryParse(value, out var parsed) ? parsed : (int?)null)
                    .Where(value => value.HasValue && value.Value >= 1 && value.Value <= 5)
                    .Select(value => value!.Value)
                    .Distinct()
                    .ToArray();

                reviewsQuery = allowedRatings.Length == 0
                    ? reviewsQuery.Where(_ => false)
                    : reviewsQuery.Where(r => allowedRatings.Contains(r.Rating));
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

        private async Task ApplyTranslationsAsync(List<ReviewDto> items, List<Review> reviews, string? languageCode, bool createMissing)
        {
            var normalizedLanguage = LanguageHelper.Normalize(languageCode);
            if (normalizedLanguage == "sr" || items.Count == 0 || reviews.Count == 0)
                return;

            var reviewsById = reviews.ToDictionary(review => review.Id);

            if (!createMissing)
            {
                foreach (var item in items)
                {
                    if (!reviewsById.TryGetValue(item.Id, out var review))
                        continue;

                    await ApplyReviewItemTranslationsAsync(item, review, normalizedLanguage, createMissing: false);
                }
                return;
            }

            // Build a flat list of translatable fields so the slow external-translation calls
            // (cache misses) can run in parallel instead of one-by-one for every review on the page.
            var batchItems = new List<TranslationBatchItem>();
            var fieldSlots = new List<(ReviewDto Item, string Field)>();

            foreach (var item in items)
            {
                if (!reviewsById.TryGetValue(item.Id, out var review))
                    continue;

                batchItems.Add(new TranslationBatchItem("Review", review.Id, "Text", item.Text));
                fieldSlots.Add((item, "Text"));

                // Normalize null -> "" up front (matches previous TranslateOptionalFieldAsync behavior),
                // so nullable DTO fields never flip from "" to null for clients that expect a non-null string.
                item.CreatorResponse ??= string.Empty;
                if (!string.IsNullOrWhiteSpace(item.CreatorResponse))
                {
                    batchItems.Add(new TranslationBatchItem("Review", review.Id, "CreatorResponse", item.CreatorResponse));
                    fieldSlots.Add((item, "CreatorResponse"));
                }

                if (review.Object == null)
                    continue;

                if (review.Object.ObjectType != null)
                {
                    item.ObjectTypeName ??= string.Empty;
                    if (!string.IsNullOrWhiteSpace(item.ObjectTypeName))
                    {
                        batchItems.Add(new TranslationBatchItem("ObjectType", review.Object.ObjectType.Id, "Name", item.ObjectTypeName));
                        fieldSlots.Add((item, "ObjectTypeName"));
                    }
                }

                if (review.Object.Locality != null)
                {
                    item.LocalityName ??= string.Empty;
                    if (!string.IsNullOrWhiteSpace(item.LocalityName))
                    {
                        batchItems.Add(new TranslationBatchItem("Locality", review.Object.Locality.Id, "Name", item.LocalityName));
                        fieldSlots.Add((item, "LocalityName"));
                    }
                }

                var destination = review.Object.Destination ?? review.Object.Locality?.Destination;
                if (destination != null)
                {
                    item.DestinationName ??= string.Empty;
                    if (!string.IsNullOrWhiteSpace(item.DestinationName))
                    {
                        batchItems.Add(new TranslationBatchItem("Destination", destination.Id, "Name", item.DestinationName));
                        fieldSlots.Add((item, "DestinationName"));
                    }
                }
            }

            var results = await _translationService.TranslateBatchAsync(batchItems, normalizedLanguage);

            for (var i = 0; i < fieldSlots.Count; i++)
            {
                var (item, field) = fieldSlots[i];
                switch (field)
                {
                    case "Text":
                        item.Text = results[i];
                        break;
                    case "CreatorResponse":
                        item.CreatorResponse = results[i];
                        break;
                    case "ObjectTypeName":
                        item.ObjectTypeName = results[i];
                        break;
                    case "LocalityName":
                        item.LocalityName = results[i];
                        break;
                    case "DestinationName":
                        item.DestinationName = results[i];
                        break;
                }
            }
        }

        private async Task ApplyReviewItemTranslationsAsync(ReviewDto item, Review review, string normalizedLanguage, bool createMissing)
        {
            item.Text = await TranslateOptionalFieldAsync("Review", review.Id, "Text", item.Text, normalizedLanguage, createMissing);

            item.CreatorResponse = await TranslateOptionalFieldAsync(
                "Review",
                review.Id,
                "CreatorResponse",
                item.CreatorResponse,
                normalizedLanguage,
                createMissing);

            if (review.Object == null)
                return;

            if (review.Object.ObjectType != null)
            {
                item.ObjectTypeName = await TranslateOptionalFieldAsync(
                    "ObjectType",
                    review.Object.ObjectType.Id,
                    "Name",
                    item.ObjectTypeName,
                    normalizedLanguage,
                    createMissing);
            }

            if (review.Object.Locality != null)
            {
                item.LocalityName = await TranslateOptionalFieldAsync(
                    "Locality",
                    review.Object.Locality.Id,
                    "Name",
                    item.LocalityName,
                    normalizedLanguage,
                    createMissing);
            }

            var destination = review.Object.Destination ?? review.Object.Locality?.Destination;
            if (destination != null)
            {
                item.DestinationName = await TranslateOptionalFieldAsync(
                    "Destination",
                    destination.Id,
                    "Name",
                    item.DestinationName,
                    normalizedLanguage,
                    createMissing);
            }
        }

        private async Task<string> TranslateOptionalFieldAsync(
            string entityType,
            int entityId,
            string fieldName,
            string? originalText,
            string languageCode,
            bool createMissing)
        {
            if (string.IsNullOrWhiteSpace(originalText))
                return originalText ?? string.Empty;

            return await TranslateFieldAsync(entityType, entityId, fieldName, originalText, languageCode, createMissing);
        }

        private async Task<string> TranslateFieldAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode,
            bool createMissing)
        {
            return createMissing
                ? await _translationService.GetOrCreateTextAsync(entityType, entityId, fieldName, originalText, languageCode)
                : await _translationService.GetTextAsync(entityType, entityId, fieldName, originalText, languageCode);
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
