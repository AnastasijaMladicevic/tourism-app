using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace TuristickiVodic.Tests.Helpers
{
    /// <summary>
    /// Kreira lažni ClaimsPrincipal koji simulira ulogovanog korisnika u testovima.
    /// </summary>
    public static class FakeUserHelper
    {
        public static ClaimsPrincipal CreateUser(int userId, string role = "Tourist", string? jti = null)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, jti ?? Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Exp,
                    DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds().ToString())
            };

            var identity = new ClaimsIdentity(claims, "TestAuthentication");
            return new ClaimsPrincipal(identity);
        }
    }
}
