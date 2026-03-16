using Microsoft.EntityFrameworkCore;
using Net_Bekend_ucenje.Data;
using Net_Bekend_ucenje.Models;

namespace Net_Bekend_ucenje.Services;

public class DestinacijeServis
{
    private readonly KonekcijaKaBazi _db;

    public DestinacijeServis(KonekcijaKaBazi db)
    {
        _db = db;
    }

    public async Task<List<Destinacija>> VratiSve()
    {
        return await _db.Destinacije
            .Include(d => d.Kategorija)
            .OrderByDescending(d => d.ProsecnaOcena)
            .ToListAsync();
    }

    public async Task<Destinacija?> VratiPoId(Guid id)
    {
        return await _db.Destinacije
            .Include(d => d.Kategorija)
            .Include(d => d.Recenzije)
            .FirstOrDefaultAsync(d => d.Id == id);
    }

    public async Task<List<Destinacija>> VratiPoKategoriji(Guid kategorijaId)
    {
        return await _db.Destinacije
            .Include(d => d.Kategorija)
            .Where(d => d.KategorijaId == kategorijaId)
            .OrderByDescending(d => d.ProsecnaOcena)
            .ToListAsync();
    }
}