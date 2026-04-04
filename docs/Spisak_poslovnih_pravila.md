**KORISNICI**

- Registracija kreira nalog sa ulogom `Tourist`.
- Korisnik može da vidi samo svoj profil; `Admin` može da vidi bilo kog korisnika.
- Korisnik može da menja samo svoj profil; `Admin` može da menja bilo kog korisnika.
- Korisnik može da menja lozinku samo sebi; `Admin` može da menja lozinku bilo kom korisniku.
- Samo `Admin` može da vidi listu svih korisnika.
- Samo `Admin` može da pretražuje korisnike po email adresi.
- Samo `Admin` može da aktivira/deaktivira korisnike.
- `Admin` ne može da obriše sam sebe.
- Samo `Tourist` može da pošalje zahtev za `ContentCreator` ulogu, i to samo za sebe.
- Samo `Admin` može da odobri `ContentCreator` ulogu.

**DESTINACIJE**

- Samo `Admin` može da kreira destinacije.
- Samo `Admin` može da menja destinacije.
- Samo `Admin` može da briše destinacije.
- Brisanje destinacije je blokirano ako destinacija ima lokalitete, objekte ili evente.
- Jedan `Manager` ne moze da rukovodi sa vise destinacija.
- Destinacija ne bi trebalo da se instancira bez da joj se dodeli menadzer.

**LOKALITET**

- Lokalitete može da kreira `Manager` samo za svoju destinaciju.
- `Manager` može da menja samo lokalitete u svojoj destinaciji.
- `Manager` može da briše samo lokalitete u svojoj destinaciji.
- Pri premeštanju lokalitete proveravaju se i trenutna i ciljna destinacija.
- Samo menadzer moze da upravlja lokalitetima. 

**TURISTIČKI OBJEKTI**

- Samo `ContentCreator` može da kreira objekat.
- Kada `ContentCreator` kreira objekat, status se postavlja na `Pending`.
- Jednom odobren objekat vise ne mora da dobije dozvolu da bi bio izmenjen.
- `DestinationId` se automatski preuzima iz `LocationId`.
- Samo `ContentCreator` može da menja sadržaj objekta.
- `ContentCreator` može da menja samo svoje objekte.
- `Manager` ne menja sadržaj objekta, već samo odobrava ili odbija status za objekte u svojoj destinaciji.
- Samo `ContentCreator` može direktno da obriše objekat.
- `ContentCreator` može direktno da obriše samo svoj `Pending` objekat.
- `Approved` objekti se ne brišu direktno, već kroz `DeletionRequest`.
- Objekat koji ima recenzije može da se obriše (kaskadno se brišu i recenzije).

**EVENTI**

- `ContentCreator` moze da kreiraju evente.
- Kada `ContentCreator` kreira event, status se postavlja na `Pending`.
- Jednom odobren event vise ne mora da dobije dozvolu da bi bio izmenjen.
- Event mora imati 'LocationId' ili 'DestinationId'.
- `LocalityId` i `DestinationId` moraju biti konzistentni.
- Samo `ContentCreator` može da menja sadržaj eventa.
- `ContentCreator` može da menja samo svoje evente.
- `Manager` ne menja sadržaj eventa, već samo odobrava ili odbija status za evente u svojoj destinaciji.
- Samo `ContentCreator` može direktno da obriše event.
- `ContentCreator` može direktno da obriše samo svoj event koji nije `Approved`.
- `Approved` event se ne briše direktno, već kroz `DeletionRequest`.

**AKTIVNOSTI**

- Samo `ContentCreator` može da kreira aktivnosti.
- Samo `ContentCreator` može da menja aktivnosti.
- Samo `ContentCreator` može da briše aktivnosti.
- Kada `ContentCreator` kreira aktivnost, status se postavlja na `Pending`.
- Jednom odobrena aktivnost vise ne mora da dobije dozvolu da bi bio izmenjena.
- Aktivnost mora imati `LocalityId` ili `DestinationId`.
- `LocalityId` i `DestinationId` moraju biti konzistentni.

**RECENZIJE**

- Samo `Tourist` može da piše recenzije.
- Recenzija može da se napiše samo za `Approved` objekat.
- Jedan `Tourist` može imati samo jednu recenziju po objektu.
- `Tourist` može da menja samo svoju recenziju.
- `ContentCreator` može da odgovori samo na recenzije svojih objekata.
- `ContentCreator` može da menja svoj odgovor na recenziju.
- `ContentCreator` može da briše svoj odgovor na recenziju.
- `Manager` može da odobrava i odbija recenzije za objekte u svojoj destinaciji i da ih brise.

**OMILJENI (FAVORITES)**

