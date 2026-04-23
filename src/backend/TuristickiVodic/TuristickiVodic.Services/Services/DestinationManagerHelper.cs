using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    /// <summary>
    /// Pomocna klasa za odredjivanje odgovornog menadzera destinacije.
    /// </summary>
    public static class DestinationManagerHelper
    {
        /// <summary>
        /// Vraca ID menadzera koji je direktno odgovoran za datu destinaciju.
        /// </summary>
        public static async Task<int?> GetResponsibleManagerIdAsync(AppDbContext context, Destination destination)
        {
            if (destination.ManagedByUserId.HasValue)
                return destination.ManagedByUserId;

            return await context.Destinations
                .Where(d => d.Id == destination.Id)
                .Select(d => d.ManagedByUserId)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Vraca ID-jeve svih destinacija za koje je dati menadzer direktno odgovoran.
        /// </summary>
        public static async Task<int[]> GetResponsibleDestinationIdsAsync(AppDbContext context, int userId)
        {
            return await context.Destinations
                .Where(destination => destination.ManagedByUserId == userId)
                .Select(destination => destination.Id)
                .ToArrayAsync();
        }

        /// <summary>
        /// Proverava da li je dati korisnik odgovoran za datu destinaciju.
        /// Koristi se za autorizaciju kod odobravanja, brisanja i pregleda.
        /// </summary>
        public static async Task<bool> IsResponsibleManagerAsync(AppDbContext context, Destination destination, int userId)
        {
            var responsibleManagerId = await GetResponsibleManagerIdAsync(context, destination);
            return responsibleManagerId == userId;
        }
    }
}
