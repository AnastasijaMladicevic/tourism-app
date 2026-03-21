create database turisticka_baza;

create extension if not exists postgis;


-- ═══════════ TABELE ═══════════ 

create table gradovi (
	id serial primary key, 
	naziv varchar(150) not null, 
	opis text, 
	geolokacija geometry(Point, 4326) not null, 
	aktivan boolean not null default true,
	kreirano timestamptz not null default now()
);

create table uloge (
	id serial primary key,
	naziv varchar(30) not null unique check (naziv in ('admin', 'menadzer', 'turista')),
	kreirano timestamptz not null default now()
);

create table korisnici(
	id serial primary key,
	ime varchar(100) not null,
	prezime varchar(100) not null,
	datum_rodjenja date not null,
	email varchar(200) not null unique,
	lozinka_hash text not null,
	id_uloge int not null references uloge(id) on delete restrict,
	verifikovan boolean not null default false,
	jezik varchar(5) not null default 'sr' check(jezik in('sr', 'en', 'de', 'fr', 'it')),
	verif_token varchar(200), 
	verif_token_istek timestamptz,
	reset_token varchar(200),
	reset_token_istek timestamptz,
	aktivan boolean not null default true,
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);

create table tipovi_destinacija (
	id serial primary key,
	naziv varchar(50) not null unique
);

create table destinacije (
	id serial primary key, 
	id_grada int not null references gradovi(id) on delete restrict,
	naziv varchar(150) not null,
	id_tipa int not null references tipovi_destinacija(id) on delete restrict,
	opis text,
	geolokacija geometry(Point, 4326) not null,
	aktivan boolean not null default true,
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);

create table tipovi_objekata (
	id serial primary key,
	naziv varchar(80) not null unique
);

create table objekti(
	id serial primary key,
	naziv varchar(200) not null,
	id_tipa int not null references tipovi_objekata(id) on delete restrict,
	opis text,
	adresa varchar(300),
	id_destinacije int not null references destinacije(id) on delete restrict,
	geolokacija geometry(Point, 4326) not null,
	telefon varchar(30),
	sajt varchar(300),
	radno_vreme JSONB,
	prosecna_ocena decimal(3,2) not null default 0 check (prosecna_ocena between 0 and 5),
	broj_recenzija int not null default 0 check (broj_recenzija >= 0),
	aktivan boolean not null default true,
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);

create table tipovi_aktivnosti (
	id serial primary key,
	naziv varchar(80) not null unique
);

create table aktivnosti (
	id serial primary key,
	naziv varchar(150) not null,
	id_tipa int not null references tipovi_aktivnosti(id) on delete restrict, 
	opis text,
	id_objekta int not null references objekti(id) on delete restrict,
	cena decimal(10,2) check (cena >= 0),
	trajanje int check (trajanje > 0),
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);

create table tipovi_dogadjaja(
	id serial primary key, 
	naziv varchar(80) not null unique
);

create table dogadjaji (
	id serial primary key, 
	naziv varchar(200) not null,
	id_tipa int not null references tipovi_dogadjaja(id) on delete restrict,
	opis text,
	datum_pocetak timestamptz not null,
	datum_kraj timestamptz, 
	check (datum_kraj is null or datum_kraj > datum_pocetak),
	id_objekta int not null references objekti(id) on delete restrict,
	cena decimal (10, 2) check (cena >= 0),
	max_posetilaca int check (max_posetilaca > 0),
	aktivan boolean not null default true,
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);






create table recenzije (
	id serial primary key,
	id_korisnika int not null references korisnici(id) on delete cascade,
	id_objekta int not null references objekti(id) on delete cascade,
	ocena smallint not null check (ocena between 1 and 5),
	tekst text not null,
	odobrena boolean not null default false,
	kreirana timestamptz not null default now(),
	unique (id_korisnika, id_objekta)
);

create table rute (
	id serial primary key,
	naziv varchar(200) not null,
	opis text,
	tezina varchar(20) check (tezina in ('laka', 'srednja', 'teska')),
	duzina_km decimal(6,2) check (duzina_km > 0),
	kreirano timestamptz not null default now(),
	izmenjeno timestamptz not null default now()
);

