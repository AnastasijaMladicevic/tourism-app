using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IDeletionRequestService
    {
        // CC podnosi zahtev za brisanje svog Approved objekta
        Task<DeletionRequestDto> CreateForObjectAsync(int objectId, CreateDeletionRequestDto dto, int requestedByUserId);

        // CC podnosi zahtev za brisanje svog Approved eventa
        Task<DeletionRequestDto> CreateForEventAsync(int eventId, CreateDeletionRequestDto dto, int requestedByUserId);

        // CC podnosi zahtev za brisanje svoje Approved aktivnosti
        Task<DeletionRequestDto> CreateForActivityAsync(int activityId, CreateDeletionRequestDto dto, int requestedByUserId);

        // Menadzer vidi zahteve za svoju destinaciju
        Task<PagedResultDto<DeletionRequestDto>> GetAllAsync(int userId, string roleName, DeletionRequestQueryDto query);

        // Menadzer odobrava ili odbija; ako je odobren, sadrzaj se brise
        Task<DeletionRequestDto?> ReviewAsync(int requestId, ApproveDeletionRequestDto dto, int reviewedByUserId, string roleName);

        Task<PagedResultDto<DeletionRequestDto>> GetByUserIdAsync(int userId, DeletionRequestQueryDto query);
        Task<DeletionRequestDto?> GetByIdAsync(int id);
        Task<DeletionRequestDto?> GetByIdForUserAsync(int id, int userId);
    }
}
