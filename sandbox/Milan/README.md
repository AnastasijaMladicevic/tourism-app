Klijent
Frontend aplikacija je razvijena u Angularu.
Omogućava prikaz podataka koje server šalje i demonstrira komunikaciju sa backendom.
Server
Backend deo je razvijen u .NET.
Komunicira sa PostgreSQL bazom i šalje podatke frontendu.
Baza podataka
Koristi se PostgreSQL za čuvanje podataka.
U ovoj demo aplikaciji, baza sadrži jednostavan tekst koji se ispisuje na frontendu.
Demo aplikacija
Ova demo aplikacija demonstrira komunikaciju između PostgreSQL, .NET i Angular.
Prilikom pokretanja, frontend prikazuje tekst koji je sačuvan u bazi.
Pokretanje

1. Baza
   Kreirati bazu i učitati SQL fajl (createBase.sql i demoBase.sql) koji sadrži demo podatke.
2. Backend
   Otvoriti backend projekat u VS Code-u ili Visual Studio.
   Pokrenuti server (dotnet run ili F5 u Visual Studio).
   Proveriti konekciju sa bazom (user/password/port).
3. Frontend
   Instalirati dependencies:
   npm install
   Pokrenuti Angular development server:
   ng serve
   Otvoriti u browseru:
   http://localhost:4200
