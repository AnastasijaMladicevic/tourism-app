using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IAiSemanticSearchService
    {
        Task<AiSemanticSearchResponseDto> SearchAsync(
            int? userId,
            AiSemanticSearchQueryDto request,
            CancellationToken cancellationToken = default);
    }
}
