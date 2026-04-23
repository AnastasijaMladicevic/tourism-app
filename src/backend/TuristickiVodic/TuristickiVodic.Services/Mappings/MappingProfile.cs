using AutoMapper;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;

using System;

namespace TuristickiVodic.Services.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // We only map from properties in this project. Disabling method mapping avoids
            // AutoMapper scanning LINQ generic helpers (for example MaxFloat on .NET 10).
            ShouldMapMethod = _ => false;

            CreateMap<User, UserDto>()
                .ForMember(dest => dest.RoleName,
                    opt => opt.MapFrom(src => src.Role != null ? src.Role.Name.ToString() : string.Empty));

            CreateMap<CreateUserDto, User>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.ProfileImageUrl, opt => opt.Ignore())
                .ForMember(dest => dest.DateOfBirth,
                    opt => opt.MapFrom(src => DateTime.SpecifyKind(src.DateOfBirth, DateTimeKind.Utc)))
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.RoleId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestinationId, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestination, opt => opt.Ignore())
                .ForMember(dest => dest.IsVerified, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.HasRequestedCreatorRole, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.VerificationToken, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.ResetToken, opt => opt.Ignore())
                .ForMember(dest => dest.ResetTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.LastKnownLocation, opt => opt.Ignore())
                .ForMember(dest => dest.LastLocationAccuracyMeters, opt => opt.Ignore())
                .ForMember(dest => dest.LastLocationUpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.RefreshToken, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
                .ForMember(dest => dest.IsBlacklisted, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Reviews, opt => opt.Ignore())
                .ForMember(dest => dest.Favorites, opt => opt.Ignore())
                .ForMember(dest => dest.UserLogs, opt => opt.Ignore())
                .ForMember(dest => dest.LocationHistory, opt => opt.Ignore())
                .ForMember(dest => dest.SentReports, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedObjects, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedEvents, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedDestinations, opt => opt.Ignore())
                .ForMember(dest => dest.EventPlannerItems, opt => opt.Ignore());

            CreateMap<UpdateUserDto, User>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Email, opt => opt.Ignore())
                .ForMember(dest => dest.DateOfBirth,
                    opt => opt.MapFrom(src => src.DateOfBirth.HasValue
                        ? DateTime.SpecifyKind(src.DateOfBirth.Value, DateTimeKind.Utc)
                        : default(DateTime?)))
                .ForMember(dest => dest.ProfileImageUrl, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.RoleId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestinationId, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestination, opt => opt.Ignore())
                .ForMember(dest => dest.IsVerified, opt => opt.Ignore())
                .ForMember(dest => dest.HasRequestedCreatorRole, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationToken, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.ResetToken, opt => opt.Ignore())
                .ForMember(dest => dest.ResetTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.LastKnownLocation, opt => opt.Ignore())
                .ForMember(dest => dest.LastLocationAccuracyMeters, opt => opt.Ignore())
                .ForMember(dest => dest.LastLocationUpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.RefreshToken, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.IsBlacklisted, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Reviews, opt => opt.Ignore())
                .ForMember(dest => dest.Favorites, opt => opt.Ignore())
                .ForMember(dest => dest.UserLogs, opt => opt.Ignore())
                .ForMember(dest => dest.LocationHistory, opt => opt.Ignore())
                .ForMember(dest => dest.SentReports, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedObjects, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedEvents, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedDestinations, opt => opt.Ignore())
                .ForMember(dest => dest.EventPlannerItems, opt => opt.Ignore())
                .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

            CreateMap<Locality, LocalityDto>()
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : string.Empty))
                .ForMember(dest => dest.LocalityTypeName,
                    opt => opt.MapFrom(src => src.LocalityType != null ? src.LocalityType.Name : string.Empty))
                .ForMember(dest => dest.DistanceMeters,
                    opt => opt.Ignore())
                .ForMember(dest => dest.MainImageUrl,
                    opt => opt.MapFrom(src => src.Images != null
                        ? src.Images.Where(i => i.IsMain).Select(i => i.Url).FirstOrDefault()
                        : null))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null));

            CreateMap<Destination, DestinationDto>()
                .ForMember(dest => dest.DestinationTypeName,
                    opt => opt.MapFrom(src => src.DestinationType != null ? src.DestinationType.Name : string.Empty))
                .ForMember(dest => dest.MainImageUrl,
                    opt => opt.MapFrom(src => src.Images != null
                        ? src.Images.Where(i => i.IsMain).Select(i => i.Url).FirstOrDefault()
                        : null))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Activity, ActivityDto>()
                .ForMember(dest => dest.ActivityTypeName,
                    opt => opt.MapFrom(src => src.ActivityType != null ? src.ActivityType.Name : string.Empty))
                .ForMember(dest => dest.LocalityName,
                    opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : null))
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.ObjectName,
                    opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.DistanceMeters,
                    opt => opt.Ignore())
                .ForMember(dest => dest.HasPendingDeletionRequest,
                    opt => opt.Ignore())
                .ForMember(dest => dest.MainImageUrl,
                    opt => opt.MapFrom(src => src.Images != null
                        ? src.Images.Where(i => i.IsMain).Select(i => i.Url).FirstOrDefault()
                        : null))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Event, EventDto>()
                .ForMember(dest => dest.EventTypeName,
                    opt => opt.MapFrom(src => src.EventType != null ? src.EventType.Name : string.Empty))
                .ForMember(dest => dest.LocalityName,
                    opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : null))
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.ObjectName,
                    opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.DistanceMeters,
                    opt => opt.Ignore())
                .ForMember(dest => dest.HasPendingDeletionRequest,
                    opt => opt.Ignore())
                .ForMember(dest => dest.MainImageUrl,
                    opt => opt.MapFrom(src => src.Images != null
                        ? src.Images.Where(i => i.IsMain).Select(i => i.Url).FirstOrDefault()
                        : null))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Review, ReviewDto>()
                .ForMember(dest => dest.UserFullName,
                    opt => opt.MapFrom(src =>
                        src.User != null ? (src.User.FirstName + " " + src.User.LastName) : string.Empty))
                .ForMember(dest => dest.ObjectName,
                    opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : string.Empty))
                .ForMember(dest => dest.ReviewedByFullName,
                    opt => opt.MapFrom(src =>
                        src.ReviewedBy != null ? (src.ReviewedBy.FirstName + " " + src.ReviewedBy.LastName) : null))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Review, TouristObjectReviewDto>()
                .ForMember(dest => dest.UserFullName,
                    opt => opt.MapFrom(src =>
                        src.User != null ? (src.User.FirstName + " " + src.User.LastName) : string.Empty))
                .ForMember(dest => dest.ReviewedByFullName,
                    opt => opt.MapFrom(src =>
                        src.ReviewedBy != null ? (src.ReviewedBy.FirstName + " " + src.ReviewedBy.LastName) : null))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<RoutePoint, RoutePointDto>()
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : 0))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : 0));

            CreateMap<Route, RouteDto>()
                .ForMember(dest => dest.CreatedByFullName,
                    opt => opt.MapFrom(src =>
                        src.CreatedBy != null ? (src.CreatedBy.FirstName + " " + src.CreatedBy.LastName) : null))
                .ForMember(dest => dest.RoutePoints,
                    opt => opt.MapFrom(src => src.RoutePoints != null ? src.RoutePoints : new List<RoutePoint>()));

            CreateMap<TouristObject, TouristObjectDto>()
                .ForMember(dest => dest.ObjectTypeName,
                    opt => opt.MapFrom(src => src.ObjectType != null ? src.ObjectType.Name : string.Empty))
                .ForMember(dest => dest.LocalityName,
                    opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : string.Empty))
                .ForMember(dest => dest.DistanceMeters,
                    opt => opt.Ignore())
                .ForMember(dest => dest.HasPendingDeletionRequest,
                    opt => opt.Ignore())
                .ForMember(dest => dest.MainImageUrl,
                    opt => opt.MapFrom(src => src.Images != null
                        ? src.Images.Where(i => i.IsMain).Select(i => i.Url).FirstOrDefault()
                        : null))
                .ForMember(dest => dest.DestinationId,
                    opt => opt.MapFrom(src => src.DestinationId))
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src =>
                        src.Destination != null
                            ? src.Destination.Name
                            : src.Locality != null && src.Locality.Destination != null
                                ? src.Locality.Destination.Name
                                : string.Empty))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.CuisineType,
                    opt => opt.MapFrom(src => src.CuisineType))
                .ForMember(dest => dest.Amenities,
                    opt => opt.MapFrom(src => src.Amenities ?? Array.Empty<string>()))
                .ForMember(dest => dest.Reviews,
                    opt => opt.MapFrom(src =>
                        src.Reviews != null
                            ? src.Reviews
                                .Where(r => r.Status == ContentStatus.Approved)
                                .OrderByDescending(r => r.CreatedAt)
                            : Enumerable.Empty<Review>()))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()));


            CreateMap<Favorite, FavoriteDto>()
                .ForMember(dest => dest.ObjectName,
                    opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.ActivityName,
                    opt => opt.MapFrom(src => src.Activity != null ? src.Activity.Name : null))
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.RouteName,
                    opt => opt.MapFrom(src => src.Route != null ? src.Route.Name : null))
                .ForMember(dest => dest.LocalityName,
                    opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : null));

            CreateMap<Image, ImageDto>();

            CreateMap<User, CreatorRoleRequestDto>()
                .ForMember(dest => dest.RoleName,
                    opt => opt.MapFrom(src => src.Role != null ? src.Role.Name.ToString() : string.Empty));

            CreateMap<ManagerReport, ManagerReportDto>()
                .ForMember(dest => dest.ManagerName,
                    opt => opt.MapFrom(src => src.Manager != null
                        ? src.Manager.FirstName + " " + src.Manager.LastName
                        : string.Empty))
                .ForMember(dest => dest.DestinationName,
                    opt => opt.MapFrom(src => src.Manager != null && src.Manager.ManagedDestination != null
                        ? src.Manager.ManagedDestination.Name
                        : string.Empty))
                .ForMember(dest => dest.ReportedUserName,
                    opt => opt.MapFrom(src => src.ReportedUser != null
                        ? src.ReportedUser.FirstName + " " + src.ReportedUser.LastName
                        : string.Empty))
                .ForMember(dest => dest.Status,
                    opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.ResolvedByName,
                    opt => opt.MapFrom(src => src.ResolvedBy != null
                        ? src.ResolvedBy.FirstName + " " + src.ResolvedBy.LastName
                        : null));
        }
    }
}
