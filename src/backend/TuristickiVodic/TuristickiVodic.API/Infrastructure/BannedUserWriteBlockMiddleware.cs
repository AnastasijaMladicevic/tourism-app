using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.API.Infrastructure
{
    public sealed class BannedUserWriteBlockMiddleware
    {
        private readonly RequestDelegate _next;

        public BannedUserWriteBlockMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
        {
            if (!ShouldInspect(context.Request))
            {
                await _next(context);
                return;
            }

            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                await _next(context);
                return;
            }

            var user = await dbContext.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null || user.Role == null || !ShouldBlockRole(user.Role.Name))
            {
                await _next(context);
                return;
            }

            if (TryLiftExpiredBan(user))
            {
                await dbContext.SaveChangesAsync();
                await _next(context);
                return;
            }

            if (!HasActiveBan(user))
            {
                await _next(context);
                return;
            }

            context.Response.StatusCode = StatusCodes.Status423Locked;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsJsonAsync(new
            {
                message = BuildBanMessage(user),
                isBanned = true,
                banReason = user.BanReason,
                banExpiresAtUtc = user.BanExpiresAtUtc,
                roleName = user.Role.Name.ToString(),
                readOnly = true
            });
        }

        private static bool ShouldInspect(HttpRequest request)
        {
            if (!(request.HttpContext.User.Identity?.IsAuthenticated ?? false))
            {
                return false;
            }

            if (HttpMethods.IsGet(request.Method) ||
                HttpMethods.IsHead(request.Method) ||
                HttpMethods.IsOptions(request.Method))
            {
                return false;
            }

            if (request.Path.StartsWithSegments("/hubs/notifications"))
            {
                return false;
            }

            if (request.Path.Equals("/api/users/logout", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return true;
        }

        private static bool ShouldBlockRole(RoleType roleType)
            => roleType == RoleType.Tourist || roleType == RoleType.ContentCreator;

        private static bool HasActiveBan(User user)
        {
            if (!user.IsBlacklisted)
            {
                return false;
            }

            return !user.BanExpiresAtUtc.HasValue || user.BanExpiresAtUtc.Value > DateTime.UtcNow;
        }

        private static bool TryLiftExpiredBan(User user)
        {
            if (!user.IsBlacklisted || !user.BanExpiresAtUtc.HasValue || user.BanExpiresAtUtc.Value > DateTime.UtcNow)
            {
                return false;
            }

            var now = DateTime.UtcNow;
            user.IsBlacklisted = false;
            user.BanReason = null;
            user.BanExpiresAtUtc = null;
            user.BannedAtUtc = null;
            user.UpdatedAt = now;
            return true;
        }

        private static string BuildBanMessage(User user)
        {
            var reason = string.IsNullOrWhiteSpace(user.BanReason)
                ? "Krsenje pravila platforme."
                : user.BanReason.Trim();

            return user.BanExpiresAtUtc.HasValue
                ? $"Ovaj nalog je banovan do {user.BanExpiresAtUtc.Value:dd.MM.yyyy. HH:mm} UTC. Razlog: {reason}"
                : $"Ovaj nalog je trajno banovan. Razlog: {reason}";
        }
    }
}
