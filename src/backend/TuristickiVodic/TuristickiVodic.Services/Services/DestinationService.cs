using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services
{
    public class DestinationService : IDestinationService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public DestinationService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedResultDto<DestinationDto>> GetAllAsync(int? userId, string? role, DestinationQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var destinationsQuery = _context.Destinations
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .Where(d => d.Images.Any(i => i.IsMain))
                .AsQueryable();

            if (role != null && role == RoleType.Manager.ToString())
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.ManagedDestinationId == null)
                {
                    return new PagedResultDto<DestinationDto>
                    {
                        Items = new List<DestinationDto>(),
                        Page = query.Page,
                        PageSize = query.PageSize,
                        TotalCount = 0,
                        TotalPages = 0
                    };
                }

                destinationsQuery = destinationsQuery.Where(d => d.Id == user.ManagedDestinationId);
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                destinationsQuery = destinationsQuery.Where(d =>
                    d.DestinationType != null &&
                    d.DestinationType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                destinationsQuery = destinationsQuery.Where(d =>
                    d.Name.ToLower().Contains(search) ||
                    (d.Description != null && d.Description.ToLower().Contains(search)));
            }

            destinationsQuery = ApplyDestinationSorting(destinationsQuery, query.SortBy, query.SortOrder);

            var totalCount = await destinationsQuery.CountAsync();

            var destinations = await destinationsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<DestinationDto>>(destinations);

            return new PagedResultDto<DestinationDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<DestinationDto?> GetByIdAsync(int id, int? userId, string role)
        {
            var destination = await _context.Destinations
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return null;

            if (!destination.Images.Any(i => i.IsMain))
                return null;

            if (role == RoleType.Manager.ToString())
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.ManagedDestinationId != destination.Id)
                    throw new UnauthorizedAccessException();
            }

            return _mapper.Map<DestinationDto>(destination);
        }

        public async Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId)
        {
            var destinationTypeExists = await _context.DestinationTypes
                .AnyAsync(dt => dt.Id == dto.DestinationTypeId);

            if (!destinationTypeExists)
                throw new InvalidOperationException("Destination type not found");

            if (dto.ManagedByUserId == null)
                throw new InvalidOperationException("Destination must have a manager.");

            var manager = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == dto.ManagedByUserId.Value);

            if (manager == null)
                throw new InvalidOperationException("Manager user not found.");

            if (manager.Role?.Name != RoleType.Manager)
                throw new InvalidOperationException("The assigned user does not have the Manager role.");

            if (manager.ManagedDestinationId != null)
                throw new InvalidOperationException("This manager already manages another destination. Each manager can manage only one destination.");

            var destination = new Destination
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                Status = ContentStatus.Approved,
                DestinationTypeId = dto.DestinationTypeId,
                ManagedByUserId = dto.ManagedByUserId.Value,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();

            manager.ManagedDestinationId = destination.Id;
            await _context.SaveChangesAsync();

            var created = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(created);
        }

        // Samo Admin može da menja destinacije.
        // Promena menadžera ide kroz AssignManagerAsync - odvojeni Admin endpoint.
        public async Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName)
        {
            var destination = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return null;

            if (dto.DestinationTypeId.HasValue)
            {
                var destinationTypeExists = await _context.DestinationTypes
                    .AnyAsync(dt => dt.Id == dto.DestinationTypeId.Value);

                if (!destinationTypeExists)
                    throw new InvalidOperationException("Destination type not found");

                destination.DestinationTypeId = dto.DestinationTypeId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                destination.Name = dto.Name;

            if (dto.Description != null)
                destination.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                destination.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            destination.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(updated);
        }

        /// Samo Admin može da promeni menadžera destinacije.
        /// Novi menadžer mora da ima rolu Manager i ne sme već da vodi drugu destinaciju.
        /// Stari menadžer se oslobađa (ManagedDestinationId -> null).
        public async Task<DestinationDto?> AssignManagerAsync(int destinationId, int newManagerUserId)
        {
            var destination = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == destinationId);

            if (destination == null)
                return null;

            var newManager = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == newManagerUserId);

            if (newManager == null)
                throw new InvalidOperationException("User not found.");

            if (newManager.Role?.Name != RoleType.Manager)
                throw new InvalidOperationException("The assigned user does not have the Manager role.");

            if (newManager.ManagedDestinationId != null && newManager.ManagedDestinationId != destinationId)
                throw new InvalidOperationException("This manager already manages another destination.");

            // Oslobodi starog menadžera ako postoji
            if (destination.ManagedByUserId.HasValue && destination.ManagedByUserId != newManagerUserId)
            {
                var oldManager = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == destination.ManagedByUserId.Value);

                if (oldManager != null)
                {
                    oldManager.ManagedDestinationId = null;
                    oldManager.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Dodeli novog menadžera
            destination.ManagedByUserId = newManagerUserId;
            destination.UpdatedAt = DateTime.UtcNow;

            newManager.ManagedDestinationId = destinationId;
            newManager.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstAsync(d => d.Id == destinationId);

            return _mapper.Map<DestinationDto>(updated);
        }

        // Brisanjem destinacije kaskadno se brišu njeni lokaliteti i objekti.
        public async Task<bool> DeleteAsync(int id)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return false;

            _context.Destinations.Remove(destination);
            await _context.SaveChangesAsync();

            return true;
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        private static IQueryable<Destination> ApplyDestinationSorting(IQueryable<Destination> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(d => d.DestinationType!.Name)
                    : query.OrderBy(d => d.DestinationType!.Name);
            }

            if (sortByValue == "createdat")
            {
                return isDesc
                    ? query.OrderByDescending(d => d.CreatedAt)
                    : query.OrderBy(d => d.CreatedAt);
            }

            return isDesc
                ? query.OrderByDescending(d => d.Name)
                : query.OrderBy(d => d.Name);
        }
    }
}