create table ruta_tacke (
	id serial primary key,
	id_rute int not null references rute(id) on delete cascade,
	redosled smallint not null check (redosled > 0),
	geolokacija geometry(Point, 4326) not null,
	naziv_tacke varchar(150),
	kreirano timestamptz not null default now(),
	unique (id_rute, redosled)
);

create table favoriti (
	id serial primary key,
	id_korisnika int not null references korisnici(id) on delete cascade,
	id_objekta int references objekti(id) on delete cascade,
	id_rute int references rute(id) on delete cascade,
	id_dogadjaja int references dogadjaji(id) on delete cascade,
	kreirano timestamptz not null default now(),
	check (
		(id_objekta is not null)::int +
		(id_rute is not null)::int +
		(id_dogadjaja is not null)::int = 1
	)
);

create table korisnik_log (
	id bigserial primary key,
	id_korisnika int references korisnici(id) on delete set null,
	sesija_id varchar(100),
	id_objekta int references objekti(id) on delete cascade,
	akcija varchar(50) not null check (akcija in ('view', 'click', 'favourite', 'review', 'search', 'share')),
	trajanje_sec int check (trajanje_sec >= 0),
	kreirano timestamptz not null default now(),
	check (id_korisnika is not null or sesija_id is not null)
);

create table korisnik_aktivnosti (
	id serial primary key,
	id_korisnika int not null references korisnici(id) on delete cascade,
	id_aktivnosti int not null references aktivnosti(id) on delete cascade,
	kreirano timestamptz not null default now(),
	unique (id_korisnika, id_aktivnosti)
);

create table slike (
	id serial primary key,
	url varchar(500) not null,
	glavna boolean not null default false,
	id_objekta int references objekti(id) on delete cascade,
	id_destinacije int references destinacije(id) on delete cascade,
	id_grada int references gradovi(id) on delete cascade,
	kreirana timestamptz not null default now(),
	check (
		(id_objekta is not null)::int +
		(id_destinacije is not null)::int +
		(id_grada is not null)::int = 1
	)
);

create table ankete (
	id serial primary key,
	id_korisnika int not null references korisnici(id) on delete cascade,
	ocena smallint not null check (ocena between 1 and 5),
	komentar text,
	kreirano timestamptz not null default now()
);





-- ═══════════ VREDNOSTI ═══════════ 

insert into gradovi (naziv, opis, geolokacija) values 
('Budva', 'Poznato turističko mesto na Jadranu, sa starim gradom i plažama',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326)),
('Podgorica', 'Glavni grad Crne Gore',
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326)),
('Žabljak', 'Planinski grad u blizini Durmitora',
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326)),
('Herceg Novi', 'Primorski grad na ulazu u Bokokotorski zaliv',
 ST_SetSRID(ST_MakePoint(18.537, 42.453), 4326)),
('Bar', 'Grad poznat po luci i Starom Baru',
 ST_SetSRID(ST_MakePoint(19.100, 42.093), 4326)),
('Ulcinj', 'Najjužniji grad na primorju, poznat po Velikoj plaži',
 ST_SetSRID(ST_MakePoint(19.224, 41.929), 4326)),
('Kotor', 'Primorski grad poznat po starom gradu i Bokokotorskom zalivu',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326)),
('Cetinje', 'Istorijska prestonica Crne Gore, u blizini Lovćena',
 ST_SetSRID(ST_MakePoint(18.924, 42.390), 4326)),
('Nikšić', 'Drugi po veličini grad, poznat po prirodi i jezerima',
 ST_SetSRID(ST_MakePoint(18.956, 42.773), 4326)),
('Plužine', 'Mali grad blizu Pivskog jezera i planinskih ruta',
 ST_SetSRID(ST_MakePoint(18.839, 43.155), 4326)),
('Tivat', 'Primorski grad poznat po marini Porto Montenegro',
 ST_SetSRID(ST_MakePoint(18.693, 42.434), 4326));

