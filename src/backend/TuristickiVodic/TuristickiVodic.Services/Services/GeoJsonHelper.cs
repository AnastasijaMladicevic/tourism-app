using NetTopologySuite.Geometries;
using NetTopologySuite.IO;

namespace TuristickiVodic.Services.Services
{
    public static class GeoJsonHelper
    {
        private static readonly GeoJsonWriter Writer = new();

        public static string? ToGeoJson(Geometry? geometry)
        {
            return geometry == null ? null : Writer.Write(geometry);
        }
    }
}
