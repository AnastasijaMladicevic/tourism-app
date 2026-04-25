using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IRecommendationService
    {
        Task<List<RecommendationItemDto>> GetHomeRecommendationsAsync(int? userId, HomeRecommendationQueryDto query);
    }
}
