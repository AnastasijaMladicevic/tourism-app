using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models;

public class Slika
{
    public int Id { get; set; }

    public string Url { get; set; } = string.Empty;

    public bool Glavna { get; set; } = false;

    public int? IdObjekta { get; set; }
    public int? IdDestinacije { get; set; }
    public int? IdGrada { get; set; }

    public DateTime Kreirano { get; set; }

    public Objekat? Objekat { get; set; }
    public Destinacija? Destinacija { get; set; }
    public Grad? Grad { get; set; }
}
