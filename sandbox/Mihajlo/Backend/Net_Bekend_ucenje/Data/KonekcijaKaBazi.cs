using System;
using Microsoft.EntityFrameworkCore;

using Net_Bekend_ucenje.Models;



namespace Net_Bekend_ucenje.Data
{
    public class KonekcijaKaBazi:DbContext
    {
        public KonekcijaKaBazi(DbContextOptions<KonekcijaKaBazi> options) : base(options) { }

        public DbSet<Kategorija> Kategorije { get; set; }
        public DbSet<Destinacija> Destinacije { get; set; }
        public DbSet<Recenzija> Recenzije { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            modelBuilder.Entity<Kategorija>(entity =>
            {
                entity.ToTable("kategorije");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Naziv).HasColumnName("naziv");
                entity.Property(e => e.Ikonica).HasColumnName("ikonica");
                entity.Property(e => e.Kreiran).HasColumnName("kreiran");
            });

            modelBuilder.Entity<Destinacija>(entity =>
            {
                entity.ToTable("destinacije");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Naziv).HasColumnName("naziv");
                entity.Property(e => e.Opis).HasColumnName("opis");
                entity.Property(e => e.Lokacija).HasColumnName("lokacija");
                entity.Property(e => e.Zemlja).HasColumnName("zemlja");
                entity.Property(e => e.UrlSlike).HasColumnName("url_slike");
                entity.Property(e => e.KategorijaId).HasColumnName("kategorija_id");
                entity.Property(e => e.ProsecnaOcena).HasColumnName("prosecna_ocena");
                entity.Property(e => e.BrojRecenzija).HasColumnName("broj_recenzija");
                entity.Property(e => e.Kreiran).HasColumnName("kreiran");
                entity.Property(e => e.Updejtovan).HasColumnName("updejtovan");

                entity.HasOne(d => d.Kategorija)
                      .WithMany(c => c.Destinacije)
                      .HasForeignKey(d => d.KategorijaId);
            });

            modelBuilder.Entity<Recenzija>(entity =>
            {
                entity.ToTable("recenzije");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.DestinacijaId).HasColumnName("destinacija_id");
                entity.Property(e => e.AutorNaziv).HasColumnName("autor_naziv");
                entity.Property(e => e.Ocena).HasColumnName("ocena");
                entity.Property(e => e.Komentar).HasColumnName("komentar");
                entity.Property(e => e.Kreiran).HasColumnName("kreiran");

                entity.HasOne(r => r.Destinacija)
                      .WithMany(d => d.Recenzije)
                      .HasForeignKey(r => r.DestinacijaId);
            });
        }
    }
}
