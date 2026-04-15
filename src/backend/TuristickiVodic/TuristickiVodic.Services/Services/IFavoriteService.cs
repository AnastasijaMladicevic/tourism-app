using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IFavoriteService
    {
        Task<PagedResultDto<FavoriteDto>> GetMyFavoritesAsync(int userId, FavoriteQueryDto query);
        Task<FavoriteDto> AddAsync(CreateFavoriteDto dto, int userId);
        Task<bool> RemoveAsync(int id, int userId);
    }
}
