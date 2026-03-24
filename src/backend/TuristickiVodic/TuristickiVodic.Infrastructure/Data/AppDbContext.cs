using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Grad> Gradovi { get; set; }
        public DbSet<Uloga> Uloge { get; set; }
        public DbSet<Korisnik> Korisnici { get; set; }
        public DbSet<Destinacija> Destinacije { get; set; }
        public DbSet<TipDestinacije> TipoviDestinacija { get; set; }
        public DbSet<Objekat> Objekti { get; set; }
        public DbSet<TipObjekta> TipoviObjekata { get; set; }
        public DbSet<Aktivnost> Aktivnosti { get; set; }
        public DbSet<TipAktivnosti> TipoviAktivnosti { get; set; }
        public DbSet<Dogadjaj> Dogadjaji { get; set; }
        public DbSet<TipDogadjaja> TipoviDogadjaja { get; set; }
        public DbSet<Recenzija> Recenzije { get; set; }
        public DbSet<Favorit> Favoriti { get; set; }
        public DbSet<KorisnikLog> KorisnikLog { get; set; }
        public DbSet<KorisnikAktivnost> KorisnikAktivnosti { get; set; }
        public DbSet<Slika> Slike { get; set; }
        public DbSet<Anketa> Ankete { get; set; }
        public DbSet<Ruta> Rute { get; set; }
        public DbSet<RutaTacka> RutaTacke { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Default schema
            modelBuilder.HasDefaultSchema("public");

            // Grad
            modelBuilder.Entity<Grad>()
                .Property(g => g.Naziv)
                .HasMaxLength(150);
            modelBuilder.Entity<Grad>().ToTable("gradovi");

            // Uloga
            modelBuilder.Entity<Uloga>().ToTable("uloge");

            // Korisnik
            modelBuilder.Entity<Korisnik>()
                .HasIndex(k => k.Email)
                .IsUnique();
            modelBuilder.Entity<Korisnik>()
                .HasOne(k => k.Uloga)
                .WithMany(u => u.Korisnici)
                .HasForeignKey(k => k.IdUloge)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Korisnik>().ToTable("korisnici");

            // Destinacija
            modelBuilder.Entity<Destinacija>()
                .HasOne(d => d.Grad)
                .WithMany(g => g.Destinacije)
                .HasForeignKey(d => d.IdGrada)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Destinacija>().ToTable("destinacije");

            // Objekat
            modelBuilder.Entity<Objekat>()
                .HasOne(o => o.Destinacija)
                .WithMany(d => d.Objekti)
                .HasForeignKey(o => o.IdDestinacije)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Objekat>().ToTable("objekti");

            // Tipovi
            modelBuilder.Entity<TipDestinacije>().ToTable("tipovi_destinacija");
            modelBuilder.Entity<TipObjekta>().ToTable("tipovi_objekata");
            modelBuilder.Entity<TipAktivnosti>().ToTable("tipovi_aktivnosti");
            modelBuilder.Entity<TipDogadjaja>().ToTable("tipovi_dogadjaja");

            // Aktivnosti i Dogadjaji
            modelBuilder.Entity<Aktivnost>().ToTable("aktivnosti");
            modelBuilder.Entity<Dogadjaj>().ToTable("dogadjaji");

            // Recenzije
            modelBuilder.Entity<Recenzija>()
                .HasOne(r => r.Korisnik)
                .WithMany(k => k.Recenzije)
                .HasForeignKey(r => r.IdKorisnika)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Recenzija>()
                .HasOne(r => r.Objekat)
                .WithMany(o => o.Recenzije)
                .HasForeignKey(r => r.IdObjekta)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Recenzija>()
                .HasIndex(r => new { r.IdKorisnika, r.IdObjekta })
                .IsUnique();
            modelBuilder.Entity<Recenzija>().ToTable("recenzije");

            // Favoriti
            modelBuilder.Entity<Favorit>()
                .HasOne(f => f.Korisnik)
                .WithMany(k => k.Favoriti)
                .HasForeignKey(f => f.IdKorisnika)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Favorit>()
                .HasOne(f => f.Objekat)
                .WithMany(o => o.Favoriti)
                .HasForeignKey(f => f.IdObjekta)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Favorit>()
                .HasOne(f => f.Ruta)
                .WithMany(r => r.Favoriti)
                .HasForeignKey(f => f.IdRute)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Favorit>()
                .HasOne(f => f.Dogadjaj)
                .WithMany(d => d.Favoriti)
                .HasForeignKey(f => f.IdDogadjaja)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Favorit>().ToTable("favoriti");

            // Log i aktivnosti korisnika
            modelBuilder.Entity<KorisnikLog>().ToTable("korisnik_log");
            modelBuilder.Entity<KorisnikAktivnost>().ToTable("korisnik_aktivnosti");

            // Slike i Ankete
            modelBuilder.Entity<Slika>().ToTable("slike");
            modelBuilder.Entity<Anketa>().ToTable("ankete");

            // Rute i tacke
            modelBuilder.Entity<Ruta>().ToTable("rute");
            modelBuilder.Entity<RutaTacka>()
                .HasOne(rt => rt.Ruta)
                .WithMany(r => r.RutaTacke)
                .HasForeignKey(rt => rt.IdRute)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<RutaTacka>()
                .HasIndex(rt => new { rt.IdRute, rt.Redosled })
                .IsUnique();
            modelBuilder.Entity<RutaTacka>().ToTable("ruta_tacke");
        }
    }
}