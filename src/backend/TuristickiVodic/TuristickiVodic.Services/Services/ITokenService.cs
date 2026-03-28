using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Services
{
    public interface ITokenService
    {
        string GenerateToken(User user);
    }
}