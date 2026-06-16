using TuristickiVodic.Core.Helpers;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System;
using System.Globalization;
using System.Linq;
using System.Text;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace TuristickiVodic.Services.Services
{
    public class TouristObjectService : ITouristObjectService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ITranslationService _translationService;

        public TouristObjectService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
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
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.IsActive)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsNoTracking()
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                objectsQuery = ApplyObjectTypeFilter(objectsQuery, query.Type);
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
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
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
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.IsActive)
                .Where(o => o.Geolocation != null)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsNoTracking()
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                objectsQuery = ApplyObjectTypeFilter(objectsQuery, query.Type);
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

            var pagedNearbyObjects = nearbyObjects
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToList();

            var items = pagedNearbyObjects
                .Select(x =>
                {
                    var dto = _mapper.Map<TouristObjectDto>(x.Object);
                    dto.DistanceMeters = Math.Round(x.DistanceMeters, 2);
                    return dto;
                })
                .ToList();

            await ApplyTranslationsAsync(items, pagedNearbyObjects.Select(x => x.Object).ToList(), query.Lang);
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
                .Where(o => o.CreatedByUserId == userId)
                .AsNoTracking()
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                objectsQuery = ApplyObjectTypeFilter(objectsQuery, query.Type);
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
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
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
                .Where(o =>
                    destinationIds.Contains(o.DestinationId) ||
                    (o.Locality != null && destinationIds.Contains(o.Locality.DestinationId)))
                .AsNoTracking()
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                objectsQuery = ApplyObjectTypeFilter(objectsQuery, query.Type);
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
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
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

        public async Task<TouristObjectDto?> GetByIdAsync(int id, string lang = "sr")
        {
            var obj = await LoadObjectReadOnlyAsync(id);
            if (obj == null)
                return null;

            if (obj.Status != ContentStatus.Approved || !obj.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.ObjectId == obj.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyTranslationsAsync(dto, obj, lang);
            await ApplyReviewTranslationsAsync(dto.Reviews, lang, true);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<TouristObjectDto?> GetMineByIdAsync(int id, int userId, string lang = "sr")
        {
            var obj = await LoadObjectReadOnlyAsync(id);
            if (obj == null || obj.CreatedByUserId != userId)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyTranslationsAsync(dto, obj, lang);
            await ApplyReviewTranslationsAsync(dto.Reviews, lang, true);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<TouristObjectDto?> GetForManagerByIdAsync(int id, int userId, string lang = "sr")
        {
            var obj = await LoadObjectReadOnlyAsync(id);
            if (obj == null)
                return null;

            var destination = obj.Destination ?? obj.Locality?.Destination;
            if (destination == null)
                return null;

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                return null;

            var dto = _mapper.Map<TouristObjectDto>(obj);
            await ApplyTranslationsAsync(dto, obj, lang);
            await ApplyReviewTranslationsAsync(dto.Reviews, lang, true);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        // Samo CC može da kreira objekte; status uvek Pending, čeka odobrenje
        // Objekat mora imati destinaciju; lokalitet je opcioni, ali ako postoji mora pripadati toj destinaciji
        public async Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName)
        {
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can create objects.");

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

            var objectType = await _context.ObjectTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == dto.ObjectTypeId);

            if (objectType == null)
                throw new InvalidOperationException("Object type not found.");

            if (dto.Price.HasValue && dto.Price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            var geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            await GeoBoundaryHelper.EnsurePointWithinBoundsAsync(_context, geolocation, dto.LocalityId, dto.DestinationId);

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
                Price = NormalizeObjectPrice(objectType.Name, dto.Price),
                Amenities = NormalizeAmenities(dto.Amenities),
                Geolocation = geolocation,
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
            await CreateManagerPendingContentNotificationAsync(
                obj.DestinationId,
                "Novi objekat čeka odobrenje",
                $"Objekat \"{obj.Name}\" je poslat na odobrenje u tvojoj destinaciji.",
                $"/objects/{obj.Id}");

            // Save image if provided
            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                var image = new Image
                {
                    ObjectId = obj.Id,
                    Url = dto.ImageUrl,
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Images.Add(image);
                await _context.SaveChangesAsync();
            }

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        // Samo CC može da menja objekte, i to samo svoje
        private async Task CreateManagerPendingContentNotificationAsync(
            int destinationId,
            string title,
            string message,
            string actionUrl)
        {
            var managerId = await _context.Destinations
                .AsNoTracking()
                .Where(d => d.Id == destinationId)
                .Select(d => d.ManagedByUserId)
                .FirstOrDefaultAsync();

            if (!managerId.HasValue)
                return;

            var manager = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == managerId.Value && u.IsActive && !u.IsBlacklisted);

            if (manager == null)
                return;

            _context.Notifications.Add(new Notification
            {
                UserId = managerId.Value,
                Type = NotificationType.ManagerNewPendingContent,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

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

            ObjectType? effectiveObjectType = obj.ObjectType;

            if (dto.ObjectTypeId.HasValue)
            {
                var nextObjectType = await _context.ObjectTypes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == dto.ObjectTypeId.Value);

                if (nextObjectType == null)
                    throw new InvalidOperationException("Object type not found.");

                obj.ObjectTypeId = dto.ObjectTypeId.Value;
                effectiveObjectType = nextObjectType;
            }
            else if (effectiveObjectType == null)
            {
                effectiveObjectType = await _context.ObjectTypes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == obj.ObjectTypeId);
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

            if (!ObjectTypeSupportsPrice(effectiveObjectType?.Name))
            {
                obj.Price = null;
            }

            if (dto.Amenities != null)
                obj.Amenities = NormalizeAmenities(dto.Amenities);

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                obj.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            await GeoBoundaryHelper.EnsurePointWithinBoundsAsync(_context, obj.Geolocation, obj.LocalityId, obj.DestinationId);

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
            await CreateCreatorContentReviewedNotificationAsync(
                obj.CreatedByUserId,
                dto.Approve,
                "objekat",
                obj.Name,
                $"/objects/{obj.Id}");
            if (!dto.Approve)
            {
                await CreateAdminMultipleRejectedContentNotificationsAsync(obj.CreatedByUserId, obj.Name, $"/objects/{obj.Id}");
            }

            var result = _mapper.Map<TouristObjectDto>(await LoadObjectAsync(obj.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        private async Task CreateCreatorContentReviewedNotificationAsync(
            int creatorId,
            bool approved,
            string contentType,
            string contentName,
            string actionUrl)
        {
            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId && u.IsActive && !u.IsBlacklisted);

            if (creator == null)
                return;

            var statusText = approved ? "odobren" : "odbijen";
            var title = $"Tvoj {contentType} je {statusText}";
            var message = $"Sadržaj \"{contentName}\" je {statusText}.";

            _context.Notifications.Add(new Notification
            {
                UserId = creatorId,
                Type = NotificationType.CreatorContentReviewed,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private async Task CreateAdminMultipleRejectedContentNotificationsAsync(
            int creatorId,
            string latestContentName,
            string actionUrl)
        {
            var rejectedCount =
                await _context.Objects.AsNoTracking().CountAsync(o => o.CreatedByUserId == creatorId && o.Status == ContentStatus.Rejected) +
                await _context.Events.AsNoTracking().CountAsync(e => e.CreatedByUserId == creatorId && e.Status == ContentStatus.Rejected) +
                await _context.Activities.AsNoTracking().CountAsync(a => a.CreatedByUserId == creatorId && a.Status == ContentStatus.Rejected);

            if (rejectedCount < 3)
                return;

            var creator = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == creatorId);

            if (creator == null)
                return;

            var adminIds = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role.Name == RoleType.Admin && u.IsActive && !u.IsBlacklisted)
                .Select(u => u.Id)
                .ToListAsync();

            if (adminIds.Count == 0)
                return;

            var creatorName = $"{creator.FirstName} {creator.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(creatorName))
                creatorName = creator.Email;

            var title = "ContentCreator ima više odbijenih sadržaja";
            var message = $"ContentCreator {creatorName} ima {rejectedCount} odbijenih sadržaja. Poslednje odbijeno: \"{latestContentName}\".";
            var createdAt = DateTime.UtcNow;

            var notifications = adminIds.Select(adminId => new Notification
            {
                UserId = adminId,
                Type = NotificationType.AdminCreatorMultipleRejectedContent,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                CreatedAt = createdAt
            });

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
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
                .Include(o => o.CreatedBy)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.Images)
                .AsSplitQuery()
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        private async Task<TouristObject> LoadObjectReadOnlyAsync(int id)
        {
            return await _context.Objects
                .AsNoTracking()
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.CreatedBy)
                .Include(o => o.Images)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.User)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.ReviewedBy)
                .Include(o => o.Reviews.Where(r => r.Status == ContentStatus.Approved))
                    .ThenInclude(r => r.Images)
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
            var tokens = TokenizeSearchTerms(search);
            return tokens.Length == 0
                ? objects
                : objects.Where(o => MatchesObjectSearch(o, tokens));
        }

        private static bool MatchesObjectSearch(TouristObject obj, IReadOnlyCollection<string> tokens)
        {
            return tokens.All(token => MatchesObjectSearchToken(obj, token));
        }

        private static bool MatchesObjectSearchToken(TouristObject obj, string token)
        {
            return obj.Name.Contains(token, StringComparison.OrdinalIgnoreCase) ||
                (obj.ObjectType != null &&
                    obj.ObjectType.Name.Contains(token, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrWhiteSpace(obj.CuisineType) &&
                    obj.CuisineType.Contains(token, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrWhiteSpace(obj.Description) &&
                    obj.Description.Contains(token, StringComparison.OrdinalIgnoreCase)) ||
                (obj.Amenities != null &&
                    obj.Amenities.Any(a => a.Contains(token, StringComparison.OrdinalIgnoreCase)));
        }

        private static int GetObjectSearchRank(TouristObject obj, string search)
        {
            if (obj.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                return 0;

            var tokens = TokenizeSearchTerms(search);
            if (tokens.Length == 0)
                return 5;

            if (tokens.All(token => obj.Name.Contains(token, StringComparison.OrdinalIgnoreCase)))
                return 1;

            if (obj.ObjectType != null &&
                (obj.ObjectType.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                 tokens.All(token => obj.ObjectType.Name.Contains(token, StringComparison.OrdinalIgnoreCase))))
                return 2;

            if (!string.IsNullOrWhiteSpace(obj.CuisineType) &&
                (obj.CuisineType.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                 tokens.All(token => obj.CuisineType.Contains(token, StringComparison.OrdinalIgnoreCase))))
                return 3;

            if (!string.IsNullOrWhiteSpace(obj.Description) &&
                (obj.Description.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                 tokens.All(token => obj.Description.Contains(token, StringComparison.OrdinalIgnoreCase))))
                return 4;

            if (obj.Amenities != null &&
                (obj.Amenities.Any(a => a.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                 tokens.All(token => obj.Amenities.Any(a => a.Contains(token, StringComparison.OrdinalIgnoreCase)))))
                return 5;

            return 6;
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

        private static IQueryable<TouristObject> ApplyObjectTypeFilter(IQueryable<TouristObject> query, string rawType)
        {
            var type = rawType.Trim().ToLower();

            if (type == "hrana i pice")
            {
                return query.Where(o =>
                    o.ObjectType != null && (
                        o.ObjectType.Name.ToLower().Contains("restoran") ||
                        o.ObjectType.Name.ToLower().Contains("kafana") ||
                        o.ObjectType.Name.ToLower().Contains("bar") ||
                        o.ObjectType.Name.ToLower().Contains("kafic") ||
                        o.ObjectType.Name.ToLower().Contains("kafić") ||
                        o.ObjectType.Name.ToLower().Contains("fast food") ||
                        o.ObjectType.Name.ToLower().Contains("fast_food") ||
                        o.ObjectType.Name.ToLower().Contains("vinarija") ||
                        o.ObjectType.Name.ToLower().Contains("club")));
            }

            if (type == "pumpe")
            {
                return query.Where(o =>
                    o.ObjectType != null && (
                        o.ObjectType.Name.ToLower().Contains("pumpa") ||
                        o.ObjectType.Name.ToLower().Contains("benzinska pumpa") ||
                        o.ObjectType.Name.ToLower().Contains("gas station")));
            }

            if (type == "smestaj")
            {
                return query.Where(o =>
                    o.ObjectType != null && (
                        o.ObjectType.Name.ToLower().Contains("hotel") ||
                        o.ObjectType.Name.ToLower().Contains("apartman") ||
                        o.ObjectType.Name.ToLower().Contains("apartment") ||
                        o.ObjectType.Name.ToLower().Contains("motel") ||
                        o.ObjectType.Name.ToLower().Contains("resort") ||
                        o.ObjectType.Name.ToLower().Contains("hostel") ||
                        o.ObjectType.Name.ToLower().Contains("pansion") ||
                        o.ObjectType.Name.ToLower().Contains("smestaj") ||
                        o.ObjectType.Name.ToLower().Contains("smeštaj")));
            }

            if (type == "soping" || type == "šoping")
            {
                return query.Where(o =>
                    o.ObjectType != null && (
                        o.ObjectType.Name.ToLower().Contains("shop") ||
                        o.ObjectType.Name.ToLower().Contains("shopping centar") ||
                        o.ObjectType.Name.ToLower().Contains("trzni centar") ||
                        o.ObjectType.Name.ToLower().Contains("tržni centar") ||
                        o.ObjectType.Name.ToLower().Contains("market") ||
                        o.ObjectType.Name.ToLower().Contains("prodavnica")));
            }

            if (type == "bolnice")
            {
                return query.Where(o =>
                    o.ObjectType != null && (
                        o.ObjectType.Name.ToLower().Contains("bolnica") ||
                        o.ObjectType.Name.ToLower().Contains("klinika") ||
                        o.ObjectType.Name.ToLower().Contains("poliklinika") ||
                        o.ObjectType.Name.ToLower().Contains("dom zdravlja") ||
                        o.ObjectType.Name.ToLower().Contains("hospital") ||
                        o.ObjectType.Name.ToLower().Contains("clinic")));
            }

            return query.Where(o =>
                o.ObjectType != null &&
                o.ObjectType.Name.ToLower().Contains(type));
        }

        private static decimal? NormalizeObjectPrice(string? objectTypeName, decimal? submittedPrice)
        {
            return ObjectTypeSupportsPrice(objectTypeName) ? submittedPrice : null;
        }

        private static bool ObjectTypeSupportsPrice(string? objectTypeName)
        {
            var normalizedTypeName = NormalizeObjectTypeName(objectTypeName);
            if (string.IsNullOrWhiteSpace(normalizedTypeName))
                return true;

            var nonPricedKeywords = new[]
            {
                "benzinska pumpa",
                "gas station",
                "bolnica",
                "hospital",
                "clinic",
                "biblioteka",
                "library",
                "crkva",
                "church",
                "manastir",
                "monastery",
                "spomenik",
                "monument",
                "trzni centar",
                "tržni centar",
                "shopping centar",
                "shopping center",
                "mall",
                "trznica",
                "tržnica",
                "suvenirnica",
                "igraliste",
                "igralište"
            };

            return !nonPricedKeywords.Any(keyword => normalizedTypeName.Contains(NormalizeObjectTypeName(keyword), StringComparison.Ordinal));
        }

        private static string NormalizeObjectTypeName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(char.ToLowerInvariant(character));
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC).Trim();
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

        private static string[] TokenizeSearchTerms(string search)
        {
            var tokens = search
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(token => token.Length >= 2)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            return tokens.Length > 0 ? tokens : new[] { search };
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


        private async Task ApplyTranslationsAsync(List<TouristObjectDto> dtos, List<TouristObject> objects, string? lang)
        {
            if (dtos.Count == 0 || objects.Count == 0)
                return;

            var normalizedLang = LanguageHelper.Normalize(lang);

            if (normalizedLang == "sr")
                return;

            var objectsById = objects.ToDictionary(o => o.Id);

            foreach (var dto in dtos)
            {
                if (!objectsById.TryGetValue(dto.Id, out var obj))
                    continue;

                await ApplyTranslationsAsync(dto, obj, normalizedLang, true);
            }
        }

        private async Task ApplyTranslationsAsync(TouristObjectDto dto, TouristObject obj, string? lang, bool createMissing = true)
        {
            var normalizedLang = LanguageHelper.Normalize(lang);

            if (normalizedLang == "sr")
                return;

            if (!createMissing)
            {
                dto.Description = await _translationService.GetTextAsync(
                    "Object", obj.Id, "Description", obj.Description ?? string.Empty, normalizedLang);

                if (!string.IsNullOrWhiteSpace(obj.CuisineType))
                {
                    dto.CuisineType = await _translationService.GetTextAsync(
                        "Object", obj.Id, "CuisineType", obj.CuisineType, normalizedLang);
                }

                if (obj.ObjectType != null && !string.IsNullOrWhiteSpace(obj.ObjectType.Name))
                {
                    dto.ObjectTypeName = await _translationService.GetTextAsync(
                        "ObjectType", obj.ObjectType.Id, "Name", obj.ObjectType.Name, normalizedLang);
                }

                if (obj.Amenities != null && obj.Amenities.Length > 0)
                {
                    var translatedAmenities = new string[obj.Amenities.Length];
                    for (var index = 0; index < obj.Amenities.Length; index++)
                    {
                        var value = obj.Amenities[index];
                        translatedAmenities[index] = string.IsNullOrWhiteSpace(value)
                            ? value
                            : await _translationService.GetTextAsync("Object", obj.Id, $"Amenity:{index}", value, normalizedLang);
                    }
                    dto.Amenities = translatedAmenities;
                }

                return;
            }

            var items = new List<TranslationBatchItem>
            {
                new("Object", obj.Id, "Description", obj.Description ?? string.Empty)
            };

            var cuisineTypeIndex = -1;
            if (!string.IsNullOrWhiteSpace(obj.CuisineType))
            {
                cuisineTypeIndex = items.Count;
                items.Add(new TranslationBatchItem("Object", obj.Id, "CuisineType", obj.CuisineType));
            }

            var objectTypeNameIndex = -1;
            if (obj.ObjectType != null && !string.IsNullOrWhiteSpace(obj.ObjectType.Name))
            {
                objectTypeNameIndex = items.Count;
                items.Add(new TranslationBatchItem("ObjectType", obj.ObjectType.Id, "Name", obj.ObjectType.Name));
            }

            var amenitiesStartIndex = -1;
            if (obj.Amenities != null && obj.Amenities.Length > 0)
            {
                amenitiesStartIndex = items.Count;
                for (var index = 0; index < obj.Amenities.Length; index++)
                {
                    items.Add(new TranslationBatchItem("Object", obj.Id, $"Amenity:{index}", obj.Amenities[index]));
                }
            }

            var results = await _translationService.TranslateBatchAsync(items, normalizedLang);

            dto.Description = results[0];

            if (cuisineTypeIndex >= 0)
                dto.CuisineType = results[cuisineTypeIndex];

            if (objectTypeNameIndex >= 0)
                dto.ObjectTypeName = results[objectTypeNameIndex];

            if (amenitiesStartIndex >= 0)
            {
                var translatedAmenities = new string[obj.Amenities!.Length];
                for (var index = 0; index < obj.Amenities.Length; index++)
                {
                    translatedAmenities[index] = results[amenitiesStartIndex + index];
                }
                dto.Amenities = translatedAmenities;
            }

            // Nazive realnih objekata najčešće ne prevodimo.
            // Ako ipak želiš da prevodiš Name, odkomentariši ovo:
            /*
            dto.Name = await _translationService.GetTextAsync(
                "Object",
                obj.Id,
                "Name",
                obj.Name,
                normalizedLang);
            */
        }


        private async Task ApplyReviewTranslationsAsync(List<TouristObjectReviewDto> reviews, string? lang, bool createMissing)
        {
            var normalizedLang = LanguageHelper.Normalize(lang);
            if (normalizedLang == "sr" || reviews.Count == 0)
                return;

            if (!createMissing)
            {
                foreach (var review in reviews)
                {
                    review.Text = await _translationService.GetTextAsync("Review", review.Id, "Text", review.Text, normalizedLang);

                    if (!string.IsNullOrWhiteSpace(review.CreatorResponse))
                    {
                        review.CreatorResponse = await _translationService.GetTextAsync("Review", review.Id, "CreatorResponse", review.CreatorResponse, normalizedLang);
                    }
                }
                return;
            }

            var items = new List<TranslationBatchItem>();
            var creatorResponseIndexes = new int[reviews.Count];

            for (var i = 0; i < reviews.Count; i++)
            {
                var review = reviews[i];
                items.Add(new TranslationBatchItem("Review", review.Id, "Text", review.Text));

                if (!string.IsNullOrWhiteSpace(review.CreatorResponse))
                {
                    creatorResponseIndexes[i] = items.Count;
                    items.Add(new TranslationBatchItem("Review", review.Id, "CreatorResponse", review.CreatorResponse));
                }
                else
                {
                    creatorResponseIndexes[i] = -1;
                }
            }

            var results = await _translationService.TranslateBatchAsync(items, normalizedLang);

            var textIndex = 0;
            for (var i = 0; i < reviews.Count; i++)
            {
                reviews[i].Text = results[textIndex];
                textIndex++;

                if (creatorResponseIndexes[i] >= 0)
                {
                    reviews[i].CreatorResponse = results[textIndex];
                    textIndex++;
                }
            }
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
