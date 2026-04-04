using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    /// <summary>
    /// Pomoćna klasa za određivanje odgovornog menadžera destinacije.
    ///
    /// Pravilo: Destinacija se uvek kreira sa menadžerom.
    /// Ako se ipak desi izuzetna situacija da destinacija ostane bez menadžera
    /// (npr. menadžer napusti sistem), sadržaj te destinacije preuzima
    /// menadžer geografski najbliže destinacije – NE admin.
    /// </summary>
    public static class DestinationManagerHelper
    {
        /// <summary>
        /// Vraća ID menadžera koji je odgovoran za datu destinaciju.
        /// Ako destinacija ima svog menadžera, vraća njega.
        /// Ako nema, traži geografski najbližu destinaciju koja ima menadžera.
        /// Vraća null samo ako u sistemu ne postoji nijedan menadžer.
        /// </summary>
        public static async Task<int?> GetResponsibleManagerIdAsync(AppDbContext context, Destination destination)
        {
            // Normalan slučaj – destinacija ima svog menadžera
            if (destination.ManagedByUserId.HasValue)
                return destination.ManagedByUserId;

            // Izuzetna situacija – destinacija nema menadžera
            // Nalazimo geografski najbliži menadžer iz svih destinacija koje imaju menadžera
            var managedDestinations = await context.Destinations
                .Where(d => d.ManagedByUserId != null && d.Id != destination.Id)
                .ToListAsync();

            if (!managedDestinations.Any())
                return null; // Nema nijednog menadžera u sistemu

            // Ako destinacija nema geolokaciju, uzimamo prvog dostupnog menadžera
            if (destination.Geolocation == null)
                return managedDestinations.First().ManagedByUserId;

            // Nalazimo najbližu destinaciju po geografskoj udaljenosti
            var nearest = managedDestinations
                .Where(d => d.Geolocation != null)
                .OrderBy(d => destination.Geolocation.Distance(d.Geolocation!))
                .FirstOrDefault();

            // Ako nema destinacija sa geolokacijom, uzimamo prvu dostupnu
            if (nearest == null)
                nearest = managedDestinations.First();

            return nearest.ManagedByUserId;
        }

        /// <summary>
        /// Proverava da li je dati korisnik odgovoran za datu destinaciju.
        /// Koristi se za autorizaciju kod odobravanja, brisanja, itd.
        /// </summary>
        public static async Task<bool> IsResponsibleManagerAsync(AppDbContext context, Destination destination, int userId)
        {
            var responsibleManagerId = await GetResponsibleManagerIdAsync(context, destination);
            return responsibleManagerId == userId;
        }
    }
}
