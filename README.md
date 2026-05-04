# SpireGO

Turisticka aplikacija za pregled destinacija, lokaliteta, objekata, aktivnosti, dogadjaja, favorita, ruta i AI preporuka.

## Tehnologije

- **Backend:** ASP.NET Core 10, Entity Framework Core, PostgreSQL, PostGIS
- **Frontend:** Angular 21
- **Baza:** PostgreSQL sa PostGIS ekstenzijom
- **AI:** Ollama lokalni model, opciono u zavisnosti od okruzenja

## Struktura projekta

```text
techspire/
|-- src/
|   |-- backend/
|   |   `-- TuristickiVodic/
|   |       |-- TuristickiVodic.API/
|   |       |-- TuristickiVodic.Core/
|   |       |-- TuristickiVodic.Infrastructure/
|   |       |-- TuristickiVodic.Services/
|   |       `-- global.json
|   |-- frontend/
|   |    |-- front-mobilna/
|   |    |-- front-web/front/
|   `-- baza/
|       `-- seed.sql
`-- README.md
```

## Development verzija

Ovaj deo opisuje kako se projekat pokrece **lokalno**, za razvoj i testiranje.

### Preduslovi

Potrebno je da lokalno imate instalirano:

- **.NET SDK 10.0.203**
- **Node.js 24+**
- **npm 11+**
- **PostgreSQL**
- **PostGIS**

Projekat backend-a zakljucava SDK verziju kroz [global.json](src/backend/TuristickiVodic/global.json).

### 1. Baza

Kreirajte bazu i ukljucite PostGIS:

```sql
CREATE DATABASE turisticka_baza;
\c turisticka_baza
CREATE EXTENSION IF NOT EXISTS postgis;
```

Lokalni connection string je definisan u [appsettings.Development.json](src/backend/TuristickiVodic/TuristickiVodic.API/appsettings.Development.json).

Ako koristite drugaciji username, password ili naziv baze, promenite ga u tom fajlu.

### 2. Pokretanje backend-a

Iz foldera [src/backend/TuristickiVodic](src/backend/TuristickiVodic) pokrenite:

```bash
dotnet restore
dotnet run --project .\TuristickiVodic.API\TuristickiVodic.API.csproj
```

Sta backend radi pri pokretanju:

- automatski primenjuje EF migracije
- proverava da li je baza prazna
- po potrebi pokrece seed iz [seed.sql](src/baza/seed.sql)

U development okruzenju su dodatno ukljuceni Swagger i lokalne razvojne opcije.

### 3. Pokretanje frontend-a

Iz foldera [src/frontend/front-mobilna](src/frontend/front-mobilna) pokrenite:

```bash
npm install
ng serve
```

Frontend je podrazumevano dostupan na:

- `http://localhost:4200`

Backend je dostupan na portu koji ASP.NET dodeli pri pokretanju, a u development-u je dozvoljen CORS za lokalni Angular frontend.

### 4. Lokalni AI

Ako zelite da AI preporuke rade lokalno, potrebno je da imate Ollama servis i odgovarajuci model.

Podrazumevana backend konfiguracija koristi:

- `Ollama:Enabled = true`
- `Ollama:BaseUrl = http://127.0.0.1:11434`
- model `llama3.2:3b`

Ako Ollama nije dostupan, AI deo ce pasti na fallback semanticku pretragu. Ako lokalno ne zelite AI, mozete privremeno postaviti:

```json
"Ollama": {
  "Enabled": false
}
```

## Production verzija

Ovaj deo opisuje kako se projekat postavlja na **server**, po logici koju je tim dobio:  
**build se radi lokalno**, a na server se kopiraju vec buildovani fajlovi.

### Vazno

Na serveru:

- **nije neophodan .NET SDK**
- dovoljan je **.NET runtime**
- frontend se ne pokrece preko `ng serve`
- backend se ne pokrece kao development aplikacija

Na server se postavlja:

- objavljen backend (`dotnet publish`)
- buildovan frontend (`ng build --configuration production`)
- baza ili seed/migracije

### Produkciona konfiguracija

Produkcione vrednosti drzite u:

- [appsettings.json](src/backend/TuristickiVodic/TuristickiVodic.API/appsettings.json)
- [appsettings.Production.json](src/backend/TuristickiVodic/TuristickiVodic.API/appsettings.Production.json)
- [appsettings.Production.example.json](src/backend/TuristickiVodic/TuristickiVodic.API/appsettings.Production.example.json)

