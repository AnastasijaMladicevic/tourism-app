using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IReviewService
    {
        Task<PagedResultDto<ReviewDto>> GetAllAsync(ReviewQueryDto query);
        Task<PagedResultDto<ReviewDto>> GetMineAsync(int userId, ReviewQueryDto query);
        Task<ReviewDto?> GetByIdAsync(int id, string? languageCode = null);
        Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId, string roleName);
        Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, int userId, string roleName);
        Task<ReviewDto?> RespondAsync(int id, RespondToReviewDto dto, int userId, string roleName);
        Task<ReviewDto?> UpdateResponseAsync(int id, RespondToReviewDto dto, int userId, string roleName);
        Task<ReviewDto?> DeleteResponseAsync(int id, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
