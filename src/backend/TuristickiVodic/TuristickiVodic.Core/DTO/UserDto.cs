using System;

namespace TuristickiVodic.Core.DTOs
{
    public class UserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Country { get; set; }
        public string Language { get; set; }
        public bool IsVerified { get; set; }
        public bool IsActive { get; set; }
        public string RoleName { get; set; }
        public string CreatorType { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}