using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    /// <summary>
    /// Pomocna klasa za proveru da li tacka pripada geografskoj granici lokaliteta/destinacije.
    /// </summary>
    public static class GeoBoundaryHelper
    {
        /// <summary>
        /// Baca InvalidOperationException ako tacka ne pripada granici izabranog lokaliteta
        /// (ako je definisana), odnosno granici destinacije (fallback).
        /// Ako ni lokalitet ni destinacija nemaju definisanu granicu, provera se preskace.
        /// </summary>
        public static async Task EnsurePointWithinBoundsAsync(AppDbContext context, Point? point, int? localityId, int? destinationId)
        {
            if (point == null)
                return;

            if (localityId.HasValue)
            {
                var locality = await context.Localities
                    .AsNoTracking()
                    .Where(l => l.Id == localityId.Value)
                    .Select(l => new { l.Name, l.Boundary, DestinationName = l.Destination!.Name, DestinationBoundary = l.Destination!.Boundary })
                    .FirstOrDefaultAsync();

                if (locality != null)
                {
                    if (locality.Boundary != null)
                    {
                        if (!locality.Boundary.Contains(point))
                            throw new InvalidOperationException($"The selected location is outside the geographic boundary of '{locality.Name}'.");

                        return;
                    }

                    if (locality.DestinationBoundary != null && !locality.DestinationBoundary.Contains(point))
                        throw new InvalidOperationException($"The selected location is outside the geographic boundary of '{locality.DestinationName}'.");

                    return;
                }
            }

            if (destinationId.HasValue)
            {
                var destination = await context.Destinations
                    .AsNoTracking()
                    .Where(d => d.Id == destinationId.Value)
                    .Select(d => new { d.Name, d.Boundary })
                    .FirstOrDefaultAsync();

                if (destination?.Boundary != null && !destination.Boundary.Contains(point))
                    throw new InvalidOperationException($"The selected location is outside the geographic boundary of '{destination.Name}'.");
            }
        }
    }
}