- Samo `Tourist` može da dodaje favorite.
- Samo `Tourist` može da briše favorite.
- U jednom zahtevu može biti dodat tačno jedan od sledećih entiteta:
  - objekat
  - lokalitet
  - destinacija
  - aktivnost
  - ruta
- Duplikat favorita je blokiran.
- Korisnik može da vidi samo svoje favorite.

**RUTE**

- Svaki ulogovani korisnik može da kreira rutu.
- Ruta mora imati minimum 2 tačke.
- Redosled tačaka u ruti mora biti jedinstven.
- Svi korisnici mogu da vide rute.
- Samo vlasnik rute može da menja rutu.
- Samo vlasnik rute može da briše rutu.
- Ruta ne može da se obriše ako je u nečijim favoritima.

**DELETION REQUESTS**

- Samo `ContentCreator` može da pošalje zahtev za brisanje objekta.
- Samo `ContentCreator` može da pošalje zahtev za brisanje eventa.
- `ContentCreator` može da pošalje zahtev samo za svoj sadržaj.
- Deletion request može da se pošalje samo za `Approved` objekat ili event.
- Ne može da postoji više `Pending` zahteva za isti objekat.
- Ne može da postoji više `Pending` zahteva za isti event.
- `ContentCreator` može da vidi samo svoje deletion request-ove.
- `ContentCreator` može da vidi samo svoj konkretan deletion request po ID-u.
- `Manager` vidi samo deletion request-ove za svoju destinaciju.
- Samo `Manager` moze da pregleda listu deletion request-ova za obradu.
- Samo `Manager` moze da odobri ili odbije deletion request.
- Kada `Manager` rešava zahtev, to može da uradi samo za svoju destinaciju.
- Kada je zahtev odobren, briše se objekat ili event ili akticnost na koju se zahtev odnosi.
- Deletion request zapis ostaje u sistemu kao evidencija odluke.

**EVENT PLANNER**

- Eventovi se ne dodaju u favorites, već u `Event Planner`.
- Samo `Tourist` može da koristi event planner.
- `Tourist` može da doda samo event u svoj planner.
- Isti event ne može dva puta da se doda u planner istog korisnika.
- Korisnik vidi samo svoj planner.
- Korisnik može da ukloni samo svoje stavke iz planner-a.
- U planner mogu da se dodaju samo aktivni i odobreni eventovi.
- Prošli eventovi ne mogu da se dodaju u planner.

**PRIJAVE (MANAGER REPORTS)**

- Samo `Manager` može da prijavi korisnika.
- `Manager` može da prijavi samo korisnika sa ulogom `ContentCreator`.
- Prijavljeni `ContentCreator` mora imati objekat ili event u destinaciji kojom upravlja taj `Manager`.
- Ne može da postoji više `Pending` prijava za istog `ContentCreator`-a.
- `Manager` vidi samo svoje prijave.
- `Admin` vidi sve prijave.
- Samo `Admin` može da odobri ili odbije prijavu.
- `Manager` može da povuče samo svoju `Pending` prijavu.
- Kada `Admin` odobri prijavu:
  - korisnik gubi `ContentCreator` ulogu
  - korisnik postaje `Tourist`
  - korisnik se stavlja na `blacklist` (ne moze ponovo postati cc)


**ROUTE POINTS**

- Route point pripada jednoj ruti (`RouteId`).
- Svi korisnici mogu da vide tačke rute.
- Samo vlasnik rute može da dodaje tačke.
- Samo vlasnik rute može da menja tačke.
- Samo vlasnik rute može da briše tačke.
- Prilikom dodavanja tačke, `Order` mora biti jedinstven u okviru rute.
- Prilikom izmene tačke, `Order` mora ostati jedinstven u okviru rute.
- Nije dozvoljeno imati dve tačke sa istim redosledom u istoj ruti.
- Ruta mora imati minimum 2 tačke.
- Brisanje tačke je zabranjeno ako bi ruta ostala sa manje od 2 tačke.
- Svaka promena tačke (dodavanje, izmena, brisanje) ažurira `Route.UpdatedAt`.

**SLIKE**

- Slika mora imati `Url`.
- `Url` ima maksimalnu dužinu od 500 karaktera.
- `AltText` je opcioni i ima maksimalnu dužinu od 200 karaktera.
- `IsMain` označava glavnu sliku.
- Slika mora biti vezana za tačno jedan entitet, nije dozvoljeno da bude vezana za više entiteta istovremeno.
- Slika može biti vezana za:
  - objekat
  - aktivnost
  - event
  - destinaciju
  - lokalitet
- Slike mogu da se dodaju samo za postojeće entitete.
- Slike mogu da se menjaju samo ako pripadaju validnom entitetu.
- Slike mogu da se brišu.
- Brisanjem roditeljskog entiteta brišu se i njegove slike (`cascade delete`).
- Sistem može imati više slika po entitetu.
