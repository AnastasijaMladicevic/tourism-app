using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class ReviewImageService : IReviewImageService
    {
        private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;

        public ReviewImageService(AppDbContext context, IMapper mapper, IWebHostEnvironment environment)
        {
            _context = context;
            _mapper = mapper;
            _environment = environment;
        }

        public async Task<List<ReviewImageDto>> GetForReviewAsync(int reviewId)
        {
            var reviewExists = await _context.Reviews.AnyAsync(r => r.Id == reviewId);
            if (!reviewExists)
            {
                throw new KeyNotFoundException($"Review with id {reviewId} not found.");
            }

            var images = await _context.ReviewImages
                .AsNoTracking()
                .Where(ri => ri.ReviewId == reviewId)
                .OrderBy(ri => ri.Id)
                .ToListAsync();

            return _mapper.Map<List<ReviewImageDto>>(images);
        }

        public async Task<List<ReviewImageDto>> AddAsync(int reviewId, IEnumerable<IFormFile> files, int userId, string roleName)
        {
            if (roleName != "Tourist")
            {
                throw new UnauthorizedAccessException("Only tourists can add review images.");
            }

            var review = await _context.Reviews
                .Include(r => r.Images)
                .FirstOrDefaultAsync(r => r.Id == reviewId);

            if (review == null)
            {
                throw new KeyNotFoundException($"Review with id {reviewId} not found.");
            }

            if (review.UserId != userId)
            {
                throw new UnauthorizedAccessException("You can add images only to your own review.");
            }

            var fileList = files?.Where(f => f != null && f.Length > 0).ToList() ?? [];
            if (fileList.Count == 0)
            {
                throw new InvalidOperationException("At least one image file is required.");
            }

            if (fileList.Count > 5)
            {
                throw new InvalidOperationException("You can upload at most 5 images per request.");
            }

            if (review.Images.Count + fileList.Count > 5)
            {
                throw new InvalidOperationException("A review can have at most 5 images.");
            }

            var root = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var reviewFolder = Path.Combine(root, "images", "reviews");
            Directory.CreateDirectory(reviewFolder);

            var createdImages = new List<ReviewImage>(fileList.Count);

            foreach (var file in fileList)
            {
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(extension))
                {
                    throw new InvalidOperationException("Only .jpg, .jpeg, .png and .webp files are allowed.");
                }

                var fileName = $"review_{reviewId}_{Guid.NewGuid():N}{extension}";
                var filePath = Path.Combine(reviewFolder, fileName);

                await using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                createdImages.Add(new ReviewImage
                {
                    ReviewId = reviewId,
                    Url = $"/images/reviews/{fileName}",
                    AltText = review.ObjectId > 0 ? $"Review image for object {review.ObjectId}" : "Review image",
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.ReviewImages.AddRange(createdImages);
            await _context.SaveChangesAsync();

            return _mapper.Map<List<ReviewImageDto>>(createdImages);
        }
    }
}
