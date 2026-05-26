using System;

namespace TuristickiVodic.Core.DTO
{
    public class UserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Country { get; set; }
        public string Language { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public bool IsActive { get; set; }
        public bool IsBanned { get; set; }
        public string? BanReason { get; set; }
        public DateTime? BanExpiresAtUtc { get; set; }
        public DateTime? BannedAtUtc { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public bool IsTwoFactorEnabled { get; set; }
        public DateTime DateOfBirth { get; set; }
        public int? PreferredRegionId { get; set; }
        public string? PreferredRegionName { get; set; }
        public string? PreferredRegionCode { get; set; }
        public bool HasRequestedCreatorRole { get; set; }
        public string CreatorRoleRequestStatus { get; set; } = string.Empty;
        public string? AdminAppLoginUrl { get; set; }
        public string? PublicAppHomeUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool HasActiveSession { get; set; }
        public DateTime? ActiveSessionExpiresAtUtc { get; set; }
        public UserEditLockDto? EditLock { get; set; }
        public int FavoritesCount { get; set; }
        public int PlansCount { get; set; }
        public int ReviewsCount { get; set; }
    }
}
