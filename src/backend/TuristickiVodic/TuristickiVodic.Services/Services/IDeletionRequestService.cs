using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IDeletionRequestService
    {
        // CC podnosi zahtev za brisanje svog Approved objekta
        Task<DeletionRequestDto> CreateForObjectAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId);

        // CC podnosi zahtev za brisanje svog Approved eventa
        Task<DeletionRequestDto> CreateForEventAsync(int eventId, CreateDeletionRequestDto dto, int requestedByUserId);

        // Menadžer vidi zahteve za svoju destinaciju, Admin vidi zahteve za destinacije bez menadžera
        Task<IEnumerable<DeletionRequestDto>> GetAllAsync(int userId, string roleName);

        // Menadžer/Admin odobrava ili odbija; ako je odobren → objekat/event se briše
        Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName);
    }
}
