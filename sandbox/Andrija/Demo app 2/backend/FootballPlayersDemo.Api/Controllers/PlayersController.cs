using FootballPlayersDemo.Api.Data;
using FootballPlayersDemo.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballPlayersDemo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlayersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Player>>> GetAll([FromQuery] string? search)
    {
        var query = _context.Players.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLower();
            query = query.Where(p =>
                p.FirstName.ToLower().Contains(normalized) ||
                p.LastName.ToLower().Contains(normalized) ||
                p.Club.ToLower().Contains(normalized) ||
                p.Position.ToLower().Contains(normalized));
        }

        var players = await query
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .ToListAsync();

        return Ok(players);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Player>> GetById(int id)
    {
        var player = await _context.Players.FindAsync(id);

        if (player is null)
        {
            return NotFound();
        }

        return Ok(player);
    }

    [HttpPost]
    public async Task<ActionResult<Player>> Create(Player player)
    {
        _context.Players.Add(player);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = player.Id }, player);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Player player)
    {
        if (id != player.Id)
        {
            return BadRequest("ID iz rute i objekta se ne poklapaju.");
        }

        var existingPlayer = await _context.Players.FindAsync(id);
        if (existingPlayer is null)
        {
            return NotFound();
        }

        existingPlayer.FirstName = player.FirstName;
        existingPlayer.LastName = player.LastName;
        existingPlayer.Club = player.Club;
        existingPlayer.Position = player.Position;
        existingPlayer.JerseyNumber = player.JerseyNumber;
        existingPlayer.Age = player.Age;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var player = await _context.Players.FindAsync(id);
        if (player is null)
        {
            return NotFound();
        }

        _context.Players.Remove(player);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
