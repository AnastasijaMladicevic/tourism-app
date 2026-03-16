using Microsoft.EntityFrameworkCore;
using Net_Bekend_ucenje.Data;
using Net_Bekend_ucenje.Models;

namespace Net_Bekend_ucenje.Services;

public class RecenzijeServis
{
    private readonly KonekcijaKaBazi _db;

    public RecenzijeServis(KonekcijaKaBazi db)
    {
        _db = db;
    }


    public async Task<List<Recenzija>> VratiPoDestinaciji(Guid destinacijaId)
    {
        return await _db.Recenzije
            .Where(r => r.DestinacijaId == destinacijaId)
            .OrderByDescending(r => r.Kreiran)
            .ToListAsync();
    }

    public async Task<Recenzija> Dodaj(Recenzija recenzija)
    {
        recenzija.Id = Guid.NewGuid();
        recenzija.Kreiran = DateTime.UtcNow;

        _db.Recenzije.Add(recenzija);
        await _db.SaveChangesAsync();

        return recenzija;
    }

    public async Task<bool> Obrisi(Guid id)
    {
        var recenzija = await _db.Recenzije.FindAsync(id);

        if (recenzija == null)
            return false;

        _db.Recenzije.Remove(recenzija);
        await _db.SaveChangesAsync();

        return true;
    }
}