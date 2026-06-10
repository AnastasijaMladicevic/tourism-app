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
            ["Nikšić"] = "Niksic, Montenegro",
            ["Lovćen"] = "Lovcen National Park, Montenegro",
            ["Skadarsko jezero"] = "Lake Skadar, Montenegro",
            ["Kolašin"] = "Kolasin, Montenegro",
            ["Žabljak"] = "Zabljak, Montenegro",
            ["Plužine"] = "Pluzine, Montenegro",

            ["Beograd"] = "Belgrade, Serbia",
            ["Niš"] = "Nis, Serbia",
            ["Tara"] = "Tara National Park, Serbia",
            ["Đerdap"] = "Đerdap National Park, Serbia",
            ["Vrnjačka Banja"] = "Vrnjacka Banja, Serbia",
            ["Palić"] = "Palic, Subotica, Serbia",
            ["Uvac"] = "Uvac Special Nature Reserve, Serbia",

            ["Sicily"] = "Sicily, Italy",
            ["Sardinija"] = "Sardinia, Italy",
            ["Lake Como"] = "Como, Italy",
        };

        public GeoBoundaryService(AppDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("TuristickiVodic/1.0 (boundary-import)");
        }

        public async Task<List<string>> FetchAndStoreBoundariesAsync(CancellationToken cancellationToken = default)
        {
            var failures = new List<string>();

            var regions = await _context.Regions.ToListAsync(cancellationToken);
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

            var destinations = await _context.Destinations
                .Include(d => d.Region)
                .ToListAsync(cancellationToken);

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
