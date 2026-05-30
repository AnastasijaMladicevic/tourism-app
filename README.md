# SpireGO

Turistička aplikacija za pregled destinacija, lokaliteta, objekata, aktivnosti, događaja, favorita, ruta i AI preporuka.

## Tehnologije

- **Backend:** ASP.NET Core 10, Entity Framework Core, PostgreSQL, PostGIS
- **Frontend:** Angular 21
- **Baza:** PostgreSQL sa PostGIS ekstenzijom
- **AI:** Ollama lokalni model (opciono, u zavisnosti od okruženja)

## Struktura projekta

```
techspire/
├── src/
│   ├── backend/
│   │   └── TuristickiVodic/
│   │       ├── TuristickiVodic.API/
│   │       ├── TuristickiVodic.Core/
│   │       ├── TuristickiVodic.Infrastructure/
│   │       ├── TuristickiVodic.Services/
│   │       └── global.json
│   ├── frontend/
│   │   ├── front-mobilna/
│   │   └── front-web/front/
│   └── baza/
│       └── seed.sql
└── README.md
```

---

## Pokretanje lokalno (development)

### Preduslovi

- .NET SDK 10.0.203
- Node.js 24+
- npm 11+
- PostgreSQL
- PostGIS

Backend verzija SDK-a je zaključana kroz `global.json`.

### 1. Baza

```sql
CREATE DATABASE turisticka_baza;
\c turisticka_baza
CREATE EXTENSION IF NOT EXISTS postgis;
```

Connection string se nalazi u `appsettings.Development.json`. Promeniti po potrebi ako se koristi drugačiji username, password ili naziv baze.

### 2. Backend

Iz foldera `src/backend/TuristickiVodic`:

```bash
dotnet restore
dotnet run --project .\TuristickiVodic.API\TuristickiVodic.API.csproj
```

Pri pokretanju backend automatski:
- primenjuje EF migracije
- proverava da li je baza prazna
- po potrebi pokreće seed iz `seed.sql`

U development okruženju su uključeni Swagger i lokalne razvojne opcije.

### 3. Frontend

**front-mobilna** — iz foldera `src/frontend/front-mobilna`:

```bash
npm install
ng serve
```

Dostupno na `http://localhost:4200`.

**front-web** — iz foldera `src/frontend/front-web/front`:

```bash
npm install
ng serve
```

Backend se pokreće na portu koji ASP.NET dodeli pri pokretanju. CORS je u development okruženju dozvoljen za lokalni Angular frontend.

### 4. AI (opciono)

Backend koristi Ollama lokalni model:

- `Ollama:Enabled = true`
- `Ollama:BaseUrl = http://127.0.0.1:11434`
- model: `llama3.2:3b`

Ako Ollama nije dostupan, AI deo pada na fallback semantičku pretragu. Za isključivanje AI-a lokalno:

```json
"Ollama": {
  "Enabled": false
}
```

---

## Deploy na server (production)

Build se radi lokalno, a na server se kopiraju već buildovani fajlovi.

Na serveru nije potreban .NET SDK — dovoljan je .NET runtime. Frontend se ne pokreće preko `ng serve`, a backend se ne pokreće kao development aplikacija.

### Produkciona konfiguracija

Vrednosti se podešavaju u `appsettings.Production.json`. Pre build-a proveriti i podesiti:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`
- `Smtp:*`
- `PublicApp:BaseUrl`
- `Cors:AllowedOrigins`
- `Ollama:Enabled`

### 1. Raspored frontova

Projekat ima dva Angular fronta:

| Front | Gde se servira | Port |
|-------|---------------|------|
| `front-mobilna` | `wwwroot` backenda | 10201 |
| `front-web` | Odvojen statički server | 10202 |


### 2. Baza na serveru

PostgreSQL na PMF serveru radi na portu **5434**.

```bash
psql -U techspire -h localhost -p 5434 -d postgres
```

```sql
CREATE DATABASE turisticka_baza;
\c turisticka_baza
CREATE EXTENSION IF NOT EXISTS postgis;
```

Connection string:
```
Host=localhost;Port=5434;Database=turisticka_baza;Username=techspire;Password=techspire#si2026
```



### 3. Adrese do aplikacija
**Turistička:** https://softeng.pmf.kg.ac.rs:10201

**Admin:** http://softeng.pmf.kg.ac.rs:10202



### 4. Uloge u aplikaciji
U sistemu postoje 4 različite uloge:

1. **Admin** -	Najvisi nivo pristupa. Upravlja korisnicima, destinacijama, mapom i activity logom. Jedini moze kreirati nove admin/manager naloge.	Dashboard, Destinacije, Korisnici, Mapa

2. **Manager** -	Moderator sadrzaja. Odobrava objekte, aktivnosti i dogadjaje. Upravlja lokalitetima i pregledava izvestaje od content creatora.	Dashboard, Objekti, Aktivnosti, Dogadjaji, Lokaliteti, Mapa, Ocene/Odgovori, Izvestaji

3. **Content Creator**	Kreira turisticki sadrzaj za destinacije koje su mu dodeljene. Podnosi sadrzaj na odobravanje menadzeru.	Dashboard, Objekti, Aktivnosti, Dogadjaji, Ocene, Mapa

4. **Tourist** - Krajnji korisnik aplikacije. Nema pristup admin panelu. Moze ostavljati ocene i koristiti planer i favorite.



### 5. Nalozi

**Admin**
admin@spirego.com		              Test1234!
milica.admin.serbia@spirego.com		Test1234!
lucia.admin@spirego.com		        Test1234!
giulia.admin@spirego.com		      Test1234!

**Manager**
marko@spirego.com		              Test1234!
manager.belgrade@spirego.com		  Test1234!
manager.novisad@spirego.com		    Test1234!
manager.zlatibor@spirego.com		  Test1234!

**Content Creator**
ana@spirego.com		                Test1234!
jelena.creator@spirego.com		    Test1234!
carmen.creator@spirego.com	 	    Test1234!
lorenzo.creator@spirego.com	 	    Test1234!

**Tourist**
ana@gmail.com		                  Test1234!
mila@gmail.com		                Test1234!
ivan@gmail.com		                Test1234!
nemanja@gmail.com		              Test1234!
tamara@gmail.com		              Test1234!
