using Microsoft.EntityFrameworkCore;
using DemoAPI.Models;

namespace DemoAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Book> Books { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Book>().HasData(
                new Book
                {
                    Id = 1,
                    Title = "Matić",
                    Author = "Dobrica Ćosić",
                    ISBN = "978-86-421-0234-1",
                    YearPublished = 1974,
                    Genre = "Roman",
                    Publisher = "Prosveta",
                    Rating = 4.8,
                    AddedDate = new DateTime(2026, 1, 15)
                },
                new Book
                {
                    Id = 2,
                    Title = "Na Drini ćuprija",
                    Author = "Ivo Andrić",
                    ISBN = "978-86-421-0156-6",
                    YearPublished = 1945,
                    Genre = "Roman",
                    Publisher = "Društvena knjiga",
                    Rating = 4.9,
                    AddedDate = new DateTime(2026, 1, 20)
                }
            );
        }
    }
}
