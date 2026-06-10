using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Features;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class GeoBoundaryService : IGeoBoundaryService
    {
        private readonly AppDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly GeoJsonReader _geoJsonReader = new();

        // Imena regiona (drzava) prevedena na engleski radi pouzdanijeg pretrazivanja na Nominatim-u.
        private static readonly Dictionary<string, string> RegionQueries = new()
        {
            ["Crna Gora"] = "Montenegro",
            ["Srbija"] = "Serbia",
            ["Španija"] = "Spain",
            ["Italija"] = "Italy",
        };

        // Destinacije ciji naziv u bazi ne odgovara direktno nazivu na OSM-u (lokalna slova, prirodne celine i sl.).
        private static readonly Dictionary<string, string> DestinationQueries = new()
        {
            ["Kotorski zaliv"] = "Boka Kotorska, Montenegro",
            ["Durmitor"] = "Durmitor National Park, Montenegro",
            ["Cetinje"] = "Old Royal Capital Cetinje, Montenegro",
            ["Nikšić"] = "Niksic, Montenegro",
            ["Lovćen"] = "Lovcen National Park, Montenegro",
            ["Skadarsko jezero"] = "Lake Skadar, Montenegro",
            ["Kolašin"] = "Kolasin, Montenegro",
            ["Žabljak"] = "Zabljak, Montenegro",
            ["Plužine"] = "Plužine Municipality, Montenegro",
            ["Andrijevica"] = "Andrijevica Municipality, Montenegro",

            ["Beograd"] = "Belgrade, Serbia",
            ["Niš"] = "Nis, Serbia",
            ["Tara"] = "Tara National Park, Serbia",
            ["Đerdap"] = "Đerdap National Park, Serbia",
            ["Vrnjačka Banja"] = "Vrnjacka Banja, Serbia",
            ["Palić"] = "Palic, Subotica, Serbia",
            ["Uvac"] = "Uvac Special Nature Reserve, Serbia",
            ["Subotica"] = "City of Subotica, Serbia",
            ["Kopaonik"] = "Kopaonik National Park, Serbia",

            ["Sicily"] = "Sicily, Italy",
            ["Sardinija"] = "Sardinia, Italy",
            ["Lake Como"] = "Como, Italy",
        };

        // Lokaliteti ciji naziv treba pretraziti drugacije da bi Nominatim vratio poligon (ne samo tacku).
        private static readonly Dictionary<string, string> LocalityQueries = new()
        {
            ["Donji Milanovac"] = "Donji Milanovac, Serbia",
            ["Tekija"] = "Tekija, Serbia",
            ["Kelebija"] = "Kelebija, Serbia",
            ["Tuzi"] = "Tuzi, Montenegro",
            ["Perućac"] = "Perućac, Serbia",
        };

        public GeoBoundaryService(AppDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("TuristickiVodic/1.0 (boundary-import)");
        }

        public async Task<List<string>> FetchAndStoreBoundariesAsync(CancellationToken cancellationToken = default)
        {
            return await FetchAndStoreBoundariesAsync(null, cancellationToken);
        }

        public async Task<List<string>> FetchAndStoreBoundariesAsync(ISet<string>? destinationNames, CancellationToken cancellationToken = default)
        {
            var failures = new List<string>();

            var regionsQuery = _context.Regions.AsQueryable();
            if (destinationNames != null)
                regionsQuery = regionsQuery.Where(r => destinationNames.Contains(r.Name));

            var regions = await regionsQuery.ToListAsync(cancellationToken);
            foreach (var region in regions)
            {
                var query = RegionQueries.GetValueOrDefault(region.Name, region.Name);
                var geometry = await FetchBoundaryAsync(query, cancellationToken);
                if (geometry != null)
                    region.Boundary = geometry;
                else
                    failures.Add($"Region: {region.Name} ({query})");

                await Task.Delay(1100, cancellationToken);
            }

            var destinationsQuery = _context.Destinations.Include(d => d.Region).AsQueryable();
            if (destinationNames != null)
                destinationsQuery = destinationsQuery.Where(d => destinationNames.Contains(d.Name));

            var destinations = await destinationsQuery.ToListAsync(cancellationToken);

            foreach (var destination in destinations)
            {
                var query = DestinationQueries.TryGetValue(destination.Name, out var overrideQuery)
                    ? overrideQuery
                    : $"{destination.Name}, {CountryName(destination.Region.Code)}";

                var geometry = await FetchBoundaryAsync(query, cancellationToken);
                if (geometry != null)
                    destination.Boundary = geometry;
                else
                    failures.Add($"Destination: {destination.Name} ({query})");

                await Task.Delay(1100, cancellationToken);
            }

            var localitiesQuery = _context.Localities.Include(l => l.Destination).ThenInclude(d => d.Region).AsQueryable();
            if (destinationNames != null)
                localitiesQuery = localitiesQuery.Where(l => destinationNames.Contains(l.Destination.Name) || destinationNames.Contains(l.Name));

            var localities = await localitiesQuery.ToListAsync(cancellationToken);

            foreach (var locality in localities)
            {
                var query = LocalityQueries.TryGetValue(locality.Name, out var overrideQuery)
                    ? overrideQuery
                    : $"{locality.Name}, {locality.Destination.Name}, {CountryName(locality.Destination.Region.Code)}";

                var geometry = await FetchBoundaryAsync(query, cancellationToken);

                // Prihvatamo samo poligone koji sadrze postojecu geolokaciju lokaliteta - u suprotnom je
                // Nominatim vratio nepovezano mesto (npr. zgradu sa istim imenom), pa ostaje fallback na granicu destinacije.
                if (geometry is Polygon or MultiPolygon && (locality.Geolocation == null || geometry.Contains(locality.Geolocation)))
                    locality.Boundary = geometry;
                else
                    failures.Add($"Locality: {locality.Name} ({query})");

                await Task.Delay(1100, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return failures;
        }

        private async Task<Geometry?> FetchBoundaryAsync(string query, CancellationToken cancellationToken)
        {
            var url = $"https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1&limit=1&q={Uri.EscapeDataString(query)}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var featureCollection = _geoJsonReader.Read<FeatureCollection>(json);
            var geometry = featureCollection.FirstOrDefault()?.Geometry;
            if (geometry == null)
                return null;

            geometry.SRID = 4326;
            return geometry;
        }

        private static string CountryName(string regionCode) => regionCode switch
        {
            "ME" => "Montenegro",
            "RS" => "Serbia",
            "ES" => "Spain",
            "IT" => "Italy",
            _ => regionCode,
        };
    }
}
