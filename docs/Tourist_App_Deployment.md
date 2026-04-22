# Tourist App Deployment

Ovaj setup pokriva turisticki frontend, ASP.NET API i PostgreSQL bazu preko Docker Compose-a.

## Sta se deployuje

- `tourist-front`: Angular turisticka aplikacija, servirana preko Nginx-a
- `api`: ASP.NET Core backend
- `db`: PostgreSQL baza

Nginx frontend prosledjuje:

- `/api/*` ka backendu
- `/images/*` ka backendu
- `/swagger/*` ka backendu

To znaci da turisticki frontend i API mogu da rade iza jednog javnog URL-a, sto je idealno za QR kodove.

## Pre pokretanja

1. `.env` se koristi za konkretne lokalne ili produkcione vrednosti.
2. `.env.example` je primer, a `.env` je lokalni fajl koji se ne pushuje.
3. Za pravi deployment obavezno promeni tajne vrednosti.

## Lokalni smoke test bez javnog domena

Ako samo zelite da proverite da li se kontejneri podizu:

- `PUBLIC_APP_BASE_URL=http://192.168.x.x:8088`
- `FRONTEND_PORT=8088`
- `REVERSE_PROXY_USE_HTTPS_REDIRECTION=false`

Zatim pokreni:

```bash
docker compose up -d --build
```

Frontend ce biti dostupan na `http://localhost:8088` na racunaru i na `http://192.168.x.x:8088` sa drugih uredjaja u istoj mrezi.

## Seed podaci

Compose sada mountuje `src/baza/seed.sql` i backend ga automatski izvrsi pri prvom podizanju ako je baza prazna. To znaci da za lokalni Docker test dobijas i pocetne podatke.

## Pravi javni deployment

Za QR koji radi svima potreban je javni domen, na primer:

- `PUBLIC_APP_BASE_URL=https://tourist.example.com`
- `FRONTEND_PORT=80`
- `REVERSE_PROXY_USE_HTTPS_REDIRECTION=true`

Taj domen treba da pokazuje na server na kome vrti ovaj `docker compose` stack.

## Pokretanje

```bash
docker compose up -d --build
```

## Gasenje

```bash
docker compose down
```

## Sta je bitno za QR

Backend generise QR linkove na osnovu `PublicApp:BaseUrl`, odnosno `PUBLIC_APP_BASE_URL` promenljive.

Ako to nije javni URL, QR nece raditi svima. Na lokalnoj mrezi radice uredjajima koji mogu da otvore IP adresu racunara.

## Persistencija

Compose cuva:

- PostgreSQL podatke u volumenu `postgres-data`
- uploadovane slike iz API-ja u volumenu `api-images`

## Napomena

Ovaj setup trenutno pokriva turisticku aplikaciju i backend. Admin web nije ukljucen u compose da se ne siri scope trenutnog deploymenta.
