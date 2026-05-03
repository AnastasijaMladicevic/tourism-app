**KORISNICI**

- Registracija kreira nalog sa ulogom `Tourist`.
- Novoregistrovani korisnik se kreira kao aktivan (`IsActive = true`) i nije blacklistovan (`IsBlacklisted = false`).
- Korisnik može da vidi samo svoj profil; `Admin` može da vidi bilo kog korisnika.
- Korisnik može da menja samo svoj profil; `Admin` može da menja bilo kog korisnika.
- Korisnik može da menja lozinku samo sebi; `Admin` može da menja lozinku bilo kom korisniku.
- Samo `Admin` može da pretražuje korisnike po email adresi, imenu i prezimenu i da vidi listu korisnika.
- Samo `Admin` može da aktivira/deaktivira korisnike.
- Deaktiviran korisnik ne može da se prijavi niti da koristi refresh token dok ga `Admin` ponovo ne aktivira.
- `Admin` ne može da obriše sam sebe.
- Manager koji je dodeljen destinaciji ne može biti obrisan dok se toj destinaciji ne dodeli drugi manager.
- Samo `Tourist` može da pošalje zahtev za `ContentCreator` ulogu, i to samo za sebe.
- Samo `Admin` može da odobri `ContentCreator` ulogu.
- Uloga `ContentCreator`-a se odobrava samo ako je turista poslao zahtev za nju.
- Blacklistovan korisnik ne može da se prijavi, da koristi refresh token, da zatraži `ContentCreator` ulogu niti da bude odobren za `ContentCreator` ulogu.


**FORGOT PASSWORD**

- Kod za reset lozinke može da se pošalje samo ako email postoji u bazi i nalog je validan.
- Ako email ne postoji, vraća se greška da korisnik sa tom email adresom još uvek nije registrovan.
- Ako nalog nije aktivan, vraća se greška da korisnički nalog nije aktivan.
- Ako je nalog blacklistovan, reset lozinke nije dostupan za taj nalog.
- Kod za reset lozinke važi 5 minuta.
- Posle uspešne provere koda izdaje se privremeni `reset session token`.
- Lozinka može biti resetovana samo uz validan i neistekao `reset session token`.
- `Reset session token` takođe važi 5 minuta.


**DESTINACIJE**

- Samo `Admin` može da kreira destinacije.
- Samo `Admin` može da menja destinacije.
- Samo `Admin` može da briše destinacije.
- Jedan `Manager` ne može da rukovodi sa više destinacija.
- Svaka destinacija mora imati dodeljenog `Manager`-a u svakom trenutku.
- `Manager` koji upravlja destinacijom ne može biti obrisan dok se toj destinaciji ne dodeli drugi `Manager`.
- `Admin` može obrisati destinaciju. Brisanje je nepovratno i zahteva eksplicitnu potvrdu korisnika na frontu.


**LOKALITETI**

- Lokalitet može da kreira `Manager` samo za svoju destinaciju.
- `Manager` može da menja samo lokalitete u svojoj destinaciji.
- `Manager` može da briše samo lokalitete u svojoj destinaciji.
- Pri premeštanju lokaliteta proveravaju se i trenutna i ciljna destinacija.
- Samo `Manager` može da upravlja lokalitetima.


**TURISTIČKI OBJEKTI**

- Samo `ContentCreator` može da kreira objekat.
- Kada `ContentCreator` kreira objekat, status se postavlja na `Pending`.
- Jednom odobren objekat više ne mora da dobije dozvolu da bi bio izmenjen.
- Objekat mora imati `DestinationId` ili `LocalityId`.
- Ako je zadat `LocalityId`, `DestinationId` se usklađuje prema tom lokalitetu.
- Ako su zadati i `LocalityId` i `DestinationId`, moraju biti konzistentni.
- Samo `ContentCreator` može da menja sadržaj objekta.
- `ContentCreator` može da menja samo svoje objekte.
- `Manager` ne menja sadržaj objekta, već samo odobrava ili odbija status objekta u svojoj destinaciji.
- Samo odgovorni `Manager` može da odobri ili odbije objekat.
- Objekat ne može biti odobren dok nema glavnu sliku.
- Samo `ContentCreator` može direktno da obriše objekat.
- `ContentCreator` može direktno da obriše samo svoj objekat koji nije `Approved`.
- `Approved` objekti se ne brišu direktno, već kroz `DeletionRequest`.
- Objekat koji ima recenzije može da se obriše; recenzije se tada brišu kaskadno.
- Samo `Manager` može da menja `IsActive` za odobren objekat u svojoj destinaciji.