insert into uloge (naziv) values
('admin'),
('menadzer'),
('turista');

insert into korisnici (ime, prezime, datum_rodjenja, email, lozinka_hash, id_uloge, verifikovan) values
('Ana', 'Jovanovic', '1998-05-12', 'ana@gmail.com', 'hash123', 3, true),
('Marko', 'Markovic', '1995-09-23', 'marko@gmail.com', 'hash456', 2, true);

insert into tipovi_destinacija(naziv) values
('planina'),
('jezero'),
('grad'),
('park'),
('reka'),
('plaza'), 
('nacionalni park');

update tipovi_destinacija
set naziv = 'nacionalni_park' 
where naziv = 'nacionalni park';

insert into destinacije (id_grada, naziv, id_tipa, opis, geolokacija) values
(7, 'Stari grad Kotor', 3, 'Istorijska lokacija',
ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326)),
(7, 'Kotorski zaliv', 2, 'Poznat po prirodnoj lepoti i planinama',
 ST_SetSRID(ST_MakePoint(18.770, 42.430), 4326)),
(1, 'Stari grad Budva', 3, 'Istorijsko jezgro Budve',
 ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326)),
(1, 'Plaža Mogren', 6, 'Jedna od najlepših plaža u Budvi',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326)),
(3, 'Durmitor', 1, 'Nacionalni park i planinski masiv',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326));

 UPDATE destinacije
SET id_tipa = 7
WHERE naziv = 'Durmitor';

insert into tipovi_objekata (naziv) values
('hotel'), 
('restoran'),
('kafic'),
('klub'),
('dom');

insert into objekti (naziv, id_tipa, opis, adresa, id_destinacije,
geolokacija, telefon, sajt, radno_vreme) values
('Hotel Vardar', 1, 'Hotel u srcu starog grada', 'Stari grad Kotor', 1,
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326),
 '+38232345678', 'https://hotelvardar.com',
 '{"pon":"00:00-24:00"}'),
('Restoran Galion', 2, 'Restoran sa pogledom na zaliv', 'Škaljari bb', 2,
 ST_SetSRID(ST_MakePoint(18.768, 42.427), 4326),
 '+38232345679', 'https://galion.me',
 '{"pon":"10:00-23:00"}'),
('Hotel Avala', 1, 'Luksuzni hotel pored mora', 'Budva centar', 3,
 ST_SetSRID(ST_MakePoint(18.838, 42.279), 4326),
 '+38233456789', 'https://avala.me',
 '{"pon":"00:00-24:00"}'),
('Mogren Beach Bar', 3, 'Kafić na plaži', 'Plaža Mogren', 4,
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326),
 '+38233456780', NULL,
 '{"pon":"08:00-02:00"}'),
('Planinarski dom Durmitor', 5, 'Dom za planinare', 'Durmitor bb', 5,
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326),
 '+38233456781', NULL,
 '{"pon":"00:00-24:00"}');

insert into tipovi_aktivnosti (naziv) values
('pesacenje'),
('sport'),
('relax'),
('ishrana'),
('plivanje'), 
('obilazak'),
('izlazak'),
('planinarenje');

insert into aktivnosti (naziv, id_tipa, opis, id_objekta, cena, trajanje) values
('Degustacija morskih specijaliteta', 4, 'Lokalna kuhinja', 2, 25.00, 90),
('Noćni izlazak', 7, 'Zabava uz muziku', 3, 10.00, 240),
('Planinarenje na Durmitoru', 8, 'Pešačka tura kroz prirodu', 5, 0.00, 300);

insert into tipovi_dogadjaja (naziv) values
('koncert'),
('festival'),
('izlozba'),
('nastup'),
('okupljanje');

insert into dogadjaji (naziv, id_tipa, opis, datum_pocetak, datum_kraj, id_objekta, cena, max_posetilaca) values
('KotorArt festival', 2, 'Kulturni festival muzike i umetnosti',
 '2026-07-15 20:00', '2026-07-30 23:00', 1, 20.00, 1000),
