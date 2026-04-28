using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IAiChatService
    {
        Task<AiChatResponseDto> ChatAsync(int? userId, AiChatRequestDto request, CancellationToken cancellationToken = default);
    }
}
