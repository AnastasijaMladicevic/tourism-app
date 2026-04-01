using AutoMapper;
using System;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class ImageService : IImageService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ImageService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ImageDto>> GetAllAsync()
        {
            var images = await _context.Images
                .OrderBy(i => i.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ImageDto>>(images);
        }

        public async Task<ImageDto?> GetByIdAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);

            return image == null ? null : _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto> CreateAsync(CreateImageDto dto)
        {
            ValidateSingleRelation(dto);

            var image = new Image
            {
                Url = dto.Url,
                AltText = dto.AltText,
                IsMain = dto.IsMain,
                ObjectId = dto.ObjectId,
                ActivityId = dto.ActivityId,
                EventId = dto.EventId,
                DestinationId = dto.DestinationId,
                LocationId = dto.LocationId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<ImageDto?> UpdateAsync(int id, UpdateImageDto dto)
        {
            var image = await _context.Images.FindAsync(id);

            if (image == null)
                return null;

            ValidateSingleRelation(dto);

            if (!string.IsNullOrWhiteSpace(dto.Url))
                image.Url = dto.Url;

            if (dto.AltText != null)
                image.AltText = dto.AltText;

            if (dto.IsMain.HasValue)
                image.IsMain = dto.IsMain.Value;

            if (dto.ObjectId.HasValue)
                image.ObjectId = dto.ObjectId;

            if (dto.ActivityId.HasValue)
                image.ActivityId = dto.ActivityId;

            if (dto.EventId.HasValue)
                image.EventId = dto.EventId;

            if (dto.DestinationId.HasValue)
                image.DestinationId = dto.DestinationId;

            if (dto.LocationId.HasValue)
                image.LocationId = dto.LocationId;

            await _context.SaveChangesAsync();

            return _mapper.Map<ImageDto>(image);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var image = await _context.Images.FindAsync(id);

            if (image == null)
                return false;

            _context.Images.Remove(image);
            await _context.SaveChangesAsync();

            return true;
        }

        private void ValidateSingleRelation(dynamic dto)
        {
            int count = 0;

            if (dto.ObjectId != null) count++;
            if (dto.ActivityId != null) count++;
            if (dto.EventId != null) count++;
            if (dto.DestinationId != null) count++;
            if (dto.LocationId != null) count++;

            if (count != 1)
                throw new InvalidOperationException("Image must be linked to exactly ONE entity.");
        }
    }
}
