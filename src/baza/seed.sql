TRUNCATE TABLE
    "Images",
    "Favorites",
    "Reviews",
    "UserLogs",
    "ManagerReports",
    "RoutePoints",
    "Routes",
    "Events",
    "Activities",
    "Objects",
    "Localities",
    "Destinations",
    "Users",
    "EventTypes",
    "ActivityTypes",
    "ObjectTypes",
    "DestinationTypes",
    "LocalityTypes",
    "Roles"
RESTART IDENTITY CASCADE;

-- ============================================
-- TEST PASSWORD FOR SEEDED USERS
-- Test1234!
-- BCrypt hash:
-- $2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS
-- ============================================

-- ============================================
-- 1. ROLES
-- ============================================
INSERT INTO "Roles" ("Name", "CreatedAt") VALUES
('Tourist', NOW()),
('ContentCreator', NOW()),
('Manager', NOW()),
('Admin', NOW());

-- ============================================
-- 2. TYPES
-- ============================================

INSERT INTO "LocalityTypes" ("Name") VALUES
('Stari Grad'),
('Turisticka Zona'),
('Setaliste'),
('Trg'),
('Park'),
('Vidikovac'),
('Plaza'),
('Uvala'),
('Marina'),
('Centar grada'),
('Izletiste'),
('Istorijska lokacija'),
('Kulturna cetvrt'),
('Pesacka zona'),
('Tvrdjava'),
('Spomen park'),
('Prirodni lokalitet'),
('Naselje');

INSERT INTO "DestinationTypes" ("Name") VALUES
('Grad'),
('Planina'),
('Nacionalni Park'),
('Jezero'),
('Reka'),
('More'),
('Obala'),
('Ostrvo'),
('Zaliv'),
('Banja'),
('Selo'),
('Turisticka Regija'),
('Rezervat prirode'),
('Ski centar');

INSERT INTO "ObjectTypes" ("Name") VALUES
('Restoran'),
('Kafana'),
('Hotel'),
('Apartman'),
('Spa Centar'),
('Spomenik'),
('Trzni Centar'),
('Klub'),
('Benzinska Pumpa'),
('Muzej'),
('Galerija'),
('Planinarski dom'),
('Kafic'),
('Bar'),
('Pansion'),
('Etno selo'),
('Vinarija'),
('Akva park'),
('Zoo vrt'),
('Akvarijum'),
('Igraliste'),
('Pozoriste'),
('Bioskop'),
('Biblioteka'),
('Crkva'),
('Manastir'),
('Sportski centar'),
('Wellness centar'),
('Trznica'),
('Suvenirnica');

INSERT INTO "ActivityTypes" ("Name") VALUES
('Plivanje'),
('Ronjenje'),
('Skijanje'),
('Soping'),
('Paraglajding'),
('Planinarenje'),
('Biciklizam'),
('Jahanje'),
('Poseta Restoranu'),
('Pesacenje'),
('Sport'),
('Obilazak'),
('Voznja camcem'),
('Kajak'),
('Rafting'),
('Pecanje'),
('Skijanje na vodi'),
('Snowboarding'),
('Klizanje'),
('Joga'),
('Spa i wellness'),
('Fotografisanje'),
('Razgledanje'),
('Degustacija vina'),
('Degustacija hrane'),
('Kupovina'),
('Nocni provod');

INSERT INTO "EventTypes" ("Name") VALUES
('Koncert'),
('Utakmica'),
('Predstava'),
('Organizovana Tura'),
('Festival'),
('Izlozba'),
('Nastup'),
('Okupljanje'),
('Sajam'),
('Sportski dogadjaj'),
('Konferencija'),
('Radionica'),
('Seminar'),
('Takmicenje'),
('Karneval'),
('Proslava'),
('Stand-up'),
('DJ vece'),
('Turnir');

-- ============================================
-- 3. USERS
-- ============================================
INSERT INTO "Users"
("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
VALUES
('Nikola', 'Nikolic', '1990-01-01', 'admin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Marko', 'Jovanovic', '1992-05-15', 'marko@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269123456', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ana', 'Petrovic', '1995-03-20', 'ana@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269234567', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ana', 'Anic', '1998-07-10', 'ana@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Mila', 'Milic', '1997-04-12', 'mila@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ivan', 'Ivanic', '1996-09-03', 'ivan@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Jelena', 'Jelenic', '1994-06-18', 'jelena@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Stefan', 'Stefanic', '1991-11-02', 'stefan@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Tamara', 'Tamaric', '1993-02-14', 'tamara@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Nemanja', 'Nemanjic', '1989-09-30', 'nemanja@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Jelena', 'Bokic', '1991-02-11', 'manager.kotorskizaliv@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000001', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ivana', 'Budimir', '1993-06-14', 'manager.budva@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000002', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Petar', 'Duric', '1989-09-02', 'manager.durmitor@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000003', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Milena', 'Stefanic', '1990-03-25', 'manager.svetistefan@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000004', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Luka', 'Jovanovic', '1988-12-01', 'manager.podgorica@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000005', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Sanja', 'Ilic', '1992-04-18', 'manager.hercegnovi@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000006', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Nikola', 'Sretenovic', '1991-08-09', 'manager.bar@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000007', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Amar', 'Jovic', '1994-01-30', 'manager.ulcinj@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000008', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Teodora', 'Jokic', '1990-11-19', 'manager.cetinje@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000009', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Vuk', 'Milivojevic', '1987-07-12', 'manager.niksic@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000010', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Jovana', 'Stojanovic', '1993-05-21', 'manager.tivat@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000011', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Milos', 'Stanojevic', '1989-10-05', 'manager.igalo@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000012', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Katarina', 'Milanovic', '1992-02-27', 'manager.njegusi@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000013', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Stefan', 'Obradovic', '1991-06-30', 'manager.lovcen@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000014', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Marija', 'Markovic', '1990-09-17', 'manager.skadarsko@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000015', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Dusan', 'Miladinovic', '1988-01-08', 'manager.kolasin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000016', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Andjela', 'Petrovic', '1994-03-13', 'manager.zabljak@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000017', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
 ('Marija', 'Misic', '1995-11-10', 'manager.pluzine@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000018', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Jovan', 'Mikic', '1990-01-03', 'manager.andrijevica@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000019', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Marijan', 'Peric', '1996-07-29', 'manager.plav@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269000020', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
 ('Lucia', 'Romero', '1988-05-14', 'lucia.admin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+34600000001', 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Carmen', 'Alvarez', '1992-09-08', 'carmen.creator@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+34600000002', 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Mateo', 'Garcia', '1990-02-11', 'manager.barcelona@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+34600000003', 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Javier', 'Ortega', '1989-11-03', 'manager.madrid@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+34600000004', 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Paula', 'Moreno', '1991-07-22', 'manager.valencia@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+34600000005', 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Diego', 'Santos', '1996-04-18', 'diego.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Sofia', 'Marin', '1997-01-26', 'sofia.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Elena', 'Ruiz', '1995-10-10', 'elena.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Spanija', 'es', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png');


-- ============================================
-- 4. DESTINATIONS
-- ============================================
INSERT INTO "Destinations"
("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Kotorski zaliv', 'Kotorski zaliv je jedan od najlepših prirodnih zaliva na Jadranu, poznat po strmim planinama koje se spuštaju direktno u more i stvaraju spektakularan pejzaž. Njegova obala ispunjena je istorijskim gradovima poput Kotora i Perasta, bogatim kulturnim nasleđem i autentičnom mediteranskom atmosferom. Idealna je destinacija za ljubitelje prirode, istorije i mirnog odmora uz more.',
 ST_SetSRID(ST_MakePoint(18.770, 42.430), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Zaliv'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Kotor', 'Kotor je istorijski primorski grad smešten u srcu Bokokotorskog zaliva, poznat po očuvanom starom gradu pod zaštitom UNESCO-a. Njegove uske kamene ulice, trgovi i srednjovekovne zidine pričaju bogatu priču o prošlosti i kulturi ovog kraja. Idealan je za istraživanje, šetnje i uživanje u autentičnoj mediteranskoj atmosferi.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Budva', 'Budva je jedan od najpoznatijih turističkih gradova na crnogorskom primorju, poznat po dugim plažama, živahnom noćnom životu i bogatoj istoriji. Stari grad Budve očarava uskim kamenim ulicama, tvrđavama i pogledom na more. Idealna je destinacija za one koji žele spoj opuštanja na plaži i dinamične zabave.',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Durmitor', 'Durmitor je veličanstveni planinski masiv i nacionalni park, poznat po netaknutoj prirodi, gustim šumama i kristalno čistim jezerima. Dom je čuvenog Crnog jezera i dubokih kanjona poput Tare, jednog od najdubljih u Evropi. Idealan je za ljubitelje avanture, planinarenja i boravka u prirodi.',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Nacionalni Park'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Sveti Stefan', 'Sveti Stefan je jedno od najprepoznatljivijih mesta na crnogorskom primorju, poznato po jedinstvenom ostrvu povezanom uskim peščanim sprudom sa kopnom. Nekada ribarsko naselje, danas je luksuzna destinacija sa prelepim pogledom na more. Idealno je za miran odmor i uživanje u ekskluzivnoj atmosferi.',
 ST_SetSRID(ST_MakePoint(18.890, 42.255), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Obala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Podgorica', 'Podgorica je glavni grad Crne Gore, spoj modernog urbanog života i bogate istorije. Grad nudi raznovrsne kulturne sadržaje, restorane i zelene površine, uz reke koje mu daju poseban šarm. Dobra je polazna tačka za istraživanje ostatka zemlje.',
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Herceg Novi', 'Herceg Novi je primorski grad na ulazu u Bokokotorski zaliv, poznat po stepenicama, tvrđavama i bujnoj mediteranskoj vegetaciji. Njegova stara gradska jezgra i šetališta uz more pružaju autentičan doživljaj primorja. Idealan je za opuštanje, šetnje i uživanje u blagoj klimi.',
 ST_SetSRID(ST_MakePoint(18.537, 42.453), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Bar', 'Bar je primorski grad poznat po velikoj luci, dugim plažama i spoju modernog i istorijskog dela grada. Stari Bar, smešten u zaleđu, čuva bogatu prošlost kroz ruševine, tvrđave i autentičnu arhitekturu. Idealan je za istraživanje istorije i uživanje u opuštenoj atmosferi na moru.',
 ST_SetSRID(ST_MakePoint(19.100, 42.093), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Ulcinj', 'Ulcinj je najjužniji grad na crnogorskom primorju, poznat po dugim peščanim plažama i jedinstvenoj kulturi. Velika plaža i Ada Bojana privlače ljubitelje prirode, sportova na vodi i opuštanja. Grad odiše orijentalnim uticajem i posebnom energijom.',
 ST_SetSRID(ST_MakePoint(19.224, 41.929), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Cetinje', 'Cetinje je istorijska prestonica Crne Gore, bogata kulturnim i nacionalnim značajem. Grad je poznat po muzejima, manastirima i starim zgradama koje svedoče o burnoj prošlosti. Idealan je za ljubitelje istorije, umetnosti i mirnijeg tempa života.',
 ST_SetSRID(ST_MakePoint(18.924, 42.390), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Niksic', 'Nikšić je drugi po veličini grad u Crnoj Gori, poznat po prostranim trgovima, parkovima i bogatom kulturnom životu. Grad ima dugu industrijsku i istorijsku tradiciju, ali i brojne manifestacije i događaje tokom godine. Okružen je prirodom, jezerima i planinama, što ga čini pogodnim za izlete i odmor.',
 ST_SetSRID(ST_MakePoint(18.956, 42.773), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Tivat', 'Tivat je moderan primorski grad poznat po luksuznoj marini Porto Montenegro i uređenim šetalištima uz more. Kombinuje savremeni turizam sa opuštenom mediteranskom atmosferom i lepim plažama. Idealan je za uživanje u moru, restoranima i elegantnom ambijentu.',
 ST_SetSRID(ST_MakePoint(18.693, 42.434), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
 ('Igalo', 'Igalo je poznato po banjskom turizmu i Institutu „Dr Simo Milošević“, koji privlači posetioce zbog zdravstvenih i rehabilitacionih tretmana. Smešteno je uz more, u blizini Herceg Novog, sa dugim šetalištima i prijatnom klimom. Pogodno je za opuštanje, zdravlje i miran odmor.',
 ST_SetSRID(ST_MakePoint(18.516, 42.460), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Banja'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
 ('Lovcen', 'Lovćen je planina i nacionalni park koji predstavlja simbol crnogorske istorije i identiteta. Poznat je po Njegoševom mauzoleju, sa kog se pruža spektakularan pogled na more i unutrašnjost zemlje. Idealan je za planinarenje, istraživanje prirode i uživanje u panoramama.',
 ST_SetSRID(ST_MakePoint(18.839, 42.399), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Planina'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Skadarsko jezero', 'Skadarsko jezero je najveće jezero na Balkanu, poznato po bogatom biodiverzitetu i netaknutoj prirodi. Dom je brojnih vrsta ptica i tradicionalnih ribarskih sela duž obale. Savršeno je za vožnju čamcem, posmatranje ptica i opuštanje u prirodi.',
 ST_SetSRID(ST_MakePoint(19.300, 42.200), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Kolasin', 'Kolašin je planinski grad na severu Crne Gore, poznat po svežem vazduhu, prirodi i ski centrima. Okružen je planinama i nacionalnim parkovima, što ga čini odličnim za zimske sportove i letnje avanture. Idealan je za odmor u prirodi tokom cele godine.',
 ST_SetSRID(ST_MakePoint(19.522, 42.822), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Zabljak', 'Žabljak je najviši grad na Balkanu, smešten u srcu Nacionalnog parka Durmitor. Poznat je po Crnom jezeru, planinskim pejzažima i brojnim avanturističkim aktivnostima poput planinarenja i skijanja. Idealan je za ljubitelje prirode i aktivnog odmora tokom cele godine.',
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
('Pluzine', 'Plužine su mali planinski grad poznat po blizini Pivskog jezera i impresivnim prirodnim pejzažima. Okružene su planinama i kanjonima, pružajući mir i netaknutu prirodu. Savršene su za opuštanje, kampovanje i istraživanje prirodnih lepota.',
 ST_SetSRID(ST_MakePoint(18.84090, 43.15385), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Andrijevica', 'Andrijevica je miran grad na severu Crne Gore, smešten u podnožju planina Komovi i Prokletije. Poznata je po prirodnim lepotama, rekama i gostoprimstvu lokalnog stanovništva. Idealna je za ljubitelje planinarenja i autentičnog planinskog ambijenta.',
 ST_SetSRID(ST_MakePoint(19.78658, 42.73596), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
('Plav', 'Plav je slikovit planinski grad smešten u podnožju Prokletija, poznat po Plavskom jezeru i netaknutoj prirodi. Okružen planinama, rekama i šumama, pruža savršene uslove za odmor i boravak u prirodi. Idealan je za planinarenje, istraživanje i uživanje u mirnom ambijentu.',
 ST_SetSRID(ST_MakePoint(19.93965, 42.59941), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW());

WITH manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Kotorski zaliv', 'manager.kotorskizaliv@spirego.com'),
        ('Kotor', 'marko@spirego.com'),
        ('Budva', 'manager.budva@spirego.com'),
        ('Durmitor', 'manager.durmitor@spirego.com'),
        ('Sveti Stefan', 'manager.svetistefan@spirego.com'),
        ('Podgorica', 'manager.podgorica@spirego.com'),
        ('Herceg Novi', 'manager.hercegnovi@spirego.com'),
        ('Bar', 'manager.bar@spirego.com'),
        ('Ulcinj', 'manager.ulcinj@spirego.com'),
        ('Cetinje', 'manager.cetinje@spirego.com'),
        ('Niksic', 'manager.niksic@spirego.com'),
        ('Tivat', 'manager.tivat@spirego.com'),
        ('Igalo', 'manager.igalo@spirego.com'),
        ('Lovcen', 'manager.lovcen@spirego.com'),
        ('Skadarsko jezero', 'manager.skadarsko@spirego.com'),
        ('Kolasin', 'manager.kolasin@spirego.com'),
        ('Zabljak', 'manager.zabljak@spirego.com'),
        ('Pluzine', 'manager.pluzine@spirego.com'),
        ('Andrijevica', 'manager.andrijevica@spirego.com'),
        ('Plav', 'manager.plav@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Destinations" d
SET "ManagedByUserId" = m.manager_id
FROM manager_assignments m
WHERE d."Id" = m.destination_id;

WITH manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Kotorski zaliv', 'manager.kotorskizaliv@spirego.com'),
        ('Kotor', 'marko@spirego.com'),
        ('Budva', 'manager.budva@spirego.com'),
        ('Durmitor', 'manager.durmitor@spirego.com'),
        ('Sveti Stefan', 'manager.svetistefan@spirego.com'),
        ('Podgorica', 'manager.podgorica@spirego.com'),
        ('Herceg Novi', 'manager.hercegnovi@spirego.com'),
        ('Bar', 'manager.bar@spirego.com'),
        ('Ulcinj', 'manager.ulcinj@spirego.com'),
        ('Cetinje', 'manager.cetinje@spirego.com'),
        ('Niksic', 'manager.niksic@spirego.com'),
        ('Tivat', 'manager.tivat@spirego.com'),
        ('Igalo', 'manager.igalo@spirego.com'),
        ('Lovcen', 'manager.lovcen@spirego.com'),
        ('Skadarsko jezero', 'manager.skadarsko@spirego.com'),
        ('Kolasin', 'manager.kolasin@spirego.com'),
        ('Zabljak', 'manager.zabljak@spirego.com'),
        ('Pluzine', 'manager.pluzine@spirego.com'),
        ('Andrijevica', 'manager.andrijevica@spirego.com'),
        ('Plav', 'manager.plav@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Users" u
SET "ManagedDestinationId" = m.destination_id
FROM manager_assignments m
WHERE u."Id" = m.manager_id;

-- ============================================
-- 5. LOCALITIES
-- ============================================
INSERT INTO "Localities"
("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
VALUES
('Stari grad Budva', 'Istorijsko jezgro Budve sa zidinama, trgovima i uskim ulicama',
 ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Centar Podgorice', 'Centralna gradska zona Podgorice sa trgovima, kaficima i institucijama',
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Crno jezero', 'Poznati prirodni lokalitet u blizini Zabljaka i Durmitora',
 ST_SetSRID(ST_MakePoint(19.091, 43.146), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Plaza Mogren', 'Jedna od najlepsih plaza na Jadranu',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Plaza'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Setaliste Pet Danica', 'Poznato setaliste uz more u Herceg Novom',
 ST_SetSRID(ST_MakePoint(18.537, 42.451), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Setaliste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Stari Bar', 'Istorijska lokacija i stari utvrdjeni deo Bara',
 ST_SetSRID(ST_MakePoint(19.140, 42.097), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Velika plaza', 'Poznata pescana plaza i obalna zona u Ulcinju',
 ST_SetSRID(ST_MakePoint(19.238, 41.906), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Plaza'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Stari grad Kotor', 'Srednjovekovno gradsko jezgro Kotora pod zastitom UNESCO-a',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Cetinjski manastir', 'Istorijska i duhovna lokacija od velikog znacaja',
 ST_SetSRID(ST_MakePoint(18.922, 42.391), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Trg Slobode', 'Glavni trg i centar gradskih desavanja u Niksicu',
 ST_SetSRID(ST_MakePoint(18.956, 42.774), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Trg'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Porto Montenegro', 'Marina i luksuzna obalna zona u Tivtu',
 ST_SetSRID(ST_MakePoint(18.694, 42.434), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Marina'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Spomen park Slobode Niksic',  'Memorijalni park posvećen istorijskim događajima i borcima',
 ST_SetSRID(ST_MakePoint(18.943, 42.773), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Spomen park'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Njegusi', 'Naselje u podnozju Lovcena',
 ST_SetSRID(ST_MakePoint(18.82640, 42.43007), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Virpazar', 'Malo mesto na obali Skadarskog jezera, polazna tacka za ture',
 ST_SetSRID(ST_MakePoint(19.091, 42.246), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Biogradsko jezero', 'Lednicko jezero u nacionalnom parku Biogradska gora',
 ST_SetSRID(ST_MakePoint(19.565, 42.890), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
('Centar Zabljaka', 'Glavna turisticka zona Zabljaka',
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Petrovac', 'Primorsko turističko mesto poznato po plažama, šetalištu i starom gradu',
 ST_SetSRID(ST_MakePoint(18.942, 42.205), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Muo', 'Primorsko naselje u Bokokotorskom zalivu, nasuprot starom gradu Kotora, poznato po mirnoj obali i pogledu na zaliv',
 ST_SetSRID(ST_MakePoint(18.762, 42.445), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Dobrota', 'Primorsko naselje u Bokokotorskom zalivu, poznato po dugoj obali, vilama i pogledu na Kotor',
 ST_SetSRID(ST_MakePoint(18.768, 42.448), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Cetinja', 'Uži gradski centar Cetinja sa muzejima, institucijama i istorijskim zgradama',
 ST_SetSRID(ST_MakePoint(18.942, 42.390), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Herceg Novog', 'Glavna gradska zona sa šetalištem, trgovima i starim gradom',
 ST_SetSRID(ST_MakePoint(18.536, 42.453), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()), 

 ('Ostrog', 'Jedan od najpoznatijih pravoslavnih manastira u regionu, uklesan u stenu i mesto hodočašća',
 ST_SetSRID(ST_MakePoint(19.028, 42.683), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Budve', 'Glavna gradska zona Budve sa trgovima, prodavnicama, kafićima i turističkim sadržajem',
 ST_SetSRID(ST_MakePoint(18.836, 42.288), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Igala', 'Deo Igalo Banje pored mora',
 ST_SetSRID(ST_MakePoint(18.509, 42.460), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Orahovac', 'Malo primorsko naselje u Bokokotorskom zalivu, poznato po mirnoj obali, maslinjacima i čistom moru',
 ST_SetSRID(ST_MakePoint(18.756, 42.491), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Kamenari', 'Primorsko naselje u Bokokotorskom zalivu poznato po trajektnoj liniji Kamenari–Lepetane i lepom pogledu na zaliv',
 ST_SetSRID(ST_MakePoint(18.674, 42.467), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Bara', 'Glavna gradska zona Bara sa trgovima, prodavnicama, lukom i šetalištem',
 ST_SetSRID(ST_MakePoint(19.099, 42.097), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Grahovac', 'Naselje u zaleđu Boke Kotorske, poznato po prirodi i istorijskom značaju Grahova',
 ST_SetSRID(ST_MakePoint(18.617, 42.686), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Tudjemili', 'Naselje u blizini Bara, poznato po istorijskom značaju i ostacima starog grada na brdu iznad obale',
 ST_SetSRID(ST_MakePoint(19.120, 42.110), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Fundina', 'Ruralno planinsko naselje u severnom delu Crne Gore, poznato po prirodi i tradicionalnom načinu života',
 ST_SetSRID(ST_MakePoint(19.692, 42.641), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Centar Niksica', 'Glavna gradska zona Nikšića sa trgovima, kafićima, institucijama i urbanim sadržajem',
 ST_SetSRID(ST_MakePoint(18.944, 42.774), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Canj', 'Malo turističko primorsko naselje poznato po dugoj peščanoj plaži između Bara i Budve',
 ST_SetSRID(ST_MakePoint(19.033, 42.124), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Kotora', 'Glavna gradska zona Kotora sa starim gradom, trgovima, lukom i turističkim sadržajem',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Tivta', 'Glavna gradska zona Tivta sa šetalištem, trgovima, marinom i turističkim sadržajem',
 ST_SetSRID(ST_MakePoint(18.712, 42.440), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Kolasina', 'Glavna gradska zona Kolašina sa trgovima, hotelima i turističkim sadržajem, polazna tačka za planine',
 ST_SetSRID(ST_MakePoint(19.516, 42.823), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Slovenska plaza', 'Najveća i najpoznatija plaža u Budvi, duga šljunkovito-peščana obala sa bogatim turističkim sadržajem',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Plaza'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Lustica', 'Poluostrvo na ulazu u Bokokotorski zaliv, poznato po prirodi, plažama i autentičnim selima',
 ST_SetSRID(ST_MakePoint(18.620, 42.370), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Centar Ulcinja', 'Glavna gradska zona Ulcinja sa starim gradom, trgovima, restoranima i turističkim sadržajem',
 ST_SetSRID(ST_MakePoint(19.224, 41.924), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Perast', 'Malo barokno primorsko mesto u Bokokotorskom zalivu, poznato po istorijskoj arhitekturi i ostrvima Gospa od Škrpjela i Sveti Đorđe',
 ST_SetSRID(ST_MakePoint(18.689, 42.486), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Radanovici', 'Naselje u opštini Kotor, poznato kao saobraćajno i trgovačko čvorište između Budve i Kotora',
 ST_SetSRID(ST_MakePoint(18.752, 42.362), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Tuzi', 'Gradsko naselje i opština u blizini Podgorice, poznato po multikulturalnoj zajednici i poljoprivredi',
 ST_SetSRID(ST_MakePoint(19.335, 42.365), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Gradjani', 'Naselje u blizini Cetinja, pretežno stambeno područje sa tradicionalnim crnogorskim ambijentom',
 ST_SetSRID(ST_MakePoint(19.00392, 42.27452), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Podostrog', 'Naselje u Budvi poznato po manastiru Podostrog i mirnijem delu grada iznad turističke zone',
 ST_SetSRID(ST_MakePoint(18.83346, 42.30500), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Becici', 'Popularno turističko naselje pored Budve, poznato po dugoj peščanoj plaži i hotelima',
 ST_SetSRID(ST_MakePoint(18.86981, 42.28282), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Imanje', 'Naselje u okolini Podgorice, mirno područje sa kombinacijom stambenih objekata i prirodnog okruženja',
 ST_SetSRID(ST_MakePoint(19.18842, 42.447190), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Moraca', 'Područje uz reku Moraču u opštini Kolašin, poznato po kanjonima, prirodi i planinskom pejzažu',
 ST_SetSRID(ST_MakePoint(19.401, 42.812), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

 ('Prcanj', 'Primorsko naselje u Bokokotorskom zalivu, poznato po baroknim crkvama i dugoj pomorskoj tradiciji',
 ST_SetSRID(ST_MakePoint(18.75221, 42.44778), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Centar Andrijevice', 'Centar grada Andrijevice',
 ST_SetSRID(ST_MakePoint(19.787, 42.738), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Centar Pluzina', 'Centar grada Pluzina',
 ST_SetSRID(ST_MakePoint(18.839, 43.152), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Pivsko jezero', 'Vještačko jezero u blizini Pluzina, poznato po pejzažima',
 ST_SetSRID(ST_MakePoint(18.837, 43.147), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Komarnica', 'Kanjon Komarnice i okolno područje',
 ST_SetSRID(ST_MakePoint(19.045, 43.029), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Sutomore', 'Poznato turističko naselje sa dugom peščanom plažom i bogatim noćnim životom',
 ST_SetSRID(ST_MakePoint(19.0435, 42.1442), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Katuni', 'Planinsko područje sa tradicionalnim katunima, poznato po stočarstvu i prirodi',
 ST_SetSRID(ST_MakePoint(19.6713, 42.7518), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Tresnjevik', 'Planinski prevoj i izletište poznato po prirodi i pogledu na Komove',
 ST_SetSRID(ST_MakePoint(19.6988, 42.7431), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Vidikovac'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Kralje', 'Ruralno naselje u opštini Andrijevica, poznato po prirodi i tradicionalnom načinu života',
 ST_SetSRID(ST_MakePoint(19.7547, 42.7358), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Kuti', 'Planinsko naselje okruženo prirodom, pogodno za odmor i boravak u mirnom okruženju',
 ST_SetSRID(ST_MakePoint(19.7812, 42.6163), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Rijeka Crnojevica', 'Malo istorijsko mesto i izletište na obali reke, poznato po mostu i prirodi',
 ST_SetSRID(ST_MakePoint(19.0267, 42.3556), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Izletiste'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Lipa', 'Ruralno naselje u blizini Cetinja, poznato po prirodi i blizini Lipske pećine',
 ST_SetSRID(ST_MakePoint(18.9532, 42.3721), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Kanjon Tare', 'Jedan od najdubljih kanjona u Evropi, poznat po raftingu i netaknutoj prirodi',
 ST_SetSRID(ST_MakePoint(19.300, 43.150), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Prirodni lokalitet'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Curevac', 'Vidikovac iznad kanjona Tare sa spektakularnim pogledom na prirodu Durmitora',
 ST_SetSRID(ST_MakePoint(19.0929, 43.2014), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Vidikovac'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Kameno', 'Ruralno naselje u zaleđu Herceg Novog, poznato po prirodi i mirnom okruženju',
 ST_SetSRID(ST_MakePoint(18.5298, 42.4789), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Podi', 'Naselje iznad Herceg Novog sa panoramskim pogledom na more i zaliv',
 ST_SetSRID(ST_MakePoint(18.5442, 42.4621), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Naselje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),
 
 ('Tvrdjava Onogost', 'Istorijska tvrđava u Nikšiću poznata kao Bedem, mesto održavanja kulturnih i muzičkih događaja.',
 ST_SetSRID(ST_MakePoint(18.9417, 42.7748), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Tvrdjava'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW());

-- Lokalitetima upravlja menadzer dodeljen destinaciji kojoj pripadaju.
UPDATE "Localities" l
SET "CreatedByUserId" = d."ManagedByUserId",
    "UpdatedAt" = NOW()
FROM "Destinations" d
WHERE l."DestinationId" = d."Id"
  AND d."ManagedByUserId" IS NOT NULL;



-- ============================================
-- 6. OBJECTS
-- ============================================
INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Vardar', 'Hotel u srcu starog grada Kotora', 'Stari grad Kotor', '+38232345678', 'https://hotelvardar.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 145.00, ARRAY['WiFi', 'Parking', 'Spa', 'Dorucak'], ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restoran Galion', 'Restoran sa pogledom na zaliv', 'Skaljari bb, Kotor', '+38232345679', 'https://galion.me',
 'https://galion.me/menu/', 'Mediteranska i morski plodovi', '{"pon":"10:00-23:00"}', 35.00, ARRAY['WiFi', 'Terasa', 'Pogled na more', 'Rezervacije'], ST_SetSRID(ST_MakePoint(18.768, 42.427), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Avala', 'Luksuzni hotel pored mora', 'Budva centar', '+38233456789', 'https://avala.me',
 'https://www.avalaresort.com/explore', NULL, '{"pon":"00:00-24:00"}', 180.00, ARRAY['WiFi', 'Bazen', 'Spa', 'Parking', 'Dorucak'], ST_SetSRID(ST_MakePoint(18.838, 42.279), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Mogren Beach Bar', 'Bar na plazi', 'Plaza Mogren', '+38233456780', 'https://mogren2.me/en',
 'https://www.dotyourspot.com/EfQ3u4/', 'Mediteranska i bar food', '{"pon":"08:00-02:00"}', 12.00, ARRAY['Terasa', 'Pogled na more', 'Kokteli', 'Muzika'], ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Planinarski dom Durmitor', 'Dom za planinare na Durmitoru', 'Durmitor bb', '+38233456781', NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 55.00, ARRAY['Parking', 'Restoran', 'Grejanje', 'Pogled na planinu'], ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Planinarski dom'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Biblioteka Niksic', 'Gradska biblioteka u Nikšiću', 'Alekse Backovića, Nikšić',  NULL, 'http://bibliotekank.me/',
 NULL, NULL, '{"pon":"08:00-20:00"}', NULL, ARRAY['WiFi', 'Citaonica', 'Klimatizovano'], ST_SetSRID(ST_MakePoint(18.94548, 42.78035), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Crkva Svetog Nikole Bar', 'Pravoslavna crkva u Starom Baru', 'Stari Bar', NULL, NULL,
 NULL, NULL, '{"pon":"06:00-18:00"}', NULL, ARRAY['Vodic', 'Mirno okruzenje'], ST_SetSRID(ST_MakePoint(19.142, 42.097), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Restoran Jezero', 'Restoran sa pogledom na Skadarsko jezero',  'Virpazar bb', '+38267148101', 'https://www.plantaze.com/restoran-jezero/',
 'https://www.plantaze.com/restoran-jezero/', 'Crnogorska i riblji specijaliteti', '{"pon":"09:00-22:00"}', 22.00, ARRAY['Terasa', 'Pogled na jezero', 'Parking', 'Rezervacije'], ST_SetSRID(ST_MakePoint(19.123, 42.272), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Hotel Bianca Kolasin', 'Popularan hotel u Kolasinu',  'Mirka Vešovića, Kolašin', '+38220863000', 'https://www.biancaresort.com/',
 'https://www.biancaresort.com/explore', NULL, '{"pon":"00:00-24:00"}', 130.00, ARRAY['WiFi', 'Spa', 'Parking', 'Dorucak', 'Ski ostava'], ST_SetSRID(ST_MakePoint(19.517, 42.824), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

 ---RESTORANI---

 ('Konoba Scala Santa', 'Tradicionalna crnogorska kuhinja u srcu Kotora', 'Trg od Salate, Kotorski zaliv', '+38267393458', NULL,
 NULL, 'Crnogorska kuhinja', '{"pon":"09:00-23:00"}', 25.00, ARRAY['Terasa', 'Tradicionalna kuhinja', 'Rezervacije'], ST_SetSRID(ST_MakePoint(18.772, 42.424), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restoran Pod Volat', 'Poznat po rostilju i domacoj hrani', '1 Trg Vojvode Bećira Osmanagića, Podgorica', '+38269618633', NULL,
 NULL, 'Balkanska kuhinja', '{"pon":"08:00-22:00"}', 18.00, ARRAY['Rostilj', 'WiFi', 'Brza usluga'], ST_SetSRID(ST_MakePoint(19.260, 42.435), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('MayaBay Porto Montenegro', 'Luksuzni azijski restoran u okviru Porto Montenegro marine', 'Porto Montenegro, Tivat', '+38269352221', 'https://mayabay.me/',
 NULL, 'Azijska kuhinja', '{"pon":"12:00-00:00"}', 45.00, ARRAY['Pogled na marinu', 'Luksuzni enterijer', 'Kokteli', 'Terasa'], ST_SetSRID(ST_MakePoint(18.694, 42.434), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Konoba Batricevic Njegusi', 'Domaca hrana i specijaliteti od prsute i sira', 'Selo Njegusi', '+38220000007', NULL,
 NULL, 'Tradicionalna kuhinja', '{"pon":"09:00-21:00"}', 20.00, ARRAY['Domaca hrana', 'Parking', 'Pogled na planinu'], ST_SetSRID(ST_MakePoint(18.82297, 42.43828), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restoran Ulcinj Sunset', 'Restoran sa pogledom na zalazak sunca na Velikoj plazi', 'Ulcinjskih moreplovaca', '+38269683122', NULL,
 NULL, 'Mediteranska kuhinja', '{"pon":"10:00-23:00"}', 28.00, ARRAY['Pogled na more', 'Terasa', 'Kokteli'], ST_SetSRID(ST_MakePoint(19.20534, 41.92144), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restaurant OrO', 'Popularan restoran u centru Zabljaka sa lokalnim i evropskim specijalitetima', 'Njegoševa, Žabljak', '+38269406210', 'http://www.restaurantoro.me/',
 NULL, 'Crnogorska i evropska kuhinja', '{"pon":"08:00-01:00"}', 20.00, ARRAY['WiFi', 'Terasa', 'Rezervacije', 'Porodicno okruzenje'], ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---HOTELI---

('Regent Porto Montenegro', 'Luksuzni hotel u marini Porto Montenegro', 'Porto Montenegro, Obala Bb, Tivat', '+382660660', 'https://www.regenthotels.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 320.00, ARRAY['Spa', 'Bazen', 'Marina pogled', 'Fitness', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.694, 42.434), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Splendid Conference & Spa Resort', 'Luksuzni resort na obali', 'Bečići bb, Budva', '+38233773777', 'https://www.splendid.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 250.00, ARRAY['Spa', 'Privatna plaza', 'Bazen', 'Fitness', 'Restoran'],
 ST_SetSRID(ST_MakePoint(18.876, 42.284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Becici'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hyatt Regency Kotor Bay Resort', 'Moderni resort sa pogledom na zaliv', 'Dobrota, Kotor', '+38232311500', 'https://www.hyatt.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 280.00, ARRAY['Spa', 'Bazen', 'More view', 'Parking', 'Fitness'],
 ST_SetSRID(ST_MakePoint(18.776, 42.454), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Palmon Bay', 'Spa hotel uz more u Igalu', 'Igalo, Herceg Novi', '+38231777777', 'https://www.palmonbay.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 160.00, ARRAY['Spa', 'Bazen', 'Plaza', 'Wellness', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.514, 42.460), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Lazure Hotel & Marina', 'Boutique hotel u obnovljenoj luci', 'Meljine, Herceg Novi', '+38231333000', 'https://www.lazure.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 210.00, ARRAY['Marina', 'Spa', 'Bazen', 'Restoran', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.536, 42.451), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Palas', 'Porodični hotel na plaži', 'Petrovac na Moru', '+38233421000', 'https://www.hotelpalas.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 140.00, ARRAY['Plaza', 'Bazen', 'Restoran', 'Parking', 'WiFi'],
 ST_SetSRID(ST_MakePoint(18.942, 42.206), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Forza Mare', 'Luksuzni boutique hotel na obali mora sa tematskim sobama i privatnom plažom', 'Dobrota bb, Kotor', '+38232301100', 'https://forzamare.com/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 260.00, ARRAY['WiFi', 'Privatna plaza', 'Spa', 'Bazen', 'Parking', 'Restoran'], ST_SetSRID(ST_MakePoint(18.762, 42.441), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Princess', 'Hotel uz more i šetalište', 'Bar centar', '+38230310000', 'https://www.hotelprincess.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 120.00, ARRAY['Bazen', 'Plaza', 'Restoran', 'Parking'],
 ST_SetSRID(ST_MakePoint(19.097, 42.093), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel CentreVille Podgorica', 'Moderan poslovni hotel', 'Podgorica centar', '+38220402500', 'https://www.centerville.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 110.00, ARRAY['WiFi', 'Parking', 'Restoran', 'Fitness'],
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Polar Star', 'Planinski hotel u prirodi', 'Žabljak centar', '+38252230303', 'https://www.polarstar.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 100.00, ARRAY['Grejanje', 'Parking', 'Restoran', 'Planinski pogled'],
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---KAFANE---
 ('Gradska kafanica Zabljak', 'Tradicionalna kafana sa domaćom crnogorskom kuhinjom u rustičnom ambijentu', '3 Vuka Karadžića, Žabljak', '+38268132101', NULL,
 NULL, 'Crnogorska kuhinja', '{"pon":"09:00-23:00"}', 20.00, ARRAY['Parking', 'Domaca hrana', 'Basta', 'Porodicno okruzenje'], ST_SetSRID(ST_MakePoint(19.124, 43.156), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafana'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Konoba Stari Grad', 'Kafana poznata po roštilju i narodnoj muzici', '12 Njegoševa, Budva', '+38233454443', NULL,
 NULL, 'Balkanska kuhinja', '{"pon":"10:00-02:00"}', 17.00, ARRAY['Ziva muzika', 'Rostilj', 'Kokteli', 'Basta'], ST_SetSRID(ST_MakePoint(18.837, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafana'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Kafana Markovic', 'Tradicionalna crnogorska kafana poznata po domaćoj hrani i opuštenoj atmosferi', 'Bulevar Svetog Petra Cetinjskog, Podgorica', '+38267266667', NULL,
 NULL, 'Crnogorska kuhinja', '{"pon":"08:00-23:00"}', 16.00, ARRAY['Rostilj', 'Domaca hrana', 'Brza usluga', 'Basta'], ST_SetSRID(ST_MakePoint(19.28571, 42.45234), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafana'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---Planinarski domovi---

('Planinarski dom Skrka', 'Planinarski dom u srcu Durmitora, polazna tačka za planinske ture i alpinizam', 'Škrka, Durmitor', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 35.00, ARRAY['Smještaj', 'Grejanje', 'Planinske ture', 'Voda'], ST_SetSRID(ST_MakePoint(19.045, 43.130), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Planinarski dom'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Planinarski dom Vranjak', 'Planinarski dom na planini Bjelasici, poznat po zimskim sportovima i planinskom turizmu', 'Bjelasica, Kolašin', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 40.00, ARRAY['Smještaj', 'Ski pristup', 'Grejanje', 'Planinarenje'], ST_SetSRID(ST_MakePoint(19.620, 42.830), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Planinarski dom'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---Biblioteke---

 ('Nacionalna biblioteka Crne Gore Djurdje Crnojevic', 'Centralna nacionalna biblioteka Crne Gore smještena u istorijskom jezgru Cetinja', '163 Bulevar Crnogorskih Junaka, Cetinje', '+38241231143', 'https://nbc-cg.me',
 NULL, NULL, '{"pon":"08:00-20:00"}', NULL, ARRAY['Čitaonica', 'Arhiv', 'Istraživački centar', 'WiFi'], ST_SetSRID(ST_MakePoint(18.915, 42.395), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Narodna biblioteka Radosav Ljumovic', 'Glavna gradska biblioteka u Podgorici sa bogatim fondom knjiga i kulturnim programima', 'Bokeška, Podgorica', '+38220664715', 'http://www.nbpg.me/',
 NULL, NULL, '{"pon":"08:00-20:00"}', NULL, ARRAY['Čitaonica', 'WiFi', 'Događaji', 'Knjige'], ST_SetSRID(ST_MakePoint(19.262, 42.442), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Gradska biblioteka i citaonica Herceg Novi', 'Javna biblioteka sa dugom tradicijom i kulturnim programima u Herceg Novom', 'Trg Herceg Stjepana 6, Herceg Novi', '+38231321900', 'http://www.bibliotekahercegnovi.co.me/',
 NULL, NULL, '{"pon":"08:00-20:00"}', NULL, ARRAY['Čitaonica', 'Arhiv', 'Kultura', 'WiFi'], ST_SetSRID(ST_MakePoint(18.536, 42.452), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---Crkve---

 ('Manastir Ostrog', 'Jedan od najpoznatijih pravoslavnih manastira na Balkanu, uklesan u stijenu Ostroške grede', 'Ostrog, Nikšić', NULL, 'https://www.manastirostrog.com',
 NULL, NULL, '{"pon":"06:00-20:00"}', NULL, ARRAY['Hodočašće', 'Pogled', 'Vodič', 'Parking'], ST_SetSRID(ST_MakePoint(19.031, 42.675), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ostrog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Katedrala Svetog Tripuna', 'Rimokatolička katedrala i jedan od najstarijih spomenika u Kotoru iz 12. vijeka', 'Stari grad Kotor', '+38232336315', 'http://www.kotorskabiskupija.me/',
 NULL, NULL, '{"pon":"08:00-18:00"}', NULL, ARRAY['Istorijski spomenik', 'Vodič', 'Religijski objekat'], ST_SetSRID(ST_MakePoint(18.772, 42.424), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Crkva Svetog Nikole', 'Pravoslavna crkva u starom gradu Kotoru poznata po velikoj ikonografskoj zbirci', 'Stari grad Kotor', NULL, 'http://www.mitropolija.com/',
 NULL, NULL, '{"pon":"07:00-19:00"}', NULL, ARRAY['Ikone', 'Mirno okruzenje', 'Religija', 'Istorija'], ST_SetSRID(ST_MakePoint(18.771, 42.426), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Crkva Svetog Jovana Vladimira', 'Pravoslavna crkva u Baru posvećena prvom srpskom svecu i knezu', '38 Ulica Jovana Tomasevica, Bar', '+38230315106', 'https://www.hrambar.com/',
 NULL, NULL, '{"pon":"07:00-18:00"}', NULL, ARRAY['Religija', 'Mir', 'Istorija', 'Vjerski turizam'], ST_SetSRID(ST_MakePoint(19.094, 42.102), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 --- Apartmani ---

('Apartments Djurovic', 'Apartmani u Petrovcu plaže, pogodni za porodice', 'broj 31 XIII Ulica, Petrovac', NULL, 'https://aptsdurovic.traveleto.com/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 70.00, ARRAY['WiFi', 'Parking', 'Klima', 'Blizina plaze'], ST_SetSRID(ST_MakePoint(18.938, 42.208), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Apartments Vukovic', 'Komforni apartmani sa pogledom na Boku Kotorsku', 'Jadranska magistrala, Muo', '+38269687310', NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 85.00, ARRAY['WiFi', 'Parking', 'Terasa', 'Pogled na more'], ST_SetSRID(ST_MakePoint(18.756, 42.437), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Muo'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Lux Apartment Budva', 'Moderni apartmani u centru Budve', 'Budva centar', NULL, 'https://www.booking.com/hotel/me/lux-apartment-budva-budva2.en-gb.html?aid=2068758&utm_source=seogooglelocal&utm_medium=description&utm_term=hotel-9910187&utm_campaign=en-gb&label=seogooglelocal-link-imagesaow-hotel-9910187_grp-3_gendate-20260414',
 NULL, NULL, '{"pon":"00:00-24:00"}', 90.00, ARRAY['WiFi', 'Klima', 'Parking'], ST_SetSRID(ST_MakePoint(18.835, 42.284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Apartmani M Herceg Novi', 'Luksuzni apartmani uz more', '62 Obala Nikole Kovačevića, Igalo, Herceg - Novi,', '+38269586924', 'https://www.facebook.com/Apartmani-Milovi%C4%87-Igalo-233951910354166/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 95.00, ARRAY['WiFi', 'Bazen', 'Parking', 'Pogled na more'], ST_SetSRID(ST_MakePoint(18.511, 42.457), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Boutique Hotel Casa del Mare - Amfora', 'Boutique apartmani uz Bokokotorski zaliv', 'Orahovac bb, Kotor', '+38232305852', 'https://casadelmare.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 120.00, ARRAY['Spa', 'Privatna plaza', 'WiFi', 'Parking'], ST_SetSRID(ST_MakePoint(18.760, 42.490), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Orahovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Apartments Mijovic', 'Porodični apartmani blizu plaže', '4. Proleterske, Budva', '+38267319039', 'https://mijovic.traveleto.com/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 55.00, ARRAY['WiFi', 'Parking', 'Klima'], ST_SetSRID(ST_MakePoint(18.851, 42.293), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Durmitor View Apartments', 'Apartmani sa pogledom na planine Durmitora', 'Žabljak centar', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 60.00, ARRAY['Grejanje', 'Parking', 'Planinski pogled'], ST_SetSRID(ST_MakePoint(19.118, 43.162), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Apartments Aleksandar', 'Apartmani blizu Velike plaže', 'Velika plaža, Ulcinj', '+38269703603', NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 65.00, ARRAY['WiFi', 'Parking', 'Klima'], ST_SetSRID(ST_MakePoint(19.212, 41.924), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Villa Ljubanovic Apartments', 'Komforni apartmani u mirnom dijelu Budve', '18 Nikole Tesle, Budva', '+38269931474', 'http://www.ljubanovic.com/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 75.00, ARRAY['WiFi', 'Parking', 'Terasa'], ST_SetSRID(ST_MakePoint(18.834, 42.286), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Casa Nuova', 'Moderni apartmani za iznajmljivanje', 'Orahovac, Kotor', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', 80.00, ARRAY['WiFi', 'Moderan ambijent', 'Terasa'], ST_SetSRID(ST_MakePoint(18.770, 42.435), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Apartman'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Orahovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---SPA CENTRI---

('Banya Wellness & Spa', 'Moderan spa centar sa saunama i masažama u Podgorici', '19/2 Šeika Zaida, Podgorica', '+38267134611', 'https://www.banyawellness.com/',
 NULL, NULL, '{"pon":"09:00-22:00"}', 30.00, ARRAY['Spa', 'Sauna', 'Masaze', 'Jacuzzi'],
 ST_SetSRID(ST_MakePoint(19.243, 42.440), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spa Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Wellness Center Simo Milosevic', 'Spa i rehabilitacioni centar sa dugom tradicijom', '5 Sava Ilića, Igalo', '+38263211313', 'https://www.igalospa.com',
 NULL, NULL, '{"pon":"07:00-21:00"}', 35.00, ARRAY['Spa', 'Bazen', 'Terapije', 'Sauna'],
 ST_SetSRID(ST_MakePoint(18.513, 42.459), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spa Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Perla Residence Spa', 'Samostalni wellness i spa centar sa fokusom na relaksaciju i tretmane tela', '70 Vlada Ćetkovića, Podgorica', '+38220511511', 'http://www.perlaresidence.me/',
 NULL, NULL, '{"pon":"09:00-21:00"}', 35.00, ARRAY['Spa', 'Masaze', 'Sauna', 'Jacuzzi', 'Relax zona'],
 ST_SetSRID(ST_MakePoint(19.236, 42.453), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spa Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Huma Bay Spa', 'Ekskluzivni spa centar sa pogledom na Bokokotorski zaliv, fokus na relaksaciji i premium tretmanima', 'Dobrota 175, Kotor', '+38268888884', 'http://www.humahotel.me/',
 NULL, NULL, '{"pon":"09:00-21:00"}', 75.00, ARRAY['Spa', 'Sauna', 'Bazen', 'Masaze', 'Wellness'],
 ST_SetSRID(ST_MakePoint(18.766, 42.448), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spa Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Casa del Mare Spa', 'Boutique wellness centar sa personalizovanim spa tretmanima u mirnom okruženju', 'Kamenari 23, Herceg Novi', '+38269700702', 'https://www.casadelmare.me',
 NULL, NULL, '{"pon":"10:00-20:00"}', 65.00, ARRAY['Spa', 'Masaze', 'Sauna', 'Jacuzzi', 'Relax zona'],
 ST_SetSRID(ST_MakePoint(18.672, 42.463), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spa Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kamenari'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ---Spomenici---

 ('Spomenik Partizanu borcu na Gorici', 'Monument posvećen borcima NOB-a, jedan od simbola Podgorice', 'Brdo Gorica, Podgorica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj', 'Pogled na grad'],
 ST_SetSRID(ST_MakePoint(19.266, 42.450), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik Vladimiru i Kosari', 'Spomenik legendarnim istorijskim ličnostima Duklje', 'Ul. Vladimira Rolovića, Bar', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj', 'Turisticka atrakcija'],
 ST_SetSRID(ST_MakePoint(19.100, 42.098), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik kralju Nikoli', 'Spomenik poslednjem kralju Crne Gore', 'Trg kralja Nikole, Podgorica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj', 'Centar grada'],
 ST_SetSRID(ST_MakePoint(19.261, 42.440), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik Ljubu Cupicu', 'Spomenik narodnom heroju poznatom po osmehu pred streljanje', 'Trg Slobode, Nikšić', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(18.950, 42.773), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik palim borcima na Grahovcu', 'Spomenik posvećen bici na Grahovcu iz 1858. godine', 'Grahovac, Nikšić', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(18.637, 42.688), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Grahovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik Tudjemilima', 'Spomenik bici kod Tuđemila gde je Duklja izvojevala pobedu', 'Tuđemili, Bar', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(19.135, 42.141), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tudjemili'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik Punisi Racicu', 'Istorijski spomenik kontroverznoj ličnosti iz perioda Kraljevine Jugoslavije', 'Andrijevica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(19.787, 42.738), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Andrijevice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik herojima Bozicnog ustanka', 'Spomenik posvećen učesnicima ustanka iz 1919. godine', 'Cetinje', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(18.916, 42.394), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Spomenik bici na Fundini', 'Spomenik jednoj od najznačajnijih bitaka protiv Osmanskog carstva', 'Fundina, Podgorica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00"}', NULL, ARRAY['Istorijski znacaj'],
 ST_SetSRID(ST_MakePoint(19.360, 42.455), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fundina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('Spomenik Njegosu na Lovcenu', 'Monument posvećen Petru II Petroviću Njegošu, smešten u okviru Mauzoleja na Lovćenu', 'Lovćen, Cetinje', NULL, NULL,
 NULL, NULL, '{"pon":"08:00-18:00"}', NULL, ARRAY['Istorijski znacaj', 'Pogled', 'Kulturna bastina'],
 ST_SetSRID(ST_MakePoint(18.838, 42.400), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Spomenik'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ---KLUBOVI---

 ('Top Hill Club', 'Jedan od najpoznatijih open-air klubova na Balkanu', 'Topliški put bb, Budva', '+38267478888', 'https://tophill.me',
 NULL, NULL, '{"pon":"22:00-05:00"}', NULL, ARRAY['DJ nastupi', 'Open air', 'Koncerti', 'VIP zona'],
 ST_SetSRID(ST_MakePoint(18.822, 42.294), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),


 ('Emporio Club', 'Popularan noćni klub u Budvi', 'Mediteranska ulica, Budva', '+38268822222', NULL,
 NULL, NULL, '{"pon":"23:00-05:00"}', NULL, ARRAY['DJ', 'Kokteli', 'VIP zona'],
 ST_SetSRID(ST_MakePoint(18.837, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Maximus Club Kotor', 'Najveći noćni klub u Kotoru', 'Stari grad, Kotor', '+38267217101', NULL,
 NULL, NULL, '{"pon":"22:00-04:00"}', NULL, ARRAY['DJ nastupi', 'Koncerti', 'Eventi'],
 ST_SetSRID(ST_MakePoint(18.769, 42.426), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Omnia Nightclub', 'Ekskluzivan klub sa internacionalnim DJ nastupima', '13. Jula, Budva', '+38268040333', 'https://www.facebook.com/omniabudva',
 NULL, NULL, '{"pon":"23:00-05:00"}', NULL, ARRAY['VIP', 'DJ', 'Eventi'],
 ST_SetSRID(ST_MakePoint(18.836, 42.284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Diamond Night Club', 'Moderan noćni klub u Nikšiću', 'Gojka Garčevića bb, Nikšić', '+38267399924', NULL,
 NULL, NULL, '{"pon":"23:00-05:00"}', NULL, ARRAY['DJ', 'VIP zona', 'Kokteli'],
 ST_SetSRID(ST_MakePoint(18.947, 42.770), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Miami Club Budva', 'Popularan noćni klub u centru Budve sa DJ nastupima i letnjim žurkama', 'bb Slovenska Obala, Budva', '+38269504900', 'https://miamiclub.me',
 NULL, NULL, '{"pon":"23:00-05:00"}', 0.00, ARRAY['DJ', 'VIP zona', 'Letnja terasa', 'Kokteli'],
 ST_SetSRID(ST_MakePoint(18.840, 42.284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Madam Open Bar', 'Poznat noćni klub u Ulcinju sa komercijalnom muzikom i žurkama', 'Ulcinjskih moreplovaca, Ulcinj', NULL, NULL,
 NULL, NULL, '{"pon":"22:00-04:00"}', 0.00, ARRAY['DJ', 'VIP zona', 'Kokteli', 'Lounge'],
 ST_SetSRID(ST_MakePoint(19.207, 41.922), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.ulcinj@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Beach club Raffaelo', 'Popularan beach club i noćni klub na obali, poznat po dnevnim žurkama i večernjem programu', 'Šetalište Pet Danica, Herceg - Novi', '+38231323246', 'http://www.raffaelo.me/',
 NULL, NULL, '{"pon":"10:00-03:00"}', 0.00, ARRAY['Beach club', 'DJ', 'Ležaljke', 'Kokteli', 'Letnje žurke'],
 ST_SetSRID(ST_MakePoint(18.522, 42.457), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Montenegro Pub', 'Noćni klub u Niksicu sa modernim ambijentom, DJ nastupima i koktel barom', 'Novice Cerovića, Nikšić', NULL, NULL,
 NULL, NULL, '{"pon":"22:00-04:00"}', 0.00, ARRAY['DJ', 'Kokteli', 'Lounge', 'VIP zona'],
 ST_SetSRID(ST_MakePoint(18.951, 42.774), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()), 

 ('Night Club Ambiente', 'Popularan noćni klub u centru Budve sa DJ nastupima i letnjim žurkama', 'bb Slovenska Obala, Budva', '+38268158585', 'https://www.instagram.com/night_club_ambiente',
 NULL, NULL, '{"pon":"23:00-05:00"}', 0.00, ARRAY['DJ', 'VIP zona', 'Letnja terasa', 'Kokteli'],
 ST_SetSRID(ST_MakePoint(18.850, 42.285), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Klub'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 --- BENZINSKE PUMPE ---

('EKO Pumpa Budva', 'Benzinska pumpa u Budvi u okviru Jugopetrol mreže', 'Jadranski put bb, Budva', '+38233401950', 'http://www.jugopetrol.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'WC'],
 ST_SetSRID(ST_MakePoint(18.842, 42.286), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Petrol Podgorica', 'Petrol benzinska pumpa u Podgorici', 'BB Ilije Plamenca, Podgorica', NULL, 'https://petrol.me',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'Autopraonica'],
 ST_SetSRID(ST_MakePoint(19.244, 42.431), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('Lukoil Konik Podgorica', 'Lukoil benzinska pumpa u glavnom gradu', 'Pete Proleterske Brigade, Podgorica', '+38220219421', 'http://www.lukoil.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'Kafa'],
 ST_SetSRID(ST_MakePoint(19.274, 42.436), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('INA Skaljari Kotor', 'INA benzinska pumpa u Kotoru', 'Skaljari bb, Kotor', '+38267061664', 'https://inacg.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market'],
 ST_SetSRID(ST_MakePoint(18.765, 42.416), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kotora'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('EKO Tivat', 'EKO benzinska pumpa u Tivtu', 'Jadranska magistrala bb, Tivat', '+38232670040', 'http://www.jugopetrol.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'WC'],
 ST_SetSRID(ST_MakePoint(18.699, 42.433), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Petrol Bar', 'Petrol benzinska pumpa u Baru', '14, E851, Šušanj, Bar', '+38230308802', 'https://www.petrol.eu/gas-stations/map/3232-bs-bar-service-station',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'Autopraonica'],
 ST_SetSRID(ST_MakePoint(19.095, 42.107), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Lukoil Kolasin', 'Lukoil pumpa u Kolasinu', '2, Bakovići', NULL, 'http://www.lukoil.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market'],
 ST_SetSRID(ST_MakePoint(19.526, 42.849), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kolasin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Eko Igalo Banja', 'EKO Jugopetrol stanica u Igalo Banji', 'br. 56 II Dalmatinske, Igalo', '+38231330080', 'http://www.jugopetrol.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'WC'],
 ST_SetSRID(ST_MakePoint(18.504, 42.456), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.igalo@spirego.com'),
 NOW(), NOW(), NOW()),

 ('EKO Kotor', 'EKO benzinska pumpa u Kotoru', 'Škaljari bb, Kotor', '+38232301058', 'http://www.jugopetrol.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market'],
 ST_SetSRID(ST_MakePoint(18.769, 42.419), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('EKO Zabljak', 'EKO benzinska pumpa u planinskom centru Žabljak', 'b.b Durmitorski put, Žabljak', '+38252363412', 'http://www.jugopetrol.co.me/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 0.00, ARRAY['Gorivo', 'Market', 'Planinski uslovi'],
 ST_SetSRID(ST_MakePoint(19.129, 43.152), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Benzinska Pumpa'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),

 --- Kafici ---
 
 ('Casper Bar Budva', 'Popularan bar u starom gradu Budve sa opuštenom atmosferom', 'Stari grad bb, Budva', '+38233402290', 'https://www.instagram.com/casper_bar',
 NULL, NULL, '{"pon":"08:00-02:00"}', 8.00, ARRAY['Kafa', 'Kokteli', 'Terasa'],
 ST_SetSRID(ST_MakePoint(18.838, 42.279), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Azzuro Beach', 'Moderan kafić sa muzikom', 'Mediteranska 4, Budva', NULL, NULL,
 NULL, NULL, '{"pon":"09:00-01:00"}', 9.00, ARRAY['Kafa', 'Lounge', 'DJ'],
 ST_SetSRID(ST_MakePoint(18.841, 42.284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Slovenska plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Kafic Marshall’s Gelato & Coffee', 'Popularan kafić i poslastičarnica poznata po gelatu i kafi', 'STARI GRAD 359 A, Kotor', '+38267876875', 'http://www.marshallsgelato.com/',
 NULL, 'Kafeterija i slatkiši', '{"pon":"08:00-17:00"}', 8.00,
 ARRAY['WiFi', 'Basta', 'Deserti', 'Kafa', 'Porodicno okruzenje'],
 ST_SetSRID(ST_MakePoint(18.771, 42.425), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Karver Bookstore & Cafe Podgorica', 'Kombinacija knjižare i kafića sa posebnom atmosferom', 'Bokeška bb, Podgorica', '+38220602625', 'https://www.facebook.com/karverknjizara/',
 NULL, NULL, '{"pon":"08:00-23:00"}', 7.00, ARRAY['Kafa', 'Knjige', 'WiFi'],
 ST_SetSRID(ST_MakePoint(19.266, 42.438), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Dojmi Cafe Kotor', 'Mali kafić u starom gradu sa pogledom na trg', 'Stari grad Kotor', '+38269183206', 'https://m.facebook.com/GradskaKafanaDOJMI/',
 NULL, NULL, '{"pon":"08:00-23:00"}', 7.00, ARRAY['Kafa', 'Terasa', 'Pogled'],
 ST_SetSRID(ST_MakePoint(18.769, 42.425), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Citadela Cafe Kotor', 'Kafić u okviru zidina sa pogledom na more', 'Stari grad, Kotor', '+38267209847', NULL,
 NULL, NULL, '{"pon":"09:00-00:00"}', 8.00, ARRAY['Kafa', 'Pogled na more', 'Terasa'],
 ST_SetSRID(ST_MakePoint(18.769, 42.426), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Al Posto Giusto Tivat', 'Moderan kafić u Porto Montenegru', 'Porto Montenegro, Tivat', '+38269146046', NULL,
 NULL, NULL, '{"pon":"08:00-00:00"}', 10.00, ARRAY['Kafa', 'Lounge', 'Marina pogled'],
 ST_SetSRID(ST_MakePoint(18.694, 42.433), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Astoria Cafe Lustica', 'Elegantni kafić uz more', 'Lustica, Tivat', '+38269066566', NULL,
 NULL, NULL, '{"pon":"08:00-00:00"}', 9.00, ARRAY['Kafa', 'More', 'Terasa'],
 ST_SetSRID(ST_MakePoint(18.672, 42.393), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lustica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

 ('HEIST Bar Ulcinj', 'Alternativni kafić sa umetničkom atmosferom', 'Rr. Hafiz Ali Ulqinaku, Ulcinj', '+38269683130', NULL,
 NULL, NULL, '{"pon":"09:00-02:00"}', 7.00, ARRAY['Kafa', 'Muzika', 'Terasa'],
 ST_SetSRID(ST_MakePoint(19.207, 41.929), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Ulcinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.ulcinj@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Grand Central Cetinje', 'Istorijski kafić u centru Cetinja', '7 Balšića Pazar, Cetinje', '+38267030122', 'https://www.instagram.com/grandcentral__/',
 NULL, NULL, '{"pon":"08:00-23:00"}', 6.00, ARRAY['Kafa', 'Terasa', 'Centar grada'],
 ST_SetSRID(ST_MakePoint(18.924, 42.390), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ---Barovi---

('Beer & Bike Club', 'Poznati bar u centru Budve sa opuštenom atmosferom', 'Slovenska Obala, Budva', '+38268033180', 'http://beerbikeclub.me/',
 NULL, 'Bar i kokteli', '{"pon":"09:00-01:00","uto":"09:00-01:00","sre":"09:00-01:00","cet":"09:00-01:00","pet":"09:00-02:00","sub":"09:00-02:00","ned":"00:00-00:00"}', 10.00,
 ARRAY['Kokteli', 'Basta', 'Muzika', 'WiFi'],
 ST_SetSRID(ST_MakePoint(18.838, 42.282), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('The Clubhouse Porto Montenegro', 'Moderan bar u marini sa pogledom', 'Porto Montenegro, Tivat', '+38232662722', 'https://www.portomontenegro.com',
 NULL, 'Kokteli i lounge', '{"pon":"10:00-00:00","uto":"10:00-00:00","sre":"10:00-00:00","cet":"10:00-00:00","pet":"10:00-02:00","sub":"10:00-02:00","ned":"00:00-00:00"}', 15.00,
 ARRAY['Kokteli', 'Pogled na marinu', 'Muzika'],
 ST_SetSRID(ST_MakePoint(18.695, 42.431), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),


('Havana Beach Bar', 'Plažni bar sa dnevnim žurkama', 'Velika Plaza, Ulcinj', '+38267231034', NULL,
 NULL, 'Bar i kokteli', '{"pon":"08:00-00:00","uto":"08:00-00:00","sre":"08:00-00:00","cet":"08:00-00:00","pet":"08:00-02:00","sub":"08:00-02:00","ned":"00:00-00:00"}', 12.00,
 ARRAY['Plaza', 'Kokteli', 'Muzika', 'Basta'],
 ST_SetSRID(ST_MakePoint(19.287, 41.895), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.ulcinj@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Evergreen Jazz Bar', 'Jazz bar sa živom muzikom', 'Kotor Stari Grad', NULL, NULL,
 NULL, 'Jazz i kokteli', '{"pon":"18:00-01:00","uto":"18:00-01:00","sre":"18:00-01:00","cet":"18:00-01:00","pet":"18:00-02:00","sub":"18:00-02:00","ned":"00:00-00:00"}', 14.00,
 ARRAY['Ziva muzika', 'Kokteli', 'Atmosfera'],
 ST_SetSRID(ST_MakePoint(18.772, 42.425), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Itaka Library Bar', 'Alternativni bar poznat po muzici i atmosferi', 'Bulevar Svetog Petra Cetinjskog, Podgorica', '+38267156650', 'https://instagram.com/itaka_library.bar?utm_medium=copy_link',
 'https://itaka.digitalnimeni.me/', 'Bar i pivo', '{"pon":"10:00-00:00","uto":"10:00-00:00","sre":"10:00-00:00","cet":"10:00-00:00","pet":"10:00-02:00","sub":"10:00-02:00","ned":"00:00-00:00"}', 9.00,
 ARRAY['Pivo', 'Muzika', 'Basta'],
 ST_SetSRID(ST_MakePoint(19.266, 42.438), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Blue Cat Art Cafe', 'Kafic u Starom gradu Budve', 'Ulica Njegoševa No:32, Budva', '+915326252818', 'https://www.instagram.com/bluecatartcafe',
 NULL, 'Kokteli i lounge', '{"pon":"09:00-00:00","uto":"09:00-00:00","sre":"09:00-00:00","cet":"09:00-00:00","pet":"09:00-02:00","sub":"09:00-02:00","ned":"00:00-00:00"}', 18.00,
 ARRAY['DJ', 'Kokteli', 'Plaza'],
 ST_SetSRID(ST_MakePoint(18.838, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Old Town Pub Kotor', 'Pub u starom gradu sa širokim izborom piva', 'Stari grad Kotor', NULL, 'https://instagram.com/oldtownpub.kotor?igshid=YmMyMTA2M2Y=',
 NULL, 'Pub i pivo', '{"pon":"10:00-00:00","uto":"10:00-00:00","sre":"10:00-00:00","cet":"10:00-00:00","pet":"10:00-02:00","sub":"10:00-02:00","ned":"00:00-00:00"}', 11.00,
 ARRAY['Pivo', 'Muzika', 'WiFi'],
 ST_SetSRID(ST_MakePoint(18.772, 42.425), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Medusa', 'Bar na obali mora u Petrovcu', '16 Nika Anđusa, Petrovac', NULL, NULL,
 NULL, 'Bar i kokteli', '{"pon":"08:00-00:00","uto":"08:00-00:00","sre":"08:00-00:00","cet":"08:00-00:00","pet":"08:00-02:00","sub":"08:00-02:00","ned":"00:00-00:00"}', 10.00,
 ARRAY['Plaza', 'Kokteli', 'Pogled na more'],
 ST_SetSRID(ST_MakePoint(18.942, 42.205), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Strix Bar', 'Popularan koktel bar u Starom gradu Budve sa živom atmosferom', '2 Ivana Crnojevića, Budva', '+38268134097', NULL,
 'https://menusa.app/11eeb241404891a997d94a12937fd993?fbclid=PAZXh0bgNhZW0CMTEAAabPY1K9rzMSJoDjF1DCR1WLNDi2baRNhV35STTTlg7e_YE-xXM_KPaTJa0_aem_-8tZ2OyXeHInxs0AV-kKwg', 'Kokteli', '{"pon":"10:00-00:00","uto":"10:00-00:00","sre":"10:00-00:00","cet":"10:00-00:00","pet":"10:00-02:00","sub":"10:00-02:00","ned":"00:00-00:00"}', 14.00,
 ARRAY['Kokteli', 'Muzika', 'Basta'],
 ST_SetSRID(ST_MakePoint(18.839, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Hard Rock Cafe Podgorica', 'Poznati internacionalni bar i restoran u srcu Podgorice sa muzikom i koktelima', 'Trg Nezavisnosti, Podgorica', '+38268076291', 'https://cafe.hardrock.com/podgorica/#utm_source=Google&utm_medium=Yext&utm_campaign=Listings',
 'https://www.hardrockcafe.com/location/podgorica/files/5470/Local_menu.pdf', 'Američki bar i kokteli', '{"pon":"10:00-00:00","uto":"10:00-00:00","sre":"10:00-00:00","cet":"10:00-00:00","pet":"10:00-02:00","sub":"10:00-02:00","ned":"10:00-00:00"}', 18.00,
 ARRAY['Kokteli', 'Muzika', 'Souvenir shop', 'Basta'],
 ST_SetSRID(ST_MakePoint(19.262, 42.442), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 --- MUZEJI --- 

('Narodni muzej Crne Gore', 'Centralna muzejska institucija sa bogatim istorijskim zbirkama', 'Novice Cerovića, Cetinje', '+38241230310', 'http://www.narodnimuzej.me/',
 NULL, 'Istorija i umetnost', '{"pon":"09:00-17:00","uto":"09:00-17:00","sre":"09:00-17:00","cet":"09:00-17:00","pet":"09:00-17:00","sub":"10:00-14:00","ned":"00:00-00:00"}', 5.00,
 ARRAY['Izlozbe', 'Vodič', 'Suvenirnica'],
 ST_SetSRID(ST_MakePoint(18.923, 42.389), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

('Pomorski muzej Crne Gore', 'Muzej posvećen pomorskoj istoriji Boke Kotorske', 'Stari grad Kotor', '+38232304720', 'http://museummaritimum.com/mnewordpress/',
 NULL, 'Pomorska istorija', '{"pon":"08:00-18:00","uto":"08:00-18:00","sre":"08:00-18:00","cet":"08:00-18:00","pet":"08:00-18:00","sub":"09:00-14:00","ned":"00:00-00:00"}', 4.00,
 ARRAY['Eksponati', 'Vodič', 'Istorijski artefakti'],
 ST_SetSRID(ST_MakePoint(18.771, 42.425), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Muzej kralja Nikole', 'Muzej u bivšoj kraljevskoj rezidenciji sa istorijskim eksponatima', '4 Dvorski Trg, Cetinje', '+38241230555', 'https://narodnimuzej.me/posjeta-muzej-kralja-nikole/',
 NULL, 'Istorija', '{"pon":"09:00-17:00","uto":"09:00-17:00","sre":"09:00-17:00","cet":"09:00-17:00","pet":"09:00-17:00","sub":"10:00-14:00","ned":"00:00-00:00"}', 3.00,
 ARRAY['Istorijske sobe', 'Eksponati', 'Vodič'],
 ST_SetSRID(ST_MakePoint(18.924, 42.388), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

('Prirodnjacki muzej Crne Gore', 'Muzej prirodne istorije sa fosilima i biodiverzitetom', '74 Oktobarske Revolucije, Podgorica', '+38220633184', 'https://pmcg.co.me/',
 NULL, 'Prirodne nauke', '{"pon":"08:00-16:00","uto":"08:00-16:00","sre":"08:00-16:00","cet":"08:00-16:00","pet":"08:00-16:00","sub":"10:00-13:00","ned":"00:00-00:00"}', 2.00,
 ARRAY['Edukacija', 'Izlozbe', 'Vodič'],
 ST_SetSRID(ST_MakePoint(19.262, 42.434), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Muzej grada Perasta', 'Mali muzej posvećen istoriji Perasta i Boke Kotorske', 'Perast', '+38232373519', 'https://muzejikotor.me/',
 NULL, 'Lokalna istorija', '{"pon":"09:00-17:00","uto":"09:00-17:00","sre":"09:00-17:00","cet":"09:00-17:00","pet":"09:00-17:00","sub":"10:00-14:00","ned":"00:00-00:00"}', 3.00,
 ARRAY['Istorija grada', 'Eksponati', 'Vodič'],
 ST_SetSRID(ST_MakePoint(18.696, 42.487), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Perast'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 

--- TRZNI CENTRI ---

('Big Fesn Podgorica', 'Najveći tržni centar u Crnoj Gori sa brojnim radnjama i bioskopom', 'b.b Cetinjski Put, Podgorica', '+38268878637', 'https://www.bigcenters.rs/podgorica/',
 NULL, 'Shopping centar', '{"pon":"10:00-22:00","uto":"10:00-22:00","sre":"10:00-22:00","cet":"10:00-22:00","pet":"10:00-22:00","sub":"10:00-22:00","ned":"10:00-22:00"}', 0,
 ARRAY['Parking', 'WiFi', 'Bioskop', 'Restorani'],
 ST_SetSRID(ST_MakePoint(19.236, 42.437), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('Mall of Montenegro', 'Tržni centar sa supermarketom i prodavnicama', '74 Bulevar Save Kovačevića, Podgorica', '+38220671357', 'https://www.mallofmontenegro.com/mall/index.php/bs-BA',
 NULL, 'Shopping centar', '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-22:00","ned":"08:00-22:00"}', 0,
 ARRAY['Supermarket', 'Parking', 'Radnje'],
 ST_SetSRID(ST_MakePoint(19.263, 42.432), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Kamelija Shopping Center', 'Glavni tržni centar u Kotoru', 'Square Mata Petrovića, Kotor', '+38232335380', 'http://www.kamelija.me/',
 NULL, 'Shopping centar', '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-21:00","ned":"09:00-21:00"}', 0,
 ARRAY['Parking', 'Radnje', 'Kafici'],
 ST_SetSRID(ST_MakePoint(18.770, 42.428), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('City Mall', 'Moderni tržni centar sa poznatim brendovima', 'bb Cetinjski Put, Podgorica', '+38220268070', 'https://citymallpodgorica.me/',
 NULL, 'Shopping centar', '{"pon":"10:00-22:00","uto":"10:00-22:00","sre":"10:00-22:00","cet":"10:00-22:00","pet":"10:00-22:00","sub":"10:00-22:00","ned":"10:00-22:00"}', 0,
 ARRAY['Brendovi', 'Parking', 'Restorani'],
 ST_SetSRID(ST_MakePoint(19.237, 42.438), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('Central Mall Bar', 'Najveći tržni centar u Baru', '6 Jovana Stojanovića, Bar', NULL, NULL,
 NULL, 'Shopping centar', '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-21:00","ned":"09:00-21:00"}', 0,
 ARRAY['Parking', 'Supermarket', 'Radnje'],
 ST_SetSRID(ST_MakePoint(19.097, 42.098), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

('Mega Mall Budva', 'Savremeni centar sa radnjama i restoranima', 'Budva centar', NULL, 'https://www.megamallbudva.me/',
 NULL, 'Shopping centar', '{"pon":"10:00-22:00","uto":"10:00-22:00","sre":"10:00-22:00","cet":"10:00-22:00","pet":"10:00-22:00","sub":"10:00-22:00","ned":"10:00-22:00"}', 0,
 ARRAY['Parking', 'Restorani', 'Radnje'],
 ST_SetSRID(ST_MakePoint(18.840, 42.295), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('TC HDL Lakovic Niksic', 'Veliki retail centar sa supermarketom i radnjama', 'Nikšić ulaz', '+38269568423', NULL,
 NULL, 'Shopping centar', '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-22:00","ned":"08:00-22:00"}', 0,
 ARRAY['Supermarket', 'Parking', 'Radnje'],
 ST_SetSRID(ST_MakePoint(18.951, 42.768), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Lakovic Kotor', 'Tržni centar i supermarket u Kotoru', 'Radanovici, Kotor', NULL, NULL,
 NULL, 'Shopping centar', '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-22:00","ned":"08:00-22:00"}', 0,
 ARRAY['Supermarket', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.746, 42.384), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Radanovici'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Butiko Shopping Center', 'Retail centar u Radanovicima', 'Radanovici BB', '+38267033977', NULL,
 NULL, 'Shopping centar', '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-22:00","ned":"08:00-22:00"}', 0,
 ARRAY['Supermarket', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.742, 42.386), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Radanovici'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('HDL Novi Mall', 'Mali gradski shopping centar', 'Igalo, Igalo Banja', '+38231336202', NULL,
 NULL, 'Shopping centar', '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-21:00","ned":"09:00-21:00"}', 0,
 ARRAY['Radnje', 'Parking'],
 ST_SetSRID(ST_MakePoint(18.493, 42.457), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trzni Centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.igalo@spirego.com'),
 NOW(), NOW(), NOW()),

--- GALERIJE ---

('Galerija Muzeja savremene umjetnosti Crne Gore', 'Najvažnija institucija savremene umjetnosti u Crnoj Gori, sa izložbama domaćih i međunarodnih umjetnika', '2 Njegoševa, Podgorica', '+38220665409', 'https://msucg.me/',
 NULL, NULL, '{"pon":"09:00-20:00","uto":"09:00-20:00","sre":"09:00-20:00","cet":"09:00-20:00","pet":"09:00-20:00","sub":"10:00-18:00","ned":"neradno"}', NULL,
 ARRAY['Izložbe', 'Kultura', 'Radionice'],
 ST_SetSRID(ST_MakePoint(19.261, 42.440), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Galerija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Galerija Pizana', 'Savremena galerija u Podgorici sa fokusom na regionalne umjetnike i izložbe', '60 Hercegovačka, Podgorica', '+38269021882', 'http://www.pizana.me/',
 NULL, NULL, '{"pon":"10:00-22:00","uto":"10:00-22:00","sre":"10:00-22:00","cet":"10:00-22:00","pet":"10:00-22:00","sub":"11:00-23:00","ned":"neradno"}', NULL,
 ARRAY['Umjetnost', 'Izložbe', 'Prodaja umjetnina'], ST_SetSRID(ST_MakePoint(19.264, 42.442), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Galerija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Galerija Velimir A. Lekovic', 'Kulturni centar i galerija sa stalnim i povremenim izložbama', 'Šetalište kralja Nikole 2, Bar', '+38230312431', 'https://instagram.com/galerija_velimir_a_lekovic?igshid=MzRlODBiNWFlZA==',
 NULL, NULL, '{"pon":"08:00-20:00","uto":"08:00-20:00","sre":"08:00-20:00","cet":"08:00-20:00","pet":"08:00-20:00","sub":"09:00-15:00","ned":"neradno"}', NULL,
 ARRAY['Kultura', 'Izložbe', 'Događaji'], ST_SetSRID(ST_MakePoint(19.091, 42.100), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Galerija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 --- PANSIONI ---

 ('Villa Ljubanovic', 'Porodični pansion blizu Mogren plaže, poznat po mirnom ambijentu i domaćinskoj atmosferi', '18 Nikole Tesle, Budva', '+38269931474', 'http://www.ljubanovic.com/',
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-22:00","ned":"09:00-20:00"}', 65.00,
 ARRAY['WiFi', 'Parking', 'Klima', 'Terasa'], ST_SetSRID(ST_MakePoint(18.83456, 42.28564), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pansion'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Guesthouse Zmukic', 'Autentični porodični pansion u starom dijelu Kotora sa pogledom na zaliv', 'Perast, Kotor', '+38268103559', 'https://instagram.com/guesthouse_zmukic?utm_medium=copy_link',
 NULL, NULL, '{"pon":"07:00-23:00","uto":"07:00-23:00","sre":"07:00-23:00","cet":"07:00-23:00","pet":"07:00-23:00","sub":"08:00-23:00","ned":"neradno"}', 70.00,
 ARRAY['WiFi', 'Parking', 'Pogled na more', 'Doručak'], ST_SetSRID(ST_MakePoint(18.69556, 42.48814), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pansion'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Perast'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Guesthouse Plima', 'Mirni pansion u Budvi, idealan za odmor', 'Babin Do, Budva', NULL, NULL,
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"09:00-22:00","ned":"neradno"}', 60.00,
 ARRAY['WiFi', 'Klima', 'Parking', 'Balkon'], ST_SetSRID(ST_MakePoint(18.83309, 42.28362), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pansion'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Pansion Vukovic Zabljak', 'Planinski pansion u blizini Durmitora, pogodan za planinare i prirodu', 'Tmajevci b.b, Žabljak', '+38267570242', NULL,
 NULL, NULL, '{"pon":"07:00-22:00","uto":"07:00-22:00","sre":"07:00-22:00","cet":"07:00-22:00","pet":"07:00-22:00","sub":"07:00-22:00","ned":"08:00-20:00"}', 55.00,
 ARRAY['Parking', 'Grejanje', 'WiFi', 'Planinski pogled'], ST_SetSRID(ST_MakePoint(19.13467, 43.158904), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pansion'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),


 --- ETNO SELA ---
 ('Etno Selo Montenegro', 'Autentično etno selo u prirodi sa tradicionalnim kućicama i domaćom hranom', 'Donja Brezna, Pluzine', '+38267209049', 'http://etnoselo.me/',
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"08:00-23:00","ned":"09:00-21:00"}', 45.00,
 ARRAY['WiFi', 'Parking', 'Restoran', 'Etno ambijent', 'Priroda'], ST_SetSRID(ST_MakePoint(18.93277, 42.98276), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Etno selo'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Pluzina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Etno Selo Izlazak', 'Planinsko etno selo sa pogledom na Bjelasicu, idealno za odmor u prirodi', 'Dubljevici, Pluzine', '+38269149323', 'http://www.etno-selo-izlazak.me/',
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-22:00","sub":"09:00-23:00","ned":"09:00-20:00"}', 52.00,
 ARRAY['WiFi', 'Parking', 'Restoran', 'Planinski pogled', 'Etno smještaj'], ST_SetSRID(ST_MakePoint(18.86401, 43.06553), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Etno selo'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Pivsko jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Etno Selo Komarnica', 'Autentično etno selo u kanjonu Komarnice, poznato po netaknutoj prirodi i tradicionalnom smještaju', 'Komarnica bb, Plužine', '+38268040124', NULL,
 NULL, NULL, '{"pon":"08:00-21:00","uto":"08:00-21:00","sre":"08:00-21:00","cet":"08:00-21:00","pet":"08:00-22:00","sub":"09:00-22:00","ned":"09:00-20:00"}', 40.00,
 ARRAY['Parking', 'Etno kuće', 'Priroda', 'Restoran'], ST_SetSRID(ST_MakePoint(19.04526, 43.02867), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Etno selo'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Komarnica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),

 --- VINARIJE ---

('Vinarija Plantaze 13 Jul', 'Najveća vinarija u Crnoj Gori, poznata po vinima iz Zete i Skadarskog basena', 'Karabuško polje bb, Tuzi', '+38267099099', 'http://www.plantaze.com/en/#/sipcanik',
 NULL, NULL, '{"pon":"08:00-20:00","uto":"08:00-20:00","sre":"08:00-20:00","cet":"08:00-20:00","pet":"08:00-20:00","sub":"09:00-18:00","ned":"neradno"}', NULL,
 ARRAY['Degustacija', 'Prodaja vina', 'Turističke ture'], ST_SetSRID(ST_MakePoint(19.32017, 42.37529), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Vinarija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tuzi'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Vinarija Lipovac', 'Porodična vinarija poznata po autohtonim crnogorskim sortama vina', 'Građani', '+38267784795', 'https://lipovacwines.com/',
 NULL, NULL, '{"pon":"09:00-19:00","uto":"09:00-19:00","sre":"09:00-19:00","cet":"09:00-19:00","pet":"09:00-19:00","sub":"10:00-18:00","ned":"neradno"}', NULL,
 ARRAY['Degustacija', 'Prodaja vina', 'Vinski podrum'], ST_SetSRID(ST_MakePoint(19.00802, 42.27054), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Vinarija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gradjani'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

('Cem winery and vineyard', 'Manja vinarija u blizini rijeke Cijevne sa domaćim vinima i rakijom', 'Cijevna bb, Tuzi', '+38267437162', NULL,
 NULL, NULL, '{"pon":"09:00-18:00","uto":"09:00-18:00","sre":"09:00-18:00","cet":"09:00-18:00","pet":"09:00-18:00","sub":"10:00-17:00","ned":"neradno"}', NULL,
 ARRAY['Degustacija', 'Domaća vina', 'Etno ambijent'], ST_SetSRID(ST_MakePoint(19.27423, 42.38388), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Vinarija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tuzi'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Winery Masanovic', 'Vinarija iz okoline Bara sa fokusom na mediteranske sorte grožđa', 'Railway station, Virpazar, Bar', '+38268509541', 'http://www.instagram.com/winery.masanovic',
 NULL, NULL, '{"pon":"09:00-20:00","uto":"09:00-20:00","sre":"09:00-20:00","cet":"09:00-20:00","pet":"09:00-20:00","sub":"10:00-18:00","ned":"neradno"}', NULL,
 ARRAY['Degustacija', 'Vino', 'Prodaja'], ST_SetSRID(ST_MakePoint(19.08346, 42.24013), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Vinarija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

('Vinarija Savina', 'Boutique vinarija u Herceg Novom poznata po premium bijelim i crvenim vinima', '7d Branka Ćopića, Herceg - Novi', '+38268205189', 'https://castelsavina.me/',
 NULL, NULL, '{"pon":"10:00-18:00","uto":"10:00-18:00","sre":"10:00-18:00","cet":"10:00-18:00","pet":"10:00-18:00","sub":"11:00-17:00","ned":"neradno"}', NULL,
 ARRAY['Degustacija', 'Podrum', 'Vino', 'Turističke posjete'], ST_SetSRID(ST_MakePoint(18.55196, 42.45173), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Vinarija'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

 --- AKVA PARKOVI ---

 ('Aqua Park Budva', 'Najveći akva park u Crnoj Gori sa brojnim toboganima i bazenima za sve uzraste', 'Podostrog, Budva', '+38268334433', NULL,
 NULL, NULL, '{"pon":"10:00-18:00","uto":"10:00-18:00","sre":"10:00-18:00","cet":"10:00-18:00","pet":"10:00-18:00","sub":"10:00-19:00","ned":"10:00-19:00"}', 25.00,
 ARRAY['Tobogani', 'Bazen', 'Parking', 'Restoran', 'Porodicno'], ST_SetSRID(ST_MakePoint(18.82242, 42.29189), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Akva park'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podostrog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Aqua Park Mediteran', 'Manji sezonski akva park sa bazenima i zabavnim sadržajem za djecu i odrasle', 'Becici bb, Boreti', '+38233689000', 'https://www.mediteran.me/en/aqua-park',
 NULL, NULL, '{"pon":"10:00-18:00","uto":"10:00-18:00","sre":"10:00-18:00","cet":"10:00-18:00","pet":"10:00-18:00","sub":"10:00-19:00","ned":"10:00-19:00"}', 15.00,
 ARRAY['Bazen', 'Djeca', 'Tobogani', 'Parking'], ST_SetSRID(ST_MakePoint(18.86364, 42.28353), 4326),
 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Akva park'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Becici'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Aqua Park Imanje Knjaz', 'Vodeni zabavni kompleks u Podgorici', 'Imanje, Podgorica', '+38267995252', 'http://www.imanje-knjaz.me/',
 NULL, NULL, '{"pon":"09:00-19:00","uto":"09:00-19:00","sre":"09:00-19:00","cet":"09:00-19:00","pet":"09:00-19:00","sub":"09:00-19:00","ned":"09:00-19:00"}', 20.00,
 ARRAY['Bazeni', 'Deciji vodeni park', 'Tobogani', 'Bar', 'Lezaljke'],
 ST_SetSRID(ST_MakePoint(19.18486, 42.47035), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Akva park'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Imanje'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

--- ZOO VRTOVI ---

('Mini Zoo Vrt Podgorica', 'Mali zoološki vrt sa domaćim i egzotičnim životinjama, popularan među porodicama', 'Podgorica bb', '+38268719404', NULL,
 NULL, NULL, '{"pon":"09:00-18:00","uto":"09:00-18:00","sre":"09:00-18:00","cet":"09:00-18:00","pet":"09:00-18:00","sub":"09:00-19:00","ned":"09:00-19:00"}', 5.00,
 ARRAY['Deciji sadrzaj', 'Zivotinje', 'Priroda', 'Parking'],
 ST_SetSRID(ST_MakePoint(19.23861, 42.46411), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Zoo vrt'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Zoo Sad', 'Manji zoo vrt sa domaćim životinjama i edukativnim sadržajem', 'Centar Budve', NULL, NULL,
 NULL, NULL, '{"pon":"10:00-17:00","uto":"10:00-17:00","sre":"10:00-17:00","cet":"10:00-17:00","pet":"10:00-17:00","sub":"10:00-18:00","ned":"10:00-18:00"}', 4.00,
 ARRAY['Zivotinje', 'Priroda', 'Porodicno okruzenje'],
 ST_SetSRID(ST_MakePoint(18.83947, 42.28978), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Zoo vrt'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Park Macaka', 'Park sa mackama u Kotoru', 'Stari grad Kotor', NULL, NULL,
 NULL, NULL, '{"pon":"10:00-17:00","uto":"10:00-17:00","sre":"10:00-17:00","cet":"10:00-17:00","pet":"10:00-17:00","sub":"10:00-18:00","ned":"10:00-18:00"}', 4.00,
 ARRAY['Zivotinje', 'Priroda', 'Porodicno okruzenje'],
 ST_SetSRID(ST_MakePoint(18.77201, 42.42601), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Zoo vrt'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 --- AKVARIJUMI ---
('Akvarijum Boka', 'Prvi javni akvarijum u Crnoj Gori sa prikazom jadranskih morskih vrsta', 'Put Bokeljskih Brigada, Dobrota', '+38267946497', 'http://www.aquariumboka.ucg.ac.me/',
 NULL, NULL, '{"pon":"09:00-20:00","uto":"09:00-20:00","sre":"09:00-20:00","cet":"09:00-20:00","pet":"09:00-20:00","sub":"09:00-20:00","ned":"10:00-18:00"}', 8.00,
 ARRAY['Edukacija', 'Morske vrste', 'Turisticka atrakcija', 'Deciji sadrzaj'],
 ST_SetSRID(ST_MakePoint(18.76420, 42.43605), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Akvarijum'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 --- IGRALISTA ---

 ('Igraliste Njegosev park', 'Dečije igralište u okviru gradskog parka', 'Njegošev park, Podgorica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Klackalice', 'Tobogan', 'Ljuljaške'], ST_SetSRID(ST_MakePoint(19.25889, 42.44212), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Gorica Park', 'Dečije igralište u šumi Gorica', '18 Radomira Vešovića', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Priroda', 'Klackalice', 'Penjalice'], ST_SetSRID(ST_MakePoint(19.26738, 42.44933), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Slovenska plaza', 'Dečije igralište u turističkom kompleksu', 'Slovenska plaža, Budva', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['More', 'Tobogan', 'Ljuljaške'], ST_SetSRID(ST_MakePoint(18.83962, 42.28348), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Slovenska plaza'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Djecije Igraliste Park Nezavisnosti', 'Igralište uz šetalište', 'Park Nezavisnosti, Herceg Novi', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['More', 'Klackalice', 'Biciklisticka zona'], ST_SetSRID(ST_MakePoint(18.53149, 42.45283), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Igraliste Centar Kotor', 'Malo gradsko igralište u starom gradu', 'Stari grad Kotor', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Klackalice', 'Ljuljaške'], ST_SetSRID(ST_MakePoint(18.76836, 42.42676), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Tolosi', 'Gradsko igralište u naselju Tološi', 'Tološi, Podgorica', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Sport', 'Fudbalski teren', 'Ljuljaške'], ST_SetSRID(ST_MakePoint(19.23797, 42.45096), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Kolasin', 'Dečije igralište u centru Kolasina', 'Mirka Vešovića, Kolašin', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Priroda', 'Klackalice'], ST_SetSRID(ST_MakePoint(19.51693, 42.82508), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kolasin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Igalo', 'Dečije igralište u centru Igalo Banje', '30 Janka Beka, Igalo', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['More', 'Tobogan', 'Klackalice'], ST_SetSRID(ST_MakePoint(18.50755, 42.46072), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.igalo@spirego.com'),
 NOW(), NOW(), NOW()),

('Igraliste Park 13 Jul', 'Dečije igralište u gradskom parku', 'Park 13 Jul, Cetinje', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Ljuljaške', 'Klackalice', 'Klupice'], ST_SetSRID(ST_MakePoint(18.92777, 42.38661), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Niksic', 'Gradsko igraliste', 'Ulica 135, Niksic', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Fudbalski teren', 'Ljuljaške', 'Koš'], ST_SetSRID(ST_MakePoint(18.94318, 42.77990), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

('Djecje igraliste kod vozica', 'Djecije igraliste kod vozica', 'Pjesacka staza, Tivat', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Klackalice', 'Ljuljaške', 'Zelenilo'], ST_SetSRID(ST_MakePoint(18.69288, 42.44178), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

('Igraliste Bar Setaliste', 'Dečije igralište uz obalu mora', 'Šetalište kralja Nikole, Bar', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['More', 'Tobogan', 'Klackalice'], ST_SetSRID(ST_MakePoint(19.08954, 42.10233), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Crno jezero', 'Dečije igralište u na putu ka Crnom jezeru', 'Šetalište ka Crnom jezeru', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Klackalice', 'Ljuljaške', 'Zelenilo'], ST_SetSRID(ST_MakePoint(19.10032, 43.15027), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.durmitor@spirego.com'),
 NOW(), NOW(), NOW()),

('Igraliste Milocer Park', 'Dečije igralište u okviru parka Miločer', 'Park Miločer, Budva', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Ljuljaške', 'Klackalice', 'Prirodno okruženje'], ST_SetSRID(ST_MakePoint(18.89628, 42.26102), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Sveti Stefan'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),
 
('Djecija igraonica Igalo', 'Dečije igralište u naselju Igalo', '43-27 Dr Svetozara Živojinovića, Igalo', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Ljuljaške', 'Klackalice', 'Penjalice'], ST_SetSRID(ST_MakePoint(18.50343, 42.45191), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.igalo@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Igraliste Lovcen National Park', 'Dečije igralište u prirodnom ambijentu Nacionalnog parka Lovćen', 'Lovćen National Park, Cetinje', NULL, NULL,
 NULL, NULL, '{"pon":"00:00-24:00","uto":"00:00-24:00","sre":"00:00-24:00","cet":"00:00-24:00","pet":"00:00-24:00","sub":"00:00-24:00","ned":"00:00-24:00"}',
 NULL, ARRAY['Drvene sprave', 'Klackalice', 'Ljuljaške', 'Priroda'], ST_SetSRID(ST_MakePoint(18.79377, 42.39303), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Igraliste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.lovcen@spirego.com'),
 NOW(), NOW(), NOW()),
 
--- POZORISTA ---

('Crnogorsko narodno pozoriste', 'Nacionalno pozorište Crne Gore', '18 Bulevar Stanka Dragojevića, Podgorica', '+38220404120', 'https://www.cnp.me',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Predstave', 'Festival', 'Sala'], ST_SetSRID(ST_MakePoint(19.26037, 42.44206), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Zetski dom', 'Istorijsko kraljevsko pozorište Crne Gore', '4 Baja Pivljanina, Cetinje', '+38241235280', 'http://www.zetskidom.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"19:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Klasika', 'Drama', 'Festival'], ST_SetSRID(ST_MakePoint(18.92671, 42.38853), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Niksicko pozoriste', 'Gradsko pozorište Nikšića', 'Njegoševa, Nikšić', '+38240213566', NULL,
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Predstave', 'Koncerti'], ST_SetSRID(ST_MakePoint(18.94666, 42.77143), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Dvorana Park Herceg Novi', 'Kulturna scena i pozorišne predstave', 'Herceg Novi centar', '+38231322098', 'http://hercegfest.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"19:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Drama', 'Film', 'Koncerti'], ST_SetSRID(ST_MakePoint(18.53231, 42.45222), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Kulturni centar Kotor - scena', 'Pozorišne i kulturne predstave u Kotoru', 'Ulica 2 (sjever-jug), Kotor', '+38232304140', 'http://www.kckotor.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"19:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Festival', 'Drama'], ST_SetSRID(ST_MakePoint(18.77136, 42.42331), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Javna ustanova Grad Teatar', 'Sezonsko pozorište i festival', '13 Jul zgrada BSP', '+38233402935', 'http://gradteatar.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"19:00-23:00","ned":"neradni dan"}',
 NULL, ARRAY['Festival', 'Letnje scene'], ST_SetSRID(ST_MakePoint(18.83581, 42.28423), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Dom kulture Bar - pozornica', 'Gradske pozorišne i kulturne predstave', 'Ulica Jovana Tomasevica, Bar', '+38230312431', 'http://kulturnicentarbar.me/jpkcbar/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Predstave', 'Koncerti'], ST_SetSRID(ST_MakePoint(19.09276, 42.09986), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Tivat Centar za kulturu', 'Scena za pozorište i događaje', 'Luke Tomanovića, Tivat', '+38232674555', 'http://www.czktivat.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Drama', 'Manifestacije'], ST_SetSRID(ST_MakePoint(18.69792, 42.43193), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

('Ljetnja Pozornica Tivat', 'Kulturno-pozorišni centar sa savremenim programima', 'Tivat', NULL, 'http://www.czktivat.me/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Drama', 'Film', 'Festival'], ST_SetSRID(ST_MakePoint(18.69581, 42.43125), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Dom kulture Kolasin', 'Kulturni centar i mala pozorišna scena u Kolašinu', 'Trg boraca, Kolašin', '+38267338053', NULL,
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"18:00-22:00","ned":"neradni dan"}',
 NULL, ARRAY['Predstave', 'Koncerti', 'Projekcije filmova'], ST_SetSRID(ST_MakePoint(19.520818, 42.82361), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Pozoriste'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kolasin@spirego.com'),
 NOW(), NOW(), NOW()),

 --- MANASTIRI ---

 ('Manastir Moraca', 'Srednjovjekovni pravoslavni manastir iz 13. vijeka', 'Kolašin region, kanjon Morače', NULL, 'http://www.manastiri-crkve.com/manastiri/manastir_moraca.htm',
 NULL, NULL, '{"pon":"07:00-19:00","uto":"07:00-19:00","sre":"07:00-19:00","cet":"07:00-19:00","pet":"07:00-19:00","sub":"07:00-19:00","ned":"07:00-19:00"}',
 NULL, ARRAY['Freske', 'Istorijski spomenik', 'Priroda'], ST_SetSRID(ST_MakePoint(19.39052, 42.76612), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Manastir'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Moraca'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kolasin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Cetinjski manastir', 'Duhovni centar Crne Gore i sjedište Mitropolije', 'Cetinje centar', NULL, NULL,
 NULL, NULL, '{"pon":"08:00-19:00","uto":"08:00-19:00","sre":"08:00-19:00","cet":"08:00-19:00","pet":"08:00-19:00","sub":"08:00-19:00","ned":"08:00-19:00"}',
 NULL, ARRAY['Relikvije', 'Istorija', 'Muzej'], ST_SetSRID(ST_MakePoint(18.92168, 42.38783), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Manastir'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Manastir Piva', 'Pravoslavni manastir iz 16. vijeka premješten zbog izgradnje hidrocentrale', 'Plužine, Piva region', NULL, NULL,
 NULL, NULL, '{"pon":"08:00-18:00","uto":"08:00-18:00","sre":"08:00-18:00","cet":"08:00-18:00","pet":"08:00-18:00","sub":"08:00-18:00","ned":"08:00-18:00"}',
 NULL, ARRAY['Freske', 'Istorijski značaj', 'Muzej'], ST_SetSRID(ST_MakePoint(18.81834, 43.10998), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Manastir'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Pluzina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zabljak@spirego.com'),
 NOW(), NOW(), NOW()),

 --- SPORTSKI CENTRI ---

('SC Moraca', 'Glavni sportski centar i dvorana u Podgorici', 'bb Ivana Milutinovića, Podgorica', NULL, 'https://www.pgsport.me/a1/index.php/cg/organizacija/potpredsjednik/o-nama',
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"10:00-22:00","ned":"10:00-20:00"}',
 NULL, ARRAY['Košarka', 'Rukomet', 'Koncerti'], ST_SetSRID(ST_MakePoint(19.25379, 42.43819), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Sportski centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

 ('SC Topolica', 'Sportski centar i dvorana u Baru', 'Ul, 85 Bulevar Revolucije, Bar', '+38230301700', 'http://srcegrada.me/',
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"10:00-22:00","ned":"10:00-20:00"}',
 NULL, ARRAY['Fudbal', 'Košarka', 'Teretana'], ST_SetSRID(ST_MakePoint(19.09407, 42.10297), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Sportski centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 ('SC Niksic', 'Gradski sportski centar Nikšića', 'Njegoševa bb, Nikšić', '+38240201252', 'https://www.scniksic.me/',
 NULL, NULL, '{"pon":"08:00-22:00","uto":"08:00-22:00","sre":"08:00-22:00","cet":"08:00-22:00","pet":"08:00-22:00","sub":"10:00-22:00","ned":"10:00-20:00"}',
 NULL, ARRAY['Košarka', 'Rukomet', 'Trening'], ST_SetSRID(ST_MakePoint(18.95070, 42.78126), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Sportski centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

 ('SC Igalo', 'Sportsko-rehabilitacioni centar Igalo', 'II Dalmatinske Brigade, Igalo', '+38267107117', 'https://spcentarigalo.com/',
 NULL, NULL, '{"pon":"08:00-20:00","uto":"08:00-20:00","sre":"08:00-20:00","cet":"08:00-20:00","pet":"08:00-20:00","sub":"10:00-18:00","ned":"neradni dan"}',
 NULL, ARRAY['Rehabilitacija', 'Fitness', 'Bazen'], ST_SetSRID(ST_MakePoint(18.50551, 42.45746), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Sportski centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.igalo@spirego.com'),
 NOW(), NOW(), NOW()),

 ('SC Kolasin', 'Sportski centar u planinskom gradu', 'Jagoša Simonovića, Kolašin', NULL, NULL,
 NULL, NULL, '{"pon":"08:00-21:00","uto":"08:00-21:00","sre":"08:00-21:00","cet":"08:00-21:00","pet":"08:00-21:00","sub":"10:00-21:00","ned":"10:00-18:00"}',
 NULL, ARRAY['Ski sport', 'Sala', 'Trening'], ST_SetSRID(ST_MakePoint(19.51640, 42.82302), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Sportski centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kolasin@spirego.com'),
 NOW(), NOW(), NOW()),

 --- WELLNESS CENTRI ---

 ('Spa Center Avala Medical Wellness', 'Medicinski i wellness spa centar otvoren za vanjske posjetioce', 'Hotel Avala, 2 Mediteranska', '+38269328922', 'http://www.avalaresort.com/',
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"10:00-20:00","ned":"10:00-18:00"}',
 NULL, ARRAY['Sauna', 'Tretmani lica', 'Masaže', 'Jacuzzi'], ST_SetSRID(ST_MakePoint(18.83512, 42.27833), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Wellness centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('The Chedi Lustica Bay', 'Savremeni wellness i spa centar u okviru naselja Luštica Bay, otvoren i za posjetioce', 'Luštica Bay Marina, Radovići', '+38232661266', 'https://www.chedilusticabay.com/',
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-21:00","ned":"09:00-20:00"}',
 NULL, ARRAY['Spa', 'Sauna', 'Masaže', 'Fitness'], ST_SetSRID(ST_MakePoint(18.66421, 42.38651), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Wellness centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lustica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Health & Wellbeing Retreat de Mar - Vrmac', 'Mali urbani wellness centar sa fokusom na relaksaciju i masaže', 'Kotorski zaliv', '+38269113222', 'https://vrmacwellbeing.com/',
 NULL, NULL, '{"pon":"10:00-20:00","uto":"10:00-20:00","sre":"10:00-20:00","cet":"10:00-20:00","pet":"10:00-20:00","sub":"11:00-18:00","ned":"neradni dan"}',
 NULL, ARRAY['Masaže', 'Sauna', 'Aromaterapija', 'Relaks zona'], ST_SetSRID(ST_MakePoint(18.73299, 42.46463), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Wellness centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Prcanj'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Shanti Wellness & Spa', 'Moderni gradski wellness studio za masaže i anti-stres tretmane', 'Dobrota 175, Dobrota', '+38268853241', 'https://www.humahotel.me/shanti-spa/',
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"10:00-18:00","ned":"neradni dan"}',
 NULL, ARRAY['Masaže', 'Relax terapija', 'Aromaterapija'], ST_SetSRID(ST_MakePoint(18.76621, 42.44838), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Wellness centar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.kotorskizaliv@spirego.com'),
 NOW(), NOW(), NOW()),

--- TRZNICE ---

 ('Trznica Podgorica', 'Glavna gradska pijaca sa voćem, povrćem i domaćim proizvodima', 'Bratstva i Jedinstva, Podgorica', '+38220625424', 'http://www.pijacepg.me/',
 NULL, NULL, '{"pon":"07:00-15:00","uto":"07:00-15:00","sre":"07:00-15:00","cet":"07:00-15:00","pet":"07:00-15:00","sub":"07:00-14:00","ned":"neradni dan"}',
 NULL, ARRAY['Voce', 'Povrce', 'Domaci proizvodi'], ST_SetSRID(ST_MakePoint(19.26315, 42.43284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.podgorica@spirego.com'),
 NOW(), NOW(), NOW()),

('Gradska pijaca Kotor', 'Gradska pijaca u starom gradu Kotora', 'Stari grad Kotor', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Riba', 'Povrce', 'Voce'], ST_SetSRID(ST_MakePoint(18.77047, 42.42393), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Pijaca Budva', 'Glavna gradska pijaca Budve sa lokalnim proizvodima', 'Mediteranska, Budva', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-15:00","uto":"07:00-15:00","sre":"07:00-15:00","cet":"07:00-15:00","pet":"07:00-15:00","sub":"07:00-14:00","ned":"neradni dan"}',
 NULL, ARRAY['Voce', 'Povrce', 'Suveniri'], ST_SetSRID(ST_MakePoint(18.83683, 42.28449), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Zelena pijaca Niksic', 'Gradska pijaca u Nikšiću', '5. proleterske brigade, Niksic', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Domaca hrana', 'Meso', 'Povrce'], ST_SetSRID(ST_MakePoint(18.95014, 42.77480), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.niksic@spirego.com'),
 NOW(), NOW(), NOW()),

('Pijaca Bar', 'Gradska pijaca u Baru', 'Bulevar Revolucije, Bar', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-15:00","uto":"07:00-15:00","sre":"07:00-15:00","cet":"07:00-15:00","pet":"07:00-15:00","sub":"07:00-14:00","ned":"neradni dan"}',
 NULL, ARRAY['Voce', 'Riba', 'Povrce'], ST_SetSRID(ST_MakePoint(19.09973, 42.10443), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.bar@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Pijaca Herceg Novi', 'Gradska pijaca uz obalu mora', 'Topla, Herceg Novi', '+38231347755', NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Riba', 'Voce', 'Zelena pijaca'], ST_SetSRID(ST_MakePoint(18.53628, 42.45197), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

('Pijaca Tivat', 'Mala gradska pijaca u Tivtu', '21.Novembra, Tivat', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Voce', 'Povrce'], ST_SetSRID(ST_MakePoint(18.69944, 42.42939), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

('Zelena pijaca Cetinje', 'Tradicionalna pijaca u istorijskom gradu', '24 Baja Pivljanina, Cetinje', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Domaci proizvodi', 'Voce', 'Povrce'], ST_SetSRID(ST_MakePoint(18.92540, 42.39000), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW()),

('Pijaca Ulcinj', 'Gradska pijaca sa lokalnim i mediteranskim proizvodima', 'Nikole Đakovića, Ulcinj', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-15:00","uto":"07:00-15:00","sre":"07:00-15:00","cet":"07:00-15:00","pet":"07:00-15:00","sub":"07:00-14:00","ned":"neradni dan"}',
 NULL, ARRAY['Riba', 'Voce', 'Povrce'], ST_SetSRID(ST_MakePoint(19.215, 41.928), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Ulcinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.ulcinj@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Riblja Pijaca Tivat', 'Mala gradska pijaca ribe u Tivtu', '21.Novembra, Tivat', NULL, NULL,
 NULL, NULL, '{"pon":"07:00-14:00","uto":"07:00-14:00","sre":"07:00-14:00","cet":"07:00-14:00","pet":"07:00-14:00","sub":"07:00-13:00","ned":"neradni dan"}',
 NULL, ARRAY['Riba'], ST_SetSRID(ST_MakePoint(18.69920, 42.42933), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Trznica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.tivat@spirego.com'),
 NOW(), NOW(), NOW()),

 --- SUVERNICE ---

 ('Kotorska Suvenirnica', 'Suvenirnica u starom gradu Kotora sa lokalnim rukotvorinama', 'Stari grad Kotor', '+38269177281', NULL,
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-22:00","ned":"09:00-21:00"}',
 NULL, ARRAY['Suveniri', 'Rucni radovi', 'Magneti'], ST_SetSRID(ST_MakePoint(18.77137, 42.42536), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Suvenirnica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('By The Sea Handmade', 'Prodavnica suvenira u starom gradu Budve', 'Vranjak, Budva', '+38268116590', 'https://instagram.com/by_the_sea_mne?igshid=YmMyMTA2M2Y=',
 NULL, NULL, '{"pon":"09:00-22:00","uto":"09:00-22:00","sre":"09:00-22:00","cet":"09:00-22:00","pet":"09:00-22:00","sub":"09:00-23:00","ned":"09:00-22:00"}',
 NULL, ARRAY['Suveniri', 'Privešci', 'Odjeća'], ST_SetSRID(ST_MakePoint(18.83870, 42.27799), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Suvenirnica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.budva@spirego.com'),
 NOW(), NOW(), NOW()),

('Souvenir Shop Montenegro', 'Premium suvenirnica luksuznim i lokalnim proizvodima', 'Kotor', NULL, NULL,
 NULL, NULL, '{"pon":"09:00-22:00","uto":"09:00-22:00","sre":"09:00-22:00","cet":"09:00-22:00","pet":"09:00-22:00","sub":"09:00-23:00","ned":"09:00-21:00"}',
 NULL, ARRAY['Luksuzni suveniri', 'Brendirani proizvodi', 'Pokloni'], ST_SetSRID(ST_MakePoint(18.76856, 42.42693), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Suvenirnica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Souvenir Shop XY', 'Suvenirnica na šetalištu uz more', 'Šetalište Pet Danica, Herceg Novi', NULL, NULL,
 NULL, NULL, '{"pon":"09:00-21:00","uto":"09:00-21:00","sre":"09:00-21:00","cet":"09:00-21:00","pet":"09:00-21:00","sub":"09:00-22:00","ned":"09:00-21:00"}',
 NULL, ARRAY['Suveniri', 'Školjke', 'Magneti'], ST_SetSRID(ST_MakePoint(18.53368, 42.45103), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Suvenirnica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.hercegnovi@spirego.com'),
 NOW(), NOW(), NOW()),

('Mnemories', 'Suvenirnica sa kraljevskim i istorijskim motivima Crne Gore', '21 Njegoševa ulica, Cetinje', '+38267675193', NULL,
 NULL, NULL, '{"pon":"09:00-19:00","uto":"09:00-19:00","sre":"09:00-19:00","cet":"09:00-19:00","pet":"09:00-19:00","sub":"10:00-17:00","ned":"neradni dan"}',
 NULL, ARRAY['Suveniri', 'Istorijski predmeti', 'Knjižice'], ST_SetSRID(ST_MakePoint(18.92490, 42.38829), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Suvenirnica'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.cetinje@spirego.com'),
 NOW(), NOW(), NOW());

-- Objekte kreira ContentCreator, a odobrava menadzer nadlezan za destinaciju.
UPDATE "Objects" o
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE o."LocalityId" = l."Id"
  AND o."DestinationId" IS DISTINCT FROM l."DestinationId";

UPDATE "Objects" o
SET "CreatedByUserId" = cc."Id",
    "ApprovedByUserId" = d."ManagedByUserId",
    "ApprovedAt" = CASE
        WHEN o."Status" = 'Approved' THEN COALESCE(o."ApprovedAt", NOW())
        ELSE o."ApprovedAt"
    END
FROM "Destinations" d,
     (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com') cc
WHERE o."DestinationId" = d."Id";

-- ============================================
-- 7. ACTIVITIES
-- ============================================
INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Degustacija morskih specijaliteta', 'Uživajte u lokalnoj kuhinji Kotora kroz degustaciju svežih ribljih i morskih specijaliteta. Aktivnost je idealna za posetioce koji žele da upoznaju autentične ukuse primorja u prijatnom ambijentu.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 25.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Poseta Restoranu'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Nocni provod Budva', 'Budva je poznata po živahnom noćnom životu, muzici i provodu do kasnih sati. Ova aktivnost je namenjena svima koji žele opušteno veče uz dobru atmosferu, piće i zabavu pored mora.',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 10.00, 240, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Nocni provod'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Planinarenje na Durmitoru', 'Planinarenje na Durmitoru pruža priliku za istraživanje netaknute prirode, planinskih staza i prelepih pejzaža. Aktivnost je idealna za ljubitelje avanture, svežeg vazduha i aktivnog odmora.',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0.00, 300, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Planinarenje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Setnja starim gradom Kotora', 'Šetnja starim gradom Kotora vodi kroz uske kamene ulice, trgove i istorijske znamenitosti ovog primorskog grada. Savršena je za posetioce koji žele da upoznaju kulturu, arhitekturu i duh Kotora.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), 
 NOW(), NOW()),
 
 ('Voznja camcem Skadarsko jezero', 'Vožnja čamcem po Skadarskom jezeru omogućava uživanje u mirnoj vodi, prirodi i bogatom biljnom i životinjskom svetu. Aktivnost je odlična za opuštanje, fotografisanje i doživljaj jezera iz drugačije perspektive.',
 ST_SetSRID(ST_MakePoint(19.091, 42.246), 4326), 15.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Voznja camcem'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

 ('Skijanje Kolasin', 'Skijanje u Kolašinu pruža uživanje na planinskim stazama i snežnim pejzažima severa Crne Gore. Aktivnost je pogodna za ljubitelje zimskih sportova i boravka na svežem planinskom vazduhu.',
 ST_SetSRID(ST_MakePoint(19.522, 42.822), 4326), 30.00, 240, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Skijanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW());


-- Aktivnosti kreira ContentCreator, a odobrava menadzer nadlezan za destinaciju.
UPDATE "Activities" a
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE a."LocalityId" = l."Id"
  AND a."DestinationId" IS DISTINCT FROM l."DestinationId";

UPDATE "Activities" a
SET "CreatedByUserId" = cc."Id",
    "ApprovedByUserId" = d."ManagedByUserId",
    "ApprovedAt" = CASE
        WHEN a."Status" = 1 THEN COALESCE(a."ApprovedAt", NOW())
        ELSE a."ApprovedAt"
    END
FROM "Destinations" d,
     (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com') cc
WHERE a."DestinationId" = d."Id";

-- ============================================
-- 8. EVENTS
-- ============================================
INSERT INTO "Events"
("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('KotorArt festival', 'KotorArt festival predstavlja jedinstven spoj muzike, umetnosti i kulturnog nasleđa u prelepom ambijentu Kotora. Tokom trajanja festivala, posetioci mogu uživati u raznovrsnom programu koji obuhvata koncerte, umetničke performanse i sadržaje inspirisane bogatom tradicijom ovog primorskog grada. Događaj okuplja ljubitelje kulture, domaće i strane goste, stvarajući živu i inspirativnu atmosferu. Poseban doživljaj pruža spoj savremene umetnosti i istorijskog okruženja, gde svaka večer donosi novo iskustvo i priliku za uživanje u kreativnom izrazu. Festival je idealan za sve koji žele da leto provedu u znaku kulture, dobrog raspoloženja i nezaboravnih trenutaka u jednom od najlepših gradova na Jadranu.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), '2026-07-15 20:00', '2026-07-30 23:00', 20.00, 1000, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Vece klasicne muzike', 'U čarobnoj atmosferi starog grada Kotora, ovo veče klasične muzike nudi jedinstven spoj umetnosti i istorije. Program obuhvata pažljivo odabrane kompozicije koje izvode talentovani muzičari, stvarajući intimnu i sofisticiranu atmosferu. Idealno za sve ljubitelje kulture, muzike i romantičnih večeri pod otvorenim nebom. Autentični ambijent kamenih trgova i osvetljenih uličica dodatno pojačava doživljaj, pretvarajući svaki ton u posebno emotivno iskustvo. Posetioci će imati priliku da se prepuste zvucima klasične muzike dok uživaju u jedinstvenom spoju tradicije i umetnosti. Ovaj događaj pruža savršenu priliku za opuštanje, inspiraciju i stvaranje nezaboravnih uspomena u jednom od najlepših primorskih gradova.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), '2026-08-05 21:00', '2026-08-05 23:00', 15.00, 200, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Budva Summer Festival', 'Budva Summer Festival donosi energičan i raznovrstan letnji program namenjen svima koji žele da uživaju u muzici, zabavi i prijatnoj atmosferi na otvorenom. Festival okuplja veliki broj posetilaca i nudi sadržaje koji spajaju savremenu zabavu sa prepoznatljivim mediteranskim duhom Budve. Tokom više festivalskih dana, grad postaje mesto susreta dobre muzike, opuštanja i letnjih uspomena. Uz atraktivan ambijent i bogat program, posetioci imaju priliku da provedu nezaboravne večeri u društvu prijatelja i porodice. Ovaj događaj je savršen izbor za sve koji žele da iskuse letnju energiju Budve, uživaju u kvalitetnom programu i provedu vreme u jednoj od najpoznatijih turističkih destinacija na crnogorskom primorju.',
 ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326), '2026-07-01 19:00', '2026-07-10 23:00', 10.00, 1500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('DJ Night Mogren', 'DJ Night Mogren je večernji događaj namenjen ljubiteljima elektronske muzike, plesa i letnje atmosfere pored mora. Smešten u atraktivnom ambijentu plaže Mogren, ovaj događaj okuplja posetioce koji žele da uživaju u modernim ritmovima, dobroj energiji i nezaboravnom noćnom provodu. Spoj muzike, mora i letnje večeri stvara poseban ambijent koji privlači kako turiste tako i lokalne posetioce. Uz dinamičan program i opuštenu atmosferu, događaj pruža savršenu priliku za druženje, zabavu i uživanje u jedinstvenom noćnom iskustvu na obali. DJ Night Mogren je idealan za sve koji žele da dožive živopisnu letnju scenu Budve i provedu noć ispunjenu muzikom, plesom i odličnim raspoloženjem.',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), '2026-08-10 22:00', '2026-08-11 03:00', 8.00, 500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Nastup'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Planinarski susret', 'Planinarski susret na Durmitoru predstavlja idealnu priliku za sve ljubitelje prirode, pešačenja i boravka na svežem planinskom vazduhu. Događaj okuplja planinare, rekreativce i avanturiste koji žele da provedu dan u druženju, istraživanju prirodnih lepota i uživanju u spektakularnim pejzažima jednog od najlepših planinskih predela. Program je osmišljen tako da spoji aktivan odmor, rekreaciju i zajedničko uživanje u prirodi. Pored same šetnje i okupljanja, učesnici imaju priliku da upoznaju druge zaljubljenike u planinu i provedu vreme u prijatnoj i opuštenoj atmosferi. Ovaj događaj pruža savršen beg od svakodnevice i mogućnost da se doživi mir, lepota i autentičan duh Durmitora kroz aktivan i ispunjen dan u prirodi.',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), '2026-09-01 08:00', '2026-09-01 18:00', 5.00, 100, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Okupljanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Praznik mimoze',  'Praznik mimoze je jedna od najpoznatijih zimskih manifestacija na crnogorskom primorju. Obeležava dolazak proleća uz karnevalske povorke, muziku i tradicionalne gastronomske događaje. Grad Herceg Novi tada postaje centar zabave i okupljanja posetilaca iz regiona.',
 ST_SetSRID(ST_MakePoint(18.5368, 42.4517), 4326), '2026-02-13 18:00', '2026-02-28 23:00', 0.00, 1000, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 NULL,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),
 
('Herceg Novi Film Festival', 'Herceg Novi Film Festival okuplja ljubitelje filmske umetnosti iz zemlje i inostranstva. Program obuhvata projekcije igranih, dokumentarnih i autorskih filmova. Poseban doživljaj pružaju projekcije na otvorenom uz more.',
 ST_SetSRID(ST_MakePoint(18.53231, 42.45222), 4326), '2026-08-22 20:00', '2026-08-28 23:30', 8.00, 500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Durmitor Trail Run', 'Durmitor Trail Run je planinska trka koja vodi kroz najlepše predele Nacionalnog parka Durmitor. Učesnici prolaze kroz šume, planinske staze i oko jezera. Događaj privlači sportiste i avanturiste iz celog sveta.',
 ST_SetSRID(ST_MakePoint(19.091, 43.146), 4326), '2026-07-10 08:00', '2026-07-12 18:00', 25.00, 600, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Takmicenje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 NULL,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Wild Beauty Art Festival', 'Wild Beauty Art Festival spaja umetnost, prirodu i muziku u jedinstvenom ambijentu Durmitora. Tokom festivala organizuju se koncerti, performansi i umetničke instalacije. Poseban akcenat stavlja se na očuvanje prirode i ekološku svest.',
 ST_SetSRID(ST_MakePoint(19.091, 43.146), 4326), '2026-07-05 20:00', '2026-08-11 23:00', 10.00, 300, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 NULL,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Bedem Fest', 'Bedem Fest je muzički festival koji se održava na istorijskoj tvrđavi u Nikšiću. Poznat je po nastupima regionalnih i domaćih izvođača različitih žanrova. Autentična lokacija daje posebnu atmosferu svakom koncertu.',
 ST_SetSRID(ST_MakePoint(18.9417, 42.7748), 4326), '2026-07-30 20:00', '2026-08-01 23:30', 15.00, 1200, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tvrdjava Onogost'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 NULL,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Petrovac Jazz Fest', 'Petrovac Jazz Fest okuplja renomirane jazz i blues muzičare iz zemlje i sveta. Koncerti se održavaju u prijatnom primorskom ambijentu. Festival pruža opuštenu atmosferu uz vrhunsku muziku.',
 ST_SetSRID(ST_MakePoint(18.942, 42.206), 4326), '2026-08-28 20:00', '2026-08-30 23:30', 12.00, 400, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Dani muzike Herceg Novi', 'Dani muzike Herceg Novi predstavljaju prestižni festival klasične muzike. Nastupaju domaći i međunarodni umetnici visokog renomea. Program obuhvata koncerte različitih muzičkih stilova i epoha.',
 ST_SetSRID(ST_MakePoint(18.53231, 42.45222), 4326), '2026-07-10 20:00', '2026-07-20 23:00', 10.00, 300, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Biser Jadrana Tivat', 'Biser Jadrana Tivat je popularan letnji muzički događaj na obali mora. Okuplja izvođače zabavne i pop muzike iz regiona. Publika uživa u koncertima u opuštenoj i svečanoj atmosferi.',
 ST_SetSRID(ST_MakePoint(18.69581, 42.43125), 4326), '2026-07-17 20:00', '2026-07-18 23:30', 15.00, 700, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW());
 

UPDATE "Events"
SET "LocalityId" = (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva')
WHERE "Name" = 'Budva Summer Festival';

UPDATE "Events"
SET "LocalityId" = (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero')
WHERE "Name" = 'Planinarski susret';

UPDATE "Events"
SET "ObjectId" = (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor')
WHERE "Name" = 'Durmitor Trail Run';

UPDATE "Events"
SET "LocalityId" = (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    "ObjectId" = (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
    "Geolocation" = ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326)
WHERE "Name" = 'Wild Beauty Art Festival';

-- Evente kreira ContentCreator, a odobrava menadzer nadlezan za destinaciju.
UPDATE "Events" e
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE e."LocalityId" = l."Id"
  AND e."DestinationId" IS DISTINCT FROM l."DestinationId";

UPDATE "Events" e
SET "CreatedByUserId" = cc."Id",
    "ApprovedByUserId" = d."ManagedByUserId",
    "ApprovedAt" = CASE
        WHEN e."Status" = 'Approved' THEN COALESCE(e."ApprovedAt", NOW())
        ELSE e."ApprovedAt"
    END
FROM "Destinations" d,
     (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com') cc
WHERE e."DestinationId" = d."Id";

-- ============================================
-- 9. REVIEWS
-- ============================================
INSERT INTO "Reviews"
("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
VALUES
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 5, 'Odlican hotel, preporucujem! Lokacija savrsena.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 4, 'Restoran je fantastican, hrana odlicna, pogled prelep! Jedina zamerka je cena ovog restorana.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 5, 'Luksuzno i udobno, vredi svake pare. Djakuzi vrhunski.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 3, 'Lep hotel i odlicna lokacija, dorucak moze biti bolji, a cena malo jeftinija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 4, 'Vrlo prijatan smestaj i sjajan pogled sa terase.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 2, 'Hrana je okej i pogled je lep ali je osoblje veoma neljubazno. Ja se sigurno necu vratiti!', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 4, 'Opustena atmosfera i super muzika predvece. Nije za roditelje sa malom decom.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 2, 'Lokacija bara je vrlo privlacna, ali nazalost nije za roditelje sa decom :(', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 5, 'Odlicno mesto za pice posle plaze.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 5, 'Savrsena baza za planinarenje, na moje iznenadjenje i veoma cisto! :).', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 4, 'Topla preporuka za ljubitelje prirode i planine.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
 3, 'Sobe su udobne i lokacija je dobra za skijanje, ali spa zona je bila prevelika guzva tokom vikenda.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
 4, 'Dobar dorucak i prijatan ambijent, osoblje brzo reaguje na zahteve.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
 5, 'Riba je bila sveza, a terasa uz jezero je najlepsi deo vecere pred zalazak sunca.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
 4, 'Pogled i hrana su odlicni, ali se na uslugu cekalo malo duze nego sto sam ocekivala.', 'Approved', NOW()),

-- =========================
-- Konoba Scala Santa
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
 5, 'Prelepa konoba sa autentičnom atmosferom i odličnom hranom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
 4, 'Hrana je bila jako ukusna, ali je usluga bila malo sporija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
 5, 'Prava domaća atmosfera i vrhunski specijaliteti.', 'Approved', NOW()),

-- =========================
-- Restoran Pod Volat
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
 4, 'Dobra tradicionalna hrana i korektne cene.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
 3, 'Hrana je okej, ali prostor bi mogao biti uređeniji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
 5, 'Odlične porcije i veoma ukusna jela.', 'Approved', NOW()),

-- =========================
-- MayaBay Porto Montenegro
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
 5, 'Luksuzno iskustvo, hrana i ambijent savršeni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
 4, 'Prelep restoran, ali cene su baš visoke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
 5, 'Jedan od najboljih restorana uz obalu.', 'Approved', NOW()),

-- =========================
-- Konoba Batricevic Njeguši
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
 4, 'Odličan domaći sir i pršut, prava planinska hrana.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
 5, 'Sve je bilo savršeno, posebno atmosfera sela.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
 5, 'Autentično i domaće, vredi posetiti.', 'Approved', NOW()),

-- =========================
-- Restoran Ulcinj Sunset
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
 3, 'Prelep pogled, ali hrana je prosečna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
 5, 'Zalazak sunca ovde je nezaboravan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
 4, 'Odlična lokacija, hrana korektna.', 'Approved', NOW()),

-- =========================
-- Restaurant OrO
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
 5, 'Fine dining iskustvo na visokom nivou.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
 4, 'Jela su lepo prezentovana i ukusna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
 5, 'Izuzetno kvalitetna hrana i servis.', 'Approved', NOW()),


-- =========================
-- Regent Porto Montenegro
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
 5, 'Luksuz na najvišem nivou, sve je besprekorno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
 5, 'Prelep hotel, usluga i ambijent su savršeni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
 3, 'Hotel jeste luksuzan, ali odnos cene i dobijenog nije baš opravdan.', 'Approved', NOW()),

-- =========================
-- Hotel Splendid Conference & Spa Resort
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
 5, 'Spa centar je fantastičan, pravi odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
 4, 'Sve je bilo odlično osim gužve u spa zoni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
 5, 'Jedan od najboljih hotela na obali.', 'Approved', NOW()),

-- =========================
-- Hyatt Regency Kotor Bay Resort
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
 5, 'Pogled na zaliv je nestvaran, hotel vrhunski.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
 4, 'Prelep ambijent, ali doručak može biti bolji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
 5, 'Savršen odmor, sve preporuke.', 'Approved', NOW()),

-- =========================
-- Hotel Palmon Bay
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
 4, 'Lep hotel uz more, vrlo prijatno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
 5, 'Spa i bazen su odlični.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
 2, 'Lokacija dobra, ali čistoća sobe nije bila na nivou koji sam očekivao.', 'Approved', NOW()),

-- =========================
-- Lazure Hotel & Marina
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
 5, 'Perfektan spoj luksuza i marine.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
 5, 'Jedinstveno mesto, sve je savršeno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
 4, 'Prelepo, ali malo skuplje nego očekivano.', 'Approved', NOW()),

-- =========================
-- Hotel Palas
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
 4, 'Odlična lokacija, blizu plaže.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
 3, 'Sobe su korektne, ali malo zastarele.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
 4, 'Prijatan boravak, osoblje ljubazno.', 'Approved', NOW()),

-- =========================
-- Hotel Forza Mare
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
 5, 'Luksuz i privatnost, savršeno mesto za odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
 5, 'Prelep dizajn i vrhunska usluga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
 4, 'Veoma lepo, ali dosta skupo.', 'Approved', NOW()),

-- =========================
-- Hotel Princess
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
 4, 'Solidan hotel za odmor pored mora.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
 2, 'Lokacija je dobra, ali sobe su loše održavane.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
 4, 'Dobar hotel za porodice.', 'Approved', NOW()),

-- =========================
-- Hotel CentreVille Podgorica
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
 5, 'Moderan hotel u centru grada.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
 4, 'Odlična lokacija i udobne sobe.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
 5, 'Sve je bilo savršeno organizovano.', 'Approved', NOW()),

-- =========================
-- Hotel Polar Star
-- =========================
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
 4, 'Odličan izbor za planinski odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
 5, 'Mir i priroda, savršeno mesto za opuštanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
 3, 'Lep ambijent, ali grejanje nije bilo dovoljno jako.', 'Approved', NOW()),



-- Gradska kafanica Zabljak
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
 5, 'Prava planinska kafana, hrana domaca i ukusna, porcije velike.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
 4, 'Lepa atmosfera i prijatno osoblje, idealno posle setnje po hladnom vremenu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
 2, 'Hrana je okej ali sam ocekivao vise za tu cenu. Ambijent malo zastareo.', 'Approved', NOW()),


-- Konoba Stari Grad
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
 5, 'Prelep ambijent u starom gradu, hrana fenomenalna, sve preporuke!', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
 4, 'Dobar izbor tradicionalnih jela i ljubazno osoblje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
 3, 'Lokacija je top, ali sam ocekivala malo brzu uslugu. Hrana solidna.', 'Approved', NOW()),


-- Kafana Markovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
 5, 'Odlicna kafana za drustvo, muzika i atmosfera vrhunski.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
 4, 'Super provod, hrana ukusna, ali zna da bude guzva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
 2, 'Previse buke za moj ukus, jedva smo mogli da pricamo. Hrana nista specijalno.', 'Approved', NOW()),


-- Planinarski dom Skrka
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
 5, 'Savrseno mesto za odmor u prirodi, mir i tisina. Dom je uredan i domacini ljubazni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
 4, 'Prelep pogled i dobra lokacija za planinarenje, uslovi solidni za ovakav tip smestaja.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
 3, 'Priroda je fantasticna, ali sam ocekivao malo bolje odrzavanje samog doma.', 'Approved', NOW()),


-- Planinarski dom Vranjak
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
 5, 'Odlican dom za beg iz grada, sve preporuke za ljubitelje planine.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
 4, 'Topla atmosfera i prijatni ljudi, idealno za vikend u prirodi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
 2, 'Lokacija lepa, ali uslovi dosta skromni. Nije bas za svakoga ko ocekuje komfor.', 'Approved', NOW()),


-- Nacionalna biblioteka Crne Gore Djurdje Crnojevic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
 5, 'Prelepo mesto za ucenje i istrazivanje, bogata zbirka i prijatan ambijent.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
 4, 'Mirno i uredno, idealno za rad. Osoblje ljubazno i spremno da pomogne.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
 4, 'Lepa atmosfera i dobar izbor knjiga, ali bi radno vreme moglo biti duze.', 'Approved', NOW()),


-- Narodna biblioteka Radosav Ljumovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
 5, 'Odlicna biblioteka, veliki izbor knjiga i prijatan prostor za citanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
 4, 'Sve pohvale za organizaciju i mir koji vlada unutra.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
 3, 'Prostor je okej, ali je nekad tesko naci slobodno mesto za sedenje.', 'Approved', NOW()),


-- Gradska biblioteka i citaonica Herceg Novi
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
 5, 'Vrlo prijatan ambijent i dobar izbor literature, rado dolazim ovde.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
 4, 'Mirno mesto za citanje, osoblje korektno i usluzno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
 4, 'Lepo uredjeno i prijatno, iako bi moglo biti malo vise novijih naslova.', 'Approved', NOW()),


-- Manastir Ostrog
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
 5, 'Posebno mesto koje ostavlja jak utisak. Pogled neverovatan, a atmosfera mirna i duhovna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
 5, 'Dolazio sam vise puta i svaki put je isti osecaj mira. Vredi posetiti makar jednom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
 4, 'Prelepo i znacajno mesto, ali treba biti spreman na guzvu u sezoni.', 'Approved', NOW()),


-- Katedrala Svetog Tripuna
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
 5, 'Impresivna gradjevina i jako lepo ocuvana. Unutra je posebno zanimljivo.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
 4, 'Vredi obici ako ste u Kotoru, istorija i arhitektura su bas zanimljivi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
 4, 'Lepo mesto za kratku posetu, nije guzva kao na drugim lokacijama.', 'Approved', NOW()),


-- Crkva Svetog Nikole
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
 5, 'Prelepa crkva, jednostavna ali ima posebnu atmosferu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
 4, 'Mirno mesto, lepo za kratko zadrzavanje i predah od guzve.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
 3, 'Lepa crkva, ali nisam nasla mnogo informacija o istoriji na licu mesta.', 'Approved', NOW()),


-- Crkva Svetog Jovana Vladimira
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
 5, 'Nova i veoma lepo uredjena crkva, ostavlja bas lep utisak.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
 4, 'Velika i prostrana, dopada mi se kako je organizovan prostor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
 4, 'Lepo mesto, uredno i mirno. Prijatno za posetu i razgledanje.', 'Approved', NOW()),


-- Apartments Djurovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
 5, 'Bas prijatan smestaj, cisto i uredno. Domacini jako ljubazni, osecas se kao kod kuce.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
 4, 'Dobar odnos cene i kvaliteta, bez nekih velikih zamerki.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
 3, 'Solidno, ali nista sto se posebno izdvaja. Za kraci boravak ok.', 'Approved', NOW()),


-- Apartments Vukovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
 5, 'Cisto, uredno i mirno. Bas sam zadovoljna, opet bih dosla.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
 4, 'Sve kako treba, bez komplikacija. Lokacija dobra.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
 4, 'Prijatno mesto, iako bi kupatilo moglo biti malo modernije.', 'Approved', NOW()),


-- Lux Apartment Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
 5, 'Stvarno luksuzno, sve novo i lepo sredjeno. Blizu svega.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
 4, 'Lep stan, dobra lokacija, ali cena malo jaca nego sto sam ocekivao.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
 4, 'Sve je bilo super, samo parking ume da bude problem.', 'Approved', NOW()),


-- Apartmani M Herceg Novi
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
 5, 'Divan pogled na more, bas sam uzivala u boravku.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
 4, 'Lepa lokacija i korektan smestaj.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
 3, 'Ok je, ali ima dosta stepenica do apartmana, nije bas prakticno.', 'Approved', NOW()),


-- Boutique Hotel Casa del Mare - Amfora
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
 5, 'Prelep ambijent i odlicna usluga. Sve deluje jako elegantno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
 5, 'Jedan od boljih smestaja gde sam bio. Sve na nivou.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
 4, 'Stvarno lepo, ali malo skuplje nego sto sam planirala.', 'Approved', NOW()),


-- Apartments Mijovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
 4, 'Sve korektno, cisto i uredno. Bez velikih zamerki.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
 3, 'Prosecno iskustvo, ali za cenu sasvim okej.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
 4, 'Mirno mesto, lepo za odmor bez guzve.', 'Approved', NOW()),


-- Durmitor View Apartments
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
 5, 'Pogled je stvarno brutalan, vredi doci samo zbog toga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
 5, 'Savrseno za odmor u prirodi, sve preporuke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
 4, 'Lepo i mirno, samo malo udaljeno od svega.', 'Approved', NOW()),


-- Apartments Aleksandar
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
 4, 'Prijatno mesto, sve uredno i cisto.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
 3, 'Nista specijalno, ali zavrsava posao za nocenje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
 4, 'Lepa lokacija i korektan smestaj.', 'Approved', NOW()),


-- Villa Ljubanovic Apartments
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
 5, 'Odlicno mesto, sve uredno i domacini bas gostoljubivi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
 4, 'Prijatno iskustvo, bez ikakvih problema tokom boravka.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
 4, 'Sve kako treba, vratio bih se opet.', 'Approved', NOW()),


-- Casa Nuova
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
 5, 'Bas lepo uredjeno i moderno, dopalo mi se na prvi pogled.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
 4, 'Lep smestaj, dobra lokacija i sve blizu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
 3, 'Ok je, ali sam ocekivao malo vise za tu cenu.', 'Approved', NOW()),


-- Banya Wellness & Spa
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
 5, 'Bas sam se opustila, sve je cisto i mirise lepo. Masaža odlicna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
 4, 'Dobar spa, sauna i bazen super. Malo guzve vikendom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
 4, 'Prijatna atmosfera, sve uredno. Moglo bi malo vise prostora za lezaljke.', 'Approved', NOW()),


-- Wellness Center Simo Milosevic
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
 5, 'Odlican za oporavak i relaksaciju. Sve preporuke, dolazim opet.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
 4, 'Usluga dobra, osoblje ljubazno. Malo stariji objekat ali uredan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
 3, 'Ok iskustvo, ali sam ocekivao moderniji prostor.', 'Approved', NOW()),


-- Perla Residence Spa
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
 5, 'Prelep prostor, bas luksuzno i tiho. Idealno za opustanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
 5, 'Sve mi se svidelo, posebno bazen i pogled. Vredi posete.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
 4, 'Lepo uredjeno i cisto, samo malo skuplje nego sto sam planirao.', 'Approved', NOW()),


-- Huma Bay Spa
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
 5, 'Top iskustvo, sve izgleda vrhunski i profesionalno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
 4, 'Bas lepo mesto, samo je malo vise ljudi nego sto sam ocekivala.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
 4, 'Sve pohvale za ambijent i uslugu. Osecaj bas kao na odmoru.', 'Approved', NOW()),


-- Casa del Mare Spa
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
 5, 'Jedan od boljih spa centara gde sam bio, sve na nivou.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
 5, 'Predivno mesto, mirno i elegantno. Bas sam uzivala.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
 4, 'Vrlo dobro, ali cena je malo jaca.', 'Approved', NOW()),


-- Spomenik Partizanu borcu na Gorici
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
 5, 'Veoma impresivan i dostojanstven spomenik, lepo održavan i mirna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
 4, 'Lepo mesto sa važnom istorijom, ali bih voleo malo više informacija na samoj lokaciji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
 5, 'Mirno i emotivno mesto, lepo za posetu i razmišljanje.', 'Approved', NOW()),

-- Spomenik Vladimiru i Kosari
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
 5, 'Prelepa skulptura i zanimljiva legenda iza nje, baš me je zainteresovalo.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
 4, 'Dobar istorijski prikaz, ali lokacija bi mogla biti malo uređenija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
 5, 'Jako lepo urađeno i simbolično mesto koje vredi videti.', 'Approved', NOW()),

-- Spomenik kralju Nikoli
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
 5, 'Impozantan spomenik, lepo uklopljen u prostor i veoma značajan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
 4, 'Zanimljivo mesto, ali ima dosta turista pa ume da bude gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
 5, 'Odlično očuvan i vrlo značajan spomenik.', 'Approved', NOW()),

-- Spomenik Ljubu Čupiću
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
 5, 'Veoma emotivan spomenik, ostavlja jak utisak.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
 4, 'Zanimljivo i simbolično mesto, vredi posetiti.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
 5, 'Jedan od najpoznatijih spomenika, baš snažna poruka.', 'Approved', NOW()),

-- Spomenik palim borcima na Grahovcu
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
 4, 'Mirno i dostojanstveno mesto, ali malo zapuštena okolina.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
 5, 'Važan istorijski lokalitet, lepo očuvan spomenik.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
 4, 'Dobar spomenik, ali bi mogao biti bolje obeležen.', 'Approved', NOW()),

-- Spomenik Tuđemilima
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
 4, 'Zanimljiva lokacija sa dosta istorije, ali malo zaboravljena.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
 5, 'Lepo mesto koje ima posebnu atmosferu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
 4, 'Zanimljivo, ali nedostaje više informacija za posetioce.', 'Approved', NOW()),

-- Spomenik Punisi Račiću
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
 5, 'Vrlo značajan istorijski spomenik, ostavlja jak utisak.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
 4, 'Lepo urađeno, ali malo skromna lokacija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
 5, 'Važan deo istorije lepo predstavljen.', 'Approved', NOW()),

-- Spomenik herojima Božićnog ustanka
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
 5, 'Veoma snažan i emotivan spomenik.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
 4, 'Lepo obeleženo mesto, ali može biti malo sređenije.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
 5, 'Vrlo značajan i dostojanstven spomenik.', 'Approved', NOW()),

-- Spomenik bici na Fundini
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
 4, 'Zanimljivo mesto, ali nije dovoljno objašnjeno šta predstavlja.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
 5, 'Lepo urađen spomenik sa važnom istorijskom vrednošću.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
 4, 'Mirno mesto, lepo za kratku posetu.', 'Approved', NOW()),

-- Spomenik Njegošu na Lovćenu
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
 5, 'Impresivno i veličanstveno mesto, pogled je neverovatan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
 5, 'Jedno od najlepših mesta u Crnoj Gori, vredno svake posete.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
 4, 'Prelepa lokacija, ali uspon može biti naporan.', 'Approved', NOW()),


-- Top Hill Club
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
 5, 'Jedan od najboljih klubova na otvorenom, odlična muzika i atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
 4, 'Super provod, ali su redovi za piće predugi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
 5, 'Neverovatna energija i pogled na grad noću.', 'Approved', NOW()),

-- Emporio Club
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
 4, 'Dobar klub, muzika je odlična, ali zna da bude gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
 5, 'Fenomenalna atmosfera, DJ je bio baš dobar.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
 4, 'Lepo mesto za izlazak, ali malo skuplja pića.', 'Approved', NOW()),

-- Maximus Club Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
 5, 'Jedan od najpoznatijih klubova, odlična energija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
 4, 'Super muzika, ali prostor zna da bude prenatrpan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
 5, 'Odličan provod, baš pravi klub za noćni izlazak.', 'Approved', NOW()),

-- Omnia Nightclub
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
 5, 'Jedinstven klub sa neverovatnim vizuelnim efektima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
 4, 'Odlična atmosfera, ali ulaz može biti komplikovan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
 5, 'Jedan od najboljih klubova u regionu, bez dileme.', 'Approved', NOW()),

-- Diamond Night Club
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
 4, 'Lep klub, dobra muzika, ali malo manji prostor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
 5, 'Odličan provod i dobra energija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
 4, 'Solidan klub, prijatna atmosfera.', 'Approved', NOW()),

-- Miami Club Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
 5, 'Letnji klub sa odličnim žurkama na plaži.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
 4, 'Super atmosfera, ali dosta glasno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
 5, 'Idealno mesto za letnje noći.', 'Approved', NOW()),

-- Madam Open Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
 4, 'Opusteno mesto za piće, ali nije za velike žurke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
 5, 'Prijatna atmosfera i ljubazno osoblje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
 4, 'Dobar bar za opušten izlazak.', 'Approved', NOW()),

-- Beach club Raffaelo
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
 5, 'Prelep beach club, muzika i ambijent savršeni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
 4, 'Odlično mesto, ali cene su malo više.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
 5, 'Savršeno za letnji izlazak.', 'Approved', NOW()),

-- Montenegro Pub
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
 4, 'Dobar pub, opuštena atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
 5, 'Odlično mesto za pivo i druženje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
 4, 'Prijatno mesto, bez previše gužve.', 'Approved', NOW()),

-- Night Club Ambiente
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
 5, 'Odlična muzika i energija, baš dobar provod.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
 4, 'Dobar klub, ali može biti gužva vikendom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
 5, 'Jedan od boljih klubova za noćni izlazak.', 'Approved', NOW()),


-- EKO Pumpa Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
 4, 'Čista pumpa i brz protok, ali zna da bude gužva u sezoni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
 3, 'Sve korektno, ali osoblje nije baš najljubaznije.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
 5, 'Uvek ima goriva i brzo se završava sve.', 'Approved', NOW()),

-- Petrol Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
 4, 'Standardna pumpa, ništa posebno ali uredna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
 3, 'Često čekanje u redu, moglo bi brže da se radi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
 4, 'Solidna usluga, nema većih zamerki.', 'Approved', NOW()),

-- Lukoil Konik Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
 3, 'Pumpa je u redu, ali deluje malo zapušteno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
 4, 'Brza usluga, ali prostor bi mogao biti čistiji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
 2, 'Dosta loš utisak, sporo i neorganizovano.', 'Approved', NOW()),

-- INA Skaljari Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
 5, 'Odlična lokacija i brza usluga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
 4, 'Sve korektno, pumpa radi kako treba.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
 3, 'Ništa specijalno, ali obavlja posao.', 'Approved', NOW()),

-- EKO Tivat
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
 4, 'Uredno i brzo, pogodno za turiste.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
 3, 'Ok pumpa, ali malo skuplje gorivo deluje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
 4, 'Solidna usluga bez čekanja.', 'Approved', NOW()),

-- Petrol Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
 3, 'Sve u redu, ali može biti gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
 4, 'Dobra lokacija i korektna usluga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
 2, 'Spora usluga i loša organizacija kada je gužva.', 'Approved', NOW()),

-- Lukoil Kolasin
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
 5, 'Odlična pumpa, sve brzo i uredno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
 4, 'Korektna usluga, bez problema.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
 3, 'Ok, ali nema baš mnogo sadržaja oko pumpe.', 'Approved', NOW()),

-- Eko Igalo Banja
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
 4, 'Čisto i uredno, prijatno mesto.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
 3, 'Može biti malo brža usluga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
 4, 'Sve korektno, nema većih zamerki.', 'Approved', NOW()),

-- EKO Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
 4, 'Dobra pumpa, ali usko i često gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
 3, 'Sve radi, ali prostor nije baš praktičan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
 5, 'Brzo i efikasno, odlična lokacija.', 'Approved', NOW()),

-- EKO Zabljak
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
 5, 'Odlična pumpa u planinskom okruženju.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
 4, 'Sve korektno, ali nema puno opcija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
 3, 'Ok pumpa, ali skromna ponuda.', 'Approved', NOW()),


-- Casper Bar Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
 5, 'Prelep ambijent i odlična kafa, baš prijatno mesto.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
 4, 'Dobar bar, ali ume da bude gužva uveče.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
 3, 'Ok mesto, ali usluga ponekad spora.', 'Approved', NOW()),

-- Azzuro Beach
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
 5, 'Savršena lokacija na plaži, idealno za opuštanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
 4, 'Lepo mesto, ali muzika je ponekad preglasna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
 3, 'Solidno, ali usluga bi mogla biti bolja.', 'Approved', NOW()),

-- Marshall’s Gelato & Coffee
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
 5, 'Najbolji sladoled u gradu, sve pohvale.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
 4, 'Ukusno i prijatno mesto za pauzu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
 3, 'Ok kafa, ali malo skuplje nego očekivano.', 'Approved', NOW()),

-- Karver Bookstore & Cafe Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
 5, 'Predivna atmosfera uz reku, savršeno za čitanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
 4, 'Jako opušteno mesto, ali zna da bude gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
 5, 'Savršeno mesto za mir i knjigu.', 'Approved', NOW()),

-- Dojmi Cafe Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
 4, 'Lep kafić u starom gradu, prijatna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
 3, 'Ok kafa, ali ništa posebno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
 4, 'Dobar pogled i solidna usluga.', 'Approved', NOW()),

-- Citadela Cafe Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
 5, 'Neverovatan pogled, idealno mesto za odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
 4, 'Prelepa lokacija, ali skuplje nego u proseku.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
 5, 'Jedno od najlepših mesta za kafu.', 'Approved', NOW()),

-- Al Posto Giusto Tivat
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
 4, 'Dobar kafić i prijatno osoblje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
 3, 'Ok mesto, ali može biti sporije.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
 5, 'Odlična lokacija i prijatna atmosfera.', 'Approved', NOW()),

-- Astoria Cafe Lustica
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
 5, 'Predivan ambijent, mir i pogled.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
 4, 'Lepo mesto za opuštanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
 3, 'Ok, ali dosta udaljeno.', 'Approved', NOW()),

-- HEIST Bar Ulcinj
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
 4, 'Dobar bar, prijatna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
 3, 'Ok mesto, ali nema nešto posebnog.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
 5, 'Super muzika i energija.', 'Approved', NOW()),

-- Grand Central Cetinje
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
 4, 'Lep kafić u centru, prijatno mesto.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
 3, 'Solidno, ali ništa posebno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
 4, 'Dobar ambijent i kafa.', 'Approved', NOW()),


-- Beer & Bike Club
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
 5, 'Super opuštena atmosfera, baš mesto za druženje sa ekipom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
 4, 'Dobar izbor piva, ali zna da bude gužva vikendom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
 3, 'Ok mesto, ali ništa posebno u odnosu na slične barove.', 'Approved', NOW()),

-- The Clubhouse Porto Montenegro
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
 5, 'Prelep ambijent i odlična muzika, baš luksuzan osećaj.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
 4, 'Sve je lepo sređeno, ali cene su dosta visoke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
 4, 'Odlična lokacija, prijatan ambijent za večernji izlazak.', 'Approved', NOW()),

-- Havana Beach Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
 5, 'Savršeno mesto uz more, posebno uveče.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
 4, 'Lepa muzika i ambijent, ali usluga malo sporija.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
 3, 'Ok bar, ali previše turistički i bučno.', 'Approved', NOW()),

-- Evergreen Jazz Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
 5, 'Fenomenalna jazz muzika i opuštena atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
 4, 'Odlično mesto za mirniji izlazak, prijatno iznenađenje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
 4, 'Lepo, ali izbor pića može biti bolji.', 'Approved', NOW()),

-- Itaka Library Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
 5, 'Jedinstvena atmosfera, baš ima svoj šarm.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
 4, 'Mirno mesto za opuštanje, ali malo skuplje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
 3, 'Koncept je zanimljiv, ali nije za svakodnevni izlazak.', 'Approved', NOW()),

-- Blue Cat Art Cafe
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
 5, 'Baš kreativno mesto, sviđa mi se umetnički vajb.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
 4, 'Lepo za kafu i opuštanje, prijatno iznenađenje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
 3, 'Zanimljiv prostor, ali malo neuredno u delu za sedenje.', 'Approved', NOW()),

-- Old Town Pub Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
 5, 'Prava pub atmosfera u starom gradu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
 4, 'Dobro pivo i lokacija, ali zna da bude gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
 3, 'Solidno mesto, ali ništa posebno.', 'Approved', NOW()),

-- Medusa
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
 4, 'Lepo mesto za večernji izlazak, dobra muzika.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
 3, 'Ok klub, ali previše glasna muzika za moj ukus.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
 4, 'Dobra energija, ali usluga može biti brža.', 'Approved', NOW()),

-- Strix Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
 5, 'Odličan bar, baš prijatna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
 4, 'Dobar izbor pića i lepo uređen prostor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
 3, 'Ok, ali očekivao sam više za taj nivo mesta.', 'Approved', NOW()),

-- Hard Rock Cafe Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
 5, 'Standard Hard Rock fazon, muzika i hrana odlični.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
 4, 'Dobro mesto, ali dosta komercijalno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
 3, 'Solidno, ali ništa što već nisam video u sličnim lancima.', 'Approved', NOW()),


-- Narodni muzej Crne Gore
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
 5, 'Veoma bogata i zanimljiva postavka, može se mnogo naučiti o istoriji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
 4, 'Dobar muzej, ali bi moglo biti više interaktivnih sadržaja.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
 4, 'Zanimljivo iskustvo, ali malo opširno za prolazak.', 'Approved', NOW()),

-- Pomorski muzej Crne Gore
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
 5, 'Prelep muzej sa bogatom pomorskom istorijom Boke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
 4, 'Vrlo edukativno, posebno deo o starim brodovima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
 3, 'Ok, ali prostor je mali i brzo se obiđe.', 'Approved', NOW()),

-- Muzej kralja Nikole
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
 5, 'Prelep istorijski muzej, osećaj kao da si u prošlom vremenu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
 4, 'Lepo očuvano, ali bih volela više objašnjenja uz eksponate.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
 4, 'Zanimljiv uvid u istoriju, ali nije za duže zadržavanje.', 'Approved', NOW()),

-- Prirodnjacki muzej Crne Gore
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
 5, 'Super kolekcija, posebno deo sa životinjama i mineralima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
 4, 'Vrlo edukativno za decu i odrasle.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
 3, 'Ok, ali prostor bi mogao biti moderniji.', 'Approved', NOW()),

-- Muzej grada Perasta
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
 5, 'Predivan mali muzej sa mnogo istorije u sebi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
 4, 'Lepo očuvani eksponati, prijatna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
 4, 'Mali, ali jako zanimljiv muzej.', 'Approved', NOW()),


-- Big Fesn Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
 4, 'Dobar izbor radnji, sve na jednom mestu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
 3, 'Ok centar, ali može biti gužva i parking je problem.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
 4, 'Praktično mesto za kupovinu, solidan izbor.', 'Approved', NOW()),

-- Mall of Montenegro
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
 5, 'Velik i moderan tržni centar, baš sve ima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
 4, 'Dobar izbor prodavnica, ali nije previše živ kao neki veći centri.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
 4, 'Uredno i pregledno, prijatno za kupovinu.', 'Approved', NOW()),

-- Kamelija Shopping Center
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
 5, 'Odlična lokacija uz more, lep ambijent.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
 4, 'Mali ali lep centar, prijatno za šetnju.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
 3, 'Ok izbor, ali nije veliki pa brzo sve obiđeš.', 'Approved', NOW()),

-- City Mall
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
 4, 'Dobar izbor radnji i kafića.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
 3, 'Solidno, ali malo zastareo izgled centra.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
 4, 'Praktično za svakodnevnu kupovinu.', 'Approved', NOW()),

-- Central Mall Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
 4, 'Lepo sređen centar, prijatna atmosfera.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
 3, 'Ok izbor radnji, ali nema puno sadržaja.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
 4, 'Dobar za osnovnu kupovinu.', 'Approved', NOW()),

-- Mega Mall Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
 5, 'Velik izbor i moderni sadržaji, baš dobar centar.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
 4, 'Super za turiste, ima sve što treba.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
 4, 'Dobar centar, ali zna da bude gužva.', 'Approved', NOW()),

-- TC HDL Lakovic Niksic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
 4, 'Povoljne cene i dobar izbor proizvoda.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
 3, 'Ok market, ali nije baš najmoderniji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
 4, 'Praktično mesto za svakodnevnu kupovinu.', 'Approved', NOW()),

-- Lakovic Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
 4, 'Dobar supermarket, sve osnovno ima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
 3, 'Ok, ali zna da bude gužva u sezoni.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
 4, 'Praktično i blizu centra.', 'Approved', NOW()),

-- Butiko Shopping Center
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
 4, 'Lep mali centar sa zanimljivim radnjama.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
 3, 'Ok, ali izbor je ograničen.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
 4, 'Prijatno mesto za brzu kupovinu.', 'Approved', NOW()),

-- HDL Novi Mall
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
 4, 'Dobar market, solidne cene.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
 3, 'Ok, ali ništa posebno u ponudi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
 4, 'Praktično za svakodnevnu kupovinu.', 'Approved', NOW()),


-- Galerija Muzeja savremene umjetnosti Crne Gore
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
 5, 'Izuzetno zanimljive izložbe, baš moderan i inspirativan prostor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
 4, 'Dobar izbor umetničkih dela, ali prostor nije prevelik.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
 4, 'Prijatno iskustvo, ali bih volela češće izmene postavki.', 'Approved', NOW()),

-- Galerija Pizana
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
 5, 'Prelepa galerija u starom gradu, baš ima dušu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
 4, 'Lepo mesto za kratku posetu i uživanje u umetnosti.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
 3, 'Zanimljivo, ali malo i brzo se obiđe.', 'Approved', NOW()),

-- Galerija Velimir A. Lekovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
 5, 'Vrlo kvalitetna postavka, lepo predstavljena umetnost.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
 4, 'Dobar prostor i zanimljiva dela lokalnih umetnika.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
 4, 'Mirno i prijatno mesto za ljubitelje umetnosti.', 'Approved', NOW()),


-- Villa Ljubanovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
 5, 'Veoma prijatan smeštaj, čisto i domaćinski osećaj.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
 4, 'Dobra lokacija i ljubazni domaćini.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
 4, 'Uredno i mirno mesto za boravak.', 'Approved', NOW()),

-- Guesthouse Zmukic
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
 4, 'Solidan smeštaj, korektna usluga.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
 3, 'Ok za kraći boravak, ali skromnije nego na slikama.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
 4, 'Prijatno mesto, domaćini ljubazni.', 'Approved', NOW()),

-- Guesthouse Plima
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
 5, 'Prelep pogled i jako mirno okruženje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
 4, 'Čisto i uredno, lepo za odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
 4, 'Dobar odnos cene i kvaliteta.', 'Approved', NOW()),

-- Pansion Vukovic Zabljak
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
 5, 'Savršeno mesto za odmor u prirodi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
 4, 'Topla atmosfera i dobar smeštaj.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
 4, 'Mirno i lepo, ali malo jednostavno uređeno.', 'Approved', NOW()),


-- Etno Selo Montenegro
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
 5, 'Prelepo iskustvo, osećaj kao da si van grada u potpunom miru.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
 4, 'Dobar ambijent i priroda, hrana domaća i ukusna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
 4, 'Lepo uređeno, ali malo skuplje nego što sam očekivala.', 'Approved', NOW()),

-- Etno Selo Izlazak
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
 5, 'Savršeno mesto za beg od svakodnevice.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
 4, 'Veoma prijatna atmosfera i ljubazno osoblje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
 3, 'Ok iskustvo, ali smeštaj je jednostavan.', 'Approved', NOW()),

-- Etno Selo Komarnica
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
 5, 'Neverovatna priroda i mir, baš opuštajuće.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
 4, 'Odlična lokacija za odmor u prirodi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
 4, 'Lepo iskustvo, ali pristup može biti malo nezgodan.', 'Approved', NOW()),

-- Vinarija Plantaze 13 Jul
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
 5, 'Odlična organizacija obilaska i vrhunska vina, posebno crvena.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
 4, 'Lep ambijent i zanimljiva degustacija, samo je bilo malo gužve.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
 3, 'Dobra vina, ali obilazak je mogao biti bolje organizovan.', 'Approved', NOW()),

-- Vinarija Lipovac
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
 5, 'Prelepa priroda i veoma kvalitetna vina, pravo uživanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
 4, 'Vrlo prijatna atmosfera i ljubazno osoblje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
 3, 'Ok iskustvo, vina su dobra ali ništa posebno novo.', 'Approved', NOW()),

-- Cem winery and vineyard
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
 4, 'Lepo mesto za opuštanje i degustaciju vina.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
 2, 'Ambijent je lep, ali je usluga bila prilično spora.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
 5, 'Odlična vina i jako prijatna degustacija.', 'Approved', NOW()),

-- Winery Masanovic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
 5, 'Autentično iskustvo i vrhunska domaća vina.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
 4, 'Lepo uređeno imanje i fina vina za degustaciju.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
 3, 'Solidno, ali očekivao sam malo bogatiju ponudu.', 'Approved', NOW()),

-- Vinarija Savina
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
 5, 'Savršen spoj pogleda i vina, baš poseban doživljaj.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
 4, 'Veoma prijatno mesto, vina su lagana i pitka.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
 3, 'Dobra vina, ali servis može biti malo brži.', 'Approved', NOW()),


-- Aqua Park Budva
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
 5, 'Super provod, tobogani su baš raznovrsni i čisto je.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
 4, 'Dobar park, ali je vikendom velika gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
 3, 'Ok za decu, ali redovi umeju da budu predugački.', 'Approved', NOW()),

-- Aqua Park Mediteran
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
 5, 'Prelep ambijent i odličan za opuštanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
 4, 'Čisto i lepo uređeno, samo malo manji izbor sadržaja.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
 3, 'Solidno mesto, ali očekivao sam više atrakcija.', 'Approved', NOW()),

-- Aqua Park Imanje Knjaz
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
 4, 'Priroda oko parka je prelepa, lepo za porodični dan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
 5, 'Odličan ambijent i dosta prostora za opuštanje.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
 2, 'Lepo mesto, ali deluje malo zapušteno na nekim delovima.', 'Approved', NOW()),

-- Mini Zoo Vrt Podgorica
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
 4, 'Deca su uživala, lepo za kratak izlet.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
 3, 'Mali zoo, ali simpatičan i uredan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
 2, 'Očekivao sam više životinja i bolje uslove.', 'Approved', NOW()),

-- Zoo Sad
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
 5, 'Odličan zoo, mnogo životinja i lepo uređeno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
 4, 'Zanimljivo iskustvo, posebno za decu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
 3, 'Solidan zoo, ali neke kaveze bi trebalo obnoviti.', 'Approved', NOW()),

-- Park Macaka
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
 5, 'Neobično i jako simpatično mesto za ljubitelje mačaka.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
 4, 'Opustajuće i zanimljivo, mačke su baš druželjubive.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
 3, 'Lepo za kratku posetu, ali brzo se obiđe.', 'Approved', NOW()),

-- Akvarijum Boka
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
 5, 'Prelep prikaz morskog sveta, baš edukativno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
 4, 'Mali, ali jako lepo uređen akvarijum.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
 3, 'Zanimljivo, ali očekivao sam više vrsta riba.', 'Approved', NOW()),


-- Igraliste Njegosev park
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
 5, 'Lepo uređeno i čisto, idealno za decu u centru grada.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
 4, 'Dosta sadržaja, ali bi moglo još klupa za roditelje.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
 3, 'Ok za kratko zadržavanje, ništa posebno.', 'Approved', NOW()),

-- Igraliste Gorica Park
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
 5, 'Prelepa priroda oko igrališta, baš prijatno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
 4, 'Dobar prostor za decu, malo strm prilaz.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
 3, 'Solidno, ali bi moglo više sprava.', 'Approved', NOW()),

-- Igraliste Slovenska plaza
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Slovenska plaza'),
 4, 'Odlična lokacija pored mora, deca uživaju.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Slovenska plaza'),
 5, 'Savršeno za letnji odmor i igru.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Slovenska plaza'),
 3, 'Lepo, ali previše gužve u sezoni.', 'Approved', NOW()),

-- Djecije Igraliste Park Nezavisnosti
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
 5, 'Veoma uredno i bezbedno za decu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
 4, 'Lepo igralište, ali malo hladovine fali.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
 3, 'U redu, ali jednostavno.', 'Approved', NOW()),

-- Igraliste Centar Kotor
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
 4, 'Lepa lokacija u starom gradu, simpatično.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
 5, 'Deca su se super provela, baš zanimljivo mesto.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
 3, 'Malo skučen prostor, ali ok.', 'Approved', NOW()),

-- Igraliste Tolosi
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
 4, 'Mirno i bezbedno igralište.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
 3, 'Solidno, ali bi moglo biti bolje održavano.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
 5, 'Lepo mesto za decu iz kraja.', 'Approved', NOW()),

-- Igraliste Kolasin
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
 5, 'Prelepo okruženje u prirodi, super za decu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
 4, 'Lepo i čisto, ali malo manje sprava.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
 3, 'Ok, ali jednostavno igralište.', 'Approved', NOW()),

-- Igraliste Igalo
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
 4, 'Blizu mora, lepo za popodne sa decom.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
 5, 'Odlično mesto, deca uživaju svaki put.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
 3, 'Dosta osnovno, ali funkcionalno.', 'Approved', NOW()),

-- Igraliste Park 13 Jul
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
 5, 'Veliko i lepo uređeno igralište.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
 4, 'Dosta prostora, ali može još sadržaja.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
 3, 'Solidno, ništa spektakularno.', 'Approved', NOW()),

-- Igraliste Niksic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
 4, 'Dobar prostor za decu u gradu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
 3, 'Može bolje održavanje.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
 5, 'Deca vole da dolaze ovde.', 'Approved', NOW()),

-- Djecje igraliste kod vozica
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
 5, 'Baš simpatično i zanimljivo za malu decu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
 4, 'Lepo uređeno i bezbedno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
 3, 'Malo, ali ok za kratku igru.', 'Approved', NOW()),

-- Igraliste Bar Setaliste
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
 5, 'Prelepa lokacija pored mora.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
 4, 'Dobar prostor, ali u sezoni gužva.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
 3, 'Ok, ali ništa posebno.', 'Approved', NOW()),

-- Igraliste Crno jezero
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
 5, 'Neverovatna priroda, prelepo za decu i roditelje.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
 4, 'Jedinstveno mesto, ali malo hladno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
 3, 'Lepo, ali ograničeno sadržajem.', 'Approved', NOW()),

-- Igraliste Milocer Park
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Milocer Park'),
 5, 'Prelepo i uredno, prava oaza.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Milocer Park'),
 4, 'Veoma lepo, ali malo ekskluzivno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Milocer Park'),
 3, 'Ok, ali više za šetnju nego igru.', 'Approved', NOW()),

-- Igraliste Lovcen National Park
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
 5, 'Neverovatan pogled i priroda.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
 4, 'Lepo iskustvo, ali vetrovito.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
 3, 'Zanimljivo, ali nije klasično igralište.', 'Approved', NOW()),


-- Crnogorsko narodno pozoriste
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
 5, 'Odlične predstave i profesionalna atmosfera, pravi kulturni centar.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
 4, 'Veoma kvalitetan repertoar, ali ponekad karte brzo planu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
 3, 'Solidno, ali nisam bio oduševljen poslednjom predstavom.', 'Approved', NOW()),

-- Zetski dom
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
 4, 'Lepo mesto sa zanimljivim programom.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
 5, 'Veoma autentično i prijatna atmosfera.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
 3, 'Ok, ali prostor bi mogao biti moderniji.', 'Approved', NOW()),

-- Niksicko pozoriste
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
 4, 'Lep repertoar i prijatan ambijent.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
 3, 'Dobar sadržaj, ali sala bi mogla biti renovirana.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
 5, 'Odlične predstave, prijatno iznenađenje.', 'Approved', NOW()),

-- Dvorana Park Herceg Novi
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
 5, 'Prelep prostor i odlični kulturni događaji.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
 4, 'Dobar program, ali nekad slabija organizacija.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
 2, 'Prostor lep, ali zvuk nije bio dobar na događaju.', 'Approved', NOW()),

-- Kulturni centar Kotor - scena
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
 5, 'Odličan kulturni program u prelepom Kotoru.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
 4, 'Zanimljive predstave, mala ali prijatna scena.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
 3, 'Solidno, ali prostor je ograničen.', 'Approved', NOW()),

-- Javna ustanova Grad Teatar
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
 5, 'Jedan od najboljih festivala kod nas.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
 4, 'Veoma kvalitetan program, ali zavisi od godine.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
 3, 'Ok, ali ne uvek sve predstave budu dobre.', 'Approved', NOW()),

-- Dom kulture Bar - pozornica
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
 4, 'Dobar lokalni program i pristupačne cene.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
 3, 'Solidno, ali prostor deluje starije.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
 5, 'Lepo mesto za kulturne događaje u gradu.', 'Approved', NOW()),

-- Tivat Centar za kulturu
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
 5, 'Odličan program i moderna atmosfera.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
 4, 'Vrlo dobro organizovani događaji.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
 3, 'Ok, ali prostor je mali za veće događaje.', 'Approved', NOW()),

-- Ljetnja Pozornica Tivat
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
 5, 'Prelep ambijent pod otvorenim nebom.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
 4, 'Super atmosfera, ali zavisi od vremena.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
 3, 'Lepo, ali ponekad neudobna sedišta.', 'Approved', NOW()),

-- Dom kulture Kolasin
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
 4, 'Dobar lokalni kulturni centar.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
 3, 'Solidno, ali mali izbor sadržaja.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
 5, 'Prijatno iznenađenje za mali grad.', 'Approved', NOW()),


-- Manastir Moraca
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
 5, 'Predivan mir i priroda oko manastira, posebno mesto.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
 4, 'Veoma lepo i duhovno mesto, vredno posete.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
 3, 'Zanimljivo, ali put do njega je malo naporan.', 'Approved', NOW()),

-- Cetinjski manastir
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
 5, 'Veoma značajno i lepo očuvano mesto.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
 5, 'Prelepa istorija i mirna atmosfera.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
 4, 'Impresivno mesto, ali dosta turista.', 'Approved', NOW()),

-- Manastir Piva
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
 5, 'Neverovatan pogled i mir koji se oseća svuda.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
 4, 'Vrlo lepo mesto, posebno okolina jezera.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
 2, 'Lepo, ali dosta udaljeno i teško za dolazak.', 'Approved', NOW()),

-- SC Moraca
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
 5, 'Odlična hala i organizacija sportskih događaja.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
 4, 'Dobar sportski centar, ali parking je problem.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
 3, 'Solidno, ali bi moglo biti modernije.', 'Approved', NOW()),

-- SC Topolica
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
 4, 'Lep sportski kompleks blizu mora.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
 3, 'Ok, ali neke stvari su starije.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
 5, 'Odličan za treninge i rekreaciju.', 'Approved', NOW()),

-- SC Niksic
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
 4, 'Dobar centar, funkcionalan i uredan.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
 2, 'Može mnogo bolje održavanje.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
 3, 'Solidno, ništa posebno.', 'Approved', NOW()),

-- SC Igalo
((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
 5, 'Odlični uslovi za sport i rehabilitaciju.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
 4, 'Veoma prijatno mesto, dobra energija.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
 3, 'Ok, ali očekivao sam više sadržaja.', 'Approved', NOW()),

-- SC Kolasin
((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
 4, 'Lepo uklopljen u prirodu, prijatan centar.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
 5, 'Odlično mesto, posebno zimi.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'nemanja@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
 2, 'Solidno, ali mali kapacitet.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
 5, 'Odličan spa, sve je čisto i organizovano. Masaža vrhunska, osoblje profesionalno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
 4, 'Ugodan ambijent, ali je vikendom prilično gužva pa se čeka na tretmane.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
 3, 'Solidno iskustvo, ali očekivala sam više za tu cijenu.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
 5, 'Perfektan luksuz, pogled i spa zona su nevjerovatni. Sve preporuke.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
 4, 'Prelijepo mjesto, ali dosta skupo, pa nije za svaku priliku.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
 5, 'Sve je na visokom nivou, posebno infinity bazen i mir.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
 4, 'Mirno i prirodno okruženje, idealno za opuštanje i reset.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
 3, 'Lijep koncept, ali pristup lokaciji je malo komplikovan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
 5, 'Savršeno za bijeg od grada, osjećaj potpune tišine.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
 3, 'Usluga korektna, ali prostor bi mogao biti moderniji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
 4, 'Lijepa atmosfera, masaža odlična, osoblje prijatno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
 2, 'Očekivala sam više za spa centar ovog tipa, djeluje malo zapušteno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
 4, 'Velik izbor proizvoda, posebno voće i povrće. Cijene korektne.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
 3, 'Solidno, ali zna biti gužva i nije uvijek sve svježe u popodnevnim satima.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
 5, 'Najbolja pijaca u gradu, uvijek nađem sve što mi treba.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
 5, 'Predivna ponuda domaćih proizvoda, atmosfera autentična.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
 4, 'Dobra pijaca, ali cijene su malo više zbog lokacije.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
 5, 'Uvijek svježe i uredno, baš prijatno iskustvo.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
 3, 'Ok izbor, ali dosta turistički i skuplje nego očekivano.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
 4, 'Dobro snabdjevena, ali zna biti gužva.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
 2, 'Nije loše, ali cijene su previsoke za lokalnu pijacu.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
 4, 'Dobar izbor lokalnih proizvoda i pristupačne cijene.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
 3, 'Solidna pijaca, ali bi mogla biti bolje organizovana.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
 5, 'Uvijek svježe i domaće, baš prijatno za kupovinu.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
 3, 'Prosječna pijaca, ima svega ali ništa posebno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
 4, 'Dobar izbor voća i povrća, korektne cijene.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
 2, 'Može bolje, djeluje malo neuredno.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
 5, 'Prelijepa pijaca, sve djeluje svježe i lokalno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
 4, 'Dobar izbor, ali gužva u sezoni zna da smeta.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
 5, 'Uvijek se vratim ovdje, kvalitet je stabilan.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
 4, 'Lijepa mala pijaca, sve osnovno se može naći.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
 3, 'Ok, ali izbor je ograničen.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
 5, 'Vrlo prijatno mjesto, lokalni proizvodi odlični.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
 3, 'Solidno, ali bi moglo biti više izbora.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
 4, 'Dobra domaća ponuda, cijene korektne.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
 2, 'Nije loše, ali očekivala sam više raznovrsnosti.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Riblja Pijaca Tivat'),
 5, 'Uvijek svježa riba, kvalitet odličan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Riblja Pijaca Tivat'),
 4, 'Dobar izbor morske hrane, ali rano se rasproda.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Riblja Pijaca Tivat'),
 3, 'Ok pijaca, ali cijene znaju biti visoke.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
 5, 'Predivan izbor suvenira, sve autentično i lijepo upakovano.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
 4, 'Kvalitet dobrih proizvoda, ali cijene malo više.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
 3, 'Ok ponuda, ali ništa posebno novo.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
 5, 'Predivni ručni radovi, baš jedinstveni suveniri.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
 4, 'Lijepo i kvalitetno, vidi se trud u izradi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
 2, 'Skupo za veličinu i izbor proizvoda.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop Montenegro'),
 3, 'Standardna turistička ponuda.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop Montenegro'),
 2, 'Ništa posebno, sve isto kao u drugim radnjama.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop Montenegro'),
 4, 'Ima solidan izbor, može se naći lijep poklon.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'jelena@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop XY'),
 2, 'Prilično slaba ponuda i sve djeluje generički.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop XY'),
 3, 'Može da posluži, ali ništa posebno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop XY'),
 1, 'Najslabija suvenirnica u kojoj sam bila, mali izbor.', 'Approved', NOW()),

 ((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
 5, 'Baš kreativni i moderni suveniri, drugačije od klasičnih.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
 4, 'Originalni proizvodi, ali malo skuplji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
 3, 'Zanimljivo, ali izbor bi mogao biti veći.', 'Approved', NOW());


-- ============================================
-- 10. IMAGES - DESTINATIONS
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
VALUES
(
    'https://afar.brightspotcdn.com/dims4/default/3a97ce6/2147483647/strip/false/crop/1600x800+0+0/resize/1486x743!/quality/90/?url=https%3A%2F%2Fk3-prod-afar-media.s3.us-west-2.amazonaws.com%2Fbrightspot%2Ff4%2F0e%2Fabb2c7bf50f46954835d19e83029%2Foriginal-956aea8bdeae0f9b8479b054a6ff8e85.jpg',
    'Kotor',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
    NOW()),
(
    'https://www.mojacrnagora.rs/wp-content/uploads/2018/08/Kotor-Stari-Grad-02-1024x682.jpg',
    'Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/kotor-stari-grad/large/kotor-stari-grad-81619.jpg',
    'Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/03/shutterstock_1703935768.jpg',
    'Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
    NOW()),
(
    'https://www.portomontenegro.com/wp-content/uploads/2022/04/faruk-kaymak-b_e5K7B3MzQ-unsplash-2-1-960x800.jpg',
    'Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/d/d4/%D0%91%D0%BE%D0%BA%D0%B0_%D0%9A%D0%BE%D1%82%D0%BE%D1%80%D1%81%D0%BA%D0%B0_%D0%BD%D0%BE%D1%9B%D1%83.jpg',
    'Kotorski zaliv',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://casadelmare.me/img/79-slider-558621_356092237777763_285909338129387_945137_1930249661_n.jpg',
    'Kotorski zaliv',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://www.montenegrosubmarine.me/assets/images/img/Boka%20Bay%20222.jpg',
    'Kotorski zaliv',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://rtcg.me/upload/media/2022/4/15/1194081/image00020.jpeg',
    'Kotorski zaliv',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://casadelmare.me/img/79-pagegallery-nature-3232601.jpg',
    'Kotorski zaliv',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://casadelmare.me/img/boka2opti.jpg',
    'Kotorski zaliv',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
    NOW()),
(
    'https://cdn.getyourguide.com/img/tour/d0e7aad0b9468ab05df7bfe45c64e847fb78b5169d162c26cfd2a925689c7eda.jpeg/99.jpg',
    'Budva',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Budva_%281%29.jpg/1280px-Budva_%281%29.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://img.travelnaut.com/web/db/photose/location/eu/me/budva/d5425c5cac459175ff14316cd2c2f82b.jpeg?format=webp&width=3840&quality=75',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://cdn.relax.si/source/destinations/budva_481b6cb9-1a47-440d-870d-de6afad89fe4.webp',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://www.halotours.rs/core/media/budva-stari-grad-1.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://b3992170.smushcdn.com/3992170/wp-content/uploads/2024/11/Budva-Featured-1200x900.jpg?lossy=2&strip=1&webp=1',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/02/shutterstock_191127089.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://butuaresidence.com/wp-content/uploads/2018/03/988242_20190203050212_5c566a9bb7896801fb658cf0jpeg_ls.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://kamenovo.me/wp-content/uploads/2020/07/budva-stari-grad.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/06/08/00/5651288_ricardova-glava_ls.jpg',
    'Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://twopacksandapup.com/wp-content/uploads/2025/06/Durmitor-Feat-scaled.jpg',
    'Durmitor',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://srbijazamlade.rs/fajlovi/productitem/194_638c9bed0dfdf.jpg',
    'Durmitor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://montours.me/wp-content/uploads/2024/11/National-Park-Durmitor-Trip-.jpg',
    'Durmitor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://explore-serbia.rs/wp-content/uploads/2023/03/Crno-jezero-Durmitor.jpg',
    'Durmitor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://nparkovi.me/educational_corner/durmitor/images/npark-durmitor-01.jpg',
    'Durmitor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://www.funtravelnis.rs/wp-content/uploads/2017/11/durmitor-2.jpg',
    'Durmitor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Sveti_Stefan_(06).jpg/1280px-Sveti_Stefan_(06).jpg',
    'Sveti Stefan',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://i.ytimg.com/vi/GqaIdM-zQcc/maxresdefault.jpg',
    'Sveti Stefan',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://i0.wp.com/sarajevotimes.com/wp-content/uploads/2025/06/IMG_4573.jpeg?fit=670%2C446&ssl=1',
    'Sveti Stefan',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://thetwirlingtraveler.nl/wp-content/uploads/2023/08/IMG_1174.jpg',
    'Sveti Stefan',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/328531171.jpg?k=deadf8ac55f804730deed83810ba03bf3bae80ce63d4ba5132bbaea59e55bbd4&o=',
    'Sveti Stefan',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://img.freepik.com/premium-photo/sveti-stefan-island-near-budva-montenegro-luxury-resort-with-beautiful-beach-adriatic-sea-famous-travel-destination_545689-5403.jpg',
    'Sveti Stefan',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Sveti Stefan'),
    NOW()),
(
    'https://www.pelago.com/img/collections/podgorica/0614-0301_podgorica-large.jpg',
    'Podgorica',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqTPvjpUP6lwFTZ6ncPwS33xZWGDuKo8UN6w&s',
    'Podgorica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/4/4b/PodgoricaOverview.jpg',
    'Podgorica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://d37rmf1ynyg9aw.cloudfront.net/fit-in/1280x1280/data/v4/resources/images/736413d4-55f2-4775-bbc9-0db59d457858.jpg',
    'Podgorica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://images.trvl-media.com/place/10048/00b6d9ee-0ab8-44e6-8080-8e12858437b4.jpg',
    'Podgorica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://cdn.airmontenegro.com/public/media/library/2026/01/20260116_141458_flight-belgrade-podgorica.webp',
    'Podgorica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
    NOW()),
(
    'https://idsb.tmgrup.com.tr/ly/uploads/images/2023/04/03/265755.jpg',
    'Herceg Novi',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
    NOW()),
(
    'https://hercegnovi.travel/images/app/stari-grad.jpg',
    'Herceg Novi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRu9l8gWkFoJXuTFICuqvCXqLSqTI19OeTQrg&s',
    'Herceg Novi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
    NOW()),
(
    'https://b2cservice.kontiki.rs/media/images/location/0/595/534',
    'Herceg Novi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
    NOW()),
(
    'https://novaontheroad.com/wp-content/uploads/2024/09/things-to-do-in-herceg-novi10.png',
    'Herceg Novi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
    NOW()),
(
    'https://www.visit-montenegro.com/wp-content/uploads/2026/01/Depositphotos_668449212_XL-scaled.jpg',
    'Bar',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4peM4e7ivXjmLQe1x1PGXrnVapOK5k9ixWw&s',
    'Bar',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://bar.me/wp-content/uploads/geografski-polozaj.jpg',
    'Bar',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://www.olympic.rs/wp-content/uploads/Bar-1.jpg',
    'Bar',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://apartmani-crna-gora.me/files/thumbnail/barrrrrrrrrrrr%20(1).jpg',
    'Bar',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://www.travelland.rs/wp-content/uploads/Bar-CG.jpg',
    'Bar',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
    NOW()),
(
    'https://ulcinj.travel/wp-content/uploads/2024/02/47.jpg',
    'Ulcinj',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
    NOW()),
(
    'https://tvsensor.com/wp-content/uploads/2025/05/ulcinj-castle-during-1024x633-1.jpg',
    'Ulcinj',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_P5n_UZEjenN5H9UYadcGrsjSLVnJACoylQ&s',
    'Ulcinj',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
    NOW()),
(
    'https://gte-gcms.images.tshiftcdn.com/AI0DIWHkBQZyx6oBkSd3hz/resize=width:2048,fit:max/dd3OMz6gRqiIyc6u5M9v?crop=1.91%3A1&fit=crop&width=1200',
    'Ulcinj',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
    NOW()),
(
    'https://www.unesco.org/sites/default/files/structured_data/cce001/7874280_cetinje-3.jpg',
    'Cetinje',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/11/91/02/43/caption.jpg?w=1200&h=700&s=1',
    'Cetinje',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
    NOW()),
(
    'https://komunalnocetinje.me/files/slideshow/1677505382-slide1-min.JPG',
    'Cetinje',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
    NOW()),
(
    'https://s3.eu-central-1.amazonaws.com/web.repository/gradska-static/static-images/06_cetinje/cetinje_hero_1920x1080.jpg',
    'Cetinje',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/11/Niksic-foto-Milan-Sapuric-22-3.jpg',
    'Niksic',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/d/d3/Nikšić.jpg',
    'Niksic',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/08/niksic-rtnk.jpg',
    'Niksic',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWVeb5mWVFUHrP0NE5AEUvRAJATkTuTocOqA&s',
    'Niksic',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
    NOW()),
(
    'https://diplomacyandcommerce.me/wp-content/uploads/2025/12/Diplomacy-and-Commerce-Montenegro-niksic-2030-capital-of-culture.jpeg',
    'Niksic',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
    NOW()),
(
    'https://opstinativat.me/wp-content/uploads/2020/09/DJI_0022-1-1100x450.jpg',
    'Tivat',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://mymagicearth.com/wp-content/uploads/2020/12/Post-Image_Tivat-the-Town-with-a-Modern-Porto-Montenegro-scaled.jpg',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://www.visit-montenegro.com/wp-content/uploads/2026/01/tivat-aerial-scaled.jpg',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://www.b92.net/data/images/2024-05-04/23696_shutterstock-1248509359_f.jpg',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://www.montenegro.travel/imagine_cache/900x900/uploads/1_MICE/tivat.jpg',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://tosamja.media/wp-content/uploads/2024/08/tivat-luka-porto-montenegro.jpg',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://montenegrovillas.com/storage/app/uploads/public/635/658/ea1/635658ea10bce141065334.webp',
    'Tivat',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
    NOW()),
(
    'https://ocdn.eu/pulscms-transforms/1/3fjktkpTURBXy85YjhmOTMwYzFjYzQ2MDZhYTNmYmRmYmIxZmYxYzVhMC5qcGeRkwXNBLDNA4Q',
    'Igalo',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/productitem/institut-dr-simo-milosevic-844.jpg',
    'Igalo',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
    NOW()),
(
    'https://igalospa.com/wp-content/uploads/2019/07/podvodna-tus-masaza-institut-igalo.jpg',
    'Igalo',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
    NOW()),
(
    'https://startravelnis.rs/wp-content/uploads/2022/02/igalo-institut-simo-14.jpg',
    'Igalo',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
    NOW()),
(
    'https://beaches-searcher.com/images/beaches/499201004/ME201004.jpg',
    'Igalo',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo'),
    NOW()),
(
    'https://www.portomontenegro.com/wp-content/uploads/2022/05/Lovcen23-1.jpg',
    'Lovcen',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/2/20/Jezerski_vrh_na_Lovcenu_-_Njegosev_mauzolej_08.jpg',
    'Lovcen',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://nparkovi.me/educational_corner/lovcen/images/npark-lovcen-03.jpg',
    'Lovcen',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://360monte.me/wp-content/uploads/2024/03/kotor-to-lovcen-6396-original.jpg',
    'Lovcen',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://visitcetinje.com/lat/wp-content/uploads/2024/10/lovcen.jpg',
    'Lovcen',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/b/b6/Lac_de_Shkodra.jpg',
    'Skadarsko jezero',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://srbijazamlade.rs/fajlovi/product/skadarsjo-jezero-248_6424454f74cf6.jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://www.atlantixtravel.com/cdn/shop/files/awesome-view-of-skadar-lake-surrounded-by-green-mo_64e5f424-3326-48b2-be39-f44ce82a8216.jpg?v=1686938493&width=1946',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://nparkovi.me/storage/images/news/1768068289.jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://bokascooter.com/wp-content/uploads/2024/02/skadarsko-jezero.jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/0/0e/Kola%C5%A1in_Town_Center.jpg',
    'Kolasin',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/2/24/Kolasin_-_Town_view.JPG',
    'Kolasin',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),

(
    'https://skijalista.me/wp-content/uploads/DJI_0765.jpg',
    'Kolasin',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),
    
(
    'https://www.kolasin.com/img/hero/hero-2.jpg',
    'Kolasin',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),
(
    'https://www.gradnja.rs/wp-content/uploads/2023/09/swissotel-kolasin-resort-02.jpg',
    'Kolasin',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),

(
    'https://www.zabljak.com/img/hero/hero-2.jpg',
    'Zabljak',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
    NOW()),

(
    'https://content.r9cdn.net/rimg/dimg/58/3a/77a7ed40-city-59219-17337d814d2.jpg?width=1366&height=768&xhint=2475&yhint=2129&crop=true',
    'Zabljak',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
    NOW()),

(
    'https://rezidenthotel.com/wp-content/uploads/2025/05/crno-jezero-zabljak-rezident-hotel.webp',
    'Zabljak',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
    NOW()),
(
    'https://pohcdn.com/sites/default/files/styles/paragraph__live_banner__lb_image__1880bp/public/live_banner/zabljak-1.jpg',
    'Zabljak',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
    NOW()),
(
    'https://adria.fun/wp-content/uploads/2025/12/Zabljak-Photo-Bigguns-Depositphotos.webp',
    'Zabljak',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zabljak'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/e/e0/Plu%C5%BEine_Piva_Lake.JPG',
    'Pluzine',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
    NOW()),
(
    'https://itinari-images.s3.eu-west-1.amazonaws.com/activity/images/original/23532394-bfda-4db1-8912-8b18f5c253ac-istock-501058345.jpg',
    'Pluzine',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
    NOW()),
(
    'https://www.pluzine.me/wp-content/uploads/2023/08/IMG_20230206_131749-scaled.jpg',
    'Pluzine',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Pluzine'),
    NOW()),
(
    'https://opstinaandrijevica.me/wp-content/uploads/2020/10/trg-Andrijevica.jpg',
    'Andrijevica',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/5/59/Andrijevica_town_hall%2C_Montenegro.jpg',
    'Andrijevica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
    NOW()),
(
    'https://opstinaandrijevica.me/wp-content/uploads/2018/11/IMG-2c31ffdb4d20092ba61fb97d9bf0ada5-V.jpg',
    'Andrijevica',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Andrijevica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/b/bf/Plav.jpg',
    'Plav',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plav'),
    NOW()),
(
    'https://radioberane.me/wp-content/uploads/2024/10/Plav-1200x900-1.jpg',
    'Plav',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plav'),
    NOW()),
(
    'https://media-api.skupstina.me/media/skupstina/2023/07/18/1689679638-plav.jpg?cacheControl=1689679655',
    'Plav',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plav'),
    NOW())   
;

-- ============================================
-- 10. IMAGES - EVENTS
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
VALUES
(
    'https://sbkotorsistercity.com/wp-content/uploads/sites/106/2025/09/KotorArt.png',
    'Logo',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBA0xI7-o4rZ9sVD3J8u7gNO3NExDx5tGDiw&s',
    'Logo',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://kotor.art/wp-content/uploads/2025/02/kotor-art-festival-002.jpg',
    'Publika na KotorArt festivalu',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/events/mezhdunarodnyy_festival_kotorart.jpg?itok=jy61u3fJ',
    'Bina KotorArt festivala',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://kotor.art/wp-content/uploads/2025/02/kotor-art-festival-006-1024x681.jpg',
    'Neki izvodjac na festivalu',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://sbkotorsistercity.com/wp-content/uploads/sites/106/2023/03/SBKotorApril.jpeg',
    'KotorArt festival',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'KotorArt festival'),
    NOW()),
(
    'https://www.radiodux.me/sites/default/files/2017/10-07-2017-gradska-muzika-kotor-priredila-gradu-velicanstvenu-noc/dsc0935resize.jpg',
    'Vece klasicne muzike',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Vece klasicne muzike'),
    NOW()),
(
    'https://radiokotor.info/files/images/1771230895-1771170853-IMG-a22537d6019981f93e0bc6c1e3e12e28-V.jpg',
    'Poster',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Vece klasicne muzike'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2025/12/Begovic_resize.jpg',
    'Vece klasicne muzike izvodjac',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Vece klasicne muzike'),
    NOW()),
(
    'https://www.wofafestivals.com/wp-content/uploads/2024/10/IMG_2885-scaled.webp',
    'devojcica sa zastavom',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Budva Summer Festival'),
    NOW()),
(
    'https://eaff.eu/cache/images/festivals/998/1600x900c/998-2.jpg',
    'Igra',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Budva Summer Festival'),
    NOW()),
(
    'https://www.wofafestivals.com/wp-content/uploads/2024/10/IMG_2470-scaled.webp',
    'Kolo',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Budva Summer Festival'),
    NOW()),
(
    'https://dancingastronaut.com/wp-content/uploads/2022/11/FgO_zYEWQAE8Iya.jpg',
    'Naslovna',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'DJ Night Mogren'),
    NOW()),
(
    'https://i1.sndcdn.com/avatars-Ai7sk2G6lJfwqYux-Yo4y5A-t500x500.jpg',
    'Poster',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'DJ Night Mogren'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEylQmHhAkQGi4ZNUGxMCLFn_QXr9HaqYTQg&s',
    'DJ',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'DJ Night Mogren'),
    NOW()),
(
    'https://img.freepik.com/free-photo/closeup-shot-dj-s-equipment-people-dancing-club_181624-58753.jpg?semt=ais_hybrid&w=740&q=80',
    'NightClub',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'DJ Night Mogren'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt6JR4eLND81QXmtmlPO8ZTpkTdrVdg-i0Og&s',
    'DJ Nigel',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'DJ Night Mogren'),
    NOW()),
(
    'https://viaferratapiva.me/wp-content/uploads/2025/10/via-ferrata-durmitor-montenegro-hiking.webp',
    'Okup',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Planinarski susret'),
    NOW()),
(
    'https://www.jankovac.hr/wp-content/grand-media/image/Durmitor_2018_005.jpg',
    'Par',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Planinarski susret'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4A95dHfmkuuRKJMl0755n-_t4GrVbpYo95A&s',
    'Pesacenje',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Planinarski susret'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTr0woQBFbTZNwJ8HJW22FvCNEMX_glAUpH4w&s',
    'Grupna slika',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Planinarski susret'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/02/praznik-mimoze-mediabiro.jpg',
    'Praznik mimoze',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Praznik mimoze'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2025/11/Praznik-mimoze-1.jpg',
    'Praznik mimoze',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Praznik mimoze'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2019/02/Praznik-mimoze.jpg',
    'Praznik mimoze',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Praznik mimoze'),
    NOW()),
(
    'https://tvpljevlja.me/wp-content/uploads/2024/08/Naslovna-HN-scaled.jpg',
    'Herceg Novi Film Festival',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Herceg Novi Film Festival'),
    NOW()),
(
    'https://ocdn.eu/pulscms/MDA_/73620fb78a50a240022ca7880a8dbbf6.jpg',
    'Herceg Novi Film Festival',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Herceg Novi Film Festival'),
    NOW()),
(
    'https://rthn.co.me/wp-content/uploads/2025/08/Stevan-Katic-Svecano-otvaranje-Filmskog-festivala-avgust-2025.jpg',
    'Herceg Novi Film Festival',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Herceg Novi Film Festival'),
    NOW()),
(
    'https://i0.wp.com/primorski.me/wp-content/uploads/2025/07/Borbelj.jpg?fit=1920%2C1080&ssl=1',
    'Durmitor Trail Run',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Durmitor Trail Run'),
    NOW()),
(
    'https://cdn.prod.website-files.com/690e0151e8414f731febec7b/690f31b494e729b06fdfdcf5_2_DTR_Predrag_Vuckovic_0232-OPT.jpg',
    'Durmitor Trail Run',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Durmitor Trail Run'),
    NOW()),
(
    'https://tvpljevlja.me/wp-content/uploads/2025/07/517425959_122148161768761130_2327081083293456390_n.jpg',
    'Durmitor Trail Run',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Durmitor Trail Run'),
    NOW()),
(
    'https://wildbeautyart.me/wp-content/uploads/2025/08/Otvaranje-WBA1.jpg',
    'Wild Beauty Art Festival',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Wild Beauty Art Festival'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2022/07/Foto-Media-biro-2-scaled.jpg',
    'Wild Beauty Art Festival',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Wild Beauty Art Festival'),
    NOW()),
(
    'https://wildbeautyart.me/wp-content/uploads/2024/04/WBA-001-084.jpg',
    'Wild Beauty Art Festival',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Wild Beauty Art Festival'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2024/08/19/09/5586859_bedem-fest_share.jpg',
    'Bedem Fest',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Bedem Fest'),
    NOW()),
(
    'https://seerural.org/wp-content/uploads/2018/08/2-3.jpg',
    'Bedem Fest',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Bedem Fest'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/08/tvrdjava-bedem-foto-bedem-fest.jpg-1.webp',
    'Bedem Fest',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Bedem Fest'),
    NOW()),
(
    'https://feral.bar/posts/feral-bar-1757362607_545546734_1314459850682048_5282717821817942881_n.jpg',
    'Petrovac Jazz Fest',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Petrovac Jazz Fest'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/10/petrovac-jazz-festival-foto-organizatori.jpg',
    'Petrovac Jazz Fest',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Petrovac Jazz Fest'),
    NOW()),
(
    'https://urbanikult.com/wp-content/uploads/2025/07/file2.jpeg',
    'Petrovac Jazz Fest',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Petrovac Jazz Fest'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2024/07/1720724699491333-scaled.jpg',
    'Dani muzike Herceg Novi',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Dani muzike Herceg Novi'),
    NOW()),
(
    'https://hercegnovi.cool/wp-content/uploads/2025/07/dani-muzike-2025-otvaranje.jpg',
    'Dani muzike Herceg Novi',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Dani muzike Herceg Novi'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/07/11/10/5658673_dani-muzike-hn-2_share.jpg',
    'Dani muzike Herceg Novi',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Dani muzike Herceg Novi'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2025/02/Biser-Jadrana-festival-tivat.jpg',
    'Biser Jadrana Tivat',
    true,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Biser Jadrana Tivat'),
    NOW()),
(
    'https://radiotivat.com/wp-content/uploads/2024/07/unnamed-16-2500x1875.jpg',
    'Biser Jadrana Tivat',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Biser Jadrana Tivat'),
    NOW()),
(
    'https://eurovoix-world.com/wp-content/uploads/2025/07/Biser-Jadrana-2025.jpg',
    'Biser Jadrana Tivat',
    false,
    (SELECT "Id" FROM "Events" WHERE "Name" = 'Biser Jadrana Tivat'),
    NOW());


-- ============================================
-- 11. IMAGES - LOCALITIES
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
VALUES
(
    'https://upload.wikimedia.org/wikipedia/commons/2/2c/Mogren_beach_aptil_19_th.jpg',
    'Plaza Mogren',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://upoznajcrnugoru.com/wp-content/uploads/2018/04/Plaza-Mogren-Budva_fs.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2019/06/62000806_632077597307537_4593433872003235840_n.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://hgbudvanskarivijera.com/media/yootheme/cache/52/mogren-1-2-plaza-52d17106.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://media.istockphoto.com/id/1481840480/photo/the-iron-gate-to-the-old-town-of-budva.jpg?s=612x612&w=0&k=20&c=NfMBwy76q1IjxDfStL2_887kLmLryFIlXipBJYnGzeo=',
    'Stari grad Budva',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/3/PAsmXBVhYOPiT5lSFvCVuZKt3KAl2sZmiB0bbY9R.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/budva_stari_grad_060323_tw1024.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/139/SESjiK44XQxShsTrOwPmlsy8eTcRf3s5uQRwGHUg.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://www.gradnja.rs/wp-content/uploads/2020/12/Podgorica_Cover.jpg',
    'Centar Podgorice',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2020/12/Trg-nezavisnosti.jpg',
    'Centar Podgorice',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
    NOW()),
(
    'https://cdnuploads.aa.com.tr/uploads/Contents/2022/01/01/thumbs_b_c_4a0d89f632f4e881ec6fe1fc00c7df08.jpg?v=123852',
    'Centar Podgorice',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
    NOW()),
(
    'https://www.cdm.me/wp-content/uploads/2017/10/bDMIFv_podgorica-marathon-1-768x511.jpg',
    'Centar Podgorice',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Podgorice'),
    NOW()),
(
    'https://24kroz7.com/247/wp-content/uploads/2024/05/2-5-1024x683.jpg',
    'Crno jezero',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/turisticka-agencija-guliver-izlet-durmitor-tara-moraca-panorama.jpg',
    'Crno jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/30306/crno-jezero-2-%281%29.jpg',
    'Crno jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
    NOW()),
(
    'https://www.montenegrocar.me/data/public/crno-jezero-pogled-iz-sume.webp',
    'Crno jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/03/shutterstock_291029393.jpg',
    'Setaliste Pet Danica',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/03/shutterstock_1548398111-1000x600.jpg',
    'Setaliste Pet Danica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2019/11/%C5%A1etali%C5%A1te.jpg',
    'Setaliste Pet Danica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/place/setaliste_pet_danica_gorodskaya_naberezhnaya_pet_danica_v_herceg-novi.jpg?itok=fPmqL_Ro',
    'Setaliste Pet Danica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Setaliste Pet Danica'),
    NOW()),
(
    'https://bar.me/wp-content/uploads/bar_61.jpg',
    'Stari Bar',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/511/X0g1zQpHiJZTtGQ4PreZkHg8707hokwFLSzM57Y4.jpg',
    'Stari Bar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2024/10/20/18/5600044_viber-image-20241018-161252598_ls.jpg',
    'Stari Bar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2020/04/Bar_Crna_Gora_Stari_Grad_Foto_Balkan_Media_Tim.jpg',
    'Stari Bar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
    NOW()),
(
    'https://visitadabojana.com/wp-content/uploads/2025/09/velika-plaza-aerial-coastline-view.webp',
    'Velika plaza',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
    NOW()),
(
    'https://www.gradnja.rs/wp-content/uploads/2025/04/velika-plaza-ulcinj.jpg',
    'Velika plaza',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/02/shutterstock_1809771406-1000x600.jpg',
    'Velika plaza',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
    NOW()),
(
    'https://itinari-images.s3.eu-west-1.amazonaws.com/activity/images/original/610157eb-d89f-4b83-82df-62255fbe753b-velika_6.jpg',
    'Velika plaza',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Velika plaza'),
    NOW()),
(
    'https://www.golivegotravel.nl/wp-content/uploads/2018/04/Stair-Grad-Kotor-8-1160x773.jpg',
    'Stari grad Kotor',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://putovanjazapet.com/wp-content/uploads/2021/12/Zadivljujuci-Kotor-grad-za-sva-godisnja-doba.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/kotor-stari-grad/large/kotor-stari-grad-81619.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/29566/stari-grad-kotor-2.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/35/Monastero_di_cetinje%2C_01.JPG',
    'Cetinjski manastir',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://media.pobjeda.me/media/2022/09/24/1664011895-glavna-manastiri-tekst-cetinjski-manastir-foto-lazar-pejovic-001-12-i_1280x800.jpg?cacheControl=1664011896',
    'Cetinjski manastir',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/d/dc/Cetinjski_manastir.jpg',
    'Cetinjski manastir',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://leks.canu.ac.me/web/Slike/Fig-LLUCG-3234-2759.jpg',
    'Cetinjski manastir',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Trg_Slobode_NK.JPG',
    'Trg Slobode',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://lovinmontenegro.com/wp-content/uploads/2025/06/freedom-square-niksic-4.jpg',
    'Trg Slobode',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://lovinmontenegro.com/wp-content/uploads/2025/06/freedom-square-niksic-3.jpg',
    'Trg Slobode',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://mondo.me/Picture/757775/jpeg/image00007.jpeg?ts=2025-02-11T10:54:15',
    'Trg Slobode',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/0/0e/Porto_Montenegro.jpg',
    'Porto Montenegro',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://www.americanexpress.com/en-us/travel/discover/photos/300669/127803/1600/Droneshot1.jpg?ch=560',
    'Porto Montenegro',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://www.godubrovnik.com/wp-content/uploads/pm_summer-campaign3.jpg',
    'Porto Montenegro',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://www.journal.rs/wp-content/uploads/2025/10/Porto-Montenegro-scaled.jpg',
    'Porto Montenegro',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://www.ekapija.com/thumbs169/spomenik_na_trebjesi_041224_tw1024.jpg',
    'Spomen park Slobode Niksic',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/03/29/20/5312665_spomenik-trubjela_share.jpg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/kralj_nikola_04-08-26-scaled.jpg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://media.pobjeda.me/media/2023/07/13/1689264523-1920-1280-max-1.jpg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/d/d2/View_over_Njegusi.jpg',
    'Njegusi',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/31/Njegusi_-_Church.jpg',
    'Njegusi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
    NOW()),
(
    'https://adriaticways.com/wp-content/uploads/2025/12/Njegusi-Village-Montenegro-3.webp',
    'Njegusi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegusi'),
    NOW()),
(
    'https://tinymontenegro.com/wp-content/uploads/2023/10/imageedit_1_2824406581.jpg',
    'Virpazar',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://skadarlakeboatcruise.com/wp-content/uploads/The-view-from-the-bridge-Virpzar-2.jpg',
    'Virpazar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://www.visit-montenegro.com/wp-content/uploads/2026/01/virpazar-01-scaled.jpg',
    'Virpazar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://undiscoveredmontenegro.com/wp-content/uploads/2025/02/Virpazar-view-2.png',
    'Virpazar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://montenegro.org/wp-content/uploads/2024/09/image-13.png',
    'Virpazar',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/9/96/Biogradsko_jezero_%282%29.JPG',
    'Biogradsko jezero',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://adria.fun/wp-content/uploads/2023/07/Biogradsko-jezero-Photo-Montenegro.travel-ok.jpg',
    'Biogradsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://www.kolasin.com/img/article/biogradska-gora/biogradska-gora-1.jpg',
    'Biogradsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://srbijazamlade.rs/fajlovi/productitem/188_638de85feedde.jpg',
    'Biogradsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://assets.etv.me/pb-etv/swp/8p72gy/media/2025043013044_039b228ce2c7d26b0a001edb45bd6f107d6155f35499555ec618f703eb29fe8b.jpg',
    'Biogradsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://www.gradnja.rs/wp-content/uploads/2023/12/trg-zabljak-konkurs-03.jpg',
    'Centar Zabljaka',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/5/5c/%C5%BDabljak%2C_Montenegro_-_town_centre_2.jpg',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/10/zabljak-rtnk.jpg',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://static.dan.co.me/images/slike/new/2023/05/28/1850818.jpg',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://mondo.me/Picture/812309/jpeg/591559472_1196910645682401_8312711898158084581_n.jpg?ts=2025-12-01T08:54:54',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://jasninaputovanja.me/wp-content/uploads/2022/04/IMG_3529-2000x1333.jpg',
    'Petrovac',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
    NOW()),
(
    'https://www.funtravelnis.rs/wp-content/uploads/2018/01/petrovac-1.jpg',
    'Petrovac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/845653015.jpg?k=35580afaf5ebb156d3ca8b0c7020fa201ff48211e50dbc4226df0ba91bef762b&o=',
    'Petrovac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovac'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/1/1c/Kotorski_zaliv_-_panoramio_%281%29.jpg',
    'Muo',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Muo'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/f/fd/Muo%2C_Montenegro.jpg',
    'Muo',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Muo'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/miso/Hosting-614451281032174205/original/a6f3da60-66fd-4538-ad2d-cb2aed4b3bce.png',
    'Muo',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Muo'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/3f/Preview_of_the_Bay_of_Kotor_from_Dobrota_Palazzi_resort.jpg',
    'Dobrota',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/71/Dobrota%2C_Bah%C3%ADa_de_Kotor%2C_Montenegro%2C_2014-04-19%2C_DD_08.JPG',
    'Dobrota',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/city/dobrota-462.png',
    'Dobrota',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Dobrota'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2020/10/DJI_0237.jpg',
    'Centar Cetinja',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
    NOW()),
(
    'https://i0.wp.com/cetinjskilist.com/wp-content/uploads/2025/04/IMG-20250328-WA0005.jpg?resize=1200%2C800&ssl=1',
    'Centar Cetinja',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/cetinje_centar_1_141119_tw1024.jpg',
    'Centar Cetinja',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Cetinja'),
    NOW()),
(
    'https://apartmani-igalo.com/images/herceg-novi-stari-grad.jpg',
    'Centar Herceg Novog',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/herceg_novi_0060220_tw1024.jpg',
    'Centar Herceg Novog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/omladinski_centar_hn_130122_tw1024.jpg',
    'Centar Herceg Novog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Herceg Novog'),
    NOW()),
(
    'https://www.visit-montenegro.com/wp-content/uploads/2026/01/ostrog-monastery-01-scaled.jpg',
    'Ostrog',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ostrog'),
    NOW()),
(
    'https://lifeontheroam.com/wp-content/uploads/2024/11/Ostrog-Monastery-Montenegro-tn.webp',
    'Ostrog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ostrog'),
    NOW()),
(
    'https://jez.co.rs/storage/2022/02/22-donji-manastir-ostrog.jpg',
    'Ostrog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ostrog'),
    NOW()),
(
    'https://amforaproperty.com/files/crm/22559133/4e70e0c4-2cc6-42d1-ae52-ec062e3a430d.jpeg',
    'Centar Budve',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
    NOW()),
(
    'https://amforaproperty.com/files/crm/22283597/fff12ad3-485b-4d4e-ba69-a436acd2bc6e.jpeg',
    'Centar Budve',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
    NOW()),
(
    'https://bizniscg.me/wp-content/uploads/2021/08/Budva_1-1-1024x768.jpg',
    'Centar Budve',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Budve'),
    NOW()),
(
    'https://image.jimcdn.com/app/cms/image/transf/none/path/s2155450c0f32d414/image/i45ecc2ae70448b4a/version/1583408463/image.jpg',
    'Centar Igala',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
    NOW()),
(
    'https://image.jimcdn.com/app/cms/image/transf/none/path/s2155450c0f32d414/image/i0784beb8bdda8d01/version/1583408478/image.jpg',
    'Centar Igala',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
    NOW()),
(
    'https://i0.wp.com/www.apartmani.me/img/oglasi/688/izdaje-se-apartman-u-centru-igala-crna-gora-jrd.jpg?fit=1920%2C1080&ssl=1',
    'Centar Igala',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Igala'),
    NOW()),
(
    'https://assets.alohatours.rs/images/core/cities/card/orahovac.jpg',
    'Orahovac',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Orahovac'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/a/a0/Orahovac.jpg',
    'Orahovac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Orahovac'),
    NOW()),
(
    'https://www.olympic.rs/wp-content/uploads/orahovac-full.jpg',
    'Orahovac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Orahovac'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0c/ea/0c/04/caption.jpg?w=1400&h=1400&s=1',
    'Kamenari',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kamenari'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/17/ca/ac/c7/adriatica.jpg?w=1100&h=-1&s=1',
    'Kamenari',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kamenari'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0e/6c/57/f3/photo2jpg.jpg?w=1200&h=1200&s=1',
    'Kamenari',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kamenari'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2020/04/Bar_Crna_Gora_Stari_Grad_Foto_Balkan_Media_Tim.jpg',
    'Centar Bara',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
    NOW()),
(
    'https://accordingtokristina.com/wp-content/uploads/2020/02/Uzbrdo-do-starog-grada-%C2%A9-According-to-Kristina-1440x964.jpg',
    'Centar Bara',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
    NOW()),
(
    'https://gradski.me/wp-content/uploads/2025/10/bar1.jpg',
    'Centar Bara',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Bara'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/03/grahovo-rtcg.jpg',
    'Grahovac',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Grahovac'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/496683289.jpg?k=febb1c8844a596b28e0be442f0e647e64c0ffcfad77d118811389de9750e5182&o=',
    'Grahovac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Grahovac'),
    NOW()),
(
    'https://bar.travel/wp-content/uploads/2022/03/Vidikovac-Tudjemili-scaled.jpg',
    'Tudjemili',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tudjemili'),
    NOW()),
(
    'https://immo-monte.me/wp-content/uploads/2022/12/Immo-Monte_Spomenik_360-3-scaled.jpg',
    'Tudjemili',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tudjemili'),
    NOW()),
(
    'https://cozymontenegro.com/wp-content/uploads/2022/07/Road-and-parking-of-Viewpoint-Tudjemili-1630x860.jpg',
    'Tudjemili',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tudjemili'),
    NOW()),
(
    'https://cdn-processed.tmatic.travel/0bb6654d-5c90-4825-b927-a6eaece8e632.jpg',
    'Fundina',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fundina'),
    NOW()),
(
    'https://jasninaputovanja.me/wp-content/uploads/2020/09/105-980x980.jpg',
    'Fundina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fundina'),
    NOW()),
(
    'https://montenegro-for.me/wp-content/uploads/2015/11/Circuit-Kucka-Korita8-Fundina.jpg',
    'Fundina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fundina'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/28723/inbound4956367721833486138.jpg',
    'Centar Niksica',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/11/Niksic-foto-Milan-Sapuric-22-3.jpg',
    'Centar Niksica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
    NOW()),
(
    'https://www.in4s.net/wp-content/uploads/2020/09/Centar-Niksic.jpg',
    'Centar Niksica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Niksica'),
    NOW()),
(
    'https://www.ponte.rs/UPLOADS-PONTE/2022/12/CANJ.jpg',
    'Canj',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Canj'),
    NOW()),
(
    'https://www.jadranskibiser.com/img/canj2.jpg',
    'Canj',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Canj'),
    NOW()),
(
    'https://maestralcanj.com/images/gallery/beach-1.jpg',
    'Canj',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Canj'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/4/4d/Kotor_Montenegro.jpg',
    'Centar Kotora',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kotora'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/29599/kotor-trg-oruzja.jpg',
    'Centar Kotora',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kotora'),
    NOW()),
(
    'https://www.visit-montenegro.com/wp-content/uploads/2026/02/Depositphotos_250074826_XL-scaled.jpg',
    'Centar Kotora',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kotora'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2018/11/Tivat-centar.jpg',
    'Centar Tivta',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/449313311.jpg?k=7d594eccd3716db7f70ee270d518f17cef37c9cfba36c5cb469009ed466387bc&o=',
    'Centar Tivta',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2018/12/Tivat-_Centar.jpg',
    'Centar Tivta',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Tivta'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/0/0e/Kola%C5%A1in_Town_Center.jpg',
    'Centar Kolasina',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/08/01/00/4576536_20190801200824_acc0e98099a547218011496814c7bb54b86f69d29170423b0b7e42d4b595c412_ls.jpg',
    'Centar Kolasina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/05/08/00/5166375_20200508120532_15b2b4d6e5e4b8fac8536ee8b7cc6fd69d14f19dc573ca6773d8cf252cfe964f_ff.jpg',
    'Centar Kolasina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Kolasina'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/13/42/92/9c/slovenska-beach.jpg?w=1200&h=-1&s=1',
    'Slovenska plaza',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Slovenska plaza'),
    NOW()),
(
    'https://www.hgbudvanskarivijera.com/images/hotel-slovenska-plaza/novo-totali/dji_0516.jpg',
    'Slovenska plaza',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Slovenska plaza'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/e/e4/Slovenska_Beach_in_Budva%2C_Montenegro_aa.jpg',
    'Slovenska plaza',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Slovenska plaza'),
    NOW()),
(
    'https://lusticabay.com/wp-content/uploads/2022/04/Marina-Village-Lustica-Bay-e1655734430415.jpg',
    'Lustica',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lustica'),
    NOW()),
(
    'https://d1tfdfyb9rvaxg.cloudfront.net/chedilusticabay.com-1070583806/cms/cache/v2/6315646eed574.jpg/1920x1080/fit/80/81f4fda3ffdd2153fdb2520418512bba.jpg',
    'Lustica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lustica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/4/4b/%D0%A1%D0%B2%D1%98%D0%B5%D1%82%D0%BB%D0%BE%D0%BF%D0%B8%D1%81_%D0%B7%D0%B2%D0%BE%D0%BD%D0%B8%D0%BA%D0%B0_%D1%81%D1%80%D0%B1%D1%81%D0%BA%D0%B5_%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%81%D0%BB%D0%B0%D0%B2%D0%BD%D0%B5_%D1%86%D1%80%D0%BA%D0%B2%D0%B5_%D0%A1%D0%B2._%D0%9D%D0%B5%D0%B4%D1%98%D0%B5%D1%99%D0%B5_%D1%83_%D0%97%D0%B0%D0%B1%D1%80%D1%92%D1%83%2C_%D0%9B%D1%83%D1%88%D1%82%D0%B8%D1%86%D0%B0.jpg',
    'Lustica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lustica'),
    NOW()),
(
    'https://velikaplaza.com/wp-content/uploads/2020/03/dsc_0020.jpg',
    'Centar Ulcinja',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Ulcinja'),
    NOW()),
(
    'https://foodbook.me/storage/blog/35/YilRuxmtjlxIt2EK3dPr5oSJpoeuLJGgy5PIqWU8.jpg',
    'Centar Ulcinja',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Ulcinja'),
    NOW()),
(
    'https://content.estitor.com/86a4da2c-a4b3-492d-8b72-9b355c1d2307-md.webp',
    'Centar Ulcinja',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Ulcinja'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/f/f3/Widok_na_Perast_z_zachodu_01.JPG',
    'Perast',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Perast'),
    NOW()),
(
    'https://www.mcadriatic.com/wp-content/uploads/2021/03/perast-3.jpg',
    'Perast',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Perast'),
    NOW()),
(
    'https://www.miroandsons.com/wp-content/uploads/2022/11/perastladyoftherock.webp',
    'Perast',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Perast'),
    NOW()),
(
    'https://beachatlas.s3.us-east-2.amazonaws.com/a20f585f-f4d3-43a7-817f-40e06eb2ae74.jpeg',
    'Radanovici',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Radanovici'),
    NOW()),
(
    'https://www.maestrotravel.rs/wp-content/uploads/2024/03/Radanovi%C4%87i.jpg',
    'Radanovici',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Radanovici'),
    NOW()),
(
    'https://cdn.nadjidom.com/images/photos/large/2025/12/03/-a41-4900-1679557921-viber-slika-2023-03-22-13-35-56-571.jpg',
    'Radanovici',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Radanovici'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/21/Podgorica-Tuzi_Vulaj_village_IMG_1321_De%C4%8Di%C4%87_mountain.JPG',
    'Tuzi',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tuzi'),
    NOW()),
(
    'https://tuzi.org.me/wp-content/uploads/2019/03/niagara-1.jpg',
    'Tuzi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tuzi'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2023/12/27/21/5539362_tuzi_share.jpg',
    'Tuzi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tuzi'),
    NOW()),
(
    'https://bosnjackidnk.com/wp-content/uploads/2021/08/image_2021-08-27_143828.png',
    'Gradjani',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gradjani'),
    NOW()),
(
    'https://www.poreklo.rs/wp-content/uploads/2019/07/selo.jpg',
    'Gradjani',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gradjani'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/07/13/22/5348555_2247292_ff.jpg',
    'Gradjani',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gradjani'),
    NOW()),
(
    'https://static.wixstatic.com/media/943f6a_dc7129f291b94358a2bc3811c6fa4ab3~mv2.jpg/v1/fill/w_2500,h_1668,al_c/943f6a_dc7129f291b94358a2bc3811c6fa4ab3~mv2.jpg',
    'Podostrog',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podostrog'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/6/6a/Budva%2C_kl%C3%A1%C5%A1ter_Podostrog.jpg',
    'Podostrog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podostrog'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Podostrog%2C_ji%C5%BEn%C3%AD_okraj_Budvy.jpg/1280px-Podostrog%2C_ji%C5%BEn%C3%AD_okraj_Budvy.jpg',
    'Podostrog',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podostrog'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/f/f6/Budva_%2826939787035%29.jpg',
    'Becici',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Becici'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/72/Be%C4%8Di%C4%87i%2C_Montenegro_-_panoramio_%286%29.jpg',
    'Becici',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Becici'),
    NOW()),
(
    'https://kontiki.ba/Handler/LocationPictHandler.ashx?LocationTvRecId=92&LocationPictTvRecId=528',
    'Becici',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Becici'),
    NOW()),
(
    'https://sothebysrealty.me/wp-content/uploads/2023/01/39-Podgorica-Mareza-luxury-villa-with-a-swimming-pool-1-1536x863.jpg',
    'Imanje',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Imanje'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/VED_1500-scaled-e1713447102971.jpg',
    'Imanje',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Imanje'),
    NOW()),
(
    'https://www.imanje-knjaz.me/files/images/1733817908-BI4_6135%20copy.jpg',
    'Imanje',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Imanje'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/3c/R%C3%ADo_Moraca%2C_norte_de_Podgorica%2C_Montenegro%2C_2014-04-14%2C_DD_09.JPG',
    'Moraca',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Moraca'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/8/84/%D0%A7%D0%B5%D1%80%D0%BD%D0%BE%D0%B3%D0%BE%D1%80%D0%B8%D1%8F%2C_%D0%9C%D0%BE%D0%BD%D0%B0%D1%81%D1%82%D1%8B%D1%80%D1%8C_%D0%9C%D0%BE%D1%80%D0%B0%D1%87%D0%B0.jpg',
    'Moraca',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Moraca'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/moraca-1-scaled.jpg',
    'Moraca',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Moraca'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/city/prcanj-455.jpg',
    'Prcanj',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Prcanj'),
    NOW()),
(
    'https://www.adriaticvacationrentals.com/wp-content/uploads/2025/06/Prcanj-feature.jpg',
    'Prcanj',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Prcanj'),
    NOW()),
(
    'https://montenegro-for.me/wp-content/uploads/2025/05/old-parish-church-Prcanj1.jpg',
    'Prcanj',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Prcanj'),
    NOW()),
(
    'https://s-medijicg.com/images/stories/2020/08/19/ANDRIJEVICA-CENTAR-2.jpeg',
    'Centar Andrijevice',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Andrijevice'),
    NOW()),
(
    'https://rtcg.me/upload//media/2024/2/20/20/59/29/1655559/thumbs/2887806/andrijevica.jpg',
    'Centar Andrijevice',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Andrijevice'),
    NOW()),
(
    'https://rtcg.me/upload//media/2024/3/28/21/24/827/1706228/thumbs/3079682/andrijevica.jpg',
    'Centar Andrijevice',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Andrijevice'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2023/03/06/10/5472797_pjesnicka-rijec-1_share.jpg',
    'Centar Pluzina',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Pluzina'),
    NOW()),
(
    'https://parkpiva.com/wp-content/uploads/2019/06/Pluzine-dron21-1024x768.jpg',
    'Centar Pluzina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Pluzina'),
    NOW()),
(
    'https://rtcg.me/upload//media/2023/7/19/12/10/687/1456199/thumbs/2160808/thumb0.jpg',
    'Centar Pluzina',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Pluzina'),
    NOW()),
(
    'https://parkpiva.com/wp-content/uploads/2016/10/Pivsko-jezero-Park-Piva.jpg',
    'Pivsko jezero',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Pivsko jezero'),
    NOW()),
(
    'https://www.tararafting.com/wp-content/uploads/2021/11/Piva-lake.jpg',
    'Pivsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Pivsko jezero'),
    NOW()),
(
    'https://srbijazamlade.rs/fajlovi/productitem/tara-rafting_63bd7ab432fbe.jpg',
    'Pivsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Pivsko jezero'),
    NOW()),
(
    'https://www.mojacrnagora.rs/wp-content/uploads/2018/07/Kom-1.jpg',
    'Komarnica',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Komarnica'),
    NOW()),
(
    'https://montenegro-for.me/wp-content/uploads/2020/06/Komarnica-Canyon.jpg',
    'Komarnica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Komarnica'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/693363952.jpg?k=79ef5b9634d70655662ce869e52f8c05fe22e2f28309317b0a95364b684d5a8b&o=',
    'Komarnica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Komarnica'),
    NOW()),
(
    'https://www.ponte.rs/UPLOADS-PONTE/2022/12/SUTOMORE.jpg',
    'Sutomore',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Sutomore'),
    NOW()),
(
    'https://server.nyaralashorvatorszagban.com/uploads/original/921512ae56e10f39163c4b2aec6264c4.webp',
    'Sutomore',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Sutomore'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0f/68/20/b0/photo0jpg.jpg?w=1200&h=-1&s=1',
    'Sutomore',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Sutomore'),
    NOW()),
(
    'https://casopisprostor.me/images/prostor_58_web-191.jpg',
    'Katuni',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Katuni'),
    NOW()),
(
    'https://www.ruralholiday.me/wp-content/uploads/2019/08/PENTAX-K-5-14-09-2012-18-25-19.jpg',
    'Katuni',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Katuni'),
    NOW()),
(
    'https://mladiberana.me/wp-content/uploads/2024/08/katun.jpg',
    'Katuni',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Katuni'),
    NOW()),
(
    'https://vcdn.bergfex.at/images/resized/profiles/detail/36a/e6e861aeb705da50a149a6722c96c36a.jpg',
    'Tresnjevik',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tresnjevik'),
    NOW()),
(
    'https://vcdn.bergfex.at/images/resized/profiles/detail/357/fea532dc5d4660446535dca5670f1357.jpg',
    'Tresnjevik',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tresnjevik'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/01/21/14/5290805_1942600_share.jpg',
    'Tresnjevik',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tresnjevik'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2024/05/26/15/5569651_2374098_ff.jpg',
    'Kralje',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kralje'),
    NOW()),
(
    'https://www.toandrijevica.me/wp-content/gallery/kralje/dsc00693.jpg',
    'Kralje',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kralje'),
    NOW()),
(
    'https://www.hotels-me.net/data/Imgs/OriginalPhoto/6134/613405/613405265/kraljska-koliba-kralje-s-cottage-andrijevica-img-68.JPEG',
    'Kralje',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kralje'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/sr/8/8a/Samarkova_luka-Kuti.JPG',
    'Kuti',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kuti'),
    NOW()),
(
    'https://www.toandrijevica.me/wp-content/uploads/2013/12/IMG_1319.jpg',
    'Kuti',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kuti'),
    NOW()),
(
    'https://rtcg.me/upload//media/2025/8/21/19/51/89/2267641/resize/2267644/3_1200x900',
    'Kuti',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kuti'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/34/Crnojevica_rijeka.jpg',
    'Rijeka Crnojevica',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rijeka Crnojevica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/f/fe/Rijeka_Crnojevi%C4%87a.jpg',
    'Rijeka Crnojevica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rijeka Crnojevica'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2019/10/viber_image_2019-10-30_14-21-45.jpg',
    'Rijeka Crnojevica',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rijeka Crnojevica'),
    NOW()),
(
    'https://lifeontheroam.com/wp-content/uploads/2024/11/Lipa-Cave-Montenegro-tn.webp',
    'Lipa',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lipa'),
    NOW()),
(
    'https://montenegro-for.me/wp-content/uploads/2015/09/Durmitor1-Prutas.jpg',
    'Lipa',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lipa'),
    NOW()),
(
    'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=auto,quality=60,width=375,height=375,dpr=2/tour_img/5ee0ced438735.jpeg',
    'Lipa',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lipa'),
    NOW()),
(
    'https://www.montenegro.travel/imagine_cache/og/uploads/banners/1_unique_montengro/1.Bridge-on-the-river-Tara.webp',
    'Kanjon Tare',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kanjon Tare'),
    NOW()),
(
    'https://www.putokaz.me/images/Zanimljivosti/U_Crnoj_Gori/7_Kanjon_Tare__Najdublji_kanjon_Evrope__/1406546530.jpg',
    'Kanjon Tare',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kanjon Tare'),
    NOW()),
(
    'https://www.amiradio.rs/wp-content/uploads/2024/08/nature-7018528_1280.jpg',
    'Kanjon Tare',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kanjon Tare'),
    NOW()),
(
    'https://s0.wklcdn.com/image_200/6002773/147428061/92972676Master.jpg',
    'Curevac',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Curevac'),
    NOW()),
(
    'https://sailingstonetravel.b-cdn.net/wp-content/uploads/2021/11/Durmitor-National-Park-Hiking-to-the-Curevac-Viewpoint-56-copy.jpg.webp',
    'Curevac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Curevac'),
    NOW()),
(
    'https://sailingstonetravel.b-cdn.net/wp-content/uploads/2021/11/Durmitor-National-Park-Hiking-to-the-Curevac-Viewpoint-55-copy.jpg',
    'Curevac',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Curevac'),
    NOW()),
(
    'https://www.montenegroprospects.com/sites/default/files/styles/realty_xxl/public/2022-04/ruins_for_sale_13471_9.jpg.webp?itok=crOxvsaa',
    'Kameno',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kameno'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/08/01/00/4576028_20190801140820_4c02bf037ed118ef7fe1c4ccaca44c35f4c154c4e2d20688158b515e34a2871f_share.jpg',
    'Kameno',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kameno'),
    NOW()),
(
    'https://www.montenegroprospects.com/sites/default/files/styles/realty_xxl/public/2022-04/ruins_for_sale_13471_6.jpg.webp?itok=U6aYvVSX',
    'Kameno',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kameno'),
    NOW()),
(
    'https://forte-mare.com/wp-content/uploads/2024/02/1-7-7.jpg',
    'Podi',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podi'),
    NOW()),
(
    'https://monteonline.org/wp-content/uploads/2025/06/familnyj-dom-s-vidom-na-zaliv-i-otkrytoe-more-v-podi-herczeg-novi_01.jpg',
    'Podi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podi'),
    NOW()),
(
    'https://nekretnina.me/wp-content/uploads/2025/01/23-min.jpg',
    'Podi',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Podi'),
    NOW()),
(
    'https://onogost.me/wp-content/uploads/2023/12/tvrdjava-onogost-nasa-slika.jpg',
    'Tvrdjava Onogost',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tvrdjava Onogost'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/03/31/00/4355293_20190331200328_505cdd0bc5d93f91405c69c3bf1364fc2a58fc8e384cf6288526dc7f64d8f17c_share.jpg',
    'Tvrdjava Onogost',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tvrdjava Onogost'),
    NOW()),
(
    'https://adria.fun/wp-content/uploads/2023/09/Onogost-Nikisic-Photo-Adria.fun_.JPG-2-ok.jpg',
    'Tvrdjava Onogost',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tvrdjava Onogost'),
    NOW());

-- ============================================
-- 12. IMAGES - OBJECTS
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
VALUES
(
    'https://images.trvl-media.com/lodging/3000000/2500000/2497700/2497664/26b21f8d.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
    'Hotel Vardar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
    NOW()),
(
    'https://vardarkotor.me-hotel.com/data/Imgs/OriginalPhoto/13136/1313656/1313656486/hotel-vardar-kotor-img-5.JPEG',
    'Hotel Vardar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
    NOW()),
(
    'https://soleazur.rs/uploads/0000/1/2021/11/22/vardar-kotor-2.jpg',
    'Hotel Vardar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
    NOW()),
(
    'https://alf.ua/public/uploads/media/thumbnails/0002/06/4cfefe4960e0f0615dbcfbb47d94d9b76d0497a4.jpeg',
    'Hotel Vardar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
    NOW()),
(
    'https://mcdn.pro/data/objects/images/40419/1-5vpoci-l-ptkdlq.jpg',
    'Hotel Avala',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
    NOW()),
(
    'https://globus-tours.co/storage/2023/05/avala-resort-2.jpg',
    'Hotel Avala',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
    NOW()),
(
    'https://www.kongresniturizam.com/storage/objects/vGHRn278rdNRSipA.jpg',
    'Hotel Avala',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
    NOW()),
(
    'https://www.avalaresort.com/photos/1/Gallery/Spa%20&%20Wellness/homepage/DSC_7301.jpg',
    'Hotel Avala',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
    NOW()),
(
    'https://www.luxurylifestylemag.co.uk/wp-content/uploads/2022/11/140-Hotel-Vardar-photo-Edvard-Nalbantjan-.jpg',
    'Restoran Galion',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
    NOW()),
(
    'https://www.luxurylifestylemag.co.uk/wp-content/uploads/2022/11/132-Hotel-Vardar-photo-Edvard-Nalbantjan-.jpg',
    'Restoran Galion',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
    NOW()),
(
    'https://turistickiinfocentar.rs/wp-content/uploads/CF026968favsmanjeno-min-1-1-scaled.jpg',
    'Restoran Galion',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/place/restaurant_galion_restoran_galion_v_kotore.jpg?itok=wLuoKPQe',
    'Restoran Galion',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
    NOW()),
(
    'https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1920,fit=crop/A854j9RqjjF9MZww/hmphoto-24-dWxbarqLqquob7Qz.jpg',
    'Mogren Beach Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
    NOW()),
(
    'https://adriaticways.com/wp-content/uploads/2026/01/Mogren-2-Beach.webp',
    'Mogren Beach Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
    NOW()),
(
    'https://montenegro.org/wp-content/uploads/2023/11/IMG_7522-1024x768.jpg',
    'Mogren Beach Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
    NOW()),
(
    'https://montenegro.org/wp-content/uploads/2023/11/IMG_7553-1024x768.jpg',
    'Mogren Beach Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
    NOW()),
(
    'https://www.antenam.net/uploads/a/f/9/af9e3af739604df73554e1fb290f080a.jpeg',
    'Planinarski dom Durmitor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/17/00/3076728_20190217020252_5c68bf02b789684ea0f98e47jpeg_ls.jpg',
    'Planinarski dom Durmitor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
    NOW()),
(
    'https://durmitor.wordpress.com/wp-content/uploads/2012/03/planinarski-dom-orjen.jpg?w=584',
    'Planinarski dom Durmitor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
    NOW()),
(
    'https://lh3.googleusercontent.com/p/AF1QipNRrYNagkDHzZ-UBtBHSm3Y7nF12mw_KBVbmdgZ=s1600-w640',
    'Planinarski dom Durmitor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/10/gradska-kuca-rtnk.jpg',
    'Biblioteka Niksic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2018/02/ed05e0e0c4febd7b2b95b70b5743b93a.jpg',
    'Biblioteka Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2025/04/gradska-kuca-rtnk.jpg',
    'Biblioteka Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://www.vijesti.me/data/images_intext/2019/10/16/14/20191016151024_6475cc02abfa00ff342bb2b5f0f51fd8170852b7828c926115eea5cc932b93ea.jpeg',
    'Biblioteka Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Katoli%C4%8Dka_crkva_svetog_Nikole_u_Starom_Baru.JPG/1280px-Katoli%C4%8Dka_crkva_svetog_Nikole_u_Starom_Baru.JPG',
    'Crkva Svetog Nikole Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
    NOW()),
(
    'https://mitropolija.com/wp-content/uploads/2019/05/08.jpg',
    'Crkva Svetog Nikole Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Pravoslavna_crkva_sv._Nikole_u_Starom_Baru.jpg',
    'Crkva Svetog Nikole Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
    NOW()),
(
    'https://images.openai.com/static-rsc-4/cg0pAy_gi4jJAH0p6vW6roIhN_4p01jmxGgbEq4g6KOxn6RB36KVyBQGDD_z9GweIyWAeEv8MvlJjQ-x9ebwT-jBpcKxzaa4PIshjLIl-CMmyg1rOB0DnrVpA6yKvul7P-qGmypBs4HGbl6YbnQ9SXiikdvuYh_WFHtraGVBI24q3nf8GbRqFPqTIfRgf19o?purpose=fullsize',
    'Restoran Jezero',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://images.openai.com/static-rsc-4/FGCGeHTOEhn7iRz5Zf3zduzGyRpI3oWMpmGMB9MLowZQVPXvaZxyapywMCj0fspxIIm1czG5MUMOWY6LNEUPFgWkcwTPgSkDc5LuTm9RQz_WVxPQ6qEYL_Az2XeKMWDbOWbfUTMV2oX1lvBUKnC5DQwl_xJ-4kUV-NBMKJ_xhmPCOogx7tIkalv0VVfFXdIL?purpose=fullsize',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()), 
(
    'https://images.openai.com/static-rsc-4/4xXo4sv034rWBeC3wyhiApeBGI1zjC9sWok5uw-zc00W9G9sf8iuOBHyX_Syym1HD9U_XFEqm5UpAeMUsPky8TL4CCgjidreQEBspAmefiK8JfJ9x212eIYkHOzeqIkcVeeexLqjAYD1r27G4_v5yBFtxjPlXF8PlajszCVRq12zAXV1Nyh4hyIuUNjPKitW?purpose=fullsize',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
    (
    'https://images.openai.com/static-rsc-4/Dw0azf0HD_TmcThiY9gyKsWWwVyDcf14vwjtPPDlmIeME56axW2iPuYn9a6qs4hmvK9D_T8hlTQ4e744sBbg3MRmhmALtYPsU0hqYj-jM7Gyw5Flhahs1Ifk4CZiZuIhLEle2WGs1Bv4OHb9bTiCfPdYBqSa2XNTDnaR3LCgWIk9Zjfg0EtTiYt6dNjzlXc3?purpose=fullsize',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://www.plantaze.com/wp-content/uploads/2026/02/restoranhrana8-637x1024.jpg',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://images.mindtrip.ai/restaurants/6498/58dd/50d5/ab5e/af05/40ba/db52/f6a2',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/77650626.jpg?k=5626605edcaec3c0992f24c5d442839d08193e6d27e5c514ba354d7b20394a75&o=',
    'Hotel Bianca Kolasin',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/19026752.jpg?k=e14990f4ba96f2a7cf0c568743d3285f1ad3a7129866214c4f33d8e67b9d6d91&o=',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://images.trvl-media.com/lodging/3000000/2360000/2351700/2351617/9d2b65dc.jpg?impolicy=fcrop&w=1200&h=800&quality=medium',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/f6/7c/ec/caption.jpg?w=1200&h=1200&s=1',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://www.hotels-me.net/data/Photos/OriginalPhoto/17144/1714498/1714498335.JPEG',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/375/bhPAke1vwjwf6FaVL5GK35nsvkuPbVTPVkYutaXU.jpg',
    'Konoba Scala Santa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/20/qSIrzDnAzB1h2gCED4v3XBRvYbR1dq90qrAZHJEx.jpg',
    'Konoba Scala Santa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/konoba-scala-santa/large/konoba-scala-santa-467850.jpg',
    'Konoba Scala Santa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Scala Santa'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/tPAx7eIGQIYSrRDBKeusUbTjftogq85754RUa72E.jpeg',
    'Restoran Pod Volat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/31/2d/c1/0b/caption.jpg?w=1200&h=1200&s=1',
    'Restoran Pod Volat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/44/SccUnOVMVGNhU3jRNlwMdupinmSwbskT8eMeSUFe.jpg',
    'Restoran Pod Volat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Pod Volat'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/2b/5f/2a/14/mayabay-porto-montenegro.jpg',
    'MayaBay Porto Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
    NOW()),
(
    'https://www.mayabayrestaurant.com/uploads/media/1416x1424/03/303-MayaBay%20Porto%20Montenegro.webp?v=1-0',
    'MayaBay Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
    NOW()),
(
    'https://www.mayabayrestaurant.com/uploads/media/960x1098/07/177-big%20last.webp?v=1-0',
    'MayaBay Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'MayaBay Porto Montenegro'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/3b/43/d9/entrance.jpg?w=1200&h=1200&s=1',
    'Konoba Batricevic Njegusi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/3b/46/3a/hanging-hams.jpg?w=1200&h=1200&s=1',
    'Konoba Batricevic Njegusi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/18/3b/43/e4/inside.jpg',
    'Konoba Batricevic Njegusi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Batricevic Njegusi'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/f8/37/7e/caption.jpg?w=1200&h=1200&s=1',
    'Restoran Ulcinj Sunset',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/19/f9/d4/caption.jpg?w=1100&h=1100&s=1',
    'Restoran Ulcinj Sunset',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/a2/8c/01/beach-restaurant.jpg?w=900&h=500&s=1',
    'Restoran Ulcinj Sunset',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Ulcinj Sunset'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/1b/06/6e/15/restaurant-oro.jpg',
    'Restaurant OrO',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/cb/c8/43/caption.jpg?w=1100&h=1100&s=1',
    'Restaurant OrO',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
    NOW()),
(
    'https://restaurantoro.me/wp-content/uploads/2024/09/Restaurant-Oro-O-nama-slika.webp',
    'Restaurant OrO',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restaurant OrO'),
    NOW()),
(
    'https://www.sto.com/media/images/references/hotel_regent_montenegro/Hotel-Regent--46602-2400-1600_1200.webp',
    'Regent Porto Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
    NOW()),
(
    'https://pierretravel.rs/media/sys/accomodation/image/52517.jpeg',
    'Regent Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
    NOW()),
(
    'https://pierretravel.rs/media/sys/accomodation/image/52523.jpeg',
    'Regent Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Regent Porto Montenegro'),
    NOW()),
(
    'https://montenegrostars.com/templates/yootheme/cache/d8/4-d8292314.jpeg',
    'Hotel Splendid Conference & Spa Resort',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
    NOW()),
(
    'https://mcdn.pro/data/objects/images/28628/splendid-23-asj1va-l-v3airh.jpg',
    'Hotel Splendid Conference & Spa Resort',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
    NOW()),
(
    'https://splendidspa-montenegro.com/templates/yootheme/cache/f6/3-f6177fdc.jpeg',
    'Hotel Splendid Conference & Spa Resort',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Splendid Conference & Spa Resort'),
    NOW()),
(
    'https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2023/08/10/0922/TIVRK-P0218-Beachfront.jpg/TIVRK-P0218-Beachfront.4x3.jpg',
    'Hyatt Regency Kotor Bay Resort',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
    NOW()),
(
    'https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2023/11/01/0624/TIVRK-P0731-Lighthouse-Restaurant-Terrace-Banquet.jpg/TIVRK-P0731-Lighthouse-Restaurant-Terrace-Banquet.16x9.jpg?imwidth=1920',
    'Hyatt Regency Kotor Bay Resort',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
    NOW()),
(
    'https://www.yachtscroatia.com/var/site/storage/images/_aliases/i1920/6/2/5/0/110526-20-eng-GB/3486df69a1bb-Hyatt-Regency-Montenegro-desktop-00.jpg.webp',
    'Hyatt Regency Kotor Bay Resort',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hyatt Regency Kotor Bay Resort'),
    NOW()),
(
    'https://www.palmonbayspa.com/upload/home_pic.jpg',
    'Hotel Palmon Bay',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
    NOW()),
(
    'https://www.palmonbayspa.com/upload/hello-lightbulb-295376-unsplash.jpg',
    'Hotel Palmon Bay',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
    NOW()),
(
    'https://media.jet2.com/is/image/jet2/TIV_81125_Palmon_Bay_Hotel_And_Spa_0919_02?wid=3840&qlt=85&dpr=off',
    'Hotel Palmon Bay',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palmon Bay'),
    NOW()),
(
    'https://cdn.prod.website-files.com/628ba2ca6ae2f8e75697f7e4/63ac5a4eeb96a70ffead357d_Lazure_AboutUs_1.webp',
    'Lazure Hotel & Marina',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
    NOW()),
(
    'https://cdn.prod.website-files.com/628ba2ca6ae2f8e75697f7e4/669e54b3429033261caefcf7_Lazure%20Hotel%20Beach%20and%20Pool_2.webp',
    'Lazure Hotel & Marina',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
    NOW()),
(
    'https://cdn.prod.website-files.com/628ba2ca6ae2f8e75697f7e4/669666f5cca21c6f3b42db11_Lazure%20Hotel%20Beach%20and%20Pool_10.webp',
    'Lazure Hotel & Marina',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lazure Hotel & Marina'),
    NOW()),
(
    'https://www.hgbudvanskarivijera.com/images/hotel-palas/plaza/plaza-(24).jpg',
    'Hotel Palas',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
    NOW()),
(
    'https://mcdn.pro/data/objects/images/28364/palas-petrovac-7-jaayre-l-nh76cy.jpg',
    'Hotel Palas',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/productitem/palas-hotel-821.jpg',
    'Hotel Palas',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Palas'),
    NOW()),
(
    'https://www.thehotelguru.com/_images/a8/55/a85501df945edd9a7be06b5b7bb34261/s1654x900.jpg',
    'Hotel Forza Mare',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/160724293.jpg?k=5d21cfd98bbaa478427c01472d5c04211c7776db48523a2797b6161b365ee063&o=',
    'Hotel Forza Mare',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/160718669.jpg?k=11068f73047646554ab217912194220c0214aee6382c05d69753128bbdbd7391&o=',
    'Hotel Forza Mare',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Forza Mare'),
    NOW()),
(
    'https://static.cupid.travel/hotels/343928627.jpg',
    'Hotel Princess',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
    NOW()),
(
    'https://cdn.prod.website-files.com/620e119cf262fe407493be3b/66eae88552a351f2e0b504e8_1149.jpg',
    'Hotel Princess',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
    NOW()),
(
    'https://cdn.prod.website-files.com/620e119cf262fe407493be3b/663c7318bc0829e0a9756677_LOBBY1.jpg',
    'Hotel Princess',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Princess'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/17/60/49/33/centreville-hotel-experiences.jpg',
    'Hotel CentreVille Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
    NOW()),
(
    'https://www.anduarch.me/sites/default/files/images/03_9.jpg',
    'Hotel CentreVille Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
    NOW()),
(
    'https://www.anduarch.me/sites/default/files/images/12.jpg',
    'Hotel CentreVille Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel CentreVille Podgorica'),
    NOW()),
(
    'https://www.polarstar.me/files/images/category/2016/03/18/hotel_polar_star_1.jpg',
    'Hotel Polar Star',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
    NOW()),
(
    'https://www.polarstar.me/files/images/category/2016/03/19/polar_star_5.jpg',
    'Hotel Polar Star',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/22/04/50/f9/hotel-polar-star.jpg?w=1100&h=1100&s=1',
    'Hotel Polar Star',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Polar Star'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/745425/1hhxwnd.png',
    'Gradska kafanica Zabljak',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/745425/e68yl7.png',
    'Gradska kafanica Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
    NOW()),
(
    'https://d2kihw5e8drjh5.cloudfront.net/eyJidWNrZXQiOiJ1dGEtaW1hZ2VzIiwia2V5IjoicGxhY2VfaW1nL2k5V25YLThXUXFTYklJb3o1bXNVZ3ciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjY0MCwiaGVpZ2h0Ijo2NDAsImZpdCI6Imluc2lkZSJ9LCJyb3RhdGUiOm51bGwsInRvRm9ybWF0IjogIndlYnAifX0=',
    'Gradska kafanica Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska kafanica Zabljak'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2f/a9/69/d2/delicious-food-and-great.jpg?w=1100&h=1100&s=1',
    'Konoba Stari Grad',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/3/PAsmXBVhYOPiT5lSFvCVuZKt3KAl2sZmiB0bbY9R.jpg',
    'Konoba Stari Grad',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2f/a9/69/d7/delicious-food-and-great.jpg?w=1100&h=1100&s=1',
    'Konoba Stari Grad',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Konoba Stari Grad'),
    NOW()),
(
    'https://glovo.dhmedia.io/image/stores-glovo/stores/a49b8c02f265dba2b2a77d1a78e72e7677c53985885e1d57e9e9ee3bd9ce2812?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MTI4MCwiaGVpZ2h0IjoxMjB9fSx7IndlYnAiOnsicSI6ImxvdyJ9fV0=',
    'Kafana Markovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
    NOW()),
(
    'https://mindtrip.ai/restaurants/5e28/8b4a/cd96/ba6c/1fc9/995d/3604/f63b',
    'Kafana Markovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
    NOW()),
(
    'https://scontent.fbeg7-2.fna.fbcdn.net/v/t1.6435-9/131350056_2225937470871146_8621430501454951551_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=7b2446&_nc_ohc=XRyXQ0M3xAkQ7kNvwH-mkJR&_nc_oc=AdofnOxUdqJ-ZTaA6-8Dc46LySbC0YV85tedPBz8cSRbOSWh55aPIBpRSiPjCt1Xmmk&_nc_zt=23&_nc_ht=scontent.fbeg7-2.fna&_nc_gid=sp2WVHyCZerzOHPuVK_LhQ&oh=00_Af2rJ-xWDsuEhw8kX-UICFhNTXcEOiNYR5vuByQsCuqUog&oe=6A12D591',
    'Kafana Markovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafana Markovic'),
    NOW()),
(
    'https://i0.wp.com/maja.team/wp-content/uploads/2025/08/Planinarski-dom-Skrka.jpg?fit=1600%2C739&ssl=1',
    'Planinarski dom Skrka',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
    NOW()),
(
    'https://mindtrip.ai/attractions/160d/6a7a/9e9c/101a/4e94/9809/feb2/d9c0',
    'Planinarski dom Skrka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
    NOW()),
(
    'https://mindtrip.ai/restaurants/40ef/4b21/97b3/4d06/b02b/021d/7e32/5810',
    'Planinarski dom Skrka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Skrka'),
    NOW()),
(
    'https://img1.oastatic.com/img2/19566032/max/variant.webp',
    'Planinarski dom Vranjak',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
    NOW()),
(
    'https://vcdn.bergfex.at/images/resized/profiles/detail/10d/7b1e98f1a11c7f844d1d8b8a5a4d310d.jpg',
    'Planinarski dom Vranjak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
    NOW()),
(
    'https://scontent.fbeg7-2.fna.fbcdn.net/v/t39.30808-6/475125747_1027593859387344_943200687554655804_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=2a1932&_nc_ohc=DZj8T1r9o-wQ7kNvwF5m8RC&_nc_oc=AdoMASlvknSwIXCxsrn5r1I81iwtRxShRO-UPJX7fKM7eWIKeVpfWu3HyV1PXXyiJgE&_nc_zt=23&_nc_ht=scontent.fbeg7-2.fna&_nc_gid=7dzdTixrMYPdZ9fl9rPgBQ&oh=00_Af3OeJoPTqNpvIZ3Aj3XIrDfjL86_hOb4qZWmIN3Tqnwjw&oe=69F14462',
    'Planinarski dom Vranjak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Vranjak'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/70/Former_Italian_Embassy_in_Cetinje%2C_Montenegro.jpg',
    'Nacionalna biblioteka Crne Gore Djurdje Crnojevic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
    NOW()),
(
    'https://www.nb-cg.me/fajlovi/p1ib9hmscud4uh5g41k1cj815fd6.jpeg',
    'Nacionalna biblioteka Crne Gore Djurdje Crnojevic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
    NOW()),
(
    'https://www.czkdanilovgrad.me/wp-content/uploads/2024/05/viber_image_2024-05-16_10-34-07-345.jpg',
    'Nacionalna biblioteka Crne Gore Djurdje Crnojevic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Nacionalna biblioteka Crne Gore Djurdje Crnojevic'),
    NOW()),
(
    'https://lh3.googleusercontent.com/proxy/yKEWJ8QT7AOuJXgry43berYLICOpIMBmfhVoDtRa4ygT2chAAXHdtos8bhg2ww5dxK1aO0Ign8qzzucbZyDX1ozK1j2VUPF-yWZanu-LKlPu4MxTt4dN0TNb_fjuv8I5',
    'Narodna biblioteka Radosav Ljumovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2018/02/ed05e0e0c4febd7b2b95b70b5743b93a.jpg',
    'Narodna biblioteka Radosav Ljumovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
    NOW()),
(
    'https://mondo.me/Picture/354583/jpeg/knjige.jpeg',
    'Narodna biblioteka Radosav Ljumovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodna biblioteka Radosav Ljumovic'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/25/00/4115345_2019022512020_5c73cb0fb789683b9225368ejpeg_share.jpg',
    'Gradska biblioteka i citaonica Herceg Novi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
    NOW()),
(
    'https://www.bibliotekahercegnovi.co.me/index.php/lat/%D0%B3%D0%B0%D0%BB%D0%B5%D1%80%D0%B8%D1%98%D0%B0/130-%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0-%D0%BF%D0%B8%D1%81%D0%BC%D0%B5%D0%BD%D0%BE%D1%81%D1%82/detail/3386-%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0-%D0%BF%D0%B8%D1%81%D0%BC%D0%B5%D0%BD%D0%BE%D1%81%D1%82?phocadownload=2',
    'Gradska biblioteka i citaonica Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2015/06/Herceg-Novi.jpg',
    'Gradska biblioteka i citaonica Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska biblioteka i citaonica Herceg Novi'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Ostrog_monastery_-_panoramio.jpg/960px-Ostrog_monastery_-_panoramio.jpg',
    'Manastir Ostrog',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2025/08/manastirostrog-2.webp',
    'Manastir Ostrog',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
    NOW()),
(
    'https://religija.republika.rs/data/images/2024-06-19/31605_profimedia-0514288768-1_fxl.jpg',
    'Manastir Ostrog',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Ostrog'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/20/Cathedral_Kotor.JPG',
    'Katedrala Svetog Tripuna',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2016/01/Katedrala-Svetog-Tripuna.jpg',
    'Katedrala Svetog Tripuna',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2014/12/Katedrala-Svetog-Tripuna1.jpg',
    'Katedrala Svetog Tripuna',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Katedrala Svetog Tripuna'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/4/42/Church_of_St._Nicholas%2C_Kotor%2C_Montenegro_%2852632091089%29.jpg',
    'Crkva Svetog Nikole',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2015/01/DSC_8706_resize.jpg',
    'Crkva Svetog Nikole',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
    NOW()),
(
    'https://www.orthphoto.net/photo/202511/149734.jpg',
    'Crkva Svetog Nikole',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/2d/Pravoslavna_katedrala_svetog_Ivana_Vladimira_u_Baru.jpeg',
    'Crkva Svetog Jovana Vladimira',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
    NOW()),
(
    'https://www.svetijovanvladimir.rs/wp-content/uploads/2024/02/IMG-20240204-WA0024.jpg',
    'Crkva Svetog Jovana Vladimira',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
    NOW()),
(
    'https://tumagazin.rs/wp-content/uploads/2021/02/oltar-i-apsida.jpg',
    'Crkva Svetog Jovana Vladimira',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Jovana Vladimira'),
    NOW()),
(
    'https://www.rentalino.com/uploads/8D7EF73D-8A1E-4F0B-9E9C-B375E158CB16_1.jpeg',
    'Apartments Djurovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
    NOW()),
(
    'https://crnagoraapartmani.me/wp-content/uploads/2022/05/6B428420-417E-43D9-9286-2230E89695B4_1.jpeg',
    'Apartments Djurovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
    NOW()),
(
    'https://www.viladjuricpetrovac.me/wp-content/uploads/2024/02/petrovac_2023_2-1.jpg',
    'Apartments Djurovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Djurovic'),
    NOW()),
(
    'https://images.trvl-media.com/lodging/24000000/23570000/23568200/23568189/3db2c668.jpg?impolicy=fcrop&w=1200&h=800&quality=medium',
    'Apartments Vukovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
    NOW()),
(
    'https://www.turizzam.com/upload/objects/1427306960_InCQyB/DSC00106.JPG',
    'Apartments Vukovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
    NOW()),
(
    'https://www.turizzam.com/upload/objects/1427306960_InCQyB/DSC00188_resize.JPG',
    'Apartments Vukovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Vukovic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/448886275.jpg?k=b4e8ec5ae4506773f6214c0b37422b85a3c0a15d98d4659bf0abccea7a3202c6&o=',
    'Lux Apartment Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/448886323.jpg?k=d9e965d8d2c52fc67e79f8ae6610bb5f20f769dd0a3887482396a18c28566628&o=',
    'Lux Apartment Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
    NOW()),
(
    'https://www.hotels-me.net/data/Photos/OriginalPhoto/13764/1376425/1376425880/lux-apartment-budva-budva-photo-11.JPEG',
    'Lux Apartment Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lux Apartment Budva'),
    NOW()),
(
    'https://cdn.worldota.net/t/1200x616/content/3a/fe/3afef9c94f03ba9f85c44e8e4b3a7bdd61ef114b.jpeg',
    'Apartmani M Herceg Novi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
    NOW()),
(
    'https://lbcdn.airpaz.com/hotelimages/5517959/apartman-m-igalo-60205935f03e038f2bb36c11cf56b867.jpg',
    'Apartmani M Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/554471434.jpg?k=11547c7479ebdca5eea8170e1e8ec4c383f040a307a08f2172c86d3f15e2cdf8&o=',
    'Apartmani M Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartmani M Herceg Novi'),
    NOW()),
(
    'https://bynder.onthebeach.co.uk/cdn-cgi/image/width=1400,quality=80,fit=cover,format=auto/m/36a0226153b0f64d/original/Hotel-Casa-del-Mare-Amfora-Montenegro-KOTOR-General-view-8.jpg',
    'Boutique Hotel Casa del Mare - Amfora',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/productitem/a869211d-370.jpg',
    'Boutique Hotel Casa del Mare - Amfora',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/productitem/79e9b011-940.jpg',
    'Boutique Hotel Casa del Mare - Amfora',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Boutique Hotel Casa del Mare - Amfora'),
    NOW()),
(
    'https://cdn.worldota.net/t/1200x616/content/a2/c8/a2c8b0b910c933f89adb5949662156cbaf33693e.jpeg',
    'Apartments Mijovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/209630322.jpg?k=fa8338c75f30184cbe50d55852d402067ce988dd8a3e050348bf4c23b0589d6d&o=',
    'Apartments Mijovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/209639468.jpg?k=e359adff7fd69f5afe224a07054800b49bc48ae021152b1d7d465ec1455decba&o=',
    'Apartments Mijovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Mijovic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/382636212.jpg?k=7256a6565339155e4e015fb94f406d1f28c58b63a648b28bd0090e36ebc8762d&o=',
    'Durmitor View Apartments',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/504628046.jpg?k=64c6540e7457f487783195825d9f11aa98de8ffb1fe7315b3307668c666f15df&o=',
    'Durmitor View Apartments',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
    NOW()),
(
    'https://static.cupid.travel/hotels/485140447.jpg',
    'Durmitor View Apartments',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Durmitor View Apartments'),
    NOW()),
(
    'https://i.szalas.hu/hotels/755448/original/41000719.jpg',
    'Apartments Aleksandar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
    NOW()),
(
    'https://www.hotels-me.net/data/Imgs/OriginalPhoto/16542/1654294/1654294378/apartman-aleksandar-ulcinj-img-26.JPEG',
    'Apartments Aleksandar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
    NOW()),
(
    'https://lbcdn.airpaz.com/hotelimages/4661551/ulcinj-apartment-seaview-wifi-tv-aircondition-kitchen-1cf3be5e8e25e7b837382af924fc6250.jpg',
    'Apartments Aleksandar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Apartments Aleksandar'),
    NOW()),
(
    'https://www.ljubanovic.com/uploads/5eb3fb1ca4a62.jpg',
    'Villa Ljubanovic Apartments',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
    NOW()),
(
    'https://www.ljubanovic.com/uploads/5eb40199023fa.jpg',
    'Villa Ljubanovic Apartments',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
    NOW()),
(
    'https://www.ljubanovic.com/uploads/6409e33eca94a.jpg',
    'Villa Ljubanovic Apartments',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic Apartments'),
    NOW()),
(
    'https://aw-d.tripcdn.com/images/0225812000kwqkap3C7DB.jpg',
    'Casa Nuova',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/17cb31db-75a4-409f-afab-853aa31f3fc1.jpg',
    'Casa Nuova',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
    NOW()),
(
    'https://lh3.googleusercontent.com/p/AF1QipN9Q8Lf62zuaVRNKnNyuhoQojY5-UG6VeroWDek=w1400-h920-k-no',
    'Casa Nuova',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa Nuova'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0d/81/b3/82/swimming-pool-banya-wellness.jpg?w=1200&h=-1&s=1',
    'Banya Wellness & Spa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/u9/hilton.jpg',
    'Banya Wellness & Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/27/3c/c2/08/wellnwss-spa.jpg?w=1200&h=-1&s=1',
    'Banya Wellness & Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Banya Wellness & Spa'),
    NOW()),
(
    'https://www.atlantic.travel/sites/default/files/styles/colorbox_images/public/Slike%20hotela/hotel_mediteranski_centar_igalo_letovanje_atlantic_travel_11.jpg?itok=knqEq2kO',
    'Wellness Center Simo Milosevic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
    NOW()),
(
    'https://www.montenegro.travel/uploads/content/2_explore/3i.Institute-Simo-Milosevic-Igalo.webp',
    'Wellness Center Simo Milosevic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
    NOW()),
(
    'https://www.atlantic.travel/sites/default/files/styles/colorbox_images/public/Slike%20hotela/hotel_mediteranski_centar_igalo_letovanje_atlantic_travel_4.jpg?itok=gphMEL9A',
    'Wellness Center Simo Milosevic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Wellness Center Simo Milosevic'),
    NOW()),
(
    'https://perla.me/public_content/images_media/h_images/1165.jpg',
    'Perla Residence Spa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
    NOW()),
(
    'https://perla.me/public_content/images_media/h_images/1230.jpg',
    'Perla Residence Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
    NOW()),
(
    'https://perla.me/public_content/images_media/h_images/1168.jpg',
    'Perla Residence Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Perla Residence Spa'),
    NOW()),
(
    'https://www.hotels-me.net/data/Photos/OriginalPhoto/16865/1686516/1686516537/photo-huma-kotor-bay-hotel-and-villas-kotor-1.JPEG',
    'Huma Bay Spa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
    NOW()),
(
    'https://www.humahotel.me/wp-content/uploads/2021/06/SHANTI-SPA_05.jpg',
    'Huma Bay Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/huma-kotor-bay/slider/huma-kotor-bay-618753.jpg',
    'Huma Bay Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Huma Bay Spa'),
    NOW()),
(
    'https://bynder.onthebeach.co.uk/cdn-cgi/image/width=1400,quality=80,fit=cover,format=auto/m/1fb903a7ee3c7f5/original/Boutique-Hotel-SPA-Casa-del-Mare-Mediterraneo-Montenegro-MONTENEGRO-General-view-5.jpg',
    'Casa del Mare Spa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
    NOW()),
(
    'https://casadelmare.me/img/wellness-casa-del-mare-mediterraneo-16.jpg',
    'Casa del Mare Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
    NOW()),
(
    'https://media.joinup.travel/storage/hotel/50106/photos/Casa-Del-Mare-La-Roche-Mne-19.jpg',
    'Casa del Mare Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casa del Mare Spa'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/TWE_3481-scaled.jpg',
    'Spomenik Partizanu borcu na Gorici',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
    NOW()),
(
    'https://live.staticflickr.com/65535/54993977246_9d783e700c_h.jpg',
    'Spomenik Partizanu borcu na Gorici',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
    NOW()),
(
    'https://www.antenam.net/uploads/f/0/0/f006d8de31d87443dcef4d45addd5fd6.JPG',
    'Spomenik Partizanu borcu na Gorici',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Partizanu borcu na Gorici'),
    NOW()),
(
    'https://c.files.bbci.co.uk/13E4/production/_125329050_img_7260.jpg',
    'Spomenik Vladimiru i Kosari',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
    NOW()),
(
    'https://gdb.rferl.org/035c0000-0aff-0242-8cef-08da1ee162f9_cx0_cy2_cw0_w1080_h608.jpg',
    'Spomenik Vladimiru i Kosari',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2022/04/277968852_1482947772101290_2413669999739147690_n-1-1200x555.jpg',
    'Spomenik Vladimiru i Kosari',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Vladimiru i Kosari'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/kralj_nikola-05-20-1.jpg',
    'Spomenik kralju Nikoli',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/c/c4/Spomenik_kralju_Nikoli_u_Podgorici.jpg',
    'Spomenik kralju Nikoli',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
    NOW()),
(
    'https://podgoricacars.com/images/podgorica-king-nikola-monument-podgorica.webp',
    'Spomenik kralju Nikoli',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik kralju Nikoli'),
    NOW()),
(
    'https://borba.me/wp-content/uploads/2021/11/Ljubo-Cupic-spomenik-1.jpg',
    'Spomenik Ljubu Cupicu',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/01/30/00/378174_20190130060116_5c513370b7896801fa611150jpeg_ff.jpg',
    'Spomenik Ljubu Cupicu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
    NOW()),
(
    'https://rtcg.me/upload//media/2024/6/13/10/9/907/1795332/thumbs/3415224/thumb0.jpg',
    'Spomenik Ljubu Cupicu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Ljubu Cupicu'),
    NOW()),
(
    'https://onogost.me/wp-content/uploads/2020/07/107386482_3629926013688663_821234783065601292_n.jpg',
    'Spomenik palim borcima na Grahovcu',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/05/09/13/5644158_viber-image-20250509-130542481_ff.jpg',
    'Spomenik palim borcima na Grahovcu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
    NOW()),
(
    'https://mladiniksica.me/wp-content/uploads/2020/07/grahovac.jpg',
    'Spomenik palim borcima na Grahovcu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik palim borcima na Grahovcu'),
    NOW()),
(
    'https://immo-monte.me/wp-content/uploads/2022/12/Immo-Monte_Spomenik_360-3-scaled.jpg',
    'Spomenik Tudjemilima',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
    NOW()),
(
    'https://feral.bar/posts/feral-bar-1759856681_IMG_4510.jpeg',
    'Spomenik Tudjemilima',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
    NOW()),
(
    'https://prch.me/wp-content/uploads/2023/03/image00023-768x1024.jpeg',
    'Spomenik Tudjemilima',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Tudjemilima'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/04/00/1203410_2019020414024_5c5838a8b7896801fb67f4d5jpeg_share.jpg',
    'Spomenik Punisi Racicu',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
    NOW()),
(
    'https://www.in4s.net/wp-content/uploads/2017/07/punisa-racic.jpg',
    'Spomenik Punisi Racicu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
    NOW()),
(
    'https://www.politika.rs/thumbs//upload/Article/Image/2017_07///906z513_spomenik-punisa-racic-rtcg.jpg',
    'Spomenik Punisi Racicu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Punisi Racicu'),
    NOW()),
(
    'https://rtcg.me/upload//media/2022/10/25/20/55/623/1249616/resize/1249617/1212_1125x900',
    'Spomenik herojima Bozicnog ustanka',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/01/06/00/4917393_2020010612010_f25e15c4313c648c1f1017be66f7dbaad176d8170c64d64a9877d21fe6370a77_share.jpg',
    'Spomenik herojima Bozicnog ustanka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2021/01/prijestonica_polaganje-vijenaca_5.jpg',
    'Spomenik herojima Bozicnog ustanka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik herojima Bozicnog ustanka'),
    NOW()),
(
    'https://24kroz7.com/stav/crnom-gorom-uzduz-i-poprijeko-panoramski-put-krug-oko-korita/attachment/9-18/',
    'Spomenik bici na Fundini',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
    NOW()),
(
    'https://rtcg.me/upload//media/2025/7/2/9/26/194/2216041/resize/2216044/viber_slika_2025-08-02_09-12-01-390-641x1024_1437x900',
    'Spomenik bici na Fundini',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
    NOW()),
(
    'https://cdn-processed.tmatic.travel/0bb6654d-5c90-4825-b927-a6eaece8e632.jpg',
    'Spomenik bici na Fundini',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik bici na Fundini'),
    NOW()),
(
    'https://gdb.rferl.org/034d0000-0aff-0242-1ccb-08dad5f22e02_cx0_cy1_cw0_w1080_r0_s.jpg',
    'Spomenik Njegosu na Lovcenu',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/1/18/Lovcen.jpg',
    'Spomenik Njegosu na Lovcenu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
    NOW()),
(
    'https://cdns.russiatoday.com/srbmedia/images/2024.10/original/6707de14e1947654b80885af.jpg',
    'Spomenik Njegosu na Lovcenu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spomenik Njegosu na Lovcenu'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/p1dr50spf6199eq21qprr1maco4.jpg',
    'Top Hill Club',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
    NOW()),
(
    'https://nikola.its.me/wp-content/uploads/2019/02/20150716_173832.jpg',
    'Top Hill Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/03/16/18/5398030_top-hil1_share.jpg',
    'Top Hill Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Top Hill Club'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/0b/80/d6/caption.jpg?w=1100&h=1100&s=1',
    'Emporio Club',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0c/d2/41/43/photo0jpg.jpg?w=1200&h=1200&s=1',
    'Emporio Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/692129/1hcmty2.png',
    'Emporio Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Emporio Club'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/05/80073243_10157797012054812_6306868262508429312_n.jpg',
    'Maximus Club Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/11/00/2205621_20190211070240_5c611944b789684e9fedffebjpeg_share.jpg',
    'Maximus Club Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/11/00/2207825_2019021108020_5c611dedb789684e9fee178cjpeg_share.jpg',
    'Maximus Club Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Maximus Club Kotor'),
    NOW()),
(
    'https://users.minmedia.me/media/p1cipovr8ukogln0f66ptd3o7a.jpg',
    'Omnia Nightclub',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
    NOW()),
(
    'https://users.minmedia.me/media/p1cipovr92121q12c3dnp10fo84ig.jpg',
    'Omnia Nightclub',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
    NOW()),
(
    'https://budvanocu.gumlet.io/p1j15f470019ifvb51pn4128i97e10.jpg?width=1200',
    'Omnia Nightclub',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Omnia Nightclub'),
    NOW()),
(
    'https://grazia.hr/wp-content/uploads/2022/06/Diamond-Club-cover.jpg',
    'Diamond Night Club',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/292314671_413964377418770_2368314707489563238_n.jpg',
    'Diamond Night Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
    NOW()),
(
    'https://img.restaurantguru.com/r93c-Diamond-interior-2021-09-8.jpg',
    'Diamond Night Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Diamond Night Club'),
    NOW()),
(
    'https://users.minmedia.me/media/p1cj0qc8v9ibeo4l1gc619jhbqr4.jpg',
    'Miami Club Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
    NOW()),
(
    'https://www.girlabouttheglobe.com/wp-content/uploads/DSC02606.jpg',
    'Miami Club Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/place/miami_club_budva_nochnoy_klub_miami_v_budve.jpg?itok=kdItKER3',
    'Miami Club Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Miami Club Budva'),
    NOW()),
(
    'https://www.madamamsterdam.nl/wp-content/uploads/2024/06/bg-skybar-scaled.jpg',
    'Madam Open Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHukJXF7MY3klo5pF7f2jkG5aJoxZHwndimw&s',
    'Madam Open Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
    NOW()),
(
    'https://travelinamsterdam.com/wp-content/uploads/2023/03/Madam-skybar-Amsterdam.jpg',
    'Madam Open Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Madam Open Bar'),
    NOW()),
(
    'https://hercegplanet.com/wp-content/uploads/2022/09/IMG-20210906-WA0021-1.jpg',
    'Beach club Raffaelo',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
    NOW()),
(
    'https://hercegplanet.com/wp-content/uploads/2022/09/IMG-20210906-WA0031-1.jpg',
    'Beach club Raffaelo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
    NOW()),
(
    'https://hercegplanet.com/wp-content/uploads/2022/09/IMG-20210906-WA0022-1.jpg',
    'Beach club Raffaelo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beach club Raffaelo'),
    NOW()),
(
    'https://caffemontenegro.me/images/restorani_i_kafici/montenegro_pub/7_copy.jpg',
    'Montenegro Pub',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
    NOW()),
(
    'https://caffemontenegro.me/images/restorani_i_kafici/montenegro_pub/4_copy.jpg',
    'Montenegro Pub',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/montenegro-pub/large/montenegro-pub-469651.jpg',
    'Montenegro Pub',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Montenegro Pub'),
    NOW()),
(
    'https://users.minmedia.me/media/p1h1ei37qr1jj7tdovu8h791bq8i.jpg',
    'Night Club Ambiente',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
    NOW()),
(
    'https://users.minmedia.me/media/p1h1ei37qr1vg1jei7a2pbo1urch.jpg',
    'Night Club Ambiente',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
    NOW()),
(
    'https://users.minmedia.me/media/p1h1ei37qs11uhldm46a1cu51vodv.jpg',
    'Night Club Ambiente',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Night Club Ambiente'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/03/29/21/5312725_jugopetrol-2_ff.jpg',
    'EKO Pumpa Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
    NOW()),
(
    'https://photos.wikimapia.org/p/00/02/68/00/68_big.jpg',
    'EKO Pumpa Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/03/29/21/5312727_jugopetrol-1_ff.jpg',
    'EKO Pumpa Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Pumpa Budva'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2018/06/85F3E958-71C9-435A-8134-874144DC980A.gif',
    'Petrol Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/03/02/00/5026241_20200302070332_be98e0c53041cb82d727b6d433d0dbb0875d477fb1aebb9088b93a3d8788568f_share.jpg',
    'Petrol Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2018/12/F6CCA876-399A-4EEE-9B98-F073145723EE.jpeg',
    'Petrol Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Podgorica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/10/24/08/5680549_10040620-ispitivanje-goriva-institut_ls.jpg',
    'Lukoil Konik Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
    NOW()),
(
    'https://lacollina.me/wp-content/uploads/lukOil.jpg',
    'Lukoil Konik Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2025/10/194117930_2972928092978733_351637732346719376_n-1-1024x678.jpg',
    'Lukoil Konik Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Konik Podgorica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/19/00/3497061_20190219230216_5c6c80c1b789684e9f15dbcdjpeg_ls.jpg',
    'INA Skaljari Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/ina_pumpa_300713_tw1024.jpg',
    'INA Skaljari Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2016/12/INA-2-768x568.jpg',
    'INA Skaljari Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'INA Skaljari Kotor'),
    NOW()),
(
    'https://radiotivat.com/wp-content/uploads/2021/11/maxresdefault-2-1280x720.jpg',
    'EKO Tivat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
    NOW()),
(
    'https://ibt.co.me/wp-content/uploads/2018/06/eko1-1170x780.jpg',
    'EKO Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2020/03/eko-pumpa-1-1024x768.jpg',
    'EKO Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Tivat'),
    NOW()),
(
    'https://kalamper.com/wp-content/uploads/IMG_9854-scaled.jpg',
    'Petrol Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
    NOW()),
(
    'https://kalamper.com/wp-content/uploads/0527-scaled.jpg',
    'Petrol Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
    NOW()),
(
    'https://kalamper.com/wp-content/uploads/1643276004-IMG_3604-min-scaled.jpg',
    'Petrol Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Petrol Bar'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/10/24/08/5680549_10040620-ispitivanje-goriva-institut_share.jpg',
    'Lukoil Kolasin',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/benzinska_pumpa_100222_tw1024.jpg',
    'Lukoil Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
    NOW()),
(
    'https://www.b92.net/data/images/2025-10-30/182700_4947385_f.jpg',
    'Lukoil Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lukoil Kolasin'),
    NOW()),
(
    'https://www.ekapija.com/thumbs169/eko_pumpa_igalo_heceg_novi_071224_tw1024.jpg',
    'Eko Igalo Banja',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
    NOW()),
(
    'https://komunalnostambeno.me/wp-content/uploads/2017/08/skver-igalo-5-1024x768.jpg',
    'Eko Igalo Banja',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/03/29/21/5312725_jugopetrol-2_ff.jpg',
    'Eko Igalo Banja',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Eko Igalo Banja'),
    NOW()),
(
    'https://www.ekapija.com/thumbs169/pumpa_eko_skaljari_kotor_121224_tw1024.jpg',
    'EKO Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
    NOW()),
(
    'https://bates.eu.com/wp-content/uploads/2014/06/Helenic-Petroleum_EKO-FS-2.jpg',
    'EKO Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/23/00/3884762_20190223030216_5c70ad77b789683b911908a2jpeg_share.jpg',
    'EKO Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Kotor'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/04/12/08/5403961_lapcici-hd_share.jpg',
    'EKO Zabljak',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2026/04/04/08/5717493_benzinska-pumpa-gorivo-15_share.jpg',
    'EKO Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2026/03/18/22/5713801_benzinska-pumpa-gorivo-47_share.jpg',
    'EKO Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'EKO Zabljak'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/19/1a/f0/b8/photo0jpg.jpg',
    'Casper Bar Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/01/d6/67/caption.jpg?w=1100&h=1100&s=1',
    'Casper Bar Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
    NOW()),
(
    'https://images.happycow.net/venues/1024/18/21/hcmp182190_1152109.jpeg',
    'Casper Bar Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Casper Bar Budva'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/place/beach_bar_azzuro_plyazhnyy_bar_azzuro_v_budve.jpg?itok=fIWAZAb6',
    'Azzuro Beach',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2a/26/7a/45/caption.jpg?w=1200&h=1200&s=1',
    'Azzuro Beach',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
    NOW()),
(
    'https://www.portoazzuro.gr/images/main-gallery/19.jpg',
    'Azzuro Beach',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Azzuro Beach'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/ef/71/be/caption.jpg?w=1100&h=1100&s=1',
    'Kafic Marshall’s Gelato & Coffee',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/6a/8e/86/caption.jpg?w=1100&h=1100&s=1',
    'Kafic Marshall’s Gelato & Coffee',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/ef/71/bf/caption.jpg?w=1100&h=1100&s=1',
    'Kafic Marshall’s Gelato & Coffee',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kafic Marshall’s Gelato & Coffee'),
    NOW()),
(
    'https://media.evendo.com/locations-resized/LandmarkImages/1920x466/a2276aad-03fe-49ff-b5f0-52cfc1d09c33',
    'Karver Bookstore & Cafe Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
    NOW()),
(
    'https://airial.travel/_next/image?url=https%3A%2F%2Fmedia-cdn.tripadvisor.com%2Fmedia%2Fphoto-w%2F23%2F3b%2Ff1%2Fc5%2Fsecond-floor.jpg&w=3840&q=75',
    'Karver Bookstore & Cafe Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
    NOW()),
(
    'https://substackcdn.com/image/fetch/$s_!VTc3!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F6640df02-763d-42ec-b191-fa9b44560e38_4080x3072.jpeg',
    'Karver Bookstore & Cafe Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Karver Bookstore & Cafe Podgorica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/6/62/Restoran_Dojmi_01.jpg',
    'Dojmi Cafe Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2a/69/78/15/caption.jpg?w=1100&h=1100&s=1',
    'Dojmi Cafe Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/301349/1gb0grv.png',
    'Dojmi Cafe Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dojmi Cafe Kotor'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/24/DgaWv0DRTYnApBxrA9rxwsKb4o3OTyK3ztPB6oQq.jpg',
    'Citadela Cafe Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/24/Zk7YdRJPhPzQl7GeDseLY1cisUoUYwvfUjy56hJT.jpg',
    'Citadela Cafe Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/24/wl2xMqw93vHiG4zg87r72SLmMarvEWf1ODaiUWy6.jpg',
    'Citadela Cafe Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Citadela Cafe Kotor'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/19/f1/d8/be/welcome-to-the-al-posto.jpg',
    'Al Posto Giusto Tivat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/507/aFN6bzh9op5Ttb5KqmfOlyoVDzTPlLNIROZY7t7k.jpeg',
    'Al Posto Giusto Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5CNzLv4FtIW1hCzk0n6BV48I3fQg0j6DXCQ&s',
    'Al Posto Giusto Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Al Posto Giusto Tivat'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/3e/d3/6f/caption.jpg?w=1100&h=1100&s=1',
    'Astoria Cafe Lustica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2b/67/11/40/caption.jpg?w=1200&h=1200&s=1',
    'Astoria Cafe Lustica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
    NOW()),
(
    'https://traveldrinkdine.com/europe/a-unique-stay-at-hotel-astoria-in-kotor/attachment/19737947919_f9d05fdd5b_o/',
    'Astoria Cafe Lustica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Astoria Cafe Lustica'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQitI7jmXWhXI9BjwB1FTj1hQdZhKq8hxf64g&s',
    'HEIST Bar Ulcinj',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
    NOW()),
(
    'https://media.evendo.com/locations-resized/BarImages/360x263/bb2f4aa1-4c04-49fc-a21d-a93f63f303f9',
    'HEIST Bar Ulcinj',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/05/287971475_570707484664331_4376306791416374200_n.jpg',
    'HEIST Bar Ulcinj',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HEIST Bar Ulcinj'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/57/69/6b/caption.jpg?w=1200&h=1200&s=1',
    'Grand Central Cetinje',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/5c/d8/09/caption.jpg?w=1200&h=1200&s=1',
    'Grand Central Cetinje',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/5b/2e/f1/caption.jpg?w=700&h=700&s=1',
    'Grand Central Cetinje',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Grand Central Cetinje'),
    NOW()),
(
    'https://users.minmedia.me/media/p1dr8knd5o16f115fr5pk1p0k7bm6.jpg',
    'Beer & Bike Club',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/2f/8f/e7/6a/caption.jpg',
    'Beer & Bike Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/31/07/51/c4/caption.jpg?w=900&h=500&s=1',
    'Beer & Bike Club',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Beer & Bike Club'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/b8/90/8a/caption.jpg?w=1100&h=1100&s=1',
    'The Clubhouse Porto Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/the-clubhouse-porto-montenegro/large/the-clubhouse-porto-montenegro-472056.jpg',
    'The Clubhouse Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/5f/85/64/outdoor-seating.jpg?w=1200&h=1200&s=1',
    'The Clubhouse Porto Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Clubhouse Porto Montenegro'),
    NOW()),
(
    'https://image-tc.galaxy.tf/wijpeg-a14cy3mhsj1y1s38nranesi0a/hb-rooftop-bar-dusk-1920x1080.jpg?width=1920',
    'Havana Beach Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
    NOW()),
(
    'https://image-tc.galaxy.tf/wijpeg-19i5769gq7xr0c933i2dv6f4x/hb-rootop-bar-evening-1920x1080.jpg?width=1920',
    'Havana Beach Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
    NOW()),
(
    'https://image-tc.galaxy.tf/wijpeg-ap7zt8j248q3gahwdywtpfrrf/hb-rooftopppl-1920x1080.jpg?width=1920',
    'Havana Beach Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Havana Beach Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2a/8f/8c/ef/caption.jpg?w=1100&h=1100&s=1',
    'Evergreen Jazz Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/391965/1i452a2.png',
    'Evergreen Jazz Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/74/21/47/caption.jpg?w=1200&h=1200&s=1',
    'Evergreen Jazz Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Evergreen Jazz Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/1a/c2/c2/caption.jpg?w=1200&h=1200&s=1',
    'Itaka Library Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/7a/ca/fd/caption.jpg?w=1100&h=1100&s=1',
    'Itaka Library Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/1a/c2/c3/caption.jpg?w=1100&h=1100&s=1',
    'Itaka Library Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Itaka Library Bar'),
    NOW()),
(
    'https://mindtrip.ai/cdn-cgi/image/format=webp,w=1200/https://tcdn.mindtrip.ai/images/798363/1rq4szz.png',
    'Blue Cat Art Cafe',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/747083/1n9kw5.png',
    'Blue Cat Art Cafe',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
    NOW()),
(
    'https://tcdn.mindtrip.ai/images/394367/c11xpk.png',
    'Blue Cat Art Cafe',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Blue Cat Art Cafe'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/20/3MS5CmzbG6fJ3ajX2oo0LUWEn7PeN1UgFLbfjiFs.jpg',
    'Old Town Pub Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/e4/5f/1f/caption.jpg?w=1200&h=1200&s=1',
    'Old Town Pub Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
    NOW()),
(
    'https://images.squarespace-cdn.com/content/v1/596e2b8a1b631b9f6334825a/1567726475894-NY4O946RKJ0JDC2P45B1/image-asset.jpeg',
    'Old Town Pub Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Old Town Pub Kotor'),
    NOW()),
(
    'https://budvanocu.gumlet.io/p1fu6eam1n1h3s1rk1pkj1c735pf7.png?width=1200',
    'Medusa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
    NOW()),
(
    'https://users.minmedia.me/media/p1fu6eam1o13bf8i19t794i1u9cd.png',
    'Medusa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
    NOW()),
(
    'https://budvanocu.gumlet.io/p1fu6eam1njn01ubo5u11rlmn19.png?width=1200',
    'Medusa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Medusa'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/b5/b3/b3/caption.jpg?w=1000&h=1000&s=1',
    'Strix Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
    NOW()),
(
    'https://media.timeout.com/images/105495655/image.jpg',
    'Strix Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/2f/b7/21/caption.jpg?w=1200&h=1200&s=1',
    'Strix Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Strix Bar'),
    NOW()),
(
    'https://cafe.hardrock.com/podgorica/files/5470/9990250_ImageLargeWidth.jpg',
    'Hard Rock Cafe Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2022/07/HRC_Podgorica_Exterior_Night_2056.jpeg',
    'Hard Rock Cafe Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
    NOW()),
(
    'https://pbs.twimg.com/media/FycgdAQWYAAlciD.jpg',
    'Hard Rock Cafe Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hard Rock Cafe Podgorica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/2c/Vladin_Dom_%28Dom_Rz%C4%85dowy%29_w_Cetinje_01.jpg',
    'Narodni muzej Crne Gore',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
    NOW()),
(
    'https://www.cdm.me/wp-content/uploads/2019/08/Umjetnicki-muzej.jpg',
    'Narodni muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
    NOW()),
(
    'https://pbs.twimg.com/media/F0_YVrvX0AAMxUl.jpg',
    'Narodni muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Narodni muzej Crne Gore'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/f/fe/Kotor_-_Pomorski_muzej.jpg',
    'Pomorski muzej Crne Gore',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/29594/pomorski-muzej-4.jpg',
    'Pomorski muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2017/03/DSC_1024_resize.jpg',
    'Pomorski muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pomorski muzej Crne Gore'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2020/03/fo-1280x728.jpg',
    'Muzej kralja Nikole',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/1-1-1-1.jpg',
    'Muzej kralja Nikole',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
    NOW()),
(
    'https://narodnimuzej.me/wp-content/uploads/2021/01/Dvor-kralja-Nikole-slicica.jpg',
    'Muzej kralja Nikole',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej kralja Nikole'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/A11A9034-1-scaled.jpg',
    'Prirodnjacki muzej Crne Gore',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
    NOW()),
(
    'https://pmcg.co.me/wp-content/uploads/2023/04/NOVA1.png',
    'Prirodnjacki muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
    NOW()),
(
    'https://podgorica.travel/wp-content/uploads/2024/04/A11A9032-scaled.jpg',
    'Prirodnjacki muzej Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Prirodnjacki muzej Crne Gore'),
    NOW()),
(
    'https://muzejikotor.me/wp-content/uploads/2023/05/IMG_5692-1-scaled.jpg',
    'Muzej grada Perasta',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2014/11/Perast-muzej_resize.jpg',
    'Muzej grada Perasta',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2026/03/01/16/5709363_muzej-perast128_share.jpg',
    'Muzej grada Perasta',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Muzej grada Perasta'),
    NOW()),
(
    'https://www.big-cee.com/wp-content/uploads/2022/10/big-podgorica-featured.webp',
    'Big Fesn Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
    NOW()),
(
    'https://montenegro.org/wp-content/uploads/2023/05/312048262_790846772025647_8199514003964736491_n.jpg',
    'Big Fesn Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
    NOW()),
(
    'https://www.novineniksica.me/wp-content/uploads/2022/09/BIG_night.jpg',
    'Big Fesn Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Big Fesn Podgorica'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/8/86/Podgorica_Mall_of_Montenegro_and_Ramada_Hotel_IMG_1297.JPG',
    'Mall of Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/10/07/8b/7f/photo1jpg.jpg?w=1200&h=-1&s=1',
    'Mall of Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
    NOW()),
(
    'https://mars-architects.com/wp-content/uploads/2025/07/Mall-of-Montenegro-06-scaled.jpg',
    'Mall of Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mall of Montenegro'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0c/92/05/b8/frontage.jpg?w=1200&h=1200&s=1',
    'Kamelija Shopping Center',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/4c/5a/2c/caption.jpg?w=1200&h=1200&s=1',
    'Kamelija Shopping Center',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
    NOW()),
(
    'https://medievaladventures.me/wp-content/uploads/2018/03/29216564_1800007913410308_4024370994708742144_o.jpg',
    'Kamelija Shopping Center',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kamelija Shopping Center'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/17/a2/70/47/city-mall.jpg?w=1200&h=1200&s=1',
    'City Mall',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/City-Mall-01-1.jpg',
    'City Mall',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
    NOW()),
(
    'https://media-cdn.tripadvisor.com/media/photo-m/1280/17/a2/70/49/city-mall.jpg',
    'City Mall',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'City Mall'),
    NOW()),
(
    'https://media.evendo.com/locations-resized/ShoppingImages/1920x466/b68271dd-3f9c-4a9f-93ee-d2fc7b69d8f2',
    'Central Mall Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Bar%2C_Montenegro_-_city_centre_2.jpg/1280px-Bar%2C_Montenegro_-_city_centre_2.jpg',
    'Central Mall Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
    NOW()),
(
    'https://photos.wikimapia.org/p/00/01/78/71/85_big.jpg',
    'Central Mall Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Central Mall Bar'),
    NOW()),
(
    'https://ik.imagekit.io/megamallbudva/67bdb8a267f21_468107908_18046730549043216_4428087423747130551_n.jpg',
    'Mega Mall Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
    NOW()),
(
    'https://ik.imagekit.io/megamallbudva/676babb73d8ec_20241217_133356.jpg',
    'Mega Mall Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
    NOW()),
(
    'https://ik.imagekit.io/megamallbudva/680a6f5a488c2_20250424_1903_Prvomajska%20Ilustracija_remix_01jsmbz1c8fv1akpwkt5zget3h.png',
    'Mega Mall Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mega Mall Budva'),
    NOW()),
(
    'https://lh4.googleusercontent.com/proxy/6oAHJOCHk3Q5fZeuVMAFLktYDQBXB1k7HPK9sAEDP5e-lYhCuD2ZD317wPDiEsYjOIWwYOH179kh48UfeABCxVzZY1IUK1Zq819tLuF8Uc4vOIS5rtTLKaXotYCKgv9xrMfARhO7WTy_K2K3_ytn_LvES7ET66E4LaUpyQFyfTUsGGtwrdk',
    'TC HDL Lakovic Niksic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
    NOW()),
(
    'https://lh4.googleusercontent.com/proxy/bIwqDRnQCvs2Rd1gYOeYLP4nxhUzUpiuY4whYq0lKoXUo7HRkpLgoE-SKJXpreOJiJMNu_MqsyqsArmj24b28jPFk5k5hTaoUZPfEixN6NrtQStkTHlWGTIpGsWz9e6dZd79Hfj0Yea_cJaTLTnJ_7HbIeo9iFoh_-Y8k_glCs4FJuVI4XM',
    'TC HDL Lakovic Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/trzni_centar_261115_tw1024.jpg',
    'TC HDL Lakovic Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'TC HDL Lakovic Niksic'),
    NOW()),
(
    'https://svetistefan-realestate.com/wp-content/uploads/2024/05/hdl_lakovici.jpg',
    'Lakovic Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
    NOW()),
(
    'https://aspirano.s3.eu-central-1.amazonaws.com/media/media/1884/apoteka-benu-hdl-radanovici_1395273907.jpg',
    'Lakovic Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
    NOW()),
(
    'https://maplz.com/media/image/commercial-premises-in-the-hdl-lakovici-shopping-center-1.jpg',
    'Lakovic Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lakovic Kotor'),
    NOW()),
(
    'https://celebic.com/wp-content/uploads/2019/07/DJI_0147-copy-1.jpg',
    'Butiko Shopping Center',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
    NOW()),
(
    'https://gracija.me/wp-content/uploads/2019/07/DJI_0018.jpg',
    'Butiko Shopping Center',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
    NOW()),
(
    'https://celebic.com/wp-content/uploads/2019/07/IMG_7147-HDR-copy.jpg',
    'Butiko Shopping Center',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Butiko Shopping Center'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/1214071_20190204150248_5c5850cdb7896801fa7a72ecjpeg_ls.jpg',
    'HDL Novi Mall',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
    NOW()),
(
    'https://www.pvcialustolarija.me/storage/2020/11/HDL-Novi-Mall-1.jpg',
    'HDL Novi Mall',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
    NOW()),
(
    'https://www.pvcialustolarija.me/storage/2020/11/HDL-Novi-Mall-3.jpg',
    'HDL Novi Mall',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'HDL Novi Mall'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2023/04/05/13/5479963_kolekcije-solidarne-buducnosti-muzej-moderne-i-savremene-umjetnosti-koroska_share.jpg',
    'Galerija Muzeja savremene umjetnosti Crne Gore',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
    NOW()),
(
    'https://media.gov.me/media/gov/2023/10/17/1697529617toovsp6qyahlevbi.jpg',
    'Galerija Muzeja savremene umjetnosti Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/11/15/16/5449763_dvorac-csucg_share.jpg',
    'Galerija Muzeja savremene umjetnosti Crne Gore',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Muzeja savremene umjetnosti Crne Gore'),
    NOW()),
(
    'https://portonovi.com/storage/app/media/webp/seedo/pizana-art-gallery/pizana-04.webp',
    'Galerija Pizana',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
    NOW()),
(
    'https://www.spottedbylocals.com/wp-content/uploads/2024/10/Gallery-Pizana-1-scaled.jpg',
    'Galerija Pizana',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
    NOW()),
(
    'https://portonovi.com/storage/app/uploads/public/66b/07f/4c7/66b07f4c7aa08019862801.webp',
    'Galerija Pizana',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Pizana'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/12/26/15/5459573_320673919-578454017454978-4369255730523475141-n_share.jpg',
    'Galerija Velimir A. Lekovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/08/20/13/5666347_oaf200zw_share.jpg',
    'Galerija Velimir A. Lekovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/07/08/15/5658001_har_share.jpg',
    'Galerija Velimir A. Lekovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Galerija Velimir A. Lekovic'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/19/51/f6/55/villa-ljubanovic.jpg?w=1200&h=1200&s=1',
    'Villa Ljubanovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
    NOW()),
(
    'https://images.trvl-media.com/lodging/90000000/89650000/89641200/89641129/5d68dc1a.jpg?impolicy=fcrop&w=1200&h=800&quality=medium',
    'Villa Ljubanovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
    NOW()),
(
    'https://www.ljubanovic.com/uploads/6409e33eca94a.jpg',
    'Villa Ljubanovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Villa Ljubanovic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/841139372.jpg?k=9eac4270322fa8656a945aeac5ef75de33aaebc3ebd703caba8c5109f22230a0&o=',
    'Guesthouse Zmukic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/c3e4ae61-fdcc-406b-87dc-ed031c1a284b.jpg',
    'Guesthouse Zmukic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/99f78802-f048-4245-b6a6-72de33631acb.jpg',
    'Guesthouse Zmukic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Zmukic'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/654530649.jpg?k=d96bb9b96d7fd00b0cd4717907fe95bc73906cc0bc0e468e1fdafea3e110c34e&o=',
    'Guesthouse Plima',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/654529487.jpg?k=b16596f228bc2d0301e77b6a532bbdd5c62d4da5331930e81e919c7ef4c73086&o=',
    'Guesthouse Plima',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/39373244.jpg?k=1995016da60cfd27f17e56a1d8a449bc2a28ef91349c6bd1734afa72cce141b8&o=',
    'Guesthouse Plima',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Guesthouse Plima'),
    NOW()),
(
    'https://static.cupid.travel/hotels/266854609.jpg',
    'Pansion Vukovic Zabljak',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/19849596.jpg?k=3673239add680895bdab952a7ce6fb540613a78b1d925ee136d110074a4858d0&o=',
    'Pansion Vukovic Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
    NOW()),
(
    'https://static.cupid.travel/hotels/319007791.jpg',
    'Pansion Vukovic Zabljak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pansion Vukovic Zabljak'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/7b7a07f9-6b8a-40b2-b649-bc853a9f61b9.jpg',
    'Etno Selo Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
    NOW()),
(
    'https://images.trvl-media.com/lodging/36000000/35250000/35246200/35246165/26808daf.jpg?impolicy=fcrop&w=1200&h=800&quality=medium',
    'Etno Selo Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/24/f2/8c/62/etno-selo-montenegro.jpg?w=1200&h=1200&s=1',
    'Etno Selo Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Montenegro'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/331394513.jpg?k=ed82728f733820cf613b767e4f765fceede1661d167818f19c17dcc3645992df&o=',
    'Etno Selo Izlazak',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/331395072.jpg?k=feebad86f6cbea9e0e1f29912e89913b50a6e0d7921eeee05c0904be642f87e5&o=',
    'Etno Selo Izlazak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0f/f8/3d/c3/etno-selo-izlazak-pluzine.jpg?w=1200&h=1200&s=1',
    'Etno Selo Izlazak',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Izlazak'),
    NOW()),
(
    'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTA1NjUyMTQ3ODE4ODgxNDM2MQ==/original/2bea6286-2299-41e0-802d-197c5f0f7e45.jpeg',
    'Etno Selo Komarnica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572431056.jpg?k=05f40f6b3c224c8ccf36f1071bd4077ba0121321e91e2cdc3f8a33cd9db84872&o=',
    'Etno Selo Komarnica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/830844207.jpg?k=7f3317c0272952d0119e9a839919597ce6545b914492c0ce13041e629266a02d&o=',
    'Etno Selo Komarnica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Etno Selo Komarnica'),
    NOW()),
(
    'https://caffemontenegro.me/images/2022/planta%C5%BEe/cover.jpg',
    'Vinarija Plantaze 13 Jul',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
    NOW()),
(
    'https://winestyle.rs/wp-content/uploads/2021/11/Vinski-Putopis-13.-Jul-Plantaze-img-7.jpg',
    'Vinarija Plantaze 13 Jul',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
    NOW()),
(
    'https://stari.plantaze.com/wp-content/uploads/2019/05/Sipcanik-05-1920x710.jpg',
    'Vinarija Plantaze 13 Jul',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Plantaze 13 Jul'),
    NOW()),
(
    'https://lipovacwines.com/images/2022/12/03/vinarija-mne.jpg',
    'Vinarija Lipovac',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
    NOW()),
(
    'https://lipovacwines.com/images/2022/12/03/3.jpg',
    'Vinarija Lipovac',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
    NOW()),
(
    'https://lipovacwines.com/images/2022/12/06/1-1.jpg',
    'Vinarija Lipovac',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Lipovac'),
    NOW()),
(
    'https://tymrazem.pl/wp-content/uploads/2023/02/IMG_6218.jpg',
    'Cem winery and vineyard',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
    NOW()),
(
    'https://coinventmediastorage.blob.core.windows.net/media-storage-container/gphoto_ChIJ8QHQGQDrTRMRvyh1bfSR2xw_2.jpg',
    'Cem winery and vineyard',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
    NOW()),
(
    'https://tymrazem.pl/wp-content/uploads/2023/02/IMG_6314.jpg',
    'Cem winery and vineyard',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cem winery and vineyard'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/08/9d/fe/a8/winery-masanovic.jpg?w=1200&h=-1&s=1',
    'Winery Masanovic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
    NOW()),
(
    'https://wineofmontenegro.com/wp-content/uploads/2024/11/wine-tasting-room-Masanovic-winery.jpg',
    'Winery Masanovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
    NOW()),
(
    'https://wineofmontenegro.com/wp-content/uploads/2024/11/Crmnica-wine-Krin-barrique-Masanovic-winery.jpg',
    'Winery Masanovic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Winery Masanovic'),
    NOW()),
(
    'https://cdn.prod.website-files.com/628ba2ca6ae2f8e75697f7e4/65eeece820b1b3b54cc6ca4b_Lazure%20Hotel%20Savina%20Winery%20Experience_1.webp',
    'Vinarija Savina',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
    NOW()),
(
    'https://wineofmontenegro.com/wp-content/uploads/2024/11/Coastal-Montenegro-wines-from-Savina-winery.jpg',
    'Vinarija Savina',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
    NOW()),
(
    'https://castelsavina.me/wp-content/uploads/2014/05/photo-11_opt-e1399640996139.jpg',
    'Vinarija Savina',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Vinarija Savina'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/15/8b/b3/ed/the-best-view-of-the.jpg?w=1200&h=1200&s=1',
    'Aqua Park Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2023/05/13/14/5488491_akva-foto-segej-zabijako_share.jpg',
    'Aqua Park Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/97/77/06/caption.jpg?w=1100&h=1100&s=1',
    'Aqua Park Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Budva'),
    NOW()),
(
    'https://mcdn.pro/data/objects/images/28630/aqua-park-01-zwogqr-l-xchn0s.jpg',
    'Aqua Park Mediteran',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
    NOW()),
(
    'https://mcdn.pro/data/objects/images/28630/aqua-park-05-f4o6zu-l-et5jzp.jpg',
    'Aqua Park Mediteran',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
    NOW()),
(
    'https://kidpassage.com/images/activity/akvapark-mediteran/aquapark-mediteran_1022510291.jpg',
    'Aqua Park Mediteran',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Mediteran'),
    NOW()),
(
    'https://www.imanje-knjaz.me/files/offer/thumb/1733817722-BI4_6175%20copy.jpg',
    'Aqua Park Imanje Knjaz',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
    NOW()),
(
    'https://www.imanje-knjaz.me/files/offer/thumb/1733817740-BI4_6020%20copy.jpg',
    'Aqua Park Imanje Knjaz',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
    NOW()),
(
    'https://www.imanje-knjaz.me/theme/images/aqua-offer1.jpg',
    'Aqua Park Imanje Knjaz',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aqua Park Imanje Knjaz'),
    NOW()),
(
    'https://mindtrip.ai/cdn-cgi/image/format=webp,w=1200/https://images.mindtrip.ai/attractions/06d5/d316/72a9/bac3/e5a7/4a66/a0ad/8bb6',
    'Mini Zoo Vrt Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/26/00/4228254_20190226120240_5c7525b2b789683b9121f181jpeg_share.jpg',
    'Mini Zoo Vrt Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/28/fe/ee/ad/caption.jpg?w=1200&h=1200&s=1',
    'Mini Zoo Vrt Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mini Zoo Vrt Podgorica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/12/04/07/5454633_copy-of-copy-of-image2-credit-asi_share.jpg',
    'Zoo Sad',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
    NOW()),
(
    'https://caffemontenegro.me/images/slider/prihvatiliste/4.jpg',
    'Zoo Sad',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2019/01/unnamed-3-1024x768.jpg',
    'Zoo Sad',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zoo Sad'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/20/00/3546016_20190220060232_5c6ce70db789684e9f1769f1jpeg_share.jpg',
    'Park Macaka',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
    NOW()),
(
    'https://mindtrip.ai/attractions/03fa/0775/1e45/0d13/5705/4287/26bb/f793',
    'Park Macaka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
    NOW()),
(
    'https://gosailmontenegro.com/wp-content/uploads/2025/01/cat-and-a-view-of-kotor-v0-hb8umanfsbdb1.jpg',
    'Park Macaka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Park Macaka'),
    NOW()),
(
    'https://aquariumboka.ucg.ac.me/wp-content/uploads/2021/05/Akvarijum-tankovi.jpg',
    'Akvarijum Boka',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2021/09/Akvarijum-Boka.jpg',
    'Akvarijum Boka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2021/09/Akvarijum-Boka-savr%C5%A1en-izlet-.jpg',
    'Akvarijum Boka',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Akvarijum Boka'),
    NOW()),
(
    'https://mnemagazin.me/wp-content/uploads/2019/06/igraliste-sajt.jpg',
    'Igraliste Njegosev park',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
    NOW()),
(
    'https://media.pobjeda.me/media/1623408831-pct-igraliste-3.jpg',
    'Igraliste Njegosev park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
    NOW()),
(
    'https://sportskiobjekti.podgorica.me/wp-content/uploads/2025/06/DJI_0794.jpg',
    'Igraliste Njegosev park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Njegosev park'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/f6/61/e6/welcome-to-the-new-adventure.jpg?w=1200&h=-1&s=1',
    'Igraliste Gorica Park',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/14/45/00/c1/photo1jpg.jpg?w=1200&h=-1&s=1',
    'Igraliste Gorica Park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/IMG_2615-1.jpg',
    'Igraliste Gorica Park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Gorica Park'),
    NOW()),
(
    'https://agencijapanorama.rs/wp-content/uploads/ws-form/2/dropzonejs/61/Slovenska-Plaza-Lux-Budva-Crna-Gora-7.jpg',
    'Igraliste Slovenska plaza',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Slovenska plaza'),
    NOW()),
(
    'https://startravelnis.rs/wp-content/uploads/2022/02/budva-slovenska-plaza-3-16.jpg',
    'Igraliste Slovenska plaza',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Slovenska plaza'),
    NOW()),
(
    'https://www.hercegnovi.me/images/stories/15072022/02.jpg',
    'Djecije Igraliste Park Nezavisnosti',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
    NOW()),
(
    'https://rthn.co.me/wp-content/uploads/2022/10/Dogadjaj-Najbolji-smo-domacini-a-Herceg-%E2%80%93-Novi-grad-tvoj-i-moj.jpg',
    'Djecije Igraliste Park Nezavisnosti',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
    NOW()),
(
    'https://www.hercegnovi.travel/storage/app/public/project-image/1700744811.jpg',
    'Djecije Igraliste Park Nezavisnosti',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecije Igraliste Park Nezavisnosti'),
    NOW()),
(
    'https://www.kotor.me/files/images/1745583583-WhatsApp%20slika%202025-04-25%20u%2013.48.33_5cb55a84.jpg',
    'Igraliste Centar Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
    NOW()),
(
    'https://radiokotor.info/files/images/1745591172-1745583581-Foto-9.jpg',
    'Igraliste Centar Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
    NOW()),
(
    'https://www.kotor.me/files/images/1745583582-Foto-8.JPG',
    'Igraliste Centar Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Centar Kotor'),
    NOW()),
(
    'https://www.cdm.me/wp-content/uploads/2021/11/tolosi.jpg',
    'Igraliste Tolosi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
    NOW()),
(
    'https://www.antenam.net/uploads/6/e/d/6ed7fb080c86bde2fff21d4f6a56a30b.jpg',
    'Igraliste Tolosi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/09/11/13/5248883_1253767_share.jpg',
    'Igraliste Tolosi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Tolosi'),
    NOW()),    
(
    'https://www.vijesti.me/data/images/2022/07/01/10/5421393_djecije-igraliste_ls.jpg',
    'Igraliste Kolasin',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
    NOW()),
(
    'https://rtcg.me/upload//media/2022/7/17/21/48/184/1214620/resize/1214622/1660762115845_1068x900',
    'Igraliste Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
    NOW()),    
(
    'https://www.vijesti.me/data/images/2021/09/30/10/5364413_juce-na-trgu-vukmana-kruscica_ls.jpg',
    'Igraliste Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Kolasin'),
    NOW()),
(
    'https://rthn.co.me/wp-content/uploads/2023/04/igraliste-Igalo.jpg',
    'Igraliste Igalo',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
    NOW()),
(
    'https://bookaweb.s3.eu-central-1.amazonaws.com/media/28555/omladinski-park-igalo.jpg',
    'Igraliste Igalo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
    NOW()),
(
    'https://biznisuregionu.com/wp-content/uploads/2025/11/soso-Milan-Petrovic-Novi-Sad.jpg',
    'Igraliste Igalo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Igalo'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/08/02/12/5428098_viber-image-20220802-122227576_share.jpg',
    'Igraliste Park 13 Jul',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
    NOW()),
(
    'https://www.antenam.net/uploads/8/5/b/85b64f91c8fd6579abc311e0f9c193ea.jpg',
    'Igraliste Park 13 Jul',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
    NOW()),
(
    'https://www.cdm.me/wp-content/uploads/2021/06/pct_igraliste_4.jpg',
    'Igraliste Park 13 Jul',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Park 13 Jul'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2024/10/novo-igraliste-u-kosovskoj-ulici-rtnk.jpg',
    'Igraliste Niksic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/09/igraliste-kod-Desetke-rtnk-1.jpg',
    'Igraliste Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/10/igraliste-stara-varos-rtnk.jpg',
    'Igraliste Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Niksic'),
    NOW()),
(
    'https://opstinativat.me/wp-content/uploads/2022/09/43918C30-2DF0-4A92-AE32-5EC0E3C7407C-scaled.jpeg',
    'Djecje igraliste kod vozica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2025/02/Novo-igraliste-i-teren_resize.jpg',
    'Djecje igraliste kod vozica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
    NOW()),
(
    'https://radiotivat.com/wp-content/uploads/2026/03/ostvj-igraliste.jpg',
    'Djecje igraliste kod vozica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecje igraliste kod vozica'),
    NOW()),
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQf19k1RmCSIEtzZCfqdwGP9IpbmHvjOCBbWw&s',
    'Igraliste Bar Setaliste',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
    NOW()),
(
    'https://www.putovanja.info/forum/uploads/monthly_2021_06/IMG_20190808_131116_1067x800.jpg.b12464c970ea513a45e21184ec346b5d.jpg',
    'Igraliste Bar Setaliste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
    NOW()),
(
    'https://barinfo.me/wp-content/uploads/2024/07/igraliste-1-2407-70ea.jpg',
    'Igraliste Bar Setaliste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Bar Setaliste'),
    NOW()),
(
    'https://radiotitograd.me/wp-content/uploads/2025/08/obnovljeno-igraliste-NPD-scaled.jpg',
    'Igraliste Crno jezero',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
    NOW()),
(
    'https://nparkovi.me/storage/images/news/1754288130.jpg',
    'Igraliste Crno jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
    NOW()),
(
    'https://nparkovi.me/storage/images/news/1754288098_68904fe2db78c.jpg',
    'Igraliste Crno jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Crno jezero'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/85068015.jpg?k=ba5ce5ed5d58026ba4f9f44c50ea9d3be236284e517d523545df24219c77e6b2&o=',
    'Igraliste Milocer Park',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Milocer Park'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/85068008.jpg?k=808052ece3d899557c778f973c0ecafd0042e569658f91e15a88edfbef5395d5&o=',
    'Igraliste Milocer Park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Milocer Park'),
    NOW()),
(
    'https://www.ivanovakorita.com/files/images/IMG_Lovcen_Djecije_igraliste_Gallery_04.jpg',
    'Igraliste Lovcen National Park',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
    NOW()),
(
    'https://www.ivanovakorita.com/files/images/IMG_Lovcen_Djecije_igraliste_Gallery_06.JPG',
    'Igraliste Lovcen National Park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
    NOW()),
(
    'https://www.ivanovakorita.com/files/images/IMG_Lovcen_Djecije_igraliste_Gallery_03.jpg',
    'Igraliste Lovcen National Park',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Igraliste Lovcen National Park'),
    NOW()),
(
    'https://cnp.me/wp-content/uploads/2019/01/eksterijer-12-18-2.jpg',
    'Crnogorsko narodno pozoriste',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
    NOW()),
(
    'https://cnp.me/wp-content/uploads/2016/12/CNP-Crnogorsko-narodno-pozoriste-9.jpg',
    'Crnogorsko narodno pozoriste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
    NOW()),
(
    'https://www.narodnopozoriste.rs/media/images/news/6396/gallery/eri-moja-cnp-7.jpg',
    'Crnogorsko narodno pozoriste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crnogorsko narodno pozoriste'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/a/a3/2023_Cetinje_theatre.jpg',
    'Zetski dom',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
    NOW()),
(
    'https://zetskidom.me/wp-content/uploads/2021/08/IMG-a1ac87d79e65defce4acd00c669ec8eb-V.jpg',
    'Zetski dom',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
    NOW()),
(
    'https://zetskidom.me/wp-content/uploads/2026/01/1000140981-scaled.jpg',
    'Zetski dom',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zetski dom'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2024/06/niksicko-pozoriste-rtnk-1200x676-1.webp',
    'Niksicko pozoriste',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/16/00/2930291_20190216050232_5c6792e3b789684e9f0515b6jpeg_share.jpg',
    'Niksicko pozoriste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
    NOW()),
(
    'https://kossev.info/wp-content/uploads/2025/10/violina-daire-1.jpg',
    'Niksicko pozoriste',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Niksicko pozoriste'),
    NOW()),
(
    'https://me.ekapija.com/thumbs169/dvorana_park_herceg_novi_1_170224_tw1024.jpg',
    'Dvorana Park Herceg Novi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
    NOW()),
(
    'https://www.dekadas.rs/slike/prva1.jpg',
    'Dvorana Park Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
    NOW()),
(
    'https://elektrovat.net/wp-content/uploads/2022/11/viber_image_2022-10-28_08-25-49-079.webp',
    'Dvorana Park Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dvorana Park Herceg Novi'),
    NOW()),
(
    'https://kckotor.me/wp-content/uploads/2020/04/DSC_0492-1024x683.jpg',
    'Kulturni centar Kotor - scena',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
    NOW()),
(
    'https://www.kotor.me/files/images/1579191876-dsc0554.jpg',
    'Kulturni centar Kotor - scena',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
    NOW()),
(
    'https://www.kotor.me/files/images/1588930288-IMG-f47455b3c7d70fd0b441a23307856215-V%20(1)-bez%20teksta.jpg',
    'Kulturni centar Kotor - scena',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kulturni centar Kotor - scena'),
    NOW()),
(
    'https://gradteatar.me/wp-content/uploads/2025/11/dobra-stara-vremena-19.11-11.jpg',
    'Javna ustanova Grad Teatar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2023/06/24/12/5498555_2343540_share.jpg',
    'Javna ustanova Grad Teatar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
    NOW()),
(
    'https://gradteatar.me/wp-content/uploads/2023/11/bravo-za-klovna-3.jpg',
    'Javna ustanova Grad Teatar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Javna ustanova Grad Teatar'),
    NOW()),
(
    'https://barinfo.me/wp-content/uploads/2025/07/ljetnja-pozornica-nova.jpg',
    'Dom kulture Bar - pozornica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
    NOW()),
(
    'https://www.gradnja.me/storage/posts/1752413044slavko-leki%C4%87.jpeg',
    'Dom kulture Bar - pozornica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
    NOW()),
(
    'https://www.gradnja.me/storage/posts/1752413705slavko-leki%C4%87.jpeg',
    'Dom kulture Bar - pozornica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Bar - pozornica'),
    NOW()),
(
    'https://czktivat.me/wp-content/uploads/2025/07/Velika-Sala-3.jpg',
    'Tivat Centar za kulturu',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
    NOW()),
(
    'https://czktivat.me/wp-content/uploads/2025/12/DSC1723-scaled.jpg',
    'Tivat Centar za kulturu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
    NOW()),
(
    'https://www.radiodux.me/sites/default/files/2026/20-04-2026-otvoren-festival-ruta-tivat-predstavom-celava-pjevacica/7q9b3203.jpg',
    'Tivat Centar za kulturu',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tivat Centar za kulturu'),
    NOW()),
(
    'https://czktivat.me/wp-content/uploads/2016/03/7146838.jpg',
    'Ljetnja Pozornica Tivat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
    NOW()),
(
    'https://czktivat.me/wp-content/uploads/2025/07/Ljetnja-Pozornica-6.jpg',
    'Ljetnja Pozornica Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
    NOW()),
(
    'https://radiotivat.com/wp-content/uploads/2025/07/viber_image_2025-07-04_10-11-44-078.jpg',
    'Ljetnja Pozornica Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Ljetnja Pozornica Tivat'),
    NOW()),
(
    'https://res.cloudinary.com/dt5z2gs3c/image/upload/v1760477333/dom-oilpainting_pn04mc.jpg',
    'Dom kulture Kolasin',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
    NOW()),
(
    'https://kossev.info/wp-content/uploads/2019/04/Dom-Kulture-Stari-Kola%C5%A1in-krupni-plan-1024x768.jpg',
    'Dom kulture Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
    NOW()),
(
    'https://i.ytimg.com/vi/D6J49YPa_Ns/maxresdefault.jpg',
    'Dom kulture Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Dom kulture Kolasin'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2021/05/IMG_0108.jpg',
    'Manastir Moraca',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
    NOW()),
(
    'https://www.mojacrnagora.rs/wp-content/uploads/2021/05/drone-montenegro-manastir-moraca.jpg',
    'Manastir Moraca',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Manastir_Moraca.jpg',
    'Manastir Moraca',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Moraca'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/3/35/Monastero_di_cetinje%2C_01.JPG',
    'Cetinjski manastir',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://svetigora.com/wp-content/uploads/2021/02/Cetinjski-manastir.jpg',
    'Cetinjski manastir',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://static.tildacdn.net/tild3633-3063-4731-b735-656262333163/WhatsApp_slika_2025-.jpg',
    'Cetinjski manastir',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Cetinjski manastir'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/27/Manastir_Piva_3.jpg',
    'Manastir Piva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/c/c2/Manastir_Piva5.jpg',
    'Manastir Piva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/08/slava-manastira-piva-eparhija-naslovna.jpg',
    'Manastir Piva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Manastir Piva'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/c/cf/Sports_Center_Moraca.jpg',
    'SC Moraca',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
    NOW()),
(
    'https://media.pobjeda.me/media/2024/03/03/1709505820-sc-moraca-2809-2023-dragan-mijatovic-001-19-1-i_1280x800.JPG?cacheControl=1709505822',
    'SC Moraca',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
    NOW()),
(
    'https://www.standard.co.me/wp-content/uploads/2020/07/SC-moraca.jpg',
    'SC Moraca',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Moraca'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/c/cd/Sportska_dvorana_Topolica.jpg',
    'SC Topolica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
    NOW()),
(
    'https://lobsport.me/wp-content/uploads/2024/05/sc-topolica-jpg.webp',
    'SC Topolica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/09/25/00/4670725_2019092516090_c4219cf306db568e72f812d8dd3743cdbb5ce1ce30da77bda38cf88e33a6e512_share.jpg',
    'SC Topolica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Topolica'),
    NOW()),
(
    'https://egca.info/wp-content/uploads/2022/07/Venue-Niksic1-1.jpg',
    'SC Niksic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
    NOW()),
(
    'https://wevotravel.com/wp-content/uploads/2023/04/DSC7460-1.jpg',
    'SC Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
    NOW()),
(
    'https://media.pobjeda.me/media/2022/02/23/1645610845-nk-img-5e60e2759c7e6894283a50e326403546-v-i_960x600.jpg?cacheControl=1645610859',
    'SC Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Niksic'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/sportski_centar_igalo_1_290920_tw1024.jpg',
    'SC Igalo',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2023/09/P9035608.jpg',
    'SC Igalo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
    NOW()),
(
    'https://rthn.co.me/wp-content/uploads/2024/06/Novi-perimetri-u-SC-Igalo-1-jun-2024.jpg',
    'SC Igalo',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Igalo'),
    NOW()),
(
    'https://skijalista.me/wp-content/uploads/DJI_0021.jpg',
    'SC Kolasin',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
    NOW()),
(
    'https://srbijazamlade.rs/fajlovi/productitem/kolasin-1600-skijaliste_5ffefd29559fc.jpg',
    'SC Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2023/07/oscg.jpg',
    'SC Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'SC Kolasin'),
    NOW()),
(
    'https://www.avalaresort.com/photos/1/Gallery/Spa%20&%20Wellness/homepage/DSC_7301.jpg',
    'Spa Center Avala Medical Wellness',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
    NOW()),
(
    'https://www.avalaresort.com/photos/1/Gallery/Spa%20&%20Wellness/homepage/Avala-27-2.jpg',
    'Spa Center Avala Medical Wellness',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
    NOW()),
(
    'https://www.avalaresort.com/photos/1/Gallery/Spa%20&%20Wellness/Gym/avg%202025/Avala-24-2.jpg',
    'Spa Center Avala Medical Wellness',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Spa Center Avala Medical Wellness'),
    NOW()),
(
    'https://d1tfdfyb9rvaxg.cloudfront.net/chedilusticabay.com-1070583806/cms/cache/v2/64afc7d4c5820.jpg/1920x1080/fit/80/8a0e6122621764bdd3b6819e6a3b3eac.jpg',
    'The Chedi Lustica Bay',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
    NOW()),
(
    'https://d1tfdfyb9rvaxg.cloudfront.net/chedilusticabay.com-1070583806/cms/cache/v2/66210aad640cc.jpg/1920x1080/fit/80/6be62e08a98bbde8ec17bd6c96904f20.jpg',
    'The Chedi Lustica Bay',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
    NOW()),
(
    'https://www.simplyluxuryescapes.co.uk/wp-content/uploads/2025/04/The-Chedi-Lustica-Bay-Montenegro-20.jpg',
    'The Chedi Lustica Bay',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'The Chedi Lustica Bay'),
    NOW()),
(
    'https://radiotitograd.me/wp-content/uploads/2024/09/Vrmac-HealthWellbeing-photo-Rozana-Sazdic-7163.jpg-2-scaled.jpg',
    'Health & Wellbeing Retreat de Mar - Vrmac',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
    NOW()),
(
    'https://europeanspamagazine.com/app/uploads/2023/11/View-from-the-pool-copy.jpg',
    'Health & Wellbeing Retreat de Mar - Vrmac',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
    NOW()),
(
    'https://europeanspamagazine.com/app/uploads/2023/11/BKB-717-copy.jpg',
    'Health & Wellbeing Retreat de Mar - Vrmac',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Health & Wellbeing Retreat de Mar - Vrmac'),
    NOW()),
(
    'https://www.humahotel.me/wp-content/uploads/2023/04/IMG_8615-3desno7.jpg',
    'Shanti Wellness & Spa',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
    NOW()),
(
    'https://www.humahotel.me/wp-content/uploads/2021/06/happy-young-beautiful-couple-enjoying-head-massage-spa-scaled-e1624554987511.jpg',
    'Shanti Wellness & Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
    NOW()),
(
    'https://www.humahotel.me/wp-content/uploads/2023/04/IMG_8265-1.jpg',
    'Shanti Wellness & Spa',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Shanti Wellness & Spa'),
    NOW()),
(
    'https://pijacepg.me/wp-content/uploads/2025/04/IMG_4153-1-scaled.jpeg',
    'Trznica Podgorica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
    NOW()),
(
    'https://pijacepg.me/wp-content/uploads/2025/04/IMG_3996-scaled.jpeg',
    'Trznica Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
    NOW()),
(
    'https://pijacepg.me/wp-content/uploads/2025/04/IMG_3790-2-scaled.jpeg',
    'Trznica Podgorica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Trznica Podgorica'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2014/11/DSC_3999_resize.jpg',
    'Gradska pijaca Kotor',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2014/11/DSC_3965_resize.jpg',
    'Gradska pijaca Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2014/11/DSC_3969_resize.jpg',
    'Gradska pijaca Kotor',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Gradska pijaca Kotor'),
    NOW()),
(
    'https://i0.wp.com/primorski.me/wp-content/uploads/2025/08/Pijaca-Budva-naslovna-scaled.jpg',
    'Pijaca Budva',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/green-market-budva/large/green-market-budva-699143.jpg',
    'Pijaca Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
    NOW()),
(
    'https://mindtrip.ai/attractions/4ab5/a82b/e240/d3ad/5648/64e7/b6a0/a1e5',
    'Pijaca Budva',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Budva'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2024/04/pijaca-niksic-rtnk.jpg',
    'Zelena pijaca Niksic',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
    NOW()),
(
    'https://seljak.me/savjetuje/wp-content/uploads/2022/04/277935918_1026062591656638_1337074368930576300_n.jpg',
    'Zelena pijaca Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
    NOW()),
(
    'https://i.ytimg.com/vi/cHmWcwUxcxE/maxresdefault.jpg',
    'Zelena pijaca Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Niksic'),
    NOW()),
(
    'https://komunalnobar.me/images/pjaca.JPG',
    'Pijaca Bar',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/green-market-stari-bar/large/green-market-stari-bar-699140.jpg',
    'Pijaca Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
    NOW()),
(
    'https://i0.wp.com/primorski.me/wp-content/uploads/2024/12/Riblja-pijaca-Bar-3.jpg',
    'Pijaca Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Bar'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/pijaca_herceg_novi_201120_tw1024.jpg',
    'Pijaca Herceg Novi',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
    NOW()),
(
    'https://investitor.me/wp-content/uploads/2024/12/green-market-herceg-novi-699146.jpg',
    'Pijaca Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/pijaca_herceg_novi_2_201120_tw1024.jpg',
    'Pijaca Herceg Novi',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Herceg Novi'),
    NOW()),
(
    'https://www.ekapija.com/thumbs/pijaca_140123_tw1024.jpg',
    'Pijaca Tivat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2021/08/11111111.jpg',
    'Pijaca Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
    NOW()),
(
    'https://radiotivat.com/wp-content/uploads/2022/06/2016-07-21-Pijaca-domacih-proizvoda.webp',
    'Pijaca Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Tivat'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/17/00/3061351_20190217000240_5c689febb789684e9f0a07fbjpeg_share.jpg',
    'Zelena pijaca Cetinje',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2021/08/15/19/5356691_12101905-pijaca-cetinje_share.jpg',
    'Zelena pijaca Cetinje',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
    NOW()),
(
    'https://me.ekapija.com/thumbs169/cetinjska_pijaca_291124_tw1024.jpg',
    'Zelena pijaca Cetinje',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Zelena pijaca Cetinje'),
    NOW()),
(
    'https://mne.ul-info.com/wp-content/uploads/2020/03/Pazari.jpg',
    'Pijaca Ulcinj',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Ulcinj'),
    NOW()),
(
    'https://mne.ul-info.com/wp-content/uploads/2020/04/Pijaca-Trego.jpg',
    'Pijaca Ulcinj',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Ulcinj'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/08/30/19/5245067_1713302_share.jpg',
    'Pijaca Ulcinj',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Ulcinj'),
    NOW()),
(
    'https://bokanews.me/wp-content/uploads/2015/01/riba-ostala-u-autu-jer-nema-pijace_resize.jpg',
    'Riblja Pijaca Tivat',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Riblja Pijaca Tivat'),
    NOW()),
(
    'https://scontent.fbeg7-2.fna.fbcdn.net/v/t39.30808-6/502622072_1463692371657941_7287224198373513296_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=09igSWvDHHMQ7kNvwF5p88J&_nc_oc=AdpJFCf1vrY8kQYnMZxUVjlBK8aLFA5lXWldv-KQwDZXCuyR7ba3NLi6Cu8P4aQuWZk&_nc_zt=23&_nc_ht=scontent.fbeg7-2.fna&_nc_gid=xgO_hby8cQ6WwjmQa7GERA&_nc_ss=7b2a8&oh=00_Af3BClcOq50XWQ78x4k12mZtqcPVkU4pYzoj6m-BbMWdTQ&oe=69F2C35E',
    'Riblja Pijaca Tivat',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Riblja Pijaca Tivat'),
    NOW()),
(
    'https://content.radnik.me/images%2F2025%2F03%2F05%2FL9VBdjgXI0aasMFb-PQ7VQ%2Fw-1280%2Fkotorska%20suvenirnica%20cover.webp',
    'Kotorska Suvenirnica',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
    NOW()),
(
    'https://lh3.googleusercontent.com/p/AF1QipO3l5O33mFx8vWgcrG1iMYX2VPDfp5NY2l-zUVT=s1600-w1024',
    'Kotorska Suvenirnica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
    NOW()),
(
    'https://static.vecteezy.com/system/resources/previews/042/518/878/large_2x/kotor-montenegro-25-december-2022-little-girl-stands-near-a-showcase-with-souvenirs-inscription-kotorska-suvenirnica-free-photo.jpg',
    'Kotorska Suvenirnica',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kotorska Suvenirnica'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/23/69/64/96/sea-style-serving-desk.jpg?w=1200&h=-1&s=1',
    'By The Sea Handmade',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
    NOW()),
(
    'https://scontent.fbeg7-2.fna.fbcdn.net/v/t39.30808-6/475981555_1149454826668661_912770419630957985_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=06a7ca&_nc_ohc=H3x2qa7DSV4Q7kNvwGwiSUK&_nc_oc=AdqigTTSDEFZXly4lwyuswAKKiJCb55Z75qZU3KkK7xeftxVdX4TBb8kECJ8I42ZPXE&_nc_zt=23&_nc_ht=scontent.fbeg7-2.fna&_nc_gid=4tafE7b5OaFQTDK7oTM70Q&_nc_ss=7b2a8&oh=00_Af1i2Q3OJ8AeH5pAF88a8ySwQ-XJMvWHpT90EaS_0RE8yg&oe=69F2D908',
    'By The Sea Handmade',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
    NOW()),
(
    'https://scontent.fbeg7-2.fna.fbcdn.net/v/t39.30808-6/475850645_1149454833335327_8305708708332480824_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=06a7ca&_nc_ohc=HvNZb_pTcMEQ7kNvwFiuvsB&_nc_oc=AdovjTjwmQGXsxjpc9KWGo4w4JZkolnFrYapfMIhc3dmOD7q_EmOIioBT0Dj0ulWtWM&_nc_zt=23&_nc_ht=scontent.fbeg7-2.fna&_nc_gid=TVNjynFbeVtSX9yC8l9-mw&_nc_ss=7b2a8&oh=00_Af2rSB0RhrVaQ297LTywswGN_YT4r1asH_qtESsP-KxBjQ&oe=69F2F828',
    'By The Sea Handmade',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'By The Sea Handmade'),
    NOW()),
(
    'https://thumbs.dreamstime.com/b/kotor-montenegro-may-display-souvenir-shop-historic-part-city-165732284.jpg',
    'Souvenir Shop Montenegro',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop Montenegro'),
    NOW()),
(
    'https://media02.stockfood.com/largepreviews/MjIxNDA2MjM3Nw==/71421367-Souvenirs-in-the-old-town-of-Kotor-Montenegro-Europe.jpg',
    'Souvenir Shop Montenegro',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop Montenegro'),
    NOW()),
(
    'https://lh3.googleusercontent.com/p/AF1QipOFaESpFFbKYXp1lRCHWoLEMxp7Ss0xovy5Sq_o=w800-h1420-k-no',
    'Souvenir Shop XY',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop XY'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2019/02/09/00/1900783_20190209010252_5c5e24e3b789689e85bff52bjpeg_share.jpg',
    'Souvenir Shop XY',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Souvenir Shop XY'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2f/fd/a0/47/caption.jpg?w=1200&h=1200&s=1',
    'Mnemories',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2f/fd/a0/45/caption.jpg?w=1200&h=1200&s=1',
    'Mnemories',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
    NOW()),
(
    'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2f/fd/a0/44/caption.jpg?w=1200&h=1200&s=1',
    'Mnemories',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mnemories'),
    NOW())

    ;

-- ============================================
-- 13. IMAGES - ACTIVITIES
-- ============================================

INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
VALUES
(
    'https://infinityadventure.me/wp-content/uploads/2023/12/durmitor-planinarenje.png',
    'Planinarenje na Durmitoru',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Planinarenje na Durmitoru'),
    NOW()),
(
    'https://durmitoradventure.com/static/4b5891e1e968e8f1d6d4708e4c7be588/df7b5/hero_Hiking_1900x1267_e5b7b9b462.jpg',
    'Planinarenje na Durmitoru',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Planinarenje na Durmitoru'),
    NOW()),
(
    'https://explore-serbia.rs/wp-content/uploads/2022/09/Durmitor-Bobotov-Kuk-1.jpg',
    'Planinarenje na Durmitoru',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Planinarenje na Durmitoru'),
    NOW()),
(
    'https://explore-serbia.rs/wp-content/uploads/2022/09/Durmitor-Bobotov-Kuk-2.jpg',
    'Planinarenje na Durmitoru',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Planinarenje na Durmitoru'),
    NOW()),
(
    'https://www.montenegrofortravellers.com/sites/default/files/styles/monte1140x550/public/place/top_hill_budva_nochnoy_klub_top_hill_v_budve.jpg?itok=zTr34xsE',
    'Nocni provod Budva',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Nocni provod Budva'),
    NOW()),
(
    'https://apartments-sofija.com/wp-content/uploads/budva-party-apartments-1.jpg',
    'Nocni provod Budva',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Nocni provod Budva'),
    NOW()),
(
    'https://www.budvanocu.com/getimage.php?img=p18rspcf3312ih5uk1uf4eb99bm1.jpg&w=600',
    'Nocni provod Budva',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Nocni provod Budva'),
    NOW()),
(
    'https://balkanfun.travel/sites/default/files/inline-images/nocni-klub-plesanje.jpg',
    'Nocni provod Budva',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Nocni provod Budva'),
    NOW()),
(
    'https://www.sentandrea.com/images/2018/11/s2.jpg',
    'Degustacija morskih specijaliteta',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Degustacija morskih specijaliteta'),
    NOW()),
(
    'https://www.sentandrea.com/images/2018/11/s4.jpg',
    'Degustacija morskih specijaliteta',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Degustacija morskih specijaliteta'),
    NOW()),
(
    'https://www.bevanda.co.rs/images/w2.jpg',
    'Degustacija morskih specijaliteta',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Degustacija morskih specijaliteta'),
    NOW()),
(
    'https://www.sentandrea.com/images/2018/11/oh2-650x630.jpg',
    'Degustacija morskih specijaliteta',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Degustacija morskih specijaliteta'),
    NOW()),
(
    'https://cdn.getyourguide.com/img/tour/b462479da72df66db77e9a7154f272c7ba1b86fe125727996216cb2ad1a398fc.jpg/99.jpg',
    'Setnja starim gradom Kotora',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Setnja starim gradom Kotora'),
    NOW()),
(
    'https://monteonline.org/wp-content/uploads/2023/01/oldtownkotor05.jpg',
    'Setnja starim gradom Kotora',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Setnja starim gradom Kotora'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/03/shutterstock_1703935768-1000x600.jpg',
    'Setnja starim gradom Kotora',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Setnja starim gradom Kotora'),
    NOW()),
(
    'https://respectacar.com/storage/blog/c5cf293f-db96-4743-9f6c-6ad90f46846b/kotor-old-town.jpg',
    'Setnja starim gradom Kotora',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Setnja starim gradom Kotora'),
    NOW()),
(
    'https://skadarlakeboatcruise.com/wp-content/uploads/1111.jpg',
    'Voznja camcem Skadarsko jezero',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://skadarlakeboatcruise.com/wp-content/uploads/5-27.jpg',
    'Voznja camcem Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://static.wixstatic.com/media/a86f42_6eedbde07bcf4db293648d5a455d2646~mv2_d_5184_3456_s_4_2.jpg/v1/fill/w_862,h_1104,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/a86f42_6eedbde07bcf4db293648d5a455d2646~mv2_d_5184_3456_s_4_2.jpg',
    'Voznja camcem Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://visitskadarlake.com/wp-content/uploads/2025/10/WhatsApp-Image-2025-10-17-at-14.28.22_58e34723.jpg',
    'Voznja camcem Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://skadarlakeboatcruise.com/wp-content/uploads/7-7.jpg',
    'Voznja camcem Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://www.kolasin.com/img/hero/hero-3.jpg',
    'Skijanje Kolasin',
    true,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://skijalista.me/wp-content/uploads/DJI_0410-Copy.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://skijalista.me/wp-content/uploads/Kolasin-1600-11-scaled.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2026/01/vikend-kolasin-1450.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://i0.wp.com/primorski.me/wp-content/uploads/2026/02/Kolasin-1450-1.jpg?fit=1920%2C1080&ssl=1',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW())
    ;

-- ============================================
-- 14. SPAIN DEMO CONTENT
-- ============================================

-- 14.2 DESTINATIONS
INSERT INTO "Destinations"
("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Barcelona', 'Katalonski grad poznat po arhitekturi, plazama i energicnom gradskom zivotu',
 ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NULL, NOW(), NOW()),

('Madrid', 'Glavni grad Spanije sa bogatom kulturnom scenom, galerijama i gradskim trgovima',
 ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NULL, NOW(), NOW()),

('Valencia', 'Mediteranski grad poznat po paelji, modernoj arhitekturi i opustenoj obali',
 ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NULL, NOW(), NOW());

WITH spain_manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Barcelona', 'manager.barcelona@spirego.com'),
        ('Madrid', 'manager.madrid@spirego.com'),
        ('Valencia', 'manager.valencia@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Destinations" d
SET "ManagedByUserId" = m.manager_id
FROM spain_manager_assignments m
WHERE d."Id" = m.destination_id;

WITH spain_manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Barcelona', 'manager.barcelona@spirego.com'),
        ('Madrid', 'manager.madrid@spirego.com'),
        ('Valencia', 'manager.valencia@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Users" u
SET "ManagedDestinationId" = m.destination_id
FROM spain_manager_assignments m
WHERE u."Id" = m.manager_id;

-- 14.3 LOCALITIES
INSERT INTO "Localities"
("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
VALUES
('Gothic Quarter Barcelona', 'Istorijsko jezgro Barselone sa uskim ulicama, trgovima i bogatom gastronomijom',
 ST_SetSRID(ST_MakePoint(2.1760, 41.3839), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NOW()),

('Barceloneta Beach', 'Zivopisna barselonska plaza poznata po setalistu, sportovima i zalascima sunca',
 ST_SetSRID(ST_MakePoint(2.1966, 41.3780), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Plaza'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NOW()),

('Gran Via Madrid', 'Centralna gradska osa Madrida sa pozoristima, prodavnicama i istorijskim zgradama',
 ST_SetSRID(ST_MakePoint(-3.7058, 40.4202), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Madrid'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NOW()),

('Ciudad de las Artes Valencia', 'Savremeni kulturni kvart Valensije sa futuristickom arhitekturom i velikim javnim prostorima',
 ST_SetSRID(ST_MakePoint(-0.3516, 39.4553), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Valencia'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Kulturna cetvrt'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lucia.admin@spirego.com'), NOW());

UPDATE "Localities" l
SET "CreatedByUserId" = d."ManagedByUserId",
    "UpdatedAt" = NOW()
FROM "Destinations" d
WHERE l."DestinationId" = d."Id"
  AND d."Name" IN ('Barcelona', 'Madrid', 'Valencia');

-- 14.4 OBJECTS
INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Casa Batllo Suites', 'Boutique hotel u istorijskom jezgru Barselone sa pogledom na gradske krovove', 'Gothic Quarter, Barcelona', '+34930000001', 'https://www.barcelonaturisme.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 210.00, ARRAY['WiFi', 'Rooftop', 'Dorucak', 'Transfer'], ST_SetSRID(ST_MakePoint(2.1746, 41.3856), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gothic Quarter Barcelona'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Tapas House Gothic', 'Moderan restoran sa tapas jelima, lokalnim vinima i kasnim vecernjim servisom', 'Carrer del Bisbe, Barcelona', '+34930000002', 'https://www.barcelonaturisme.com',
 NULL, 'Tapas i mediteranska', '{"pon":"12:00-23:30"}', 38.00, ARRAY['WiFi', 'Terasa', 'Rezervacije', 'Veganske opcije'], ST_SetSRID(ST_MakePoint(2.1758, 41.3835), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gothic Quarter Barcelona'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Barceloneta Sunset Bar', 'Bar uz plazu sa koktelima, muzikom i otvorenom terasom prema moru', 'Passeig Maritim, Barcelona', '+34930000003', 'https://www.barcelonaturisme.com',
 NULL, 'Kokteli i bar food', '{"pon":"10:00-02:00"}', 18.00, ARRAY['Kokteli', 'Muzika', 'Pogled na more', 'Terasa'], ST_SetSRID(ST_MakePoint(2.1955, 41.3783), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Barceloneta Beach'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Gran Via Palace', 'Elegantni gradski hotel u centru Madrida, pogodan za obilaske i poslovna putovanja', 'Gran Via 42, Madrid', '+34910000001', 'https://www.esmadrid.com',
 NULL, NULL, '{"pon":"00:00-24:00"}', 195.00, ARRAY['WiFi', 'Spa', 'Parking', 'Dorucak'], ST_SetSRID(ST_MakePoint(-3.7049, 40.4205), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gran Via Madrid'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Madrid'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.madrid@spirego.com'),
 NOW(), NOW(), NOW()),

('Oceanic Bistro Valencia', 'Restoran inspirisan mediteranskom kuhinjom u modernom delu Valensije', 'Avinguda del Professor Lopez Pinero, Valencia', '+34960000001', 'https://www.visitvalencia.com',
 NULL, 'Mediteranska i spanjolska', '{"pon":"11:00-23:00"}', 34.00, ARRAY['Terasa', 'Pogled na vodu', 'Porodicno', 'Rezervacije'], ST_SetSRID(ST_MakePoint(-0.3508, 39.4557), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ciudad de las Artes Valencia'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Valencia'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.valencia@spirego.com'),
 NOW(), NOW(), NOW());

-- 14.5 ACTIVITIES
INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Gothic Tapas Walk', 'Vecernja setnja kroz istorijski deo Barselone uz tapas degustaciju i lokalna vina',
 ST_SetSRID(ST_MakePoint(2.1759, 41.3836), 4326), 28.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Degustacija hrane'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gothic Quarter Barcelona'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tapas House Gothic'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Barceloneta Sunset Ride', 'Lagani biciklisticki obilazak obale uz zavrsetak na plazi tokom zalaska sunca',
 ST_SetSRID(ST_MakePoint(2.1959, 41.3781), 4326), 18.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Biciklizam'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Barceloneta Beach'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Madrid Architecture Walk', 'Pesacka tura kroz centar Madrida sa fokusom na fasade, trgove i gradske price',
 ST_SetSRID(ST_MakePoint(-3.7052, 40.4204), 4326), 0.00, 150, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gran Via Madrid'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Madrid'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.madrid@spirego.com'),
 NOW(), NOW(), NOW()),

('Valencia Paella Experience', 'Gastronomsko iskustvo uz mediteranske ukuse i prezentaciju pripreme paelje',
 ST_SetSRID(ST_MakePoint(-0.3510, 39.4556), 4326), 32.00, 110, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Degustacija hrane'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ciudad de las Artes Valencia'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Valencia'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oceanic Bistro Valencia'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.valencia@spirego.com'),
 NOW(), NOW(), NOW());

-- 14.6 EVENTS
INSERT INTO "Events"
("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Barcelona Summer Lights', 'Letnji festivalski program sa muzikom, ulicnim performansima i nocnim obilascima istorijskog centra',
 ST_SetSRID(ST_MakePoint(2.1756, 41.3840), 4326), '2026-07-18 19:30', '2026-07-20 23:30', 18.00, 1200, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gothic Quarter Barcelona'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Casa Batllo Suites'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Barceloneta Sunset Session', 'Vecernji nastup na otvorenom sa DJ setovima i plaznim ambijentom',
 ST_SetSRID(ST_MakePoint(2.1961, 41.3782), 4326), '2026-08-09 20:00', '2026-08-10 00:30', 12.00, 500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Nastup'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Barceloneta Beach'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Barcelona'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Barceloneta Sunset Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.barcelona@spirego.com'),
 NOW(), NOW(), NOW()),

('Madrid Culture Week', 'Nedeljni gradski program sa manjim izlozbama, muzikom i vodjenim setnjama kroz centar',
 ST_SetSRID(ST_MakePoint(-3.7056, 40.4201), 4326), '2026-09-10 17:00', '2026-09-14 22:00', 15.00, 900, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Gran Via Madrid'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Madrid'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Gran Via Palace'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.madrid@spirego.com'),
 NOW(), NOW(), NOW()),

('Valencia Paella Fest', 'Gastronomski sajam sa degustacijama, live cooking segmentima i lokalnim proizvodjacima',
 ST_SetSRID(ST_MakePoint(-0.3513, 39.4555), 4326), '2026-10-03 12:00', '2026-10-03 21:00', 10.00, 700, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Sajam'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ciudad de las Artes Valencia'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Valencia'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oceanic Bistro Valencia'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'carmen.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.valencia@spirego.com'),
 NOW(), NOW(), NOW());

-- 14.7 REVIEWS
INSERT INTO "Reviews"
("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
VALUES
((SELECT "Id" FROM "Users" WHERE "Email" = 'diego.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Casa Batllo Suites'),
 5, 'Sjajna lokacija i odlican dorucak, hotel je idealan za obilazak Barselone.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'sofia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Casa Batllo Suites'),
 4, 'Veoma prijatan smestaj i lep pogled sa krova, recepcija je bila brza i ljubazna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'elena.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tapas House Gothic'),
 5, 'Tapasi su bili fantasticni, a osoblje je davalo odlicne preporuke za vino.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'diego.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Tapas House Gothic'),
 4, 'Odlicna hrana i fina atmosfera, samo je bilo malo guzve u vecernjem terminu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'sofia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Barceloneta Sunset Bar'),
 5, 'Savrsen zalazak sunca, muzika taman koliko treba i super kokteli.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'elena.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Gran Via Palace'),
 4, 'Hotel je tih i uredan, a Gran Via je odlicna baza za gradske obilaske.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'diego.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oceanic Bistro Valencia'),
 5, 'Paelja je bila odlicna, a ambijent moderan i opusten.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'sofia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oceanic Bistro Valencia'),
 4, 'Dobra usluga i lep pogled na moderni deo grada, preporuka za veceru.', 'Approved', NOW());

INSERT INTO "Reviews"
("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
VALUES

-- Pijaca Ulcinj
((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Ulcinj'),
 4, 'Dobra pijaca sa svežim voćem i povrćem. Lokalni proizvodi su odlični.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Pijaca Ulcinj'),
 5, 'Autentično mesto sa bogatom ponudom. Preporuka za sve koji vole lokalnu hranu.', 'Approved', NOW()),


-- Biblioteka Niksic
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
 4, 'Prijatno i tiho mesto za učenje. Mogao bi biti veći izbor novih knjiga.', 'Approved', NOW()),


-- Djecija igraonica Igalo
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecija igraonica Igalo'),
 5, 'Odlično mesto za decu, bezbedno i zabavno. Osoblje jako ljubazno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Djecija igraonica Igalo'),
 4, 'Deca su uživala, prostor je čist i lepo organizovan.', 'Approved', NOW()),


-- Crkva Svetog Nikole Bar
((SELECT "Id" FROM "Users" WHERE "Email" = 'stefan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
 5, 'Prelepa i mirna lokacija. Vredi posetiti zbog atmosfere i istorije.', 'Approved', NOW());

-- 14.8 IMAGES - DESTINATIONS
WITH source("Url", "AltText", "IsMain", "DestinationName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Barcelona%20Skyline.jpg', 'Barcelona', true, 'Barcelona'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barcelona', false, 'Barcelona'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Madrid', true, 'Madrid'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid%20-%20007.jpg', 'Madrid', false, 'Madrid'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Valencia', true, 'Valencia'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Valencia%20skyline%20sunset%20%284262234180%29.jpg', 'Valencia', false, 'Valencia')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", d."Id", NOW()
FROM source s
JOIN "Destinations" d ON d."Name" = s."DestinationName";

-- 14.9 IMAGES - LOCALITIES
WITH source("Url", "AltText", "IsMain", "LocalityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Gothic Quarter Barcelona', true, 'Gothic Quarter Barcelona'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Beach', true, 'Barceloneta Beach'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Gran Via Madrid', true, 'Gran Via Madrid'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Ciudad de las Artes Valencia', true, 'Ciudad de las Artes Valencia')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", l."Id", NOW()
FROM source s
JOIN "Localities" l ON l."Name" = s."LocalityName";

-- 14.10 IMAGES - OBJECTS
WITH source("Url", "AltText", "IsMain", "ObjectName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Barcelona%20Skyline.jpg', 'Hotel Casa Batllo Suites', true, 'Hotel Casa Batllo Suites'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Hotel Casa Batllo Suites', false, 'Hotel Casa Batllo Suites'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Tapas House Gothic', true, 'Tapas House Gothic'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona%20%2821%29%20%2830446599463%29.jpg', 'Tapas House Gothic', false, 'Tapas House Gothic'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Sunset Bar', true, 'Barceloneta Sunset Bar'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Sunset Bar', false, 'Barceloneta Sunset Bar'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Hotel Gran Via Palace', true, 'Hotel Gran Via Palace'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid%20-%20007.jpg', 'Hotel Gran Via Palace', false, 'Hotel Gran Via Palace'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Oceanic Bistro Valencia', true, 'Oceanic Bistro Valencia'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Valencia%20skyline%20sunset%20%284262234180%29.jpg', 'Oceanic Bistro Valencia', false, 'Oceanic Bistro Valencia')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", o."Id", NOW()
FROM source s
JOIN "Objects" o ON o."Name" = s."ObjectName";

-- 14.11 IMAGES - EVENTS
WITH source("Url", "AltText", "IsMain", "EventName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Barcelona Summer Lights', true, 'Barcelona Summer Lights'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Sunset Session', true, 'Barceloneta Sunset Session'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Madrid Culture Week', true, 'Madrid Culture Week'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Valencia Paella Fest', true, 'Valencia Paella Fest')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", e."Id", NOW()
FROM source s
JOIN "Events" e ON e."Name" = s."EventName";

-- 14.12 IMAGES - ACTIVITIES
WITH source("Url", "AltText", "IsMain", "ActivityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Gothic Tapas Walk', true, 'Gothic Tapas Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Sunset Ride', true, 'Barceloneta Sunset Ride'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Madrid Architecture Walk', true, 'Madrid Architecture Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Valencia Paella Experience', true, 'Valencia Paella Experience')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", a."Id", NOW()
FROM source s
JOIN "Activities" a ON a."Name" = s."ActivityName";

-- 14.13 REGION FOCUS + CUISINE BACKFILL
UPDATE "Regions"
SET "CenterLongitude" = 12.4964,
    "CenterLatitude" = 42.4279,
    "DefaultMapZoom" = 6.4,
    "UpdatedAt" = NOW()
WHERE "Code" = 'IT';

UPDATE "Regions"
SET "CenterLongitude" = 20.7505,
    "CenterLatitude" = 43.8914,
    "DefaultMapZoom" = 7.2,
    "UpdatedAt" = NOW()
WHERE "Code" = 'RS';

UPDATE "Objects"
SET "CuisineType" = CASE "Name"
    WHEN 'Restoran Galion' THEN 'Mediteranska i morski plodovi'
    WHEN 'Hotel Avala' THEN 'Internacionalna i mediteranska'
    WHEN 'Hotel Vardar' THEN 'Mediteranska i internacionalna'
    WHEN 'Hotel Bianca Kolasin' THEN 'Planinska i internacionalna'
    ELSE "CuisineType"
END,
    "UpdatedAt" = NOW()
WHERE "Name" IN ('Restoran Galion', 'Hotel Avala', 'Hotel Vardar', 'Hotel Bianca Kolasin')
  AND COALESCE("CuisineType", '') = '';

-- 15. ITALIJA + SRBIJA DEMO KORISNICI
INSERT INTO "Users"
("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language", "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole",
 "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
VALUES
('Giulia', 'Bianchi', '1988-06-14', 'giulia.admin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+390600000001', 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Lorenzo', 'Conti', '1991-04-03', 'lorenzo.creator@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+390600000002', 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Alessandro', 'Ricci', '1989-08-27', 'manager.rome@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+390600000003', 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Martina', 'Greco', '1990-11-19', 'manager.venice@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+390600000004', 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Sara', 'Galli', '1992-01-08', 'manager.florence@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+390600000005', 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Chiara', 'Rossi', '1997-07-12', 'chiara.italy.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Marco', 'Esposito', '1995-03-30', 'marco.italy.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Bianca', 'Ferri', '1998-10-21', 'bianca.italy.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Italija', 'it', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Milica', 'Petrovic', '1987-02-11', 'milica.admin.serbia@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+381640000001', 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Jelena', 'Nikolic', '1992-05-18', 'jelena.creator@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+381640000002', 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Stefan', 'Jovanovic', '1989-09-02', 'manager.belgrade@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+381640000003', 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ana', 'Markovic', '1990-12-14', 'manager.novisad@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+381640000004', 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Nikola', 'Savic', '1988-04-25', 'manager.zlatibor@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+381640000005', 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Tamara', 'Ilic', '1997-01-17', 'tamara.serbia.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Andrija', 'Stojanovic', '1996-08-09', 'andrija.serbia.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Teodora', 'Pavlovic', '1998-06-06', 'teodora.serbia.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png');

-- 15.1 ITALIJA + SRBIJA DESTINACIJE
INSERT INTO "Destinations"
("Name", "DisplayTitle", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Rome', 'Rimske ulice, fontane i vecere u Trastevereu',
 'Rim je grad u kojem se svakodnevni ritam mesa sa antickim slojevima istorije, trgovima, fontanama i dugim vecerama. Putnik u jednom danu moze da obidje Koloseum, da sedne na kafu u malom baru i da zavrsi vece uz testeninu i vino u Trastevereu.',
 ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'IT'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.rome@spirego.com'),
 NOW(), NOW()),
('Venice', 'Kanali, kameni prolazi i veceri oko San Marka',
 'Venecija nudi sporiji ritam obilaska, setnje preko mostova i male gastronomske pauze uz poglede na kanale. Grad je posebno zanimljiv putnicima koji vole atmosferu, umetnost i osecaj da je gotovo svaka ulica scenografija.',
 ST_SetSRID(ST_MakePoint(12.3155, 45.4408), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'IT'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.venice@spirego.com'),
 NOW(), NOW()),
('Florence', 'Renesansa, mostovi i toskanski ritam grada',
 'Firenca spaja umetnost, zanatstvo i toskansku gastronomiju na malom prostoru koji je lako obici peske. Grad je odlican za putnike koji zele da kombinuju muzeje, panoramske poglede, lagan gradski tempo i ozbiljno dobru hranu.',
 ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'IT'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.florence@spirego.com'),
 NOW(), NOW()),
('Belgrade', 'Tvrdjava, gradske ulice i nocni ritam prestonice',
 'Beograd je grad sirokih bulevara, tvrdjave iznad usca i kafana koje zive do kasno. Posetioci ovde lako kombinuju istorijske tacke, moderni gradski ritam, dobru kafu i vecere koje se cesto produze vise nego sto je planirano.',
 ST_SetSRID(ST_MakePoint(20.4573, 44.8176), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'RS'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.belgrade@spirego.com'),
 NOW(), NOW()),
('Novi Sad', 'Trgovi, tvrdjava i lagani tempo uz Dunav',
 'Novi Sad ima mirniji ritam, ali bogat gradski sadrzaj, uredjene trgove, dobru gastronomsku scenu i jak kulturni identitet. Posebno je prijatan za putnike koji vole setnju, dobru hranu i pogled sa Petrovaradina prema Dunavu i gradu.',
 ST_SetSRID(ST_MakePoint(19.8335, 45.2671), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'RS'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.novisad@spirego.com'),
 NOW(), NOW()),
('Zlatibor', 'Planinski vazduh, vidikovci i opusten ritam dana',
 'Zlatibor je destinacija za sporiji planinski ritam, panoramske poglede, duge setnje i odmor uz lokalne specijalitete. Pogodan je i za kratke vikend odmore i za duze boravke kada neko zeli da kombinuje prirodu, wellness i lakse aktivnosti napolju.',
 ST_SetSRID(ST_MakePoint(19.7023, 43.7299), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Planina'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'RS'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zlatibor@spirego.com'),
 NOW(), NOW());

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome')
WHERE "Email" = 'manager.rome@spirego.com';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice')
WHERE "Email" = 'manager.venice@spirego.com';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence')
WHERE "Email" = 'manager.florence@spirego.com';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade')
WHERE "Email" = 'manager.belgrade@spirego.com';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad')
WHERE "Email" = 'manager.novisad@spirego.com';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor')
WHERE "Email" = 'manager.zlatibor@spirego.com';

-- 15.2 ITALIJA + SRBIJA LOKALITETI
INSERT INTO "Localities"
("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
VALUES
('Trastevere Rome', 'Kvart sa uskim ulicama, restoranima, vinskim barovima i vecernjom atmosferom po kojoj je Rim prepoznatljiv.',
 ST_SetSRID(ST_MakePoint(12.4712, 41.8895), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('Colosseum District', 'Istorijski deo Rima oko Koloseuma i okolnih arheoloskih tacaka, pogodan za prve obilaske grada.',
 ST_SetSRID(ST_MakePoint(12.4922, 41.8902), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('San Marco Venice', 'Najpoznatiji centralni prostor Venecije sa trgovima, bazilikom i stalnim tokom posetilaca tokom celog dana.',
 ST_SetSRID(ST_MakePoint(12.3378, 45.4340), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('Grand Canal Venice', 'Glavna gradska vodena osa sa pogledima na palate, mostove i neprekidno kretanje vodenog saobracaja.',
 ST_SetSRID(ST_MakePoint(12.3310, 45.4380), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('Duomo Florence', 'Istorijsko jezgro oko katedrale koje je uvek puno setaca, manjih prodavnica i lokala za kratku pauzu izmedju obilazaka.',
 ST_SetSRID(ST_MakePoint(11.2558, 43.7731), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('Ponte Vecchio Florence', 'Zona oko najpoznatijeg firentinskog mosta, popularna za setnje u kasno popodne i panoramske fotografije.',
 ST_SetSRID(ST_MakePoint(11.2531, 43.7679), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'giulia.admin@spirego.com'), NOW()),
('Terazije Belgrade', 'Siri centar Beograda sa hotelima, starim gradskim fasadama i lakim pristupom pesackim zonama.',
 ST_SetSRID(ST_MakePoint(20.4623, 44.8141), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW()),
('Kalemegdan Belgrade', 'Tvrdjava i park iznad usca, omiljena tacka za setnju, pogled i krace predah pauze.',
 ST_SetSRID(ST_MakePoint(20.4489, 44.8230), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Tvrdjava'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW()),
('Trg Slobode Novi Sad', 'Glavni gradski trg Novog Sada, pregledan i prijatan za obilazak peske sa mnogo kafica u neposrednoj blizini.',
 ST_SetSRID(ST_MakePoint(19.8423, 45.2554), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW()),
('Petrovaradin Fortress', 'Petrovaradinska tvrdjava sa vidikovcima, tunelima i jednim od najlepsih pogleda na grad i Dunav.',
 ST_SetSRID(ST_MakePoint(19.8644, 45.2528), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Tvrdjava'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW()),
('Kraljev Trg Zlatibor', 'Centralni plato Zlatibora sa hotelima, setalistem i lakim pristupom glavnim sadrzajima planinskog centra.',
 ST_SetSRID(ST_MakePoint(19.7005, 43.7287), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Centar grada'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW()),
('Tornik Viewpoint', 'Vidikovac i siri prostor Tornika, odlican za panorame, kratke pauze i aktivnosti na otvorenom.',
 ST_SetSRID(ST_MakePoint(19.6409, 43.6945), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Vidikovac'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'milica.admin.serbia@spirego.com'), NOW());

UPDATE "Localities" l
SET "CreatedByUserId" = d."ManagedByUserId",
    "UpdatedAt" = NOW()
FROM "Destinations" d
WHERE l."DestinationId" = d."Id"
  AND d."Name" IN ('Rome', 'Venice', 'Florence', 'Belgrade', 'Novi Sad', 'Zlatibor')
  AND d."ManagedByUserId" IS NOT NULL;

-- 15.3 ITALIJA + SRBIJA OBJEKTI
INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Artemide Rome', 'Hotel u centralnom delu Rima sa komfornim sobama, krovnim barom i lokacijom pogodnom za obilazak glavnih znamenitosti peske.', 'Via Nazionale 22, Rome', '+3906499911', 'https://www.hotelartemide.it/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 240.00, ARRAY['WiFi', 'Spa', 'Dorucak', 'Rooftop'], ST_SetSRID(ST_MakePoint(12.4938, 41.9017), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Colosseum District'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.rome@spirego.com'),
 NOW(), NOW(), NOW()),
('Rione 13 Trastevere', 'Restoran u Trastevereu fokusiran na rimske klasike, pizzu i opustenu vecernju atmosferu. Dobar je izbor kada neko zeli da spoji kvartovsku setnju i konkretnu veceru.', 'Via Roma Libera 19, Rome', '+39065817418', 'https://www.rione13ristorante.com/en',
 'https://www.rione13ristorante.com/en/menu', 'Rimska i italijanska', '{"pon":"12:00-23:30"}', 32.00, ARRAY['Rezervacije', 'Terasa', 'Vegetarijanske opcije', 'Vinska karta'], ST_SetSRID(ST_MakePoint(12.4707, 41.8898), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trastevere Rome'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.rome@spirego.com'),
 NOW(), NOW(), NOW()),
('Hotel Canaletto Venice', 'Miran hotel u istorijskom jezgru Venecije sa tradicionalnim enterijerom i lakim pristupom mostovima i trgovima.', 'Castello 5487, Venice', '+390415220518', 'https://www.hotelcanaletto.com/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 265.00, ARRAY['WiFi', 'Dorucak', 'Concierge', 'Bar'], ST_SetSRID(ST_MakePoint(12.3391, 45.4364), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'San Marco Venice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.venice@spirego.com'),
 NOW(), NOW(), NOW()),
('Bistrot de Venise', 'Restoran koji naglasak stavlja na istorijsku venecijansku kuhinju, ribu i pazljivo uparivanje jela i vina. Ambijent je formalniji, ali usluga i lokacija opravdavaju sporiji, duzi obrok.', 'San Marco 4685, Venice', '+390415236651', 'https://www.bistrotdevenise.com/en/',
 'https://www.bistrotdevenise.com/en/menu/', 'Venecijanska i morski plodovi', '{"pon":"12:00-22:30"}', 48.00, ARRAY['Rezervacije', 'Vinska karta', 'Morski plodovi', 'Fine dining'], ST_SetSRID(ST_MakePoint(12.3369, 45.4375), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'San Marco Venice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.venice@spirego.com'),
 NOW(), NOW(), NOW()),
('Hotel Davanzati Florence', 'Manji hotel u srcu Firence, miran i praktican za obilazak starog jezgra bez oslanjanja na prevoz. Dobro funkcionise za parove i za kratke gradske boravke.', 'Via Porta Rossa 5, Florence', '+39055286666', 'https://www.hoteldavanzati.it/?lang=eng',
 NULL, NULL, '{"pon":"00:00-24:00"}', 230.00, ARRAY['WiFi', 'Dorucak', 'Happy hour', 'Transfer'], ST_SetSRID(ST_MakePoint(11.2529, 43.7697), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ponte Vecchio Florence'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.florence@spirego.com'),
 NOW(), NOW(), NOW()),
('La Loggia Firenze', 'Panoramski restoran sa pogledom na Firencu, jelima koja spajaju toskansku bazu i moderniji pristup servisu. Posebno je dobar za duzi rucak ili veceru sa pogledom.', 'Piazzale Michelangelo 1, Florence', '+390552342832', 'https://ristorantelaloggia.it/en/menus/',
 'https://ristorantelaloggia.it/en/menus/', 'Toskanska i moderna italijanska', '{"pon":"11:00-23:00"}', 55.00, ARRAY['Pogled na grad', 'Rezervacije', 'Vinska karta', 'Terasa'], ST_SetSRID(ST_MakePoint(11.2552, 43.7635), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ponte Vecchio Florence'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.florence@spirego.com'),
 NOW(), NOW(), NOW()),
('Hotel Moskva Belgrade', 'Istorijski hotel u centru Beograda koji je dobar izbor za goste kojima je bitna lokacija i prepoznatljiv gradski ambijent. Koristan je i za poslovna putovanja i za kratke gradske vikende.', 'Terazije 20, Belgrade', '+381113648999', 'https://hotelmoskva.rs/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 185.00, ARRAY['WiFi', 'Spa', 'Dorucak', 'Poslasticarnica'], ST_SetSRID(ST_MakePoint(20.4613, 44.8135), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Terazije Belgrade'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.belgrade@spirego.com'),
 NOW(), NOW(), NOW()),
('Restoran Frans Beograd', 'Veliki gradski restoran sa sirokim jelovnikom, bastom i ponudom koja pokriva i klasicna domaca jela i internacionalnije izbore. Dobro radi i za porodicne ruckove i za duza vecernja sedenja.', 'Bulevar oslobodjenja 18G, Belgrade', '+381652641944', 'https://frans.rs/',
 'https://frans.rs/menu/jelovnik/', 'Srpska i internacionalna', '{"pon":"09:00-23:30"}', 27.00, ARRAY['Basta', 'Rezervacije', 'Parking', 'Vegetarijanske opcije'], ST_SetSRID(ST_MakePoint(20.4691, 44.7976), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Terazije Belgrade'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.belgrade@spirego.com'),
 NOW(), NOW(), NOW()),
('Hotel Pupin Novi Sad', 'Moderan gradski hotel sa centralnom pozicijom i lakim pristupom trgovima, pesackoj zoni i obali Dunava. Cesto je dobar kompromis izmedju komfora, lokacije i urednog servisa.', 'Narodnih Heroja 3, Novi Sad', '+381212156000', 'https://hotelpupin.rs/en/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 170.00, ARRAY['WiFi', 'Parking', 'Dorucak', 'Fitness'], ST_SetSRID(ST_MakePoint(19.8414, 45.2559), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode Novi Sad'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.novisad@spirego.com'),
 NOW(), NOW(), NOW()),
('Kalem by Zak Novi Sad', 'Restoran i gradski lounge sa savremenijom ponudom, koktelima i urbanim ambijentom. Praktican je za goste koji hoce ozbiljniji rucak, ali i opusteniji vecernji izlazak bez napustanja centra.', 'Narodnih Heroja 3, Novi Sad', '+381668888021', 'https://hotelpupin.rs/en/dining/kalem-by-zak/',
 'https://hotelpupin.rs/en/dining/kalem-by-zak/menu-kalem/', 'Moderna evropska i lokalna', '{"pon":"08:00-23:30"}', 24.00, ARRAY['Terasa', 'Kokteli', 'Rezervacije', 'Dorucak'], ST_SetSRID(ST_MakePoint(19.8417, 45.2560), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode Novi Sad'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.novisad@spirego.com'),
 NOW(), NOW(), NOW()),
('Hotel Zlatibor Mountain Resort', 'Veliki planinski hotel sa wellness ponudom i lakim pristupom centralnom delu Zlatibora. Dobar je izbor za goste koji hoce da kombinuju smestaj, pogled i usluge u okviru jednog kompleksa.', 'Miladina Pecinara 31a, Zlatibor', '+381318450000', 'https://www.hotelzlatibor-resort.com/en/',
 NULL, NULL, '{"pon":"00:00-24:00"}', 160.00, ARRAY['WiFi', 'Spa', 'Parking', 'Bazen'], ST_SetSRID(ST_MakePoint(19.7014, 43.7284), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kraljev Trg Zlatibor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zlatibor@spirego.com'),
 NOW(), NOW(), NOW()),
('Lobby Bar Zlatibor', 'Bar i neformalni gastro kutak u centru Zlatibora sa laganijim jelima, koktelima i prijatnim mestom za pauzu tokom dana. Dobar je za opusten tempo, kafu i kasniji vecernji izlazak bez velike organizacije.', 'Miladina Pecinara 31a, Zlatibor', '+381318450001', 'https://www.hotelzlatibor-resort.com/en/lobby-bar/',
 'https://www.hotelzlatibor-resort.com/en/menu-lobby-bar/', 'Bar food i internacionalna', '{"pon":"09:00-00:30"}', 16.00, ARRAY['Kokteli', 'Pogled', 'Terasa', 'Dessert menu'], ST_SetSRID(ST_MakePoint(19.7011, 43.7282), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kraljev Trg Zlatibor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.zlatibor@spirego.com'),
 NOW(), NOW(), NOW());

-- 15.4 ITALIJA + SRBIJA AKTIVNOSTI
INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Trastevere Food Walk', 'Lagani gastronomski obilazak Trasteverea sa fokusom na rimske klasike, male ulice i mesta gde se najlepse vidi kako kvart zivi uvece.',
 ST_SetSRID(ST_MakePoint(12.4709, 41.8899), 4326), 29.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Degustacija hrane'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trastevere Rome'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rione 13 Trastevere'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Grand Canal Evening Walk', 'Setnja uz kanal i okolne prolaze, sa kratkim stajanjima na tackama odakle se najbolje vidi promena svetla predvece.',
 ST_SetSRID(ST_MakePoint(12.3312, 45.4382), 4326), 0.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Grand Canal Venice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Florence Sunset View Walk', 'Kraca ruta za posetioce koji zele da predvece prodju kroz istorijski centar i zavrse setnju na mestu odakle grad izgleda najfotogenicnije.',
 ST_SetSRID(ST_MakePoint(11.2538, 43.7682), 4326), 0.00, 100, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ponte Vecchio Florence'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Belgrade Fortress Sunset Walk', 'Setnja kroz Kalemegdan sa naglaskom na pogled ka uscu, kratke istorijske price i preporuke za nastavak veceri u centru.',
 ST_SetSRID(ST_MakePoint(20.4487, 44.8233), 4326), 0.00, 105, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kalemegdan Belgrade'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW()),
('Petrovaradin Fortress Walk', 'Obilazak tvrdjave i njenih glavnih tacaka sa dovoljno vremena za pogled na Novi Sad i krace fotografske pauze.',
 ST_SetSRID(ST_MakePoint(19.8641, 45.2529), 4326), 0.00, 95, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Petrovaradin Fortress'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW()),
('Zlatibor Panorama Ride', 'Lagano iskustvo kretanja kroz centralni deo Zlatibora i dalje prema vidikovcima, namenjeno gostima koji zele mirniji tempo i dobar pogled.',
 ST_SetSRID(ST_MakePoint(19.6660, 43.7030), 4326), 18.00, 130, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Tornik Viewpoint'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW());

-- 15.5 ITALIJA + SRBIJA EVENTI
INSERT INTO "Events"
("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Rome Piazza Music Evening', 'Vecernji koncert manjeg formata namenjen posetiocima koji posle obilaska grada zele mirniji kulturni program i dobru lokaciju za nastavak setnje. Atmosfera je opustena, bez prevelike guzve, sa fokusom na muziku i ambijent kvarta.',
 ST_SetSRID(ST_MakePoint(12.4711, 41.8897), 4326), '2026-09-11 18:30', '2026-09-11 22:30', 14.00, 300, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trastevere Rome'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rome'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rione 13 Trastevere'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Venice Lagoon Taste Week', 'Program degustacija i manjih kulinarskih prezentacija inspirisan venecijanskim jelima i sastojcima iz lagune. Dogadjaj je zamisljen kao sporiji gradski festival za goste koji uz razgledanje zele i ozbiljniji gastronomski sadrzaj.',
 ST_SetSRID(ST_MakePoint(12.3369, 45.4374), 4326), '2026-10-07 12:00', '2026-10-11 21:00', 20.00, 450, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'San Marco Venice'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Venice'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Bistrot de Venise'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Florence Artisan Evenings', 'Serija vecernjih okupljanja sa manjim radionicama, muzikom i fokusom na detalje koji Firencu cine gradom zanata i umetnosti. Dobra je opcija za posetioce koji zele sadrzaj izmedju klasicnog obilaska i formalnog koncerta.',
 ST_SetSRID(ST_MakePoint(11.2540, 43.7684), 4326), '2026-09-25 17:00', '2026-09-27 22:00', 12.00, 350, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Ponte Vecchio Florence'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Florence'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'La Loggia Firenze'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'lorenzo.creator@spirego.com'),
 NOW(), NOW()),
('Belgrade Coffee and Jazz Night', 'Manji vecernji program sa jazz nastupom i toplijom lounge atmosferom, namenjen gostima koji vole centar grada i laganiji izlazak. Uslovljen je sedecim formatom i nije preglasan, pa dobro odgovara i turistima koji sutradan nastavljaju obilazak.',
 ST_SetSRID(ST_MakePoint(20.4612, 44.8134), 4326), '2026-11-05 18:00', '2026-11-05 23:00', 9.00, 220, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Nastup'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Terazije Belgrade'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Belgrade'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Moskva Belgrade'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW()),
('Novi Sad Gourmet Weekend', 'Dvodevni gradski gastro program sa degustacijama, koktelima i manjim live cooking segmentima. Ideja je da posetioci spoje vikend u centru Novog Sada, setnju do tvrdjave i nekoliko kvalitetnih obroka na maloj udaljenosti.',
 ST_SetSRID(ST_MakePoint(19.8418, 45.2559), 4326), '2026-10-16 14:00', '2026-10-18 22:00', 11.00, 400, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Sajam'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode Novi Sad'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Novi Sad'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kalem by Zak Novi Sad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW()),
('Zlatibor Mountain Taste Days', 'Planinski vikend program sa laganijim gastro ponudama, toplim napicima i muzikom prikladnom za opusten kraj dana. Koncept je prilagodjen gostima koji zele da posle setnje ili spa dana imaju jednostavan, prijatan vecernji sadrzaj.',
 ST_SetSRID(ST_MakePoint(19.7010, 43.7283), 4326), '2026-12-12 15:00', '2026-12-13 22:00', 8.00, 260, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kraljev Trg Zlatibor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Zlatibor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lobby Bar Zlatibor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'jelena.creator@spirego.com'),
 NOW(), NOW());

-- 15.6 ITALIJA + SRBIJA RECENZIJE
INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
VALUES
((SELECT "Id" FROM "Users" WHERE "Email" = 'chiara.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Artemide Rome'),
 5, 'Lokacija je bila odlicna za prvi obilazak Rima, a osoblje je brzo resavalo sitne zahteve oko kasnog check-ina. Soba nije bila ogromna, ali je sve delovalo uredno i kvalitetno odrzavano.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'marco.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Artemide Rome'),
 4, 'Dopao mi se rooftop i cinjenica da se vecina znamenitosti moze obici peske. Jedino je dorucak bio jaci prvi dan nego drugog jutra, ali ukupni utisak je i dalje vrlo dobar.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'bianca.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rione 13 Trastevere'),
 5, 'Hrana je stigla brzo i nijedno jelo nije delovalo genericki, sto mi je bilo vazno jer sam htela bas rimski fazon vecere. Konobari su lepo objasnili sta je jace, a sta lakse za deljenje.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'marco.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rione 13 Trastevere'),
 3, 'Pasta je bila dobra, ali je terasa bila dosta bucna i cekali smo duze na drugo pice nego sto bih voleo. Vratio bih se zbog hrane, ali ne u najudarnijem terminu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'chiara.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Canaletto Venice'),
 4, 'Hotel ima lep, starinski karakter i osoblje je dalo korisne savete za kretanje kroz manje prometne ulice. Soba je bila tiha, mada bi kupatilo moglo da se osvezi.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'bianca.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Canaletto Venice'),
 3, 'Boravak je bio prijatan i lokacija je vrlo dobra za pesacke obilaske, ali je prostor delovao malo skuplje nego sto realno nudi. Ako je cilj centar Venecije bez mnogo komplikacija, hotel i dalje radi posao.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'marco.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Bistrot de Venise'),
 5, 'Ovde se stvarno oseca da kuhinja ima identitet i da neko vodi racuna o detaljima, ne samo o prezentaciji. Usluga je bila mirna i profesionalna, bez onog osecaja da te ubrzavaju da oslobodis sto.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'chiara.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Bistrot de Venise'),
 4, 'Jela su bila vrlo dobra, posebno riba i vino uz veceru, ali cene su vise i to treba imati u vidu. Za jedno vece u Veneciji kada zelis ozbiljniji obrok, izbor je opravdan.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'bianca.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Davanzati Florence'),
 4, 'Hotel je prijatan i deluje toplije od klasicnih gradskih hotela, sto mi je posebno prijalo posle dugog dana po muzeju. Lokacija je jaka strana, a dorucak je bio sasvim korektan.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'marco.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Davanzati Florence'),
 5, 'Osoblje je bilo zaista gostoljubivo i nekoliko sitnih preporuka za veceru nam je znacilo vise nego bilo koji turisticki vodic. Sve je bilo cisto, mirno i bez neprijatnih iznenadjenja.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'chiara.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'La Loggia Firenze'),
 3, 'Pogled je sjajan i vredan dolaska, ali su neka jela vise igrala na utisak nego na dubinu ukusa. Nije lose, samo treba ici sa idejom da placas i lokaciju i atmosferu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'bianca.italy.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'La Loggia Firenze'),
 5, 'Vece ovde je bilo jedno od najboljih u Firenci jer se dobar pogled uklopio sa opustenom uslugom i finim ritmom posluzenja. Nije mesto za brz obrok, ali za duzu veceru radi odlicno.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Moskva Belgrade'),
 5, 'Svidelo mi se sto hotel ima prepoznatljiv karakter i ne deluje kao bilo koji moderan lanac bez identiteta. Lokacija je odlicna za peske i za dnevni obilazak i za vecernji povratak.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'andrija.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Moskva Belgrade'),
 4, 'Soba je bila uredna i mirna, a osoblje profesionalno, ali je ceo dozivljaj vise klasicno gradski nego luksuzan. Ipak, zbog lokacije i atmosfere bih ga opet uzeo za kraci boravak.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'teodora.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Frans Beograd'),
 4, 'Jelovnik je sirok i lako je naci nesto i za ljude koji vole klasiku i za one koji hoce laksi obrok. Usluga je bila dobra, samo je terasa bila dosta puna pa je ritam malo usporio.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Frans Beograd'),
 3, 'Hrana je korektna i porcije su ozbiljne, ali mesto vise volim za duze sedenje i drustvo nego za nesto posebno gastronomsko. Ako neko ocekuje mirniji restoran, guzva moze malo da zasmeta.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'andrija.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Pupin Novi Sad'),
 5, 'Hotel je uredan, moderan i vrlo praktican kada hoces da budes blizu glavnog trga i pesacke zone. Posebno mi je znacilo sto sve deluje novo i dobro organizovano bez nepotrebne pompe.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'teodora.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Pupin Novi Sad'),
 4, 'Lokacija je jaka strana, a dorucak i prijava su prosli bez problema. Jedino je pogled iz sobe bio manje zanimljiv nego sto sam ocekivala po fotografijama.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kalem by Zak Novi Sad'),
 5, 'Mesto ima fin balans izmedju ozbiljnog rucka i opustenije gradske energije, pa je lako ostati duze nego sto planiras. Hrana nije bila teska, a kokteli su bili iznad ocekivanja.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'andrija.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Kalem by Zak Novi Sad'),
 4, 'Ambijent je vrlo prijatan i lokacija zgodna kada si vec u centru, a meni ima dovoljno izbora da grupa lako nadje zajednicki termin. Cene nisu najnize, ali servis je bio uredan i brz.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'teodora.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Zlatibor Mountain Resort'),
 3, 'Hotel ima dosta sadrzaja i dobra je baza za kraci odmor, ali u spicu se oseca da kroz zajednicke prostore prolazi veliki broj gostiju. Kada je cilj prakticnost i spa, to ne mora da bude problem.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'tamara.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Zlatibor Mountain Resort'),
 4, 'Spa i lokacija u centru su mi bili najveci plus, a osoblje je bilo vrlo korektno kada smo trazili kasniji check-out. Dobar je izbor ako zelis da sve bude na jednom mestu.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'andrija.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lobby Bar Zlatibor'),
 2, 'Pice je bilo okej, ali je usluga tog dana bila sporija nego sto sam ocekivao, a muzika je bila glasnija nego sto prija kada hoces samo kratku pauzu. Za opusten razgovor nisam uhvatio pravi termin.', 'Approved', NOW()),
((SELECT "Id" FROM "Users" WHERE "Email" = 'teodora.serbia.tourist@spirego.com'), (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lobby Bar Zlatibor'),
 4, 'Kad smo svratili ranije popodne atmosfera je bila dosta prijatnija i mesto je lepo leglo za kratki predah posle setnje. Karta pica je solidna, a prostor deluje moderno i uredno.', 'Approved', NOW());

-- 15.7 ITALIJA + SRBIJA IMAGES - DESTINACIJE
WITH source("Url", "AltText", "IsMain", "DestinationName") AS (
    VALUES
    ('https://i0.wp.com/media1.lepojeziveti.com/2018/04/vitorrio-emanuelle-panorama.jpg', 'Rome', true, 'Rome'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Venice', true, 'Venice'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Florence', true, 'Florence'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Belgrade', true, 'Belgrade'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Novi Sad', true, 'Novi Sad'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Zlatibor', true, 'Zlatibor')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", d."Id", NOW()
FROM source s
JOIN "Destinations" d ON d."Name" = s."DestinationName";

-- 15.8 ITALIJA + SRBIJA IMAGES - LOKALITETI
WITH source("Url", "AltText", "IsMain", "LocalityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Trastevere Rome', true, 'Trastevere Rome'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%20%28Rome%29.jpg', 'Colosseum District', true, 'Colosseum District'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Piazza%20San%20Marco%2C%20Venice.jpg', 'San Marco Venice', true, 'San Marco Venice'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Grand Canal Venice', true, 'Grand Canal Venice'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Duomo Florence', true, 'Duomo Florence'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Ponte Vecchio Florence', true, 'Ponte Vecchio Florence'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Terazije Belgrade', true, 'Terazije Belgrade'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Kalemegdan Belgrade', true, 'Kalemegdan Belgrade'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Trg Slobode Novi Sad', true, 'Trg Slobode Novi Sad'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Petrovaradin.jpg', 'Petrovaradin Fortress', true, 'Petrovaradin Fortress'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Kraljev Trg Zlatibor', true, 'Kraljev Trg Zlatibor'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Planina%20Zlatibor.JPG', 'Tornik Viewpoint', true, 'Tornik Viewpoint')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", l."Id", NOW()
FROM source s
JOIN "Localities" l ON l."Name" = s."LocalityName";

-- 15.9 ITALIJA + SRBIJA IMAGES - OBJEKTI
WITH source("Url", "AltText", "IsMain", "ObjectName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%20%28Rome%29.jpg', 'Hotel Artemide Rome', true, 'Hotel Artemide Rome'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Rione 13 Trastevere', true, 'Rione 13 Trastevere'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Piazza%20San%20Marco%2C%20Venice.jpg', 'Hotel Canaletto Venice', true, 'Hotel Canaletto Venice'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Bistrot de Venise', true, 'Bistrot de Venise'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Hotel Davanzati Florence', true, 'Hotel Davanzati Florence'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'La Loggia Firenze', true, 'La Loggia Firenze'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Hotel Moskva Belgrade', true, 'Hotel Moskva Belgrade'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Restoran Frans Beograd', true, 'Restoran Frans Beograd'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Hotel Pupin Novi Sad', true, 'Hotel Pupin Novi Sad'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Kalem by Zak Novi Sad', true, 'Kalem by Zak Novi Sad'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Hotel Zlatibor Mountain Resort', true, 'Hotel Zlatibor Mountain Resort'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Lobby Bar Zlatibor', true, 'Lobby Bar Zlatibor')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", o."Id", NOW()
FROM source s
JOIN "Objects" o ON o."Name" = s."ObjectName";

-- 15.10 ITALIJA + SRBIJA IMAGES - EVENTI
WITH source("Url", "AltText", "IsMain", "EventName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Rome Piazza Music Evening', true, 'Rome Piazza Music Evening'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Venice Lagoon Taste Week', true, 'Venice Lagoon Taste Week'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Florence Artisan Evenings', true, 'Florence Artisan Evenings'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Belgrade Coffee and Jazz Night', true, 'Belgrade Coffee and Jazz Night'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Novi Sad Gourmet Weekend', true, 'Novi Sad Gourmet Weekend'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Zlatibor Mountain Taste Days', true, 'Zlatibor Mountain Taste Days')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", e."Id", NOW()
FROM source s
JOIN "Events" e ON e."Name" = s."EventName";

-- 15.11 ITALIJA + SRBIJA IMAGES - AKTIVNOSTI
WITH source("Url", "AltText", "IsMain", "ActivityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Trastevere Food Walk', true, 'Trastevere Food Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Grand Canal Evening Walk', true, 'Grand Canal Evening Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Florence Sunset View Walk', true, 'Florence Sunset View Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Belgrade Fortress Sunset Walk', true, 'Belgrade Fortress Sunset Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Petrovaradin.jpg', 'Petrovaradin Fortress Walk', true, 'Petrovaradin Fortress Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Planina%20Zlatibor.JPG', 'Zlatibor Panorama Ride', true, 'Zlatibor Panorama Ride')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", a."Id", NOW()
FROM source s
JOIN "Activities" a ON a."Name" = s."ActivityName";


    
-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_localities_geo ON "Localities" USING gist("Geolocation");
CREATE INDEX IF NOT EXISTS idx_destinations_geo ON "Destinations" USING gist("Geolocation");
CREATE INDEX IF NOT EXISTS idx_objects_geo ON "Objects" USING gist("Geolocation");
CREATE INDEX IF NOT EXISTS idx_activities_geo ON "Activities" USING gist("Geolocation");
CREATE INDEX IF NOT EXISTS idx_events_geo ON "Events" USING gist("Geolocation");

CREATE INDEX IF NOT EXISTS idx_localities_active ON "Localities"("IsActive");
CREATE INDEX IF NOT EXISTS idx_localities_type ON "Localities"("LocalityTypeId");
CREATE INDEX IF NOT EXISTS idx_localities_destination ON "Localities"("DestinationId");

CREATE INDEX IF NOT EXISTS idx_destinations_type ON "Destinations"("DestinationTypeId");
CREATE INDEX IF NOT EXISTS idx_destinations_status ON "Destinations"("Status");
CREATE INDEX IF NOT EXISTS idx_destinations_active ON "Destinations"("IsActive");
CREATE INDEX IF NOT EXISTS idx_destinations_managed_by ON "Destinations"("ManagedByUserId");

CREATE INDEX IF NOT EXISTS idx_objects_locality ON "Objects"("LocalityId");
CREATE INDEX IF NOT EXISTS idx_objects_destination ON "Objects"("DestinationId");
CREATE INDEX IF NOT EXISTS idx_objects_type ON "Objects"("ObjectTypeId");
CREATE INDEX IF NOT EXISTS idx_objects_status ON "Objects"("Status");
CREATE INDEX IF NOT EXISTS idx_objects_active ON "Objects"("IsActive");
CREATE INDEX IF NOT EXISTS idx_objects_rating ON "Objects"("AverageRating" DESC);

CREATE INDEX IF NOT EXISTS idx_activities_locality ON "Activities"("LocalityId");
CREATE INDEX IF NOT EXISTS idx_activities_type ON "Activities"("ActivityTypeId");
CREATE INDEX IF NOT EXISTS idx_activities_active ON "Activities"("IsActive");

CREATE INDEX IF NOT EXISTS idx_events_locality ON "Events"("LocalityId");
CREATE INDEX IF NOT EXISTS idx_events_type ON "Events"("EventTypeId");
CREATE INDEX IF NOT EXISTS idx_events_status ON "Events"("Status");
CREATE INDEX IF NOT EXISTS idx_events_active ON "Events"("IsActive");
CREATE INDEX IF NOT EXISTS idx_events_startdate ON "Events"("StartDate");

CREATE INDEX IF NOT EXISTS idx_reviews_object ON "Reviews"("ObjectId");
CREATE INDEX IF NOT EXISTS idx_reviews_user ON "Reviews"("UserId");
CREATE INDEX IF NOT EXISTS idx_reviews_status ON "Reviews"("Status");

CREATE INDEX IF NOT EXISTS idx_users_role ON "Users"("RoleId");
CREATE INDEX IF NOT EXISTS idx_users_active ON "Users"("IsActive");
CREATE INDEX IF NOT EXISTS idx_users_blacklisted ON "Users"("IsBlacklisted");

CREATE INDEX IF NOT EXISTS idx_favorites_user ON "Favorites"("UserId");
CREATE INDEX IF NOT EXISTS idx_favorites_object ON "Favorites"("ObjectId") WHERE "ObjectId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_activity ON "Favorites"("ActivityId") WHERE "ActivityId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_destination ON "Favorites"("DestinationId") WHERE "DestinationId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_route ON "Favorites"("RouteId") WHERE "RouteId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_requests_pending_object ON "DeletionRequests"("ObjectId")
WHERE "ObjectId" IS NOT NULL AND "Status" = 'Pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_requests_pending_event ON "DeletionRequests"("EventId")
WHERE "EventId" IS NOT NULL AND "Status" = 'Pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_requests_pending_activity ON "DeletionRequests"("ActivityId")
WHERE "ActivityId" IS NOT NULL AND "Status" = 'Pending';

CREATE INDEX IF NOT EXISTS idx_images_main ON "Images"("IsMain") WHERE "IsMain" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_main_object ON "Images"("ObjectId", "IsMain") WHERE "ObjectId" IS NOT NULL AND "IsMain" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_main_activity ON "Images"("ActivityId", "IsMain") WHERE "ActivityId" IS NOT NULL AND "IsMain" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_main_event ON "Images"("EventId", "IsMain") WHERE "EventId" IS NOT NULL AND "IsMain" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_main_destination ON "Images"("DestinationId", "IsMain") WHERE "DestinationId" IS NOT NULL AND "IsMain" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_main_locality ON "Images"("LocalityId", "IsMain") WHERE "LocalityId" IS NOT NULL AND "IsMain" = true;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION refresh_object_rating(object_id integer)
RETURNS void AS $$
BEGIN
    IF object_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE "Objects" o
    SET
        "AverageRating" = COALESCE((
            SELECT ROUND(AVG(r."Rating")::numeric, 2)
            FROM "Reviews" r
            WHERE r."ObjectId" = object_id
              AND r."Status" = 'Approved'
        ), 0),
        "ReviewCount" = (
            SELECT COUNT(*)
            FROM "Reviews" r
            WHERE r."ObjectId" = object_id
              AND r."Status" = 'Approved'
        )
    WHERE o."Id" = object_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_object_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_object_rating(OLD."ObjectId");
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        PERFORM refresh_object_rating(OLD."ObjectId");

        IF NEW."ObjectId" IS DISTINCT FROM OLD."ObjectId" THEN
            PERFORM refresh_object_rating(NEW."ObjectId");
        END IF;

        RETURN NEW;
    END IF;

    PERFORM refresh_object_rating(NEW."ObjectId");
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_update_rating ON "Reviews";
CREATE TRIGGER tg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON "Reviews"
FOR EACH ROW EXECUTE FUNCTION update_object_rating();

UPDATE "Objects" o
SET
    "AverageRating" = COALESCE((
        SELECT ROUND(AVG(r."Rating")::numeric, 2)
        FROM "Reviews" r
        WHERE r."ObjectId" = o."Id"
          AND r."Status" = 'Approved'
    ), 0),
    "ReviewCount" = (
        SELECT COUNT(*)
        FROM "Reviews" r
        WHERE r."ObjectId" = o."Id"
          AND r."Status" = 'Approved'
    );

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_users_updated ON "Users";
DROP TRIGGER IF EXISTS tg_destinations_updated ON "Destinations";
DROP TRIGGER IF EXISTS tg_objects_updated ON "Objects";
DROP TRIGGER IF EXISTS tg_activities_updated ON "Activities";
DROP TRIGGER IF EXISTS tg_events_updated ON "Events";

CREATE TRIGGER tg_users_updated
BEFORE UPDATE ON "Users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tg_destinations_updated
BEFORE UPDATE ON "Destinations"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tg_objects_updated
BEFORE UPDATE ON "Objects"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tg_activities_updated
BEFORE UPDATE ON "Activities"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tg_events_updated
BEFORE UPDATE ON "Events"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE OR REPLACE FUNCTION ensure_one_main_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."IsMain" = true THEN
        IF NEW."ObjectId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "ObjectId" = NEW."ObjectId";

        ELSIF NEW."ActivityId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "ActivityId" = NEW."ActivityId";

        ELSIF NEW."EventId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "EventId" = NEW."EventId";

        ELSIF NEW."DestinationId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "DestinationId" = NEW."DestinationId";

        ELSIF NEW."LocalityId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "LocalityId" = NEW."LocalityId";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_one_main_image ON "Images";
CREATE TRIGGER tg_one_main_image
BEFORE INSERT OR UPDATE ON "Images"
FOR EACH ROW EXECUTE FUNCTION ensure_one_main_image();

CREATE OR REPLACE FUNCTION deactivate_past_events()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Events"
    SET "IsActive" = false
    WHERE "EndDate" < NOW()
      AND "IsActive" = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_deactivate_events ON "Events";
CREATE TRIGGER tg_deactivate_events
AFTER INSERT OR UPDATE ON "Events"
FOR EACH ROW EXECUTE FUNCTION deactivate_past_events();

-- ============================================
-- 19. DESTINATION HERO COPY AND DETAIL TEXT
-- ============================================
UPDATE "Destinations"
SET
    "DisplayTitle" = CASE "Name"
        WHEN 'Kotorski zaliv' THEN 'Strme planine, mirna obala i gradovi uz samu vodu'
        WHEN 'Kotor' THEN 'Zidine, trgovi i mediteranski ritam starog grada'
        WHEN 'Budva' THEN 'Plaze, stari grad i energija koja traje do kasno'
        WHEN 'Durmitor' THEN 'Planinski vrhovi, jezera i avantura na sve strane'
        WHEN 'Sveti Stefan' THEN 'Ikonicno ostrvo, mirne uvale i pogled za pamcenje'
        WHEN 'Podgorica' THEN 'Gradski ritam, reke i dobra baza za celu zemlju'
        WHEN 'Herceg Novi' THEN 'Stepenice, tvrdjave i setnje uz more'
        WHEN 'Bar' THEN 'Luka, Stari Bar i opustena obala za lagan obilazak'
        WHEN 'Ulcinj' THEN 'Pesak, sunce i jug sa drugacijom energijom'
        WHEN 'Cetinje' THEN 'Istorija, muzeji i mirniji ritam stare prestonice'
        WHEN 'Niksic' THEN 'Trgovi, parkovi i gradski zivot okruzen prirodom'
        WHEN 'Tivat' THEN 'Marina, setalista i moderan ritam zaliva'
        WHEN 'Igalo' THEN 'More, wellness i lagane setnje uz obalu'
        WHEN 'Lovcen' THEN 'Vidikovci, Njegos i planina koja cuva identitet zemlje'
        WHEN 'Skadarsko jezero' THEN 'Camci, ptice i mir koji traje duze od izleta'
        WHEN 'Kolasin' THEN 'Planinski vazduh, ski centri i odmor tokom cele godine'
        WHEN 'Zabljak' THEN 'Crno jezero, Durmitor i dani puni aktivnosti'
        WHEN 'Pluzine' THEN 'Pivsko jezero, kanjoni i mirniji planinski beg'
        WHEN 'Andrijevica' THEN 'Komovi, reke i autenticni severni ambijent'
        WHEN 'Plav' THEN 'Jezero, Prokletije i miran ritam severa'
        WHEN 'Barcelona' THEN 'Gaudi, more i veceri u gotickoj cetvrti'
        WHEN 'Madrid' THEN 'Muzeji, bulevari i gradska energija do kasno u noc'
        WHEN 'Valencia' THEN 'Paelja, futuristicka arhitektura i mediteranski tempo'
        WHEN 'Rome' THEN 'Rimske ulice, fontane i vecere u Trastevereu'
        WHEN 'Venice' THEN 'Kanali, kameni prolazi i veceri oko San Marka'
        WHEN 'Florence' THEN 'Renesansa, mostovi i toskanski ritam grada'
        WHEN 'Belgrade' THEN 'Tvrdjava, gradske ulice i nocni ritam prestonice'
        WHEN 'Novi Sad' THEN 'Trgovi, tvrdjava i lagani tempo uz Dunav'
        WHEN 'Zlatibor' THEN 'Planinski vazduh, vidikovci i opusten ritam dana'
        ELSE "DisplayTitle"
    END,
    "Description" = CASE "Name"
        WHEN 'Kotorski zaliv' THEN 'Kotorski zaliv spaja mirnu morsku povrsinu, strme planine i niz istorijskih mesta uz samu obalu. Putovanje ovde lako prelazi iz setnje kroz Kotor i Perast u kratke voznje obalom, kafu uz more i sporiji mediteranski ritam. Dobar je izbor za putnike koji vole pejzaze, fotografiju i kombinaciju kulture i odmora.'
        WHEN 'Kotor' THEN 'Kotor je istorijski grad u srcu zaliva, poznat po zidinama, trgovima i starom gradu pod zastitom UNESCO-a. Dan ovde lako krene obilaskom uskih kamenih ulica, nastavi se usponom ka tvrdjavi i zavrsi vecerom uz more. Posebno prija putnicima koji vole istoriju, atmosferu i setnje bez zurbe.'
        WHEN 'Budva' THEN 'Budva kombinuje plaze, stari grad i energicnu turisticku scenu na malom prostoru. Posetioci mogu da provedu jutro uz more, popodne u kamenim ulicama starog grada, a vece u restoranima i barovima uz obalu. Odlicna je za one koji zele i odmor i zivlju atmosferu.'
        WHEN 'Durmitor' THEN 'Durmitor je planinska destinacija za ljude koji traze prirodu, vazduh i aktivan dan napolju. Crno jezero, vidikovci, pesacke staze i blizina kanjona Tare cine ga odlicnim za vise dana istrazivanja. Ovde se lako prelazi iz mirne setnje u ozbiljniju avanturu, zavisno od ritma putovanja.'
        WHEN 'Sveti Stefan' THEN 'Sveti Stefan je jedna od najupecatljivijih tacki crnogorskog primorja, prepoznatljiv po ostrvu povezanom sa kopnom. Okolina nudi mirnije uvale, panoramske poglede i elegantniji ritam odmora nego veci turisticki centri. Posebno prija putnicima koji traze lepe kadrove, tisinu i more.'
        WHEN 'Podgorica' THEN 'Podgorica je glavni grad i prakticna baza za istrazivanje razlicitih delova Crne Gore. Grad ima siroke bulevare, reke, restorane, parkove i dovoljno urbanog ritma za kraci city break ili usputni boravak. Dobra je kada neko zeli kombinaciju svakodnevnog gradskog zivota i lakih izleta van centra.'
        WHEN 'Herceg Novi' THEN 'Herceg Novi je grad stepenica, tvrdjava i dugih setnji uz more na ulazu u Bokokotorski zaliv. Njegovi trgovi i stare ulice daju mu izrazen karakter, dok obala ostavlja prostor za mirnije popodne i duza vecernja setalista. Posebno odgovara putnicima koji vole zeleni mediteranski ambijent i staru primorsku atmosferu.'
        WHEN 'Bar' THEN 'Bar spaja funkcionalan primorski grad, dugu obalu i istorijski sloj Starog Bara u zaledju. Posetioci mogu da provedu dan na moru, a zatim da obilaze tvrdjavu, maslinjake i starije kamene delove grada. Dobar je za ljude koji vole da kombinuju plazu, istoriju i opusteniji ritam.'
        WHEN 'Ulcinj' THEN 'Ulcinj nosi drugaciju energiju juga, sa dugim pescanim plazama, vetrom i opustenijom atmosferom. Velika plaza i Ada Bojana su najjaci magnet za ljubitelje sunca, vode i duzih boravaka napolju. Grad prija putnicima koji zele vise prostora, topliji mediteranski ritam i malo drugaciji kulturni ton.'
        WHEN 'Cetinje' THEN 'Cetinje je istorijska prestonica sa muzejima, manastirima i ulicama koje cuvaju drzavnicku i kulturnu memoriju zemlje. Nije grad za zurbu, vec za sporiji obilazak, kratke pauze i fokus na price, zgrade i institucije. Posebno ce prijati ljubiteljima istorije i mirnijeg gradskog ambijenta.'
        WHEN 'Niksic' THEN 'Niksic je sirok, pregledan grad sa trgovima, parkovima i jakim lokalnim ritmom. Osim urbanog dela, blizu su mu jezera, izletista i versko-istorijske tacke poput Ostroga. Dobar je kada neko zeli gradski boravak uz lak izlaz u prirodu.'
        WHEN 'Tivat' THEN 'Tivat je moderan primorski grad sa marinom, setalistima i uredjenim delovima obale. Porto Montenegro mu daje elegantniji ton, ali grad ostaje lagan za setnju i prijatan za kraci odmor uz more. Odgovara putnicima koji vole savremeniji izgled obale, restorane i mirniji luksuz.'
        WHEN 'Igalo' THEN 'Igalo je poznato po banjskom i wellness turizmu, ali i po dugim setnjama uz obalu. U blizini Herceg Novog nudi mirniji boravak, tretmane, more i vise prostora za oporavak i laganiji tempo dana. Dobro odgovara ljudima koji na putovanju zele da spoje zdravlje, odmor i setnju.'
        WHEN 'Lovcen' THEN 'Lovcen je planina sa jakim simbolickim znacajem i jednim od najimpresivnijih vidikovaca u zemlji. Put do Njegosevog mauzoleja i pogled sa vrha cine ovu destinaciju jednom od najpamtljivijih za prvi obilazak Crne Gore. Prija putnicima koji vole panorame, planinski vazduh i osecaj prostora.'
        WHEN 'Skadarsko jezero' THEN 'Skadarsko jezero je destinacija za sporiji boravak u prirodi, voznju camcem i posmatranje ptica. Oko jezera se smenjuju mala mesta, vidikovci, vinske tacke i mirniji ritam od morskih gradova. Posebno je dobar izbor za putnike koji traze fotografiju, prirodu i lagan dan van gradske guzve.'
        WHEN 'Kolasin' THEN 'Kolasin je planinski grad koji dobro radi i zimi i leti. Zimi ga ljudi vezuju za ski centre, a topliji deo godine za setnje, recne doline, sumu i izlazak ka nacionalnim parkovima. Dobar je za one koji hoce uredjenu bazu za aktivan odmor u prirodi.'
        WHEN 'Zabljak' THEN 'Zabljak je ulaz u Durmitor i jedna od najboljih baza za planinske aktivnosti u zemlji. Crno jezero, vidikovci, biciklisticke i pesacke staze, kao i zimski sadrzaji, daju mu ritam tokom cele godine. Prija putnicima koji zele prirodu na dohvat ruke od jutra do veceri.'
        WHEN 'Pluzine' THEN 'Pluzine nude mirniji planinski boravak uz Pivsko jezero, kanjone i siroke pejzaze. Ovo je mesto za sporiji tempo, voznju, poglede i odmore koji vise zavise od prirode nego od gradske ponude. Dobar je izbor za one koji traze tisi sever zemlje.'
        WHEN 'Andrijevica' THEN 'Andrijevica je severna planinska baza za izlete ka Komovima i Prokletijama. Reke, doline i okolne planine daju joj jednostavan, autentican karakter i dosta mogucnosti za aktivan dan napolju. Posebno prija putnicima koji vole manje sredine i planinski ambijent bez velike guzve.'
        WHEN 'Plav' THEN 'Plav kombinuje planinsku atmosferu, jezero i blizinu Prokletija. Destinacija je pogodna za one koji vole prirodu, duze voznje, pesacenje i mirniji severni ritam. Dobro radi kao baza za vise dana istrazivanja okoline.'
        WHEN 'Barcelona' THEN 'Barcelona spaja more, Gaudijevu arhitekturu, kvartove pune detalja i vrlo ziv gradski ritam. U istom danu mozes da obidjes Sagradu Familiju, prosetas kroz Gothic Quarter, sednes na tapas i zavrsis uz obalu. Posebno prija putnicima koji vole kombinaciju kulture, hrane i grada koji dugo ostaje budan.'
        WHEN 'Madrid' THEN 'Madrid je grad sirokih bulevara, velikih muzeja i stalne gradske energije. Putnici ovde lako kombinuju Prado, Retiro, trznice, tapas barove i vecernji izlazak bez potrebe da zure izmedju tacki. Dobar je za city break koji trazi i kulturu i ritam velikog grada.'
        WHEN 'Valencia' THEN 'Valencia spaja mediteranski tempo, modernu arhitekturu i poznatu gastronomsku scenu. Grad je prijatan za setnju i bicikl, a lako kombinuje istorijski centar, more i Ciudad de las Artes. Dobar je za putnike koji zele topliji i opusteniji ritam od vecih evropskih prestonica.'
        WHEN 'Rome' THEN 'Rim je grad u kojem se svakodnevni ritam mesa sa antickim slojevima istorije, trgovima, fontanama i dugim vecerama. Putnik u jednom danu moze da obidje Koloseum, da sedne na kafu u malom baru i da zavrsi vece uz testeninu i vino u Trastevereu. Zbog tog spoja velikih znamenitosti i malih kvartovskih trenutaka, Rim je dobar i za prvi dolazak i za sporiji povratak.'
        WHEN 'Venice' THEN 'Venecija nudi sporiji ritam obilaska, setnje preko mostova i male gastronomske pauze uz poglede na kanale. Grad je posebno zanimljiv putnicima koji vole atmosferu, umetnost i osecaj da je gotovo svaka ulica scenografija. Najvise prija kada se obilazi bez velike zurbe, uz vreme za male prolaze, trgove i zalaske sunca.'
        WHEN 'Florence' THEN 'Firenca spaja umetnost, zanatstvo i toskansku gastronomiju na malom prostoru koji je lako obici peske. Grad je odlican za putnike koji zele da kombinuju muzeje, panoramske poglede, lagan gradski tempo i ozbiljno dobru hranu. Posebno je lepa za one koji vole da im se kultura i svakodnevni zivot preplicu iz ulice u ulicu.'
        WHEN 'Belgrade' THEN 'Beograd je grad sirokih bulevara, tvrdjave iznad usca i kafana koje zive do kasno. Posetioci ovde lako kombinuju istorijske tacke, moderni gradski ritam, dobru kafu i vecere koje se cesto produze vise nego sto je planirano. Dobar je izbor za putnike koji vole energiju velikog grada, ali i spontane male pauze pored reke.'
        WHEN 'Novi Sad' THEN 'Novi Sad ima mirniji ritam, ali bogat gradski sadrzaj, uredjene trgove, dobru gastronomsku scenu i jak kulturni identitet. Posebno je prijatan za putnike koji vole setnju, dobru hranu i pogled sa Petrovaradina prema Dunavu i gradu. Grad lako ostavlja utisak mesta u kome mozes i da obilazis i da usporis.'
        WHEN 'Zlatibor' THEN 'Zlatibor je destinacija za sporiji planinski ritam, panoramske poglede, duge setnje i odmor uz lokalne specijalitete. Pogodan je i za kratke vikend odmore i za duze boravke kada neko zeli da kombinuje prirodu, wellness i lakse aktivnosti napolju. Posebno odgovara putnicima koji hoce uredjenu planinsku bazu bez prevelikog napora oko organizacije.'
        ELSE "Description"
    END,
    "UpdatedAt" = NOW()
WHERE "Name" IN (
    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo', 'Lovcen',
    'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav',
    'Barcelona', 'Madrid', 'Valencia', 'Rome', 'Venice', 'Florence', 'Belgrade',
    'Novi Sad', 'Zlatibor'
);

-- ============================================
-- 20. CREATOR OWNERSHIP NORMALIZATION
-- ============================================
WITH role_assignments AS (
    SELECT *
    FROM (VALUES
        ('ME', 'admin@spirego.com', 'ana@spirego.com'),
        ('ES', 'lucia.admin@spirego.com', 'carmen.creator@spirego.com'),
        ('IT', 'giulia.admin@spirego.com', 'lorenzo.creator@spirego.com'),
        ('RS', 'milica.admin.serbia@spirego.com', 'jelena.creator@spirego.com')
    ) AS map(region_code, admin_email, creator_email)
),
destination_ownership AS (
    SELECT
        d."Id" AS destination_id,
        d."ManagedByUserId" AS manager_user_id,
        admin_user."Id" AS admin_user_id,
        creator_user."Id" AS creator_user_id
    FROM "Destinations" d
    JOIN "Regions" r ON r."Id" = d."RegionId"
    JOIN role_assignments ra ON ra.region_code = r."Code"
    JOIN "Users" admin_user ON admin_user."Email" = ra.admin_email
    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
)
UPDATE "Destinations" d
SET "CreatedByUserId" = ownership.admin_user_id,
    "UpdatedAt" = NOW()
FROM destination_ownership ownership
WHERE d."Id" = ownership.destination_id;

WITH destination_ownership AS (
    SELECT d."Id" AS destination_id, d."ManagedByUserId" AS manager_user_id
    FROM "Destinations" d
    WHERE d."ManagedByUserId" IS NOT NULL
)
UPDATE "Localities" l
SET "CreatedByUserId" = ownership.manager_user_id,
    "UpdatedAt" = NOW()
FROM destination_ownership ownership
WHERE l."DestinationId" = ownership.destination_id;

UPDATE "Objects" o
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE o."LocalityId" = l."Id";

UPDATE "Activities" a
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE a."LocalityId" = l."Id";

UPDATE "Events" e
SET "DestinationId" = l."DestinationId"
FROM "Localities" l
WHERE e."LocalityId" = l."Id";

WITH role_assignments AS (
    SELECT *
    FROM (VALUES
        ('ME', 'ana@spirego.com'),
        ('ES', 'carmen.creator@spirego.com'),
        ('IT', 'lorenzo.creator@spirego.com'),
        ('RS', 'jelena.creator@spirego.com')
    ) AS map(region_code, creator_email)
),
destination_content AS (
    SELECT
        d."Id" AS destination_id,
        d."ManagedByUserId" AS manager_user_id,
        creator_user."Id" AS creator_user_id
    FROM "Destinations" d
    JOIN "Regions" r ON r."Id" = d."RegionId"
    JOIN role_assignments ra ON ra.region_code = r."Code"
    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
)
UPDATE "Objects" o
SET "CreatedByUserId" = content.creator_user_id,
    "ApprovedByUserId" = content.manager_user_id,
    "ApprovedAt" = CASE
        WHEN o."Status"::text IN ('Approved', '1') THEN COALESCE(o."ApprovedAt", NOW())
        ELSE o."ApprovedAt"
    END,
    "UpdatedAt" = NOW()
FROM destination_content content
WHERE o."DestinationId" = content.destination_id;

WITH role_assignments AS (
    SELECT *
    FROM (VALUES
        ('ME', 'ana@spirego.com'),
        ('ES', 'carmen.creator@spirego.com'),
        ('IT', 'lorenzo.creator@spirego.com'),
        ('RS', 'jelena.creator@spirego.com')
    ) AS map(region_code, creator_email)
),
destination_content AS (
    SELECT
        d."Id" AS destination_id,
        d."ManagedByUserId" AS manager_user_id,
        creator_user."Id" AS creator_user_id
    FROM "Destinations" d
    JOIN "Regions" r ON r."Id" = d."RegionId"
    JOIN role_assignments ra ON ra.region_code = r."Code"
    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
)
UPDATE "Activities" a
SET "CreatedByUserId" = content.creator_user_id,
    "ApprovedByUserId" = content.manager_user_id,
    "ApprovedAt" = CASE
        WHEN a."Status"::text IN ('Approved', '1') THEN COALESCE(a."ApprovedAt", NOW())
        ELSE a."ApprovedAt"
    END,
    "UpdatedAt" = NOW()
FROM destination_content content
WHERE a."DestinationId" = content.destination_id;

WITH role_assignments AS (
    SELECT *
    FROM (VALUES
        ('ME', 'ana@spirego.com'),
        ('ES', 'carmen.creator@spirego.com'),
        ('IT', 'lorenzo.creator@spirego.com'),
        ('RS', 'jelena.creator@spirego.com')
    ) AS map(region_code, creator_email)
),
destination_content AS (
    SELECT
        d."Id" AS destination_id,
        d."ManagedByUserId" AS manager_user_id,
        creator_user."Id" AS creator_user_id
    FROM "Destinations" d
    JOIN "Regions" r ON r."Id" = d."RegionId"
    JOIN role_assignments ra ON ra.region_code = r."Code"
    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
)
UPDATE "Events" e
SET "CreatedByUserId" = content.creator_user_id,
    "ApprovedByUserId" = content.manager_user_id,
    "ApprovedAt" = CASE
        WHEN e."Status"::text IN ('Approved', '1') THEN COALESCE(e."ApprovedAt", NOW())
        ELSE e."ApprovedAt"
    END,
    "UpdatedAt" = NOW()
FROM destination_content content
WHERE e."DestinationId" = content.destination_id;
