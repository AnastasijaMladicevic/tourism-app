using FootballPlayersDemo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FootballPlayersDemo.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Player> Players => Set<Player>();
}