('Veče klasične muzike', 1, 'Koncert u starom gradu',
 '2026-08-05 21:00', '2026-08-05 23:00', 1, 15.00, 200),
('Budva Summer Festival', 2, 'Letnji festival na otvorenom',
 '2026-07-01 19:00', '2026-07-10 23:00', 4, 10.00, 1500),
('DJ Night Mogren', 4, 'Elektronska muzika na plaži',
 '2026-08-10 22:00', '2026-08-11 03:00', 4, 8.00, 500),
('Planinarski susret', 5, 'Okupljanje planinara',
 '2026-09-01 08:00', '2026-09-01 18:00', 5, 5.00, 100);





insert into recenzije (id_korisnika, id_objekta, ocena, tekst, odobrena) values
(1, 1, 5, 'Odličan hotel, prelepa lokacija u srcu starog grada!', true),
(2, 1, 4, 'Veoma dobar smeštaj, osoblje ljubazno i profesionalno.', true),
(1, 2, 5, 'Restoran sa neverovatnim pogledom na zaliv, hrana odlična!', true),
(2, 3, 4, 'Hotel Avala je pravi mali raj pored mora.', true),
(1, 4, 3, 'Kafić na dobroj lokaciji ali malo bučno noću.', true),
(2, 5, 5, 'Savršeno mesto za planinare, čisto i udobno.', true);

insert into rute (naziv, opis, tezina, duzina_km) values
('Tura oko starog grada Kotor', 'Šetnja duž kotorskih zidina sa pogledom na zaliv', 'laka', 3.50),
('Planinarski put Durmitor', 'Ruta kroz nacionalni park do Crnog jezera', 'srednja', 8.20),
('Obilaznkica Plaže Mogren', 'Kratka tura duž budvanske obale', 'laka',    2.10),
('Vrh Bobotov kuk', 'Zahtevna tura do najvišeg vrha Durmitora', 'teska',  14.50);

insert into ruta_tacke (id_rute, redosled, geolokacija, naziv_tacke) values
(1, 1, ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 'Start - Trg od oružja'),
(1, 2, ST_SetSRID(ST_MakePoint(18.773, 42.425), 4326), 'Kotorske zidine'),
(1, 3, ST_SetSRID(ST_MakePoint(18.775, 42.427), 4326), 'Tvrđava Sv. Ivan'),
(1, 4, ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 'Cilj - Trg od oružja'),
(2, 1, ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 'Start - Planinarski dom'),
(2, 2, ST_SetSRID(ST_MakePoint(19.130, 43.155), 4326), 'Vidikovac'),
(2, 3, ST_SetSRID(ST_MakePoint(19.138, 43.160), 4326), 'Crno jezero'),
(3, 1, ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 'Start - Plaža Mogren'),
(3, 2, ST_SetSRID(ST_MakePoint(18.835, 42.279), 4326), 'Stenska promenada'),
(3, 3, ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326), 'Cilj - Stari grad Budva'),       
(4, 1, ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 'Start - Planinarski dom'),
(4, 2, ST_SetSRID(ST_MakePoint(19.140, 43.165), 4326), 'Sedlo'),
(4, 3, ST_SetSRID(ST_MakePoint(19.155, 43.178), 4326), 'Vrh Bobotov kuk 2523m');

insert into favoriti (id_korisnika, id_objekta, id_rute, id_dogadjaja) values
(1, 1,    null, null),
(1, 2,    null, null),
(2, 3,    null, null),
(2, 5,    null, null),
(1, null, 1,    null),
(2, null, 2,    null),
(1, null, null, 1),
(2, null, null, 3);

insert into korisnik_log (id_korisnika, sesija_id, id_objekta, akcija, trajanje_sec) values
(1,    null,        1,    'view',      45),
(1,    null,        2,    'view',      30),
(1,    null,        1,    'favourite', null),
(1,    null,        2,    'favourite', null),
(1,    null,        1,    'review',    null),
(2,    null,        3,    'view',      60),
(2,    null,        5,    'view',      90),
(2,    null,        3,    'favourite', null),
-- neregistrovani korisnik
(null, 'ses_abc123', 1,   'view',      20),
(null, 'ses_abc123', 2,   'view',      15),
(null, 'ses_xyz789', null,'search',    null),
-- deljenje
(1,    null,         1,   'share',     null),
(2,    null,         3,   'share',     null);

