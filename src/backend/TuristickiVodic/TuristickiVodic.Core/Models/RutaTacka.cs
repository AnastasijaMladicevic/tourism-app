using NetTopologySuite.Geometries;
using System.Drawing;

namespace TuristickiVodic.Core.Models;

public class RutaTacka
{
    public int Id { get; set; }
    public int IdRute { get; set; }
    public short Redosled { get; set; }
    public Point Geolokacija { get; set; } = null!;
    public string? NazivTacke { get; set; }
    public DateTime Kreirano { get; set; }

    public Ruta Ruta { get; set; } = null!;
}