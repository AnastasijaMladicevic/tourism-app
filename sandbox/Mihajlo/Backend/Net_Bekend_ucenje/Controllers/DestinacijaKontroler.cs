using Microsoft.AspNetCore.Mvc;
using Net_Bekend_ucenje.Models;
using Net_Bekend_ucenje.Services;

namespace Net_Bekend_ucenje.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DestinacijeController : ControllerBase
{
    private readonly DestinacijeServis _servis;

    public DestinacijeController(DestinacijeServis servis)
    {
        _servis = servis;
    }

    [HttpGet]
    public async Task<ActionResult<List<Destinacija>>> VratiSve()
    {
        var destinacije = await _servis.VratiSve();
        return Ok(destinacije);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Destinacija>> VratiPoId(Guid id)
    {
        var destinacija = await _servis.VratiPoId(id);

        if (destinacija == null)
            return NotFound($"Destinacija sa ID-em {id} nije pronađena.");

        return Ok(destinacija);
    }

    [HttpGet("kategorija/{kategorijaId}")]
    public async Task<ActionResult<List<Destinacija>>> VratiPoKategoriji(Guid kategorijaId)
    {
        var destinacije = await _servis.VratiPoKategoriji(kategorijaId);
        return Ok(destinacije);
    }
}