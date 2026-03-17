# Football Players Demo App

## Klijent
Frontend aplikacija je razvijena u Angularu.
Omogucava prikaz podataka koje server salje i demonstrira komunikaciju sa backendom.
Korisnik moze da pregleda igrace, pretrazuje ih, dodaje nove, menja postojece i brise ih.

## Server
Backend deo je razvijen u .NET-u.
Komunicira sa PostgreSQL bazom i salje podatke frontendu preko REST API-ja.
Backend radi na adresi `http://localhost:5000`.

## Baza podataka
Koristi se PostgreSQL za cuvanje podataka.
U ovoj demo aplikaciji baza sadrzi tabelu `Players` sa podacima o fudbalerima.
Kolone u tabeli su:
- `Id`
- `FirstName`
- `LastName`
- `Club`
- `Position`
- `JerseyNumber`
- `Age`

## Demo aplikacija
Ova demo aplikacija demonstrira komunikaciju izmedju PostgreSQL, .NET i Angular tehnologija.
Prilikom pokretanja, frontend prikazuje listu igraca koja je sacuvana u bazi.
Aplikacija podrzava CRUD operacije nad fudbalerima:
- prikaz svih igraca
- pretraga igraca
- dodavanje igraca
- izmena podataka
- brisanje igraca

## Pokretanje

### Baza
Kreirati bazu i ucitati SQL fajl `setup.sql` koji sadrzi strukturu tabele i demo podatke.
SQL skriptu je moguce pokrenuti kroz `psql` ili pgAdmin Query Tool.

### Backend
Otvoriti backend projekat u VS Code-u ili Visual Studio-u.
Proveriti konekciju sa bazom u `appsettings.Development.json`:
- host
- port
- username
- password
- naziv baze

Pokrenuti server:
```bash
dotnet run --project backend/FootballPlayersDemo.Api
```

Swagger ce biti dostupan na:
`http://localhost:5000/swagger`

### Frontend
Instalirati dependencies:
```bash
npm install
```

Pokrenuti Angular development server:
```bash
npm start
```

Otvoriti u browseru:
`http://localhost:4200`

Frontend je podesen da komunicira sa backendom na adresi:
`http://localhost:5000/api/players`