-- aktivnosti: 1=Degustacija(obj 2), 2=Noćni izlazak(obj 4), 3=Planinarenje(obj 5)
insert into korisnik_aktivnosti (id_korisnika, id_aktivnosti) values
(1, 1),
(1, 3),
(2, 2),
(2, 3);

insert into slike (url, glavna, id_objekta, id_destinacije, id_grada) values
('/uploads/objekti/hotel-vardar-1.jpg',       true,  1,    null, null),
('/uploads/objekti/hotel-vardar-2.jpg',       false, 1,    null, null),
('/uploads/objekti/restoran-galion-1.jpg',    true,  2,    null, null),
('/uploads/objekti/hotel-avala-1.jpg',        true,  3,    null, null),
('/uploads/objekti/hotel-avala-2.jpg',        false, 3,    null, null),
('/uploads/objekti/mogren-beach-bar-1.jpg',   true,  4,    null, null),
('/uploads/objekti/planinarski-dom-1.jpg',    true,  5,    null, null),
('/uploads/destinacije/stari-grad-kotor.jpg', true,  null, 1,    null),
('/uploads/destinacije/kotorski-zaliv.jpg',   true,  null, 2,    null),
('/uploads/destinacije/stari-grad-budva.jpg', true,  null, 3,    null),
('/uploads/destinacije/plaza-mogren.jpg',     true,  null, 4,    null),
('/uploads/destinacije/durmitor.jpg',         true,  null, 5,    null),
('/uploads/gradovi/kotor-panorama.jpg',       true,  null, null, 7),
('/uploads/gradovi/budva-panorama.jpg',       true,  null, null, 1),
('/uploads/gradovi/zabljak-panorama.jpg',     true,  null, null, 3);

insert into ankete (id_korisnika, ocena, komentar) values
(1, 5, 'Odlična aplikacija, sve radi brzo i intuitivno!'),
(2, 4, 'Vrlo korisno, jedino bi moglo biti više sadržaja za planinarenje.');








-- ═══════════ INDEXI ═══════════ 

create index idx_gradovi_geolokacija     on gradovi      using gist(geolokacija);
create index idx_destinacije_geolokacija on destinacije  using gist(geolokacija);
create index idx_objekti_geolokacija     on objekti      using gist(geolokacija);
create index idx_ruta_tacke_geolokacija  on ruta_tacke   using gist(geolokacija);

-- GRADOVI I DESTINACIJE
create index idx_destinacije_grad        on destinacije(id_grada);
create index idx_destinacije_tip         on destinacije(id_tipa);

-- OBJEKTI
create index idx_objekti_destinacija     on objekti(id_destinacije);
create index idx_objekti_tip             on objekti(id_tipa);
create index idx_objekti_ocena           on objekti(prosecna_ocena desc);
create index idx_objekti_aktivan         on objekti(aktivan);

-- KORISNICI
create index idx_korisnici_email         on korisnici(email);
create index idx_korisnici_uloga         on korisnici(id_uloge);
create index idx_korisnici_aktivan       on korisnici(aktivan);

-- RECENZIJE
create index idx_recenzije_objekat       on recenzije(id_objekta);
create index idx_recenzije_korisnik      on recenzije(id_korisnika);
create index idx_recenzije_odobrena      on recenzije(odobrena);

-- AKTIVNOSTI
create index idx_aktivnosti_objekat      on aktivnosti(id_objekta);
create index idx_aktivnosti_tip          on aktivnosti(id_tipa);

-- DOGADJAJI
create index idx_dogadjaji_objekat       on dogadjaji(id_objekta);
create index idx_dogadjaji_datum         on dogadjaji(datum_pocetak);
create index idx_dogadjaji_tip           on dogadjaji(id_tipa);
create index idx_dogadjaji_aktivan       on dogadjaji(aktivan);

