using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace TuristickiVodic.Services.Services
{
    public class TouristObjectService : ITouristObjectService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public TouristObjectService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedResultDto<TouristObjectDto>> GetAllAsync(TouristObjectQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var objectsQuery = _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.IsActive)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.ObjectType != null &&
                    o.ObjectType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    ((o.Destination != null && o.Destination.Name.ToLower().Contains(destination)) ||
                     (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Locality))
            {
                var locality = query.Locality.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.Locality != null &&
                    o.Locality.Name.ToLower().Contains(locality));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination) && !string.IsNullOrWhiteSpace(query.Locality))
            {
                var destination = query.Destination.Trim().ToLower();
                var locality = query.Locality.Trim().ToLower();

                var localityEntity = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstOrDefaultAsync(l => l.Name.ToLower().Contains(locality));

                if (localityEntity != null &&
                    localityEntity.Destination != null &&
                    !localityEntity.Destination.Name.ToLower().Contains(destination))
                {
                    throw new InvalidOperationException("The selected locality does not belong to the selected destination.");
                }
            }

            if (query.RegionId.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    (o.Destination != null && o.Destination.RegionId == query.RegionId.Value) ||
                    (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);

            var requestedAmenities = NormalizeAmenities(query.Amenities);
            if (requestedAmenities.Length > 0)
            {
                foreach (var amenity in requestedAmenities)
                {
                    objectsQuery = objectsQuery.Where(o =>
                        o.Amenities != null &&
                        o.Amenities.Contains(amenity));
                }
            }

            if (query.MinPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value >= query.MinPrice.Value);
            }

            if (query.MaxPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value <= query.MaxPrice.Value);
            }

            if (query.MinRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.AverageRating >= query.MinRating.Value);
            }

            if (query.MaxRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.AverageRating <= query.MaxRating.Value);
            }

            int totalCount;
            List<TouristObject> items;

            if (search != null)
            {
                var searchedObjects = ApplyObjectSearch(await objectsQuery.ToListAsync(), search);
                totalCount = searchedObjects.Count;
                items = searchedObjects
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToList();
            }
            else
            {
                objectsQuery = ApplyObjectSorting(objectsQuery, query.SortBy, query.SortOrder);
                totalCount = await objectsQuery.CountAsync();
                items = await objectsQuery
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToListAsync();
            }

            var mappedItems = _mapper.Map<List<TouristObjectDto>>(items);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<TouristObjectDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<TouristObjectDto>> GetNearbyAsync(NearbyTouristObjectQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var objectsQuery = _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.IsActive)
                .Where(o => o.Geolocation != null)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                objectsQuery = objectsQuery.Where(o =>
                    o.ObjectType != null &&
                    o.ObjectType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    ((o.Destination != null && o.Destination.Name.ToLower().Contains(destination)) ||
                     (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Locality))
            {
                var locality = query.Locality.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.Locality != null &&
                    o.Locality.Name.ToLower().Contains(locality));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination) && !string.IsNullOrWhiteSpace(query.Locality))
            {
                var destination = query.Destination.Trim().ToLower();
                var locality = query.Locality.Trim().ToLower();

                var localityEntity = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstOrDefaultAsync(l => l.Name.ToLower().Contains(locality));

                if (localityEntity != null &&
                    localityEntity.Destination != null &&
                    !localityEntity.Destination.Name.ToLower().Contains(destination))
                {
                    throw new InvalidOperationException("The selected locality does not belong to the selected destination.");
                }
            }

            if (query.RegionId.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    (o.Destination != null && o.Destination.RegionId == query.RegionId.Value) ||
                    (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);

            var requestedAmenities = NormalizeAmenities(query.Amenities);
            if (requestedAmenities.Length > 0)
            {
                foreach (var amenity in requestedAmenities)
                {
                    objectsQuery = objectsQuery.Where(o =>
                        o.Amenities != null &&
                        o.Amenities.Contains(amenity));
                }
            }

            if (query.MinPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value >= query.MinPrice.Value);
            }

            if (query.MaxPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value <= query.MaxPrice.Value);
            }

            if (query.MinRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating >= query.MinRating.Value);
            }

            if (query.MaxRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating <= query.MaxRating.Value);
            }

            var objects = await objectsQuery.ToListAsync();
            if (search != null)
                objects = ApplyObjectSearchFilter(objects, search).ToList();

            var nearbyObjects = objects
                .Select(obj => new
                {
                    Object = obj,
                    DistanceMeters = CalculateDistanceMeters(
                        query.Latitude,
                        query.Longitude,
                        obj.Geolocation!.Y,
                        obj.Geolocation.X)
                })
                .Where(x => x.DistanceMeters <= query.RadiusMeters)
                .ToList();

            var isDesc = string.Equals(query.SortOrder?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            nearbyObjects = isDesc
                ? nearbyObjects.OrderByDescending(x => x.DistanceMeters).ThenBy(x => x.Object.Name).ToList()
                : nearbyObjects.OrderBy(x => x.DistanceMeters).ThenBy(x => x.Object.Name).ToList();

            var totalCount = nearbyObjects.Count;

            var items = nearbyObjects
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x =>
                {
                    var dto = _mapper.Map<TouristObjectDto>(x.Object);
                    dto.DistanceMeters = Math.Round(x.DistanceMeters, 2);
                    return dto;
                })
                .ToList();

            await ApplyPendingDeletionRequestFlagsAsync(items);

            return new PagedResultDto<TouristObjectDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<TouristObjectDto>> GetMyAsync(int userId, TouristObjectQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var objectsQuery = _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Where(o => o.CreatedByUserId == userId)
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                objectsQuery = objectsQuery.Where(o =>
                    o.ObjectType != null &&
                    o.ObjectType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                objectsQuery = objectsQuery.Where(o =>
                    ((o.Destination != null && o.Destination.Name.ToLower().Contains(destination)) ||
                     (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Locality))
            {
                var locality = query.Locality.Trim().ToLower();
                objectsQuery = objectsQuery.Where(o =>
                    o.Locality != null &&
                    o.Locality.Name.ToLower().Contains(locality));
            }

            if (query.RegionId.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    (o.Destination != null && o.Destination.RegionId == query.RegionId.Value) ||
                    (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.RegionId == query.RegionId.Value));
            }

            objectsQuery = ApplyStatusFilter(objectsQuery, query.Status);
            var search = NormalizeSearchTerm(query.Search);

            var requestedAmenities = NormalizeAmenities(query.Amenities);
            if (requestedAmenities.Length > 0)
            {
                foreach (var amenity in requestedAmenities)
                {
                    objectsQuery = objectsQuery.Where(o =>
                        o.Amenities != null &&
                        o.Amenities.Contains(amenity));
                }
            }

            if (query.MinPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value >= query.MinPrice.Value);
            }

            if (query.MaxPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value <= query.MaxPrice.Value);
            }

            if (query.MinRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating >= query.MinRating.Value);
            }

            if (query.MaxRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating <= query.MaxRating.Value);
            }

            int totalCount;
            List<TouristObject> items;

            if (search != null)
            {
                var searchedObjects = ApplyObjectSorting(
                        ApplyObjectSearchFilter(await objectsQuery.ToListAsync(), search).AsQueryable(),
                        query.SortBy,
                        query.SortOrder)
                    .ToList();

                totalCount = searchedObjects.Count;
                items = searchedObjects
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToList();
            }
            else
            {
                objectsQuery = ApplyObjectSorting(objectsQuery, query.SortBy, query.SortOrder);
                totalCount = await objectsQuery.CountAsync();
                items = await objectsQuery
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToListAsync();
            }

            var mappedItems = _mapper.Map<List<TouristObjectDto>>(items);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<TouristObjectDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<TouristObjectDto>> GetForManagerAsync(int userId, TouristObjectQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var destinationIds = await DestinationManagerHelper.GetResponsibleDestinationIdsAsync(_context, userId);

            var objectsQuery = _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Where(o =>
                    destinationIds.Contains(o.DestinationId) ||
                    (o.Locality != null && destinationIds.Contains(o.Locality.DestinationId)))
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.ObjectType != null &&
                    o.ObjectType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    ((o.Destination != null && o.Destination.Name.ToLower().Contains(destination)) ||
                     (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (!string.IsNullOrWhiteSpace(query.Locality))
            {
                var locality = query.Locality.Trim().ToLower();

                objectsQuery = objectsQuery.Where(o =>
                    o.Locality != null &&
                    o.Locality.Name.ToLower().Contains(locality));
            }

            if (query.RegionId.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    (o.Destination != null && o.Destination.RegionId == query.RegionId.Value) ||
                    (o.Destination == null && o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.RegionId == query.RegionId.Value));
            }

            objectsQuery = ApplyStatusFilter(objectsQuery, query.Status);
            var search = NormalizeSearchTerm(query.Search);

            var requestedAmenities = NormalizeAmenities(query.Amenities);
            if (requestedAmenities.Length > 0)
            {
                foreach (var amenity in requestedAmenities)
                {
                    objectsQuery = objectsQuery.Where(o =>
                        o.Amenities != null &&
                        o.Amenities.Contains(amenity));
                }
            }

            if (query.MinPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value >= query.MinPrice.Value);
            }

            if (query.MaxPrice.HasValue)
            {
                objectsQuery = objectsQuery.Where(o =>
                    o.Price.HasValue &&
                    o.Price.Value <= query.MaxPrice.Value);
            }

            if (query.MinRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating >= query.MinRating.Value);
            }

            if (query.MaxRating.HasValue)
            {
                objectsQuery = objectsQuery.Where(o => o.AverageRating <= query.MaxRating.Value);
            }

            int totalCount;
            List<TouristObject> items;

            if (search != null)
            {
                var searchedObjects = ApplyObjectSorting(
                        ApplyObjectSearchFilter(await objectsQuery.ToListAsync(), search).AsQueryable(),
                        query.SortBy,
                        query.SortOrder)
                    .ToList();

                totalCount = searchedObjects.Count;
                items = searchedObjects
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToList();
            }
            else
            {
                objectsQuery = ApplyObjectSorting(objectsQuery, query.SortBy, query.SortOrder);
                totalCount = await objectsQuery.CountAsync();
                items = await objectsQuery
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .ToListAsync();
            }

            var mappedItems = _mapper.Map<List<TouristObjectDto>>(items);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<TouristObjectDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<TouristObjectDto?> GetByIdAsync(int id)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null)
                return null;

            if (obj.Status != ContentStatus.Approved || !obj.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<TouristObjectDto?> GetMineByIdAsync(int id, int userId)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null || obj.CreatedByUserId != userId)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<TouristObjectDto?> GetForManagerByIdAsync(int id, int userId)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null)
                return null;

            var destination = obj.Destination ?? obj.Locality?.Destination;
            if (destination == null)
                return null;

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        // Samo CC može da kreira objekte; status uvek Pending, čeka odobrenje
        // Objekat mora imati destinaciju; lokalitet je opcioni, ali ako postoji mora pripadati toj destinaciji
        public async Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName)
        {
            if ((dto.Longitude.HasValue && !dto.Latitude.HasValue) || (!dto.Longitude.HasValue && dto.Latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            Locality? locality = null;
            if (dto.LocalityId.HasValue)
            {
                locality = await _context.Localities
                    .FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);

                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (dto.DestinationId.HasValue && locality.DestinationId != dto.DestinationId.Value)
                    throw new InvalidOperationException("Selected locality does not belong to the selected destination.");

                dto.DestinationId = locality.DestinationId;
            }

            if (!dto.DestinationId.HasValue)
                throw new InvalidOperationException("Destination not found.");

            var destinationExists = await _context.Destinations
                .AnyAsync(d => d.Id == dto.DestinationId.Value);

            if (!destinationExists)
                throw new InvalidOperationException("Destination not found.");

            if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId))
                throw new InvalidOperationException("Object type not found.");

            if (dto.Price.HasValue && dto.Price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            var obj = new TouristObject
            {
                Name = dto.Name,
                Description = dto.Description,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Website = dto.Website,
                MenuUrl = NormalizeOptionalText(dto.MenuUrl),
                CuisineType = NormalizeOptionalText(dto.CuisineType),
                WorkingHours = dto.WorkingHours,
                Price = dto.Price,
                Amenities = NormalizeAmenities(dto.Amenities),
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                ObjectTypeId = dto.ObjectTypeId,
                DestinationId = dto.DestinationId.Value,
                LocalityId = dto.LocalityId,
                CreatedByUserId = userId,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Objects.Add(obj);
            await _context.SaveChangesAsync();

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Samo CC može da menja objekte, i to samo svoje
        public async Task<TouristObjectDto?> UpdateAsync(int id, UpdateTouristObjectDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update objects.");

            if (obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update your own objects.");

            if ((dto.Longitude.HasValue && !dto.Latitude.HasValue) || (!dto.Longitude.HasValue && dto.Latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            if (dto.ObjectTypeId.HasValue)
            {
                if (!await _context.ObjectTypes.AnyAsync(x => x.Id == dto.ObjectTypeId.Value))
                    throw new InvalidOperationException("Object type not found.");
                obj.ObjectTypeId = dto.ObjectTypeId.Value;
            }

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities.FirstOrDefaultAsync(l => l.Id == dto.LocalityId.Value);
                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (dto.DestinationId.HasValue && locality.DestinationId != dto.DestinationId.Value)
                    throw new InvalidOperationException("Selected locality does not belong to the selected destination.");

                obj.LocalityId = dto.LocalityId.Value;
                obj.DestinationId = locality.DestinationId;
            }
            else if (dto.DestinationId.HasValue)
            {
                if (!await _context.Destinations.AnyAsync(d => d.Id == dto.DestinationId.Value))
                    throw new InvalidOperationException("Destination not found.");

                obj.DestinationId = dto.DestinationId.Value;
            }

            if (dto.DestinationId.HasValue && !dto.LocalityId.HasValue && obj.LocalityId.HasValue)
            {
                var currentLocality = await _context.Localities.FirstOrDefaultAsync(l => l.Id == obj.LocalityId.Value);
                if (currentLocality != null && currentLocality.DestinationId != obj.DestinationId)
                    obj.LocalityId = null;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) obj.Name = dto.Name;
            if (dto.Description != null) obj.Description = dto.Description;
            if (dto.Address != null) obj.Address = dto.Address;
            if (dto.PhoneNumber != null) obj.PhoneNumber = dto.PhoneNumber;
            if (dto.Website != null) obj.Website = dto.Website;
            if (dto.MenuUrl != null) obj.MenuUrl = NormalizeOptionalText(dto.MenuUrl);
            if (dto.CuisineType != null) obj.CuisineType = NormalizeOptionalText(dto.CuisineType);
            if (dto.WorkingHours != null) obj.WorkingHours = dto.WorkingHours;

            if (dto.Price.HasValue)
            {
                if (dto.Price.Value < 0)
                    throw new InvalidOperationException("Price cannot be negative.");

                obj.Price = dto.Price.Value;
            }

            if (dto.Amenities != null)
                obj.Amenities = NormalizeAmenities(dto.Amenities);

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                obj.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Menadžer odobrava/odbija objekte u svojoj destinaciji
        // Ako destinacija nema Menadžera, odobrava Admin
        public async Task<TouristObjectDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var obj = await LoadObjectAsync(id);
            if (obj == null) return null;

            if (dto.Approve)
            {
                var hasMainImage = await _context.Images
                    .AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);

                if (!hasMainImage)
                    throw new InvalidOperationException("Object must have a main image before approval.");
            }

            if (obj.Status != ContentStatus.Pending)
                throw new InvalidOperationException("Only pending objects can be approved or rejected.");

            var destination = obj.Destination ?? obj.Locality?.Destination;

            // Proverava ko je odgovoran menadžer za ovu destinaciju.
            // Ako destinacija ima svog menadžera – samo on može da odobri.
            // Ako je ostala bez menadžera (izuzetna situacija) – odgovornost preuzima
            // menadžer geografski najbliže destinacije, NE admin.
            if (roleName == "Manager")
            {
                var isResponsible = destination != null &&
                    await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new UnauthorizedAccessException("Admins do not directly approve tourist objects. The responsible manager handles approvals.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only the responsible manager can approve objects.");
            }

            obj.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            obj.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            obj.ApprovedByUserId = userId;
            obj.ApprovedAt = DateTime.UtcNow;
            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var obj = await _context.Objects
                .Include(o => o.Reviews)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (obj == null) return false;

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can delete objects directly.");

            if (obj.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own objects.");

            if (obj.Status == ContentStatus.Approved)
                throw new InvalidOperationException("Cannot delete an approved object directly. Submit a deletion request.");

            // Recenzije se brišu zajedno sa objektom (cascade)
            if (obj.Reviews != null && obj.Reviews.Any())
                _context.Reviews.RemoveRange(obj.Reviews);

            _context.Objects.Remove(obj);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<TouristObject> LoadObjectAsync(int id)
        {
            return await _context.Objects
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .AsSplitQuery()
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue) return null;
            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        public async Task<TouristObjectDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName)
        {
            var obj = await _context.Objects
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (obj == null)
                return null;

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only managers can change object visibility.");

            if (obj.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved objects can have visibility changed.");

            var destination = obj.Destination ?? obj.Locality?.Destination;
            if (destination == null)
                throw new InvalidOperationException("Cannot determine destination for this object.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            obj.IsActive = isActive;
            obj.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        public async Task<PagedResultDto<TouristObjectDto>> SearchAsync(TouristObjectQueryDto query)
        {
            return await GetAllAsync(query);
        }

        private static IQueryable<TouristObject> ApplyStatusFilter(IQueryable<TouristObject> query, string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return query;

            if (!Enum.TryParse<ContentStatus>(status.Trim(), true, out var parsedStatus))
                return query.Where(_ => false);

            return query.Where(o => o.Status == parsedStatus);
        }

        private static string? NormalizeSearchTerm(string? search)
        {
            return string.IsNullOrWhiteSpace(search)
                ? null
                : search.Trim().ToLower();
        }

        private static List<TouristObject> ApplyObjectSearch(IEnumerable<TouristObject> objects, string search)
        {
            return ApplyObjectSearchFilter(objects, search)
                .OrderBy(o => GetObjectSearchRank(o, search))
                .ThenBy(o => o.Name)
                .ToList();
        }

        private static IEnumerable<TouristObject> ApplyObjectSearchFilter(IEnumerable<TouristObject> objects, string search)
        {
            return objects.Where(o => MatchesObjectSearch(o, search));
        }

        private static bool MatchesObjectSearch(TouristObject obj, string search)
        {
            return obj.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (obj.ObjectType != null &&
                    obj.ObjectType.Name.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrWhiteSpace(obj.Description) &&
                    obj.Description.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (obj.Amenities != null &&
                    obj.Amenities.Any(a => a.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        private static int GetObjectSearchRank(TouristObject obj, string search)
        {
            if (obj.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                return 0;

            if (obj.ObjectType != null &&
                obj.ObjectType.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                return 1;

            if (!string.IsNullOrWhiteSpace(obj.Description) &&
                obj.Description.Contains(search, StringComparison.OrdinalIgnoreCase))
                return 2;

            if (obj.Amenities != null &&
                obj.Amenities.Any(a => a.Contains(search, StringComparison.OrdinalIgnoreCase)))
                return 3;

            return 4;
        }

        private static IQueryable<TouristObject> ApplyObjectSorting(IQueryable<TouristObject> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.ObjectType!.Name)
                    : query.OrderBy(o => o.ObjectType!.Name);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Destination != null ? o.Destination.Name : string.Empty)
                    : query.OrderBy(o => o.Destination != null ? o.Destination.Name : string.Empty);
            }

            if (sortByValue == "locality")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Locality != null ? o.Locality.Name : string.Empty)
                    : query.OrderBy(o => o.Locality != null ? o.Locality.Name : string.Empty);
            }

            if (sortByValue == "rating" || sortByValue == "averagerating")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.AverageRating)
                    : query.OrderBy(o => o.AverageRating);
            }

            if (sortByValue == "reviewcount")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.ReviewCount)
                    : query.OrderBy(o => o.ReviewCount);
            }

            if (sortByValue == "price")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Price ?? decimal.MinValue)
                    : query.OrderBy(o => o.Price ?? decimal.MaxValue);
            }

            if (sortByValue == "status")
            {
                return isDesc
                    ? query.OrderByDescending(o => o.Status)
                    : query.OrderBy(o => o.Status);
            }

            return isDesc
                ? query.OrderByDescending(o => o.Name)
                : query.OrderBy(o => o.Name);
        }

        private static string[] NormalizeAmenities(string[]? amenities)
        {
            if (amenities == null)
                return Array.Empty<string>();

            return amenities
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Select(a => a.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static double CalculateDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
        {
            const double earthRadiusMeters = 6371000d;

            var deltaLatitude = DegreesToRadians(latitude2 - latitude1);
            var deltaLongitude = DegreesToRadians(longitude2 - longitude1);
            var normalizedLatitude1 = DegreesToRadians(latitude1);
            var normalizedLatitude2 = DegreesToRadians(latitude2);

            var a =
                Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2) +
                Math.Cos(normalizedLatitude1) * Math.Cos(normalizedLatitude2) *
                Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private async Task ApplyPendingDeletionRequestFlagsAsync(List<TouristObjectDto> items)
        {
            if (items.Count == 0)
                return;

            var objectIds = items.Select(x => x.Id).Distinct().ToList();

            var pendingIds = await _context.DeletionRequests
                .AsNoTracking()
                .Where(dr => dr.ObjectId.HasValue
                    && objectIds.Contains(dr.ObjectId.Value)
                    && dr.Status == ContentStatus.Pending)
                .Select(dr => dr.ObjectId!.Value)
                .Distinct()
                .ToListAsync();

            var pendingIdSet = pendingIds.ToHashSet();

            foreach (var item in items)
            {
                item.HasPendingDeletionRequest = pendingIdSet.Contains(item.Id);
            }
        }

        private Task ApplyPendingDeletionRequestFlagsAsync(TouristObjectDto item)
        {
            return ApplyPendingDeletionRequestFlagsAsync(new List<TouristObjectDto> { item });
        }

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;
    }
}
