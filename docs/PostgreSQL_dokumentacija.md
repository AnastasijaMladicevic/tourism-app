# PostgreSQL Dokumentacija

> **PostgreSQL** je mocan, open-source relacioni sistem za upravljanje bazama podataka (RDBMS) koji se koristi kao osnova za cuvanje i pretragu podataka u projektu.
> Odabran zbog svojih naprednih mogucnosti za rad sa geografskim podacima putem **PostGIS** ekstenzije.

---

## Sadrzaj

1. [Zasto PostgreSQL?](#zasto-postgresql)
2. [Instalacija PostgreSQL-a](#instalacija-postgresql-a)
3. [Instalacija PostGIS-a](#instalacija-postgis-a)
4. [Rad u pgAdmin alatu](#rad-u-pgadmin-alatu)
5. [Primer SQL upita](#primer-sql-upita)
6. [Integracija sa .NET backendom](#integracija-sa-net-backendom)
7. [Konfiguracija konekcije](#konfiguracija-konekcije)
8. [Korisni resursi](#korisni-resursi)

---

## Zasto PostgreSQL?

PostgreSQL je odlican izbor za potrebe ovog projekta iz vise razloga:

| Razlog | Opis |
|--------|------|
| **PostGIS ekstenzija** | Cuvanje i pretraga geografskih podataka — idealno za mape, rute i lokacije turistickih objekata |
| **Open-source** | Besplatan za koriscenje, bez licencnih troskova |
| **AI/ML podrska** | Ekstenzija `pg_vector` za skladistenje vektora slicnosti — podrska za recommendation sisteme |
| **Laka integracija** | Nezahtevna integracija sa .NET ekosistemom putem Npgsql i Entity Framework Core |
| **Agregatne funkcije** | Bogate mogucnosti za analizu i agregaciju podataka |

---

## Instalacija PostgreSQL-a

### Korak 1 — Preuzimanje

Sa zvanicnog sajta preuzeti PostgreSQL installer za svoj operativni sistem:

https://www.postgresql.org/download/

### Korak 2 — Pokretanje instalatera

Pokrenuti preuzeti installer i pratiti korake:

1. Izabrati **direktorijum** za instalaciju
2. Ostaviti sve opcije cekirane (Server, pgAdmin, Stack Builder, Command Line Tools)
3. Postaviti **lozinku za superusera** — **ovu lozinku zapamtiti za kasniji rad!**
4. Port — ostaviti podrazumevani port **`5432`**

> **Vazno:** Lozinka superusera se koristi za sve buduce konekcije na bazu. Zabelezite je na sigurnom mestu.

---

## Instalacija PostGIS-a

PostGIS se instalira putem **Stack Builder** alata koji se automatski otvara po zavrsetku PostgreSQL instalacije.

### Koraci u Stack Builder-u

1. Iz padajuceg menija izabrati **PostgreSQL na portu 5432**
2. Obavezno oznaciti opciju: **PostGIS Bundle for PostgreSQL**
3. Pratiti dugme "Next >" i instalirati potreban softver

> PostGIS dodaje podrsku za geografske tipove podataka (tacke, linije, poligone) i prostorne SQL upite putem OpenStreetMap-a i PostGIS funkcija.

---

## Rad u pgAdmin alatu

**pgAdmin** je graficki alat za upravljanje PostgreSQL bazama podataka, instaliran zajedno sa PostgreSQL-om.

### Konekcija na server

1. Pokrenuti pgAdmin
2. Kliknuti na stavku **"Servers (1)"**
3. Kliknuti na **"PostgreSQL 18"**
4. Uneti **lozinku** postavljenu tokom instalacije

### Otvaranje Query Tool-a

Nakon konekcije:

1. Kliknuti na **Query Tool Workspace** ikonicu iz menija levo
2. U prvom padajucem meniju odabrati **"PostgreSQL 18"**
3. Kliknuti na **"Connect & Open Query Tool"**

---

## Primer SQL upita

U nastavku je primer skripte sa osnovnim upitima koji se mogu sresti u daljem radu.

> **Napomena:** Da bi cela skripta davala rezultat, isprva se izvrsava samo prva linija, a nakon toga se mogu odjednom izvrsiti ostali upiti iz skripte zajedno.

```sql
-- Kreiranje baze podataka
CREATE DATABASE turisticki_vodic;

-- Kreiranje tabele ruta
CREATE TABLE rute (
    id SERIAL PRIMARY KEY,
    naziv VARCHAR(255) NOT NULL,
    tezina VARCHAR(50),
    duzina_km DECIMAL(6,2),
    opis TEXT,
    lokacija GEOMETRY(Point, 4326)
);

-- Pregled svih ruta
SELECT * FROM rute;

-- Filtriranje po tezini
SELECT naziv, duzina_km
FROM rute
WHERE tezina = 'laka'
ORDER BY duzina_km ASC;

-- PostGIS primer -- rute u radijusu od 5km
SELECT naziv
FROM rute
WHERE ST_DWithin(
    lokacija::geography,
    ST_MakePoint(21.9010, 43.3209)::geography,
    5000
);
```

> Fajlovi tipa upit (sa ekstenzijom `.sql`) se nalaze na Git-u — svi ih izvrsavaju na svom lokalu da bi imali lokalnu instancu baze podataka.

---

## Integracija sa .NET backendom

Za povezivanje PostgreSQL baze sa .NET backendom, potrebno je instalirati sledece NuGet pakete u Visual Studiju.

### Instalacija paketa

```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite
```

Ili putem NuGet Package Manager u Visual Studiju:

| Paket | Svrha |
|-------|-------|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Osnovna PostgreSQL integracija sa EF Core |
| `Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite` | Rad sa geografskim podacima (PostGIS) |

---

## Konfiguracija konekcije

### Konekcioni string

Dodati konekcioni string u fajl **`appsettings.json`**:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=turisticki_vodic;Username=postgres;Password=TVOJA_LOZINKA"
  }
}
```

> Na mestu `TVOJA_LOZINKA` uneti lozinku postavljenu tokom instalacije PostgreSQL-a.

### Registracija u Program.cs

```csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.UseNetTopologySuite()
    )
);
```

### DbContext primer

```csharp
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<Ruta> Rute { get; set; }
    public DbSet<Atrakcija> Atrakcije { get; set; }
    public DbSet<Smestaj> Smestaji { get; set; }
}
```

### Model sa geografskim podacima

```csharp
using NetTopologySuite.Geometries;

public class Ruta
{
    public int Id { get; set; }
    public string Naziv { get; set; }
    public string Tezina { get; set; }
    public decimal DuzinaKm { get; set; }
    public Point Lokacija { get; set; }
}
```

---

## Korisni resursi

| Resurs | URL |
|--------|-----|
| PostgreSQL dokumentacija | https://www.postgresql.org/docs |
| PostGIS dokumentacija | https://postgis.net/docs |
| Npgsql dokumentacija | https://www.npgsql.org/efcore |
| pgAdmin | https://www.pgadmin.org |
| OpenStreetMap | https://www.openstreetmap.org |

---

*© 2024 Interna Dokumentacija*