**EVENTOVI**

- Samo `ContentCreator` može da kreira evente.
- Kada `ContentCreator` kreira event, status se postavlja na `Pending`.
- Jednom odobren event više ne mora da dobije novo odobrenje da bi bio izmenjen.
- Event mora imati `LocalityId` ili `DestinationId`.
- `LocalityId` i `DestinationId` moraju biti konzistentni.
- Ako je event vezan i za objekat, objekat mora pripadati istoj destinaciji.
- Samo `ContentCreator` može da menja sadržaj eventa.
- `ContentCreator` može da menja samo svoje evente.
- `Manager` ne menja sadržaj eventa, već samo odobrava ili odbija status eventa u svojoj destinaciji.
- Samo odgovorni `Manager` može da odobri ili odbije event.
- Event ne može biti odobren dok nema glavnu sliku.
- Samo `ContentCreator` može direktno da obriše event.
- `ContentCreator` može direktno da obriše samo svoj event koji nije `Approved`.
- `Approved` event se ne briše direktno, već kroz `DeletionRequest`.
- Samo `Manager` može da menja `IsActive` za odobren event u svojoj destinaciji.
- Moguće je izlistati eventove po raznim datumskim filterima.


**AKTIVNOSTI**

- Samo `ContentCreator` može da kreira aktivnosti.
- Kada `ContentCreator` kreira aktivnost, status se postavlja na `Pending`.
- Jednom odobrena aktivnost više ne mora da dobije novo odobrenje da bi bila izmenjena.
- Aktivnost mora imati `LocalityId` ili `DestinationId`.
- `LocalityId` i `DestinationId` moraju biti konzistentni.
- Samo `ContentCreator` može da menja sadržaj aktivnosti.
- `ContentCreator` može da menja samo svoje aktivnosti.
- `Manager` ne menja sadržaj aktivnosti, već samo odobrava ili odbija status aktivnosti u svojoj destinaciji.
- Samo odgovorni `Manager` može da odobri ili odbije aktivnost.
- Aktivnost ne može biti odobrena dok nema glavnu sliku.
- Samo `ContentCreator` može direktno da obriše aktivnost.
- `ContentCreator` može direktno da obriše samo svoju aktivnost koja nije `Approved`.
- `Approved` aktivnosti se ne brišu direktno, već kroz `DeletionRequest`.
- Samo `Manager` može da menja `IsActive` za odobrenu aktivnost u svojoj destinaciji.


**RECENZIJE**

- Samo `Tourist` može da piše recenzije.
- Recenzija može da se napiše samo za `Approved` objekat.
- Jedan `Tourist` može imati samo jednu recenziju po objektu.
- `Tourist` može da menja samo svoju recenziju i da je briše.
- `ContentCreator` može da odgovori samo na recenzije svojih objekata.
- `ContentCreator` može da menja i briše svoj odgovor na recenziju.


**OMILJENI (FAVORITES)**

- Samo `Tourist` može da dodaje favorite.
- Samo `Tourist` može da briše favorite.
- U jednom zahtevu može biti dodat tačno jedan od sledećih entiteta: objekat, lokalitet, destinacija, aktivnost ili ruta.
- Eventovi se ne dodaju u favorite.
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

- Samo `ContentCreator` može da pošalje zahtev za brisanje objekta, eventa ili aktivnosti.
- `ContentCreator` može da pošalje zahtev samo za svoj sadržaj.
- `DeletionRequest` može da se pošalje samo za `Approved` objekat, event ili aktivnost.
- Ne može da postoji više `Pending` zahteva za isti objekat, event ili aktivnost.
- `ContentCreator` može da vidi samo svoje `DeletionRequest`-ove.
- `ContentCreator` može da vidi samo svoj konkretan `DeletionRequest` po ID-u.
- `Manager` vidi samo `DeletionRequest`-ove za svoju destinaciju.
- Samo `Manager` može da pregleda listu `DeletionRequest`-ova za obradu.
- Samo `Manager` može da odobri ili odbije `DeletionRequest`.
- Kada `Manager` rešava zahtev, to može da uradi samo za svoju destinaciju.
- Kada je zahtev odobren, briše se objekat, event ili aktivnost na koju se zahtev odnosi.
- `DeletionRequest` zapis ostaje u sistemu kao evidencija odluke.