-- FAVORITI (parcijalni indeksi)
create index idx_favoriti_korisnik       on favoriti(id_korisnika);
create index idx_favoriti_objekat        on favoriti(id_objekta)
    where id_objekta is not null;
create index idx_favoriti_ruta           on favoriti(id_rute)
    where id_rute is not null;
create index idx_favoriti_dogadjaj       on favoriti(id_dogadjaja)
    where id_dogadjaja is not null;

-- KORISNIK_LOG
create index idx_log_korisnik            on korisnik_log(id_korisnika);
create index idx_log_objekat             on korisnik_log(id_objekta);
create index idx_log_akcija              on korisnik_log(akcija);
create index idx_log_vreme               on korisnik_log(kreirano desc);

-- KORISNIK_AKTIVNOSTI
create index idx_kor_akt_korisnik        on korisnik_aktivnosti(id_korisnika);
create index idx_kor_akt_aktivnost       on korisnik_aktivnosti(id_aktivnosti);

-- SLIKE (parcijalni indeksi)
create index idx_slike_objekat           on slike(id_objekta)
    where id_objekta is not null;
create index idx_slike_destinacija       on slike(id_destinacije)
    where id_destinacije is not null;
create index idx_slike_grad              on slike(id_grada)
    where id_grada is not null;
create index idx_slike_glavna            on slike(glavna)
    where glavna = true;

-- RUTE I TACKE
create index idx_ruta_tacke_ruta         on ruta_tacke(id_rute);
create index idx_ruta_tacke_redosled     on ruta_tacke(id_rute, redosled);



-- ═══════════ TRIGERI ═══════════ 

-- TRIGER 1: automatska prosecna ocena i broj recenzija
create or replace function azuriraj_ocenu()
returns trigger as $$
begin
    update objekti
    set
        prosecna_ocena = (
            select coalesce(round(avg(ocena)::numeric, 2), 0)
            from recenzije
            where id_objekta = coalesce(new.id_objekta, old.id_objekta)
              and odobrena = true
        ),
        broj_recenzija = (
            select count(*)
            from recenzije
            where id_objekta = coalesce(new.id_objekta, old.id_objekta)
              and odobrena = true
        )
    where id = coalesce(new.id_objekta, old.id_objekta);
    return coalesce(new, old);
end;
$$ language plpgsql;

create trigger tg_azuriraj_ocenu
after insert or update or delete on recenzije
for each row execute function azuriraj_ocenu();

-- TRIGER 2: automatsko azuriranje kolone izmenjeno
create or replace function postavi_izmenjeno()
returns trigger as $$
begin
    new.izmenjeno = now();
    return new;
end;
$$ language plpgsql;

create trigger tg_korisnici_izmenjeno
before update on korisnici
for each row execute function postavi_izmenjeno();

create trigger tg_destinacije_izmenjeno
before update on destinacije
for each row execute function postavi_izmenjeno();

create trigger tg_objekti_izmenjeno
before update on objekti
for each row execute function postavi_izmenjeno();

create trigger tg_aktivnosti_izmenjeno
before update on aktivnosti
for each row execute function postavi_izmenjeno();

create trigger tg_dogadjaji_izmenjeno
before update on dogadjaji
for each row execute function postavi_izmenjeno();

create trigger tg_rute_izmenjeno
before update on rute
for each row execute function postavi_izmenjeno();

-- TRIGER 3: jedna glavna slika po entitetu 
create or replace function osiguraj_jednu_glavnu()
returns trigger as $$
begin
    if new.glavna = true then
        if new.id_objekta is not null then
            update slike set glavna = false
            where id_objekta = new.id_objekta and id != new.id;
        elsif new.id_destinacije is not null then
            update slike set glavna = false
            where id_destinacije = new.id_destinacije and id != new.id;
        elsif new.id_grada is not null then
            update slike set glavna = false
            where id_grada = new.id_grada and id != new.id;
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tg_jedna_glavna_slika
before insert or update on slike
for each row execute function osiguraj_jednu_glavnu();