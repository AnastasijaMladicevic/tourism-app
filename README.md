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

### 1. Backend build

Iz foldera `src/backend/TuristickiVodic`:

```bash
dotnet publish .\TuristickiVodic.API\TuristickiVodic.API.csproj -c Release -o .\publish
```

Rezultat je u folderu `src/backend/TuristickiVodic/publish`.

### 2. Frontend build

**front-mobilna** — iz foldera `src/frontend/front-mobilna`:

```bash
npm install
ng build --configuration production
```

Buildovani fajlovi se nalaze u `src/frontend/front-mobilna/dist/front-mobilna/browser`.

**front-web** — iz foldera `src/frontend/front-web/front`:

```bash
npm install
ng build --configuration production
```

Buildovani fajlovi se nalaze u `src/frontend/front-web/front/dist/front/browser`.

### 3. Raspored frontova

Projekat ima dva Angular fronta:

| Front | Gde se servira | Port |
|-------|---------------|------|
| `front-mobilna` | `wwwroot` backenda | 10201 |
| `front-web` | Odvojen statički server | 10202 |

`front-mobilna` se kopira u `wwwroot` objavljenog backenda:

```powershell
Copy-Item -Recurse -Force .\src\frontend\front-mobilna\dist\front-mobilna\browser\* .\src\backend\TuristickiVodic\publish\wwwroot\
```

Ovo je preporučeni pristup jer je u `environment.prod.ts` podešeno `apiUrl: '/api'`, što znači da frontend očekuje API na istom origin-u. Prednosti ovog pristupa:
- nema CORS komplikacija
- `/api` radi prirodno
- slike i statički fajlovi idu sa istog servera
- najjednostavnije za javni link i QR kodove

### 4. Upload na server

```bash
# Backend + front-mobilna (iz korena projekta)
scp -r ./src/backend/TuristickiVodic/publish/* techspire@softeng.pmf.kg.ac.rs:/home/techspire/backend/

# front-web
scp -r ./src/frontend/front-web/front/dist/front/browser/* techspire@softeng.pmf.kg.ac.rs:/home/techspire/frontend-web/
```

### 5. Baza na serveru

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

### 6. Pokretanje na serveru

Backend se pokreće u `screen` sesiji kako bi ostao aktivan i nakon prekida SSH konekcije:

```bash
screen -S backend
cd /home/techspire/backend
dotnet TuristickiVodic.API.dll --urls "http://0.0.0.0:10201"
```

`front-web` se pokreće odvojeno:

```bash
screen -S frontend-web
cd /home/techspire/frontend-web
npx http-server . -p 10202
```

Korisne `screen` komande:

```bash
screen -ls              # lista aktivnih sesija
screen -r backend       # povratak u backend sesiju
screen -r frontend-web  # povratak u frontend-web sesiju
# Ctrl + A, pa D        # odvajanje od sesije (proces ostaje aktivan)
```

### Javne adrese

| Šta | URL |
|-----|-----|
| Backend API + front-mobilna | http://softeng.pmf.kg.ac.rs:10201 |
| front-web | http://softeng.pmf.kg.ac.rs:10202 |
| Swagger | http://softeng.pmf.kg.ac.rs:10201/swagger |

### Seed podaci

Backend pri startu automatski radi migracije i seed ako je baza prazna. Ponašanje se kontroliše kroz `SeedData` sekciju u konfiguraciji:

```json
"SeedData": {
  "ResetAndSeedOnStartup": false,
  "SeedIfDatabaseEmpty": true,
  "ApplyIncrementalSeedOnStartup": false,
  "FailStartupOnSeedError": false
}
```

### PublicApp i QR linkovi

`PublicApp:BaseUrl` mora biti postavljen na javni URL frontend aplikacije kako bi QR kodovi vodili na ispravnu adresu:

```json
"PublicApp": {
  "BaseUrl": "http://softeng.pmf.kg.ac.rs:10201"
}
```

### AI na serveru

Ako na serveru nema Ollama servisa, isključiti AI u produkcijskoj konfiguraciji:

```json
"Ollama": {
  "Enabled": false
}
```
