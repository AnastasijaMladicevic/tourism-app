using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    /// <summary>
    /// Pomocna klasa za odredjivanje odgovornog menadzera destinacije.
    ///
    /// Pravilo: destinacija se kreira sa menadzerom.
    /// Ako ipak ostane bez menadzera, odgovornost prelazi na menadzera
    /// geografski najblize destinacije - ne na admina.
    /// </summary>
    public static class DestinationManagerHelper
    {
        private static int? ResolveResponsibleManagerId(Destination destination, IReadOnlyCollection<Destination> allDestinations)
        {
            if (destination.ManagedByUserId.HasValue)
                return destination.ManagedByUserId;

            var managedDestinations = allDestinations
                .Where(d => d.ManagedByUserId != null && d.Id != destination.Id)
                .ToList();

            if (!managedDestinations.Any())
                return null;

            if (destination.Geolocation == null)
                return managedDestinations.First().ManagedByUserId;

            var nearest = managedDestinations
                .Where(d => d.Geolocation != null)
                .OrderBy(d => destination.Geolocation.Distance(d.Geolocation!))
                .FirstOrDefault();

            if (nearest == null)
                nearest = managedDestinations.First();

            return nearest.ManagedByUserId;
        }

        /// <summary>
        /// Vraca ID menadzera koji je odgovoran za datu destinaciju.
        /// Ako destinacija ima svog menadzera, vraca njega.
        /// Ako nema, trazi geografski najblizu destinaciju koja ima menadzera.
        /// </summary>
        public static async Task<int?> GetResponsibleManagerIdAsync(AppDbContext context, Destination destination)
        {
            var destinations = await context.Destinations.ToListAsync();
            return ResolveResponsibleManagerId(destination, destinations);
        }

        /// <summary>
        /// Vraca ID-jeve svih destinacija za koje je dati menadzer odgovoran.
        /// Pokriva i izuzetne slucajeve kada neka destinacija ostane bez menadzera.
        /// </summary>
        public static async Task<int[]> GetResponsibleDestinationIdsAsync(AppDbContext context, int userId)
        {
            var destinations = await context.Destinations.ToListAsync();

            return destinations
                .Where(destination => ResolveResponsibleManagerId(destination, destinations) == userId)
                .Select(destination => destination.Id)
                .Distinct()
                .ToArray();
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
