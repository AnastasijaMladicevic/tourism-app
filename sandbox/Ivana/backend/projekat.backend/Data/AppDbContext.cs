using Microsoft.EntityFrameworkCore;
using projekat.backend.Models;

namespace projekat.backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Student> Students { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Student>().HasData(
                new Student
                {
                    Id = 1,
                    Name = "Ana Marković",
                    Email = "ana@example.com",
                    EnrollmentDate = new DateTime(2023, 9, 1),
                    Major = "Informatika",
                    GPA = 9.5
                },
                new Student
                {
                    Id = 2,
                    Name = "Marko Đorđević",
                    Email = "marko@example.com",
                    EnrollmentDate = new DateTime(2023, 9, 1),
                    Major = "Inženjerstvo",
                    GPA = 8.2
                }
            );
        }
    }
}
