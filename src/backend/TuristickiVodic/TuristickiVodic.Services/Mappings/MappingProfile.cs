using AutoMapper;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Services.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name.ToString()));

            CreateMap<CreateUserDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.RoleId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestinationId, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestination, opt => opt.Ignore())
                .ForMember(dest => dest.IsVerified, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.VerificationToken, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.ResetToken, opt => opt.Ignore())
                .ForMember(dest => dest.ResetTokenExpiry, opt => opt.Ignore())
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
                .ForMember(dest => dest.CreatedDestinations, opt => opt.Ignore());

            CreateMap<UpdateUserDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.RoleId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestinationId, opt => opt.Ignore())
                .ForMember(dest => dest.ManagedDestination, opt => opt.Ignore())
                .ForMember(dest => dest.IsVerified, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationToken, opt => opt.Ignore())
                .ForMember(dest => dest.VerificationTokenExpiry, opt => opt.Ignore())
                .ForMember(dest => dest.ResetToken, opt => opt.Ignore())
                .ForMember(dest => dest.ResetTokenExpiry, opt => opt.Ignore())
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
                .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));

            CreateMap<Location, LocationDto>()
                .ForMember(dest => dest.DestinationName, opt => opt.MapFrom(src => src.Destination.Name))
                .ForMember(dest => dest.LocationTypeName, opt => opt.MapFrom(src => src.LocationType.Name))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null));

            CreateMap<Destination, DestinationDto>()
                .ForMember(dest => dest.DestinationTypeName, opt => opt.MapFrom(src => src.DestinationType.Name))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.X : (double?)null))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Geolocation != null ? src.Geolocation.Y : (double?)null))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));
        }
    }
}