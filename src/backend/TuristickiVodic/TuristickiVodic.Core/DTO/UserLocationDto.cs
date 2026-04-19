using System;

namespace TuristickiVodic.Core.DTO
{
    public class UserLocationDto
    {
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public double? AccuracyMeters { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
