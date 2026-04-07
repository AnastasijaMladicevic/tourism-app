using AutoMapper;
using Microsoft.EntityFrameworkCore;
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
            var image = new Image
            {
                Url = dto.Url,
                AltText = dto.AltText,
                IsMain = dto.IsMain,
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

            if (!string.IsNullOrWhiteSpace(dto.Url))
                image.Url = dto.Url;

            if (dto.AltText != null)
                image.AltText = dto.AltText;

            if (dto.IsMain.HasValue)
                image.IsMain = dto.IsMain.Value;

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
    }
}