Pre produkcionog build-a proverite i podesite:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`
- `Jwt:Issuer`
- `Jwt:Audience`
- `Smtp:*`
- `PublicApp:BaseUrl`
- `Cors:AllowedOrigins`
- `Ollama:Enabled`

### Napomena za AI na serveru

Ako na serveru **nemate Ollama servis i model**, preporuka je da u produkciji iskljucite AI model:

```json
"Ollama": {
  "Enabled": false
}
```

Ako na serveru zelite AI, morate obezbediti:

- pokrenut Ollama servis
- lokalno instaliran model koji backend koristi

### Produkcioni build

#### 1. Backend publish

Iz foldera [src/backend/TuristickiVodic](src/backend/TuristickiVodic) pokrenite:

```bash
dotnet publish .\TuristickiVodic.API\TuristickiVodic.API.csproj -c Release -o .\publish
```

Rezultat je buildovani backend u folderu:

```text
src/backend/TuristickiVodic/publish
```

#### 2. Frontend production build

Iz foldera [src/frontend/front-mobilna](src/frontend/front-mobilna) pokrenite:

```bash
npm install
ng build --configuration production
```

Rezultat Angular build-a se nalazi u `dist` folderu. Za ovu Angular konfiguraciju staticki fajlovi se tipicno nalaze u:

```text
src/frontend/front-mobilna/dist/front-mobilna/browser
```

### Deployment na server

#### 1. Baza na serveru

Na PMF serveru PostgreSQL radi na portu `5434`.

Primer konekcije:

```bash
psql -U <team_user> -h localhost -p 5434 -d postgres
```

Kreirajte bazu i ukljucite PostGIS:

```sql
CREATE DATABASE turisticka_baza;
\c turisticka_baza
CREATE EXTENSION IF NOT EXISTS postgis;
```

Zatim u produkcionom connection string-u postavite odgovarajuci:

```text
Host=localhost;Port=5434;Database=turisticka_baza;Username=<team_user>;Password=<team_password>
```

#### 2. Kopiranje fajlova

Na server se preko FTP/SFTP kopiraju:

- sadrzaj backend `publish` foldera
- buildovani Angular fajlovi iz `dist/front-mobilna/browser`

### Preporuceni produkcioni scenario

Najjednostavniji scenario za ovaj projekat je:

1. backend se pokrece kao ASP.NET aplikacija
2. buildovani Angular fajlovi se smeste u backend `wwwroot`
3. backend sluzi i API i frontend sa istog javnog URL-a

Prakticno, to znaci da se sadrzaj `dist/front-mobilna/browser` kopira u `wwwroot` objavljenog backend-a.

Ovaj pristup je preporucen zato sto je u [environment.prod.ts](src/frontend/front-mobilna/src/environment/environment.prod.ts) podeseno:

```ts
apiUrl: '/api'
```

To znaci da produkcioni frontend ocekuje da API bude na istom origin-u kao i frontend.

#### Prednost ovog pristupa

- nema dodatnog CORS komplikovanja
- `/api` radi prirodno
- `/images` i staticki fajlovi mogu da idu sa istog servera
- najjednostavnije je za javni link i QR kodove

### Alternativni scenario

Frontend moze biti serviran i preko posebnog statickog web servera, ali tada morate:

1. promeniti `apiUrl` u produkcionom frontendu na pun backend URL
2. ponovo buildovati frontend
3. pravilno podesiti `Cors:AllowedOrigins` na backend-u

Ako ovo ne uradite, frontend nece moci da zove API kako treba.

### Pokretanje na serveru

#### Backend

Preporuka je da se backend pokrece u `screen` sesiji:

```bash
screen -S tourist-api
cd <folder_sa_publish_fajlovima>
dotnet TuristickiVodic.API.dll
```

Ako se SSH konekcija prekine, proces ostaje aktivan u `screen` sesiji.

#### Frontend

Ako frontend smestate u backend `wwwroot`, nije potreban poseban frontend proces.

Ako frontend drzite odvojeno, potreban vam je poseban staticki server, na primer:

```bash
npx http-server ./dist/front-mobilna/browser -p 10101
```

U tom slucaju dodatno morate resiti i CORS i `apiUrl` konfiguraciju.

### Seed podaci u produkciji

Backend pri startu radi:

- `db.Database.Migrate()`
- seed ako je baza prazna i ako je seed ukljucen kroz konfiguraciju

To znaci da za praznu bazu nije neophodan rucni import svih podataka ako zelite da koristite postojece seed podatke iz [seed.sql](src/baza/seed.sql).

Ako ne zelite automatski seed u produkciji, prilagodite `SeedData` sekciju pre deploy-a.

### PublicApp i QR linkovi

`PublicApp:BaseUrl` mora biti postavljen na javni URL frontend aplikacije.

Primer:

```json
"PublicApp": {
  "BaseUrl": "https://vas-domen.rs"
}
```

Ova vrednost se koristi za generisanje javnih linkova i QR kodova. Ako nije tacna, QR kodovi nece voditi na ispravnu adresu.

## Kratak pregled

### Lokalno

```bash
# backend
dotnet run --project .\TuristickiVodic.API\TuristickiVodic.API.csproj

# frontend
npm install
ng serve
```

### Produkcija

```bash
# backend build
dotnet publish .\TuristickiVodic.API\TuristickiVodic.API.csproj -c Release -o .\publish

# frontend build
npm install
ng build --configuration production
```

Zatim:

- upload buildovanih fajlova na server
- podizanje baze na PostgreSQL `5434`
- ukljucivanje PostGIS ekstenzije
- pokretanje backend-a preko `dotnet TuristickiVodic.API.dll`
