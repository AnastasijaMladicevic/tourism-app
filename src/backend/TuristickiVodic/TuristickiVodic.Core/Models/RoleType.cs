namespace TuristickiVodic.Core.Models
{
    public enum RoleType
    {
        Tourist = 1,      // običan turista
        ContentCreator = 2, // može dodavati objekte i eventove
        Manager = 3,       // upravlja destinacijom
        Admin = 4          // sve može
    }
}