**EVENT PLANNER**

- Eventovi se ne dodaju u favorites, već u `Event Planner`.
- Samo `Tourist` može da koristi `Event Planner`.
- `Tourist` može da doda samo event u svoj planner.
- Isti event ne može dva puta da se doda u planner istog korisnika.
- Korisnik vidi samo svoj planner.
- Korisnik može da ukloni samo svoje stavke iz planner-a.
- U planner mogu da se dodaju samo aktivni i odobreni eventovi.
- Prošli eventovi ne mogu da se dodaju u planner.


**PRIJAVE (MANAGER REPORTS)**

- Samo `Manager` može da prijavi korisnika.
- `Manager` može da prijavi samo korisnika sa ulogom `ContentCreator`.
- Prijavljeni `ContentCreator` mora imati objekat, event ili aktivnost u destinaciji kojom upravlja taj `Manager`.
- Ne može da postoji više `Pending` prijava za istog `ContentCreator`-a.
- `Manager` vidi samo svoje prijave.
- `Admin` vidi sve prijave.
- Samo `Admin` može da odobri ili odbije prijavu.
- `Manager` može da povuče samo svoju `Pending` prijavu.
- Kada `Admin` odobri prijavu, korisnik gubi `ContentCreator` ulogu, postaje `Tourist` i stavlja se na blacklist, pa više ne može ponovo postati `ContentCreator`.


**ROUTE POINTS**

- `RoutePoint` pripada jednoj ruti (`RouteId`).
- Svi korisnici mogu da vide tačke rute.
- Samo vlasnik rute može da dodaje tačke.
- Samo vlasnik rute može da menja tačke.
- Samo vlasnik rute može da briše tačke.
- Prilikom dodavanja tačke, `Order` mora biti jedinstven u okviru rute.
- Prilikom izmene tačke, `Order` mora ostati jedinstven u okviru rute.
- Nije dozvoljeno imati dve tačke sa istim redosledom u istoj ruti.
- Ruta mora imati minimum 2 tačke.
- Brisanje tačke je zabranjeno ako bi ruta ostala sa manje od 2 tačke.
- Svaka promena tačke, uključujući dodavanje, izmenu i brisanje, ažurira `Route.UpdatedAt`.


**IMAGES**

- Entitet može imati više slika.
- Entitet može biti kreiran bez slika.
- Entitet se ne prikazuje javno dok nema glavnu sliku.
- Kada entitet ima slike, mora postojati tačno jedna glavna slika.
- Nije dozvoljeno imati više od jedne glavne slike.
- Nije dozvoljeno da entitet koji ima slike ostane bez glavne slike.
- Slike se mogu dodavati samo za postojeće entitete.
- Prva slika za entitet mora biti glavna.
- Ako već postoji glavna slika, nova slika ne može biti glavna dok se postojeća ne promeni.
- Slika mora biti vezana za tačno jedan entitet i može pripadati objektu, aktivnosti, eventu, destinaciji ili lokalitetu.
- Nije dozvoljeno da slika pripada više entiteta.
- Nije dozvoljeno da slika nema nijedan entitet.
- Dozvoljeno je menjati samo `Url` i `AltText`.
- Nije dozvoljeno premeštanje slike na drugi entitet.
- Promena glavne slike vrši se kroz posebnu operaciju `SetMainImage`.
- Kada se nova slika postavi kao glavna, prethodna glavna slika automatski prestaje da bude glavna.
- Dozvoljeno je brisanje slika koje nisu jedina glavna slika entiteta.
- Sadržaj koji podleže odobravanju ne može biti odobren dok nema glavnu sliku.
- Nije dozvoljeno obrisati jedinu glavnu sliku entiteta.
- Ako entitet ima više slika, pre brisanja glavne slike druga slika mora biti postavljena kao glavna.
- Brisanjem roditeljskog entiteta brišu se i njegove slike kaskadno.
- Slikama destinacije upravlja `Admin`.
- Slikama lokaliteta upravlja odgovorni `Manager`.
- Slikama objekata, aktivnosti i eventova upravlja njihov `ContentCreator`.
- `Destination` i `Locality` se javno prikazuju samo ako imaju glavnu sliku; to se rešava kroz query u servisu, ne posebnom kolonom u bazi.
