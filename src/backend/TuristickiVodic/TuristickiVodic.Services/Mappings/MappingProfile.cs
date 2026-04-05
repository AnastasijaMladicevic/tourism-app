using AutoMapper;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Services.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name));

            CreateMap<CreateUserDto, User>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
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
                .ForMember(dest => dest.RefreshToken, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
                .ForMember(dest => dest.IsBlacklisted, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Reviews, opt => opt.Ignore())
                .ForMember(dest => dest.Favorites, opt => opt.Ignore())
                .ForMember(dest => dest.UserLogs, opt => opt.Ignore())
                .ForMember(dest => dest.SentReports, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedObjects, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedEvents, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedDestinations, opt => opt.Ignore())
                .ForMember(dest => dest.EventPlannerItems, opt => opt.Ignore());

            CreateMap<UpdateUserDto, User>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Email, opt => opt.Ignore())
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
                .ForMember(dest => dest.RefreshToken, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.IsBlacklisted, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Reviews, opt => opt.Ignore())
                .ForMember(dest => dest.Favorites, opt => opt.Ignore())
                .ForMember(dest => dest.UserLogs, opt => opt.Ignore())
                .ForMember(dest => dest.SentReports, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedObjects, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedEvents, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedDestinations, opt => opt.Ignore())
                .ForMember(dest => dest.EventPlannerItems, opt => opt.Ignore())
                .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

            CreateMap<Locality, LocalityDto>()
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.LocalityTypeName, opt => opt.MapFrom(src => src.LocalityType != null ? src.LocalityType.Name : null))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null));

            CreateMap<Destination, DestinationDto>()
                .ForMember(dest => dest.DestinationTypeName, opt => opt.MapFrom(src => src.DestinationType != null ? src.DestinationType.Name : null))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Activity, ActivityDto>()
                .ForMember(dest => dest.ActivityTypeName, opt => opt.MapFrom(src => src.ActivityType != null ? src.ActivityType.Name : null))
                .ForMember(dest => dest.LocalityName, opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : null))
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.ObjectName, opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Event, EventDto>()
                .ForMember(dest => dest.EventTypeName, opt => opt.MapFrom(src => src.EventType != null ? src.EventType.Name : null))
                .ForMember(dest => dest.LocalityName, opt => opt.MapFrom(src => src.Locality != null ? src.Locality.Name : null))
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination != null ? src.Destination.Name : null))
                .ForMember(dest => dest.ObjectName, opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Review, ReviewDto>()
                .ForMember(dest => dest.UserFullName, opt => opt.MapFrom(src => src.User != null ? src.User.FirstName + " " + src.User.LastName : null))
                .ForMember(dest => dest.ObjectName, opt => opt.MapFrom(src => src.Object != null ? src.Object.Name : null))
                .ForMember(dest => dest.ReviewedByFullName, opt => opt.MapFrom(src => src.ReviewedBy != null ? src.ReviewedBy.FirstName + " " + src.ReviewedBy.LastName : null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<RoutePoint, RoutePointDto>()
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : 0))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : 0));

            CreateMap<Route, RouteDto>()
                .ForMember(dest => dest.CreatedByFullName, opt => opt.MapFrom(src => src.CreatedBy != null ? src.CreatedBy.FirstName + " " + src.CreatedBy.LastName : null))
                .ForMember(dest => dest.RoutePoints, opt => opt.MapFrom(src => src.RoutePoints));

            CreateMap<Image, ImageDto>()
                .ForMember(dest => dest.LocationId, opt => opt.MapFrom(src => src.LocalityId));
        }
    }
}