using Microsoft.AspNetCore.Mvc;
using Net_Bekend_ucenje.Models;
using Net_Bekend_ucenje.Services;

namespace Net_Bekend_ucenje.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecenzijeController: ControllerBase
{
    private readonly RecenzijeServis _servis;

    public RecenzijeController(RecenzijeServis servis)
    {
        _servis = servis;
    }
    [HttpGet("destinacija/{destinacijaId}")]
    public async Task<ActionResult<List<Recenzija>>> VratiPoDestinaciji(Guid destinacijaId)
    {
        var recenzije = await _servis.VratiPoDestinaciji(destinacijaId);
        return Ok(recenzije);
    }


    [HttpPost]
    public async Task<ActionResult<Recenzija>> Dodaj([FromBody] Recenzija recenzija)
    {
        if (recenzija.Ocena < 1 || recenzija.Ocena > 5)
            return BadRequest("Ocena mora biti između 1 i 5.");

        if (string.IsNullOrWhiteSpace(recenzija.AutorNaziv))
            return BadRequest("Ime autora je obavezno.");

        var novaRecenzija = await _servis.Dodaj(recenzija);
        return CreatedAtAction(nameof(VratiPoDestinaciji),
            new { destinacijaId = novaRecenzija.DestinacijaId },
            novaRecenzija);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Obrisi(Guid id)
    {
        var uspelo = await _servis.Obrisi(id);

        if (!uspelo)
            return NotFound($"Recenzija sa ID-em {id} nije pronađena.");

        return NoContent();
    }
}