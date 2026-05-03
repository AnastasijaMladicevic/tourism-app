# Angular Dokumentacija

> **Angular** je moderni frontend framework razvijen od strane Google-a, baziran na TypeScript-u.
> Ova dokumentacija pokriva instalaciju Angular okruzenja, kao i kreiranje i pokretanje Angular projekata.

---

## Sadrzaj

1. [Instalacija Node.js](#instalacija-nodejs)
2. [Instalacija Angular CLI](#instalacija-angular-cli)
3. [Kreiranje novog projekta](#kreiranje-novog-projekta)
4. [Pokretanje aplikacije](#pokretanje-aplikacije)
5. [Struktura projekta](#struktura-projekta)
6. [Kreiranje komponenti i servisa](#kreiranje-komponenti-i-servisa)
7. [Build projekta](#build-projekta)
8. [Korisni resursi](#korisni-resursi)

---

## Instalacija Node.js

Posto Angular CLI zavisi od Node.js platforme, **prvi korak** je instalacija Node.js-a.

### Preuzimanje

Preuzmi najnoviju **LTS verziju** sa zvanicnog sajta:

https://nodejs.org/

> Uvek birati **LTS (Long Term Support)** verziju jer je stabilnija i bolje podrzana.

### Verifikacija instalacije

Nakon instalacije, pokreni sledece komande u terminalu da proveriš da li su Node.js i NPM ispravno instalirani:

```bash
node --version
npm --version
```

Primer ocekivanog izlaza:

```
v20.11.0
10.2.4
```

---

## Instalacija Angular CLI

Nakon sto je Node.js okruzenje podeseno, instalira se **Angular CLI** — alat koji omogucava upravljanje Angular projektima.

```bash
npm install -g @angular/cli
```

> Opcija `-g` oznacava **globalnu instalaciju**, sto znaci da ce Angular CLI biti dostupan iz bilo kog direktorijuma na racunaru.

### Verifikacija Angular CLI

```bash
ng version
```

Ova komanda prikazuje verziju Angular CLI alata, kao i informacije o instaliranom Node.js okruzenju. Primer izlaza:

```
Angular CLI: 17.x.x
Node: 20.x.x
Package Manager: npm 10.x.x
OS: win32 x64
```

---

## Kreiranje novog projekta

### Kreiranje

Za kreiranje novog Angular projekta koristi se komanda:

```bash
ng new naziv-projekta
```

Tokom kreiranja, Angular CLI postavlja nekoliko pitanja. Preporuke:

| Pitanje | Preporuceni odgovor |
|---------|---------------------|
| Would you like to add Angular routing? | **Yes** |
| Which stylesheet format would you like to use? | **CSS** (ili SCSS po potrebi) |

### Ulazak u folder projekta

```bash
cd naziv-projekta
```

---

## Pokretanje aplikacije

### Instalacija zavisnosti

Pre pokretanja aplikacije, neophodno je instalirati sve biblioteke definisane u **`package.json`** fajlu:

```bash
npm install
```

Ova komanda preuzima sve potrebne pakete i smesta ih u folder **`node_modules`**.

> Ovaj korak je obavezan kad god se projekat klonira sa Git-a na novi racunar.

### Pokretanje lokalnog dev servera

```bash
ng serve
```

Ili skraceno:

```bash
ng s
```

Nakon pokretanja, aplikacija je dostupna na adresi:

http://localhost:4200

Otvori stranicu `Ctrl + Click` na adresi ili ukucavanjem u browser.

### Automatsko otvaranje u browseru

```bash
ng serve --open
```

Ova komanda automatski otvara aplikaciju u podrazumevanom browseru cim server postane spreman.

---

## Struktura projekta

Tipicna struktura Angular projekta izgleda ovako:

```
naziv-projekta/
├── src/
│   ├── app/                    # Komponente, servisi i logika aplikacije
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.css
│   │   └── app.module.ts
│   ├── assets/                 # Slike i staticni fajlovi
│   ├── index.html              # Pocetna HTML stranica aplikacije
│   └── main.ts                 # Ulazna tacka aplikacije
├── angular.json                # Konfiguracija Angular projekta
├── package.json                # Zavisnosti i skripte
├── tsconfig.json               # TypeScript konfiguracija
└── node_modules/               # Instalirani paketi (ne commitovati!)
```

### Najvazniji folderi

| Folder / Fajl | Opis |
|---------------|------|
| `src/` | Glavni izvorni kod aplikacije |
| `src/app/` | Komponente, servisi i logika aplikacije |
| `src/assets/` | Slike i staticni fajlovi |
| `src/index.html` | Pocetna HTML stranica aplikacije |
| `angular.json` | Konfiguracija build-a i projekta |
| `package.json` | Lista zavisnosti i npm skripte |

---

## Kreiranje komponenti i servisa

### Kreiranje nove komponente

```bash
ng generate component naziv-komponente
```

Ili skraceno:

```bash
ng g c naziv-komponente
```

Angular ce automatski kreirati sledece fajlove:

| Fajl | Opis |
|------|------|
| `naziv-komponente.component.html` | HTML template komponente |
| `naziv-komponente.component.css` | Stilovi komponente |
| `naziv-komponente.component.ts` | TypeScript logika |
| `naziv-komponente.component.spec.ts` | Unit testovi |

### Kreiranje servisa

Servisi u Angularu sluze za **logiku aplikacije**, **komunikaciju sa API-jem** i **deljenje podataka izmedju komponenti**.

```bash
ng generate service naziv-servisa
```

Ili skraceno:

```bash
ng g s naziv-servisa
```

Ova komanda kreira:

- `naziv-servisa.service.ts` — implementacija servisa
- `naziv-servisa.service.spec.ts` — unit testovi

Servis se zatim koristi u komponentama pomocu **Dependency Injection**:

```typescript
constructor(private mojiServis: MojServis) {}
```

> **Dependency Injection** je dizajn pattern koji Angular koristi kako bi automatski dostavljao instance servisa komponentama koje ih trebaju — ne morate sami da kreirate instance.

---

## Build projekta

Za kreiranje produkcione verzije aplikacije koristi se:

```bash
ng build
```

Build fajlovi se nalaze u folderu:

```
dist/naziv-projekta/
```

### Opcije build-a

| Komanda | Opis |
|---------|------|
| `ng build` | Development build |
| `ng build --configuration production` | Produkcioni build (optimizovan, minifikovan) |
| `ng build --watch` | Build koji prati promene fajlova |

> Uvek koristiti **produkcioni build** za deploy na server — manji je i znatno brzi od development build-a.

---

## Korisni resursi

| Resurs | URL |
|--------|-----|
| Zvanicna Angular dokumentacija | https://angular.io/docs |
| Angular CLI referenca | https://angular.io/cli |
| Node.js | https://nodejs.org |
| TypeScript dokumentacija | https://www.typescriptlang.org |
| NPM registry | https://www.npmjs.com |

---

*© 2024 Interna Dokumentacija*
