using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IFavoriteService
    {
        Task<IEnumerable<FavoriteDto>> GetMyFavoritesAsync(int userId);
        Task<FavoriteDto> AddAsync(CreateFavoriteDto dto, int userId);
        Task<bool> RemoveAsync(int id, int userId);
    }
}