using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IDeletionRequestService
    {
        // CC podnosi zahtev za brisanje svog Approved objekta
        Task<DeletionRequestDto> CreateAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId);

        // Menadžer vidi zahteve za svoju destinaciju, Admin vidi zahteve za destinacije bez menadžera
        Task<IEnumerable<DeletionRequestDto>> GetAllAsync(int userId, string roleName);

        // Menadžer/Admin odobrava ili odbija; ako je odobren → objekat se briše
        Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName);
    }
}
