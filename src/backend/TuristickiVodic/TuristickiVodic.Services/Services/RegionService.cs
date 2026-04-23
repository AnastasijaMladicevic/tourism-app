using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class RegionService : IRegionService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public RegionService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IReadOnlyList<RegionDto>> GetAllAsync(bool includeInactive = false)
        {
            var query = _context.Regions.AsNoTracking().AsQueryable();

            if (!includeInactive)
                query = query.Where(r => r.IsActive);

            var regions = await query
                .OrderByDescending(r => r.IsDefault)
                .ThenBy(r => r.Name)
                .ToListAsync();

            return _mapper.Map<List<RegionDto>>(regions);
        }

        public async Task<RegionDto?> GetByIdAsync(int id)
        {
            var region = await _context.Regions
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);

            return region == null ? null : _mapper.Map<RegionDto>(region);
        }

        public async Task<RegionDto?> GetDefaultAsync()
        {
            var region = await _context.Regions
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderByDescending(r => r.IsDefault)
                .ThenBy(r => r.Name)
                .FirstOrDefaultAsync();

            return region == null ? null : _mapper.Map<RegionDto>(region);
        }
    }
}
