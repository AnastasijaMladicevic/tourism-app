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
('Prirodni lokalitet');

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
('Hostel'),
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
 ('Maria', 'Papadopoulou', '1987-04-19', 'maria.admin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000001', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Eleni', 'Nikolaou', '1991-08-12', 'eleni.creator@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000002', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Nikos', 'Andreou', '1989-01-23', 'manager.athens@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000003', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Katerina', 'Vasiliou', '1990-06-17', 'manager.santorini@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000004', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Giorgos', 'Dimitriou', '1988-10-05', 'manager.crete@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000005', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Sofia', 'Markou', '1992-03-28', 'manager.rhodes@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000006', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Andreas', 'Pappas', '1991-12-14', 'manager.corfu@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+306900000007', 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Ioanna', 'Petrou', '1997-09-09', 'ioanna.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Dimitris', 'Kostas', '1996-02-20', 'dimitris.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Anastasia', 'Georgiou', '1998-05-11', 'anastasia.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
('Luka', 'Petrovic', '1995-11-22', 'luka.greece.tourist@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Grcka', 'el', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png'),
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
('Kotorski zaliv', 'Poznat po prirodnoj lepoti i Boki Kotorskoj',
 ST_SetSRID(ST_MakePoint(18.770, 42.430), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Zaliv'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Kotor', 'Primorski grad poznat po starom gradu i Bokokotorskom zalivu',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Budva', 'Primorski grad poznat po turizmu i starom gradu',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Durmitor', 'Planinski masiv i nacionalni park',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Nacionalni Park'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Sveti Stefan', 'Poznato ostrvo-hotel',
 ST_SetSRID(ST_MakePoint(18.890, 42.255), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Obala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Podgorica', 'Glavni grad Crne Gore',
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Herceg Novi', 'Primorski grad na ulazu u Bokokotorski zaliv',
 ST_SetSRID(ST_MakePoint(18.537, 42.453), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Bar', 'Grad poznat po luci i Starom Baru',
 ST_SetSRID(ST_MakePoint(19.100, 42.093), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Ulcinj', 'Najjuzniji grad na primorju',
 ST_SetSRID(ST_MakePoint(19.224, 41.929), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Cetinje', 'Istorijska prestonica Crne Gore',
 ST_SetSRID(ST_MakePoint(18.924, 42.390), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Niksic', 'Drugi po velicini grad u Crnoj Gori',
 ST_SetSRID(ST_MakePoint(18.956, 42.773), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Tivat', 'Primorski grad poznat po marini Porto Montenegro',
 ST_SetSRID(ST_MakePoint(18.693, 42.434), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
 ('Igalo Banja', 'Poznata banja i zdravstveni centar na moru',
 ST_SetSRID(ST_MakePoint(18.516, 42.460), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Banja'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
 ('Selo Njegusi', 'Tradicionalno planinsko selo poznato po pršuti i siru',
 ST_SetSRID(ST_MakePoint(18.820, 42.420), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Selo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),
 
 ('Lovcen', 'Planina poznata po Njegosevom mauzoleju i nacionalnom parku',
 ST_SetSRID(ST_MakePoint(18.839, 42.399), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Planina'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Skadarsko jezero', 'Najvece jezero na Balkanu poznato po biodiverzitetu',
 ST_SetSRID(ST_MakePoint(19.300, 42.200), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Kolasin', 'Planinski grad i ski centar na severu Crne Gore',
 ST_SetSRID(ST_MakePoint(19.522, 42.822), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Ski centar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Zabljak', 'Planinski grad u blizini Durmitora',
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Selo'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW())
 ;

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
        ('Igalo Banja', 'manager.igalo@spirego.com'),
        ('Selo Njegusi', 'manager.njegusi@spirego.com'),
        ('Lovcen', 'manager.lovcen@spirego.com'),
        ('Skadarsko jezero', 'manager.skadarsko@spirego.com'),
        ('Kolasin', 'manager.kolasin@spirego.com'),
        ('Zabljak', 'manager.zabljak@spirego.com')
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
        ('Igalo Banja', 'manager.igalo@spirego.com'),
        ('Selo Njegusi', 'manager.njegusi@spirego.com'),
        ('Lovcen', 'manager.lovcen@spirego.com'),
        ('Skadarsko jezero', 'manager.skadarsko@spirego.com'),
        ('Kolasin', 'manager.kolasin@spirego.com'),
        ('Zabljak', 'manager.zabljak@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Users" u
SET "ManagedDestinationId" = m.destination_id
FROM manager_assignments m
WHERE u."Id" = m.manager_id;

INSERT INTO "Destinations"
("Name", "DisplayTitle", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
VALUES

('Athens', 'Anticka istorija, gradski ritam i pogled na Akropolj', 'Atina je glavni grad Grcke i jedno od najvaznijih istorijskih sredista Evrope. Grad spaja anticke hramove, zive trgove, muzeje, moderne restorane i kvartove pune malih kafica i galerija. Najpoznatija je po Akropolju, ali pravi dozivljaj Atine nalazi se i u setnji kroz Plaku, Monastiraki i u vecernjem pogledu na osvetljene anticke spomenike. Atina je idealna za putnike koji vole istoriju, kulturu, hranu i urbani ritam grada koji se ne zaustavlja ni nocu.',
 ST_SetSRID(ST_MakePoint(23.7275, 37.9838), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'GR'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NULL, NOW(), NOW()),

('Santorini', 'Bela sela, kaldera i zalasci sunca iznad mora', 'Santorini je ostrvo poznato po belim kucama, plavim kupolama, vulkanskim liticama i zalascima sunca koji privlace posetioce iz celog sveta. Pored popularnih vidikovaca u Oiji i Firi, ostrvo nudi vinarije, male luke, plaze tamnog peska i mirnije delove idealne za duze setnje. Santorini je posebno zanimljiv za parove, fotografe i sve koji zele kombinaciju luksuza, prirode i tradicionalne kikladske arhitekture.',
 ST_SetSRID(ST_MakePoint(25.4615, 36.3932), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Ostrvo'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'GR'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NULL, NOW(), NOW()),

('Crete', 'Veliko ostrvo sa plazama, lukama i lokalnim ukusima', 'Krit je najvece grcko ostrvo i destinacija koja nudi mnogo vise od klasicnog letovanja. Na ostrvu se smenjuju venecijanski stari gradovi, planinska sela, arheoloska nalazista, tirkizne plaze i restorani sa jednom od najpoznatijih mediteranskih kuhinja. Krit je dobar izbor za porodice, avanturiste i putnike koji zele da istovremeno obidju gradove, prirodu i tradicionalna mesta sa lokalnom atmosferom.',
 ST_SetSRID(ST_MakePoint(24.8093, 35.2401), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Ostrvo'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'GR'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NULL, NOW(), NOW()),

('Rhodes', 'Srednjovekovne ulice, tvrdjave i svetle uvale', 'Rodos je ostrvo sa izuzetno bogatom istorijom, srednjovekovnim zidinama, starim ulicama i obalom koja nudi veliki izbor plaza. Stari grad Rodosa ima atmosferu muzeja na otvorenom, dok Lindos pruza prepoznatljiv spoj belih kuca, akropolja i zaliva. Destinacija je pogodna za one koji zele da kombinuju kulturu, kupanje, izlete brodom i opustene veceri u tavernama.',
 ST_SetSRID(ST_MakePoint(28.2278, 36.4341), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Ostrvo'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'GR'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NULL, NOW(), NOW()),

('Corfu', 'Venecijanske fasade, zelenilo i jonske uvale', 'Krf je zeleno jonsko ostrvo poznato po venecijanskom uticaju, starom gradu, maslinjacima i uvalama koje menjaju boju tokom dana. Ostrvo ima mirnije plaze, zivlje turisticke zone i kulturne tacke koje podsecaju na dugu istoriju susreta razlicitih civilizacija. Krf je lep izbor za putnike koji vole kombinaciju prirode, arhitekture, setalista i opustenih restorana uz more.',
 ST_SetSRID(ST_MakePoint(19.9217, 39.6243), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Ostrvo'),
 (SELECT "Id" FROM "Regions" WHERE "Code" = 'GR'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NULL, NOW(), NOW());

WITH greece_manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Athens', 'manager.athens@spirego.com'),
        ('Santorini', 'manager.santorini@spirego.com'),
        ('Crete', 'manager.crete@spirego.com'),
        ('Rhodes', 'manager.rhodes@spirego.com'),
        ('Corfu', 'manager.corfu@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Destinations" d
SET "ManagedByUserId" = m.manager_id
FROM greece_manager_assignments m
WHERE d."Id" = m.destination_id;

WITH greece_manager_assignments AS (
    SELECT d."Id" AS destination_id, u."Id" AS manager_id
    FROM (VALUES
        ('Athens', 'manager.athens@spirego.com'),
        ('Santorini', 'manager.santorini@spirego.com'),
        ('Crete', 'manager.crete@spirego.com'),
        ('Rhodes', 'manager.rhodes@spirego.com'),
        ('Corfu', 'manager.corfu@spirego.com')
    ) AS map(destination_name, manager_email)
    JOIN "Destinations" d ON d."Name" = map.destination_name
    JOIN "Users" u ON u."Email" = map.manager_email
)
UPDATE "Users" u
SET "ManagedDestinationId" = m.destination_id
FROM greece_manager_assignments m
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
 
 ('Njegosev mauzolej', 'Mauzolej Petra II Petrovica Njegosa na Lovcenu',
 ST_SetSRID(ST_MakePoint(18.839, 42.399), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
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
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW())
 ;

-- Lokalitetima upravlja menadzer dodeljen destinaciji kojoj pripadaju.
UPDATE "Localities" l
SET "CreatedByUserId" = d."ManagedByUserId",
    "UpdatedAt" = NOW()
FROM "Destinations" d
WHERE l."DestinationId" = d."Id"
  AND d."ManagedByUserId" IS NOT NULL;


INSERT INTO "Localities"
("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
VALUES
('Plaka Athens', 'Plaka je jedan od najstarijih i najlepših kvartova Atine, smesten ispod Akropolja. Ulice su uske, pune taverni, malih radnji, stepenista, cvetnih balkona i mesta gde se istorija grada oseca u svakodnevnom ritmu.',
 ST_SetSRID(ST_MakePoint(23.7294, 37.9715), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Acropolis Hill', 'Akropoljski brezuljak je najpoznatiji simbol Atine i mesto sa kojeg se pruza pogled na grad, antičke hramove i okolna brda. Ovaj lokalitet je posebno posecen ujutru i pred zalazak sunca kada svetlo naglasava mermerne stubove.',
 ST_SetSRID(ST_MakePoint(23.7265, 37.9715), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Istorijska lokacija'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Oia Santorini', 'Oia je najpoznatije mesto na Santoriniju, prepoznatljivo po belim kucama, plavim kupolama i uskim ulicama koje vode do vidikovaca nad kalderom. Najveca guzva je pred zalazak sunca, ali jutarnje setnje daju potpuno drugaciji i mirniji dozivljaj.',
 ST_SetSRID(ST_MakePoint(25.3753, 36.4618), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Vidikovac'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Fira Santorini', 'Fira je zivo srediste Santorinija sa restoranima, kaficima, prodavnicama i pogledom na vulkansku kalderu. Odavde se lako organizuju izleti, obilasci vinarija i vecernje setnje uz ivicu litice.',
 ST_SetSRID(ST_MakePoint(25.4300, 36.4167), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Turisticka Zona'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Chania Old Town', 'Stari grad Hanije na Kritu spaja venecijansku luku, uske ulice, trznice i male restorane uz more. Lokalitet je prijatan za setnju tokom celog dana, ali je najlepši uvece kada se svetla luke reflektuju u vodi.',
 ST_SetSRID(ST_MakePoint(24.0170, 35.5170), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Elafonisi Beach', 'Elafonisi je plaza na zapadu Krita poznata po plitkoj vodi, svetlom pesku i ruzicastim nijansama obale. Najbolji dozivljaj je rano ujutru ili kasnije popodne, kada je manje guzve i kada boje mora dolaze do izrazaja.',
 ST_SetSRID(ST_MakePoint(23.5407, 35.2716), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Plaza'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Rhodes Old Town', 'Stari grad Rodosa je utvrdjeno srednjovekovno jezgro sa kamenim ulicama, kapijama, trgovima i palatama. Prostor je veoma fotogenican i pogodan za obilazak peske, posebno za putnike koji vole istoriju i arhitekturu.',
 ST_SetSRID(ST_MakePoint(28.2240, 36.4430), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Lindos Bay', 'Lindos Bay je obalna zona ispod belog sela Lindos, poznata po mirnijoj vodi, lepom pogledu na akropolj i restoranima u kojima se dan lako pretvara u lagano vecernje druzenje.',
 ST_SetSRID(ST_MakePoint(28.0850, 36.0917), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Uvala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Corfu Old Town', 'Stari grad Krfa je elegantna mesavina venecijanskih zgrada, trgova, arkada i uskih ulica. Lokalitet je odlican za setnju, kupovinu suvenira, kratke pauze u kaficima i obilazak kulturnih znamenitosti.',
 ST_SetSRID(ST_MakePoint(19.9245, 39.6249), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW()),

('Paleokastritsa', 'Paleokastritsa je jedna od najpoznatijih obalnih zona Krfa, sa zelenim brdima, uvalama i prozirnom vodom. Pogodna je za kupanje, voznju camcem i mirniji dan van guzve starog grada.',
 ST_SetSRID(ST_MakePoint(19.7097, 39.6725), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Uvala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'), NOW());

UPDATE "Localities" l
SET "CreatedByUserId" = d."ManagedByUserId",
    "UpdatedAt" = NOW()
FROM "Destinations" d
WHERE l."DestinationId" = d."Id"
  AND d."Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');


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
 
 ('Biblioteka Niksic', 'Gradska biblioteka u Nikšiću', 'Trg Slobode, Nikšić',  '+38220000001', NULL,
 NULL, NULL, '{"pon":"08:00-20:00"}', NULL, ARRAY['WiFi', 'Citaonica', 'Klimatizovano'], ST_SetSRID(ST_MakePoint(18.956, 42.774), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Crkva Svetog Nikole Bar', 'Pravoslavna crkva u Starom Baru', 'Stari Bar', '+38220000002', NULL,
 NULL, NULL, '{"pon":"06:00-18:00"}', NULL, ARRAY['Vodic', 'Mirno okruzenje'], ST_SetSRID(ST_MakePoint(19.142, 42.097), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Restoran Jezero', 'Restoran sa pogledom na Skadarsko jezero',  'Virpazar bb', '+38220000003', 'https://www.plantaze.com/restoran-jezero/',
 'https://www.plantaze.com/restoran-jezero/', 'Crnogorska i riblji specijaliteti', '{"pon":"09:00-22:00"}', 22.00, ARRAY['Terasa', 'Pogled na jezero', 'Parking', 'Rezervacije'], ST_SetSRID(ST_MakePoint(19.091, 42.246), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Hotel Bianca Kolasin', 'Popularan hotel u Kolasinu',  'Kolasin centar', '+38220000004', 'https://www.biancaresort.com/',
 'https://www.biancaresort.com/explore', NULL, '{"pon":"00:00-24:00"}', 130.00, ARRAY['WiFi', 'Spa', 'Parking', 'Dorucak', 'Ski ostava'], ST_SetSRID(ST_MakePoint(19.522, 42.822), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW())
 ;

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

INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Acropolis View Athens', 'Udoban gradski hotel u blizini istorijskog centra Atine, pogodan za putnike koji zele da vecinu obilazaka obave peske. Sobe su moderne, terasa ima pogled ka Akropolju, a lokacija omogucava brz pristup Plaki, muzejima i vecernjim restoranima.', 'Rovertou Galli 10, Athens', '+302100000001', 'https://www.visitgreece.gr',
 NULL, NULL, '{"pon":"00:00-24:00"}', 165.00, ARRAY['WiFi', 'Rooftop', 'Dorucak', 'Transfer', 'Klimatizovano'], ST_SetSRID(ST_MakePoint(23.7258, 37.9698), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Acropolis Hill'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.athens@spirego.com'),
 NOW(), NOW(), NOW()),

('Plaka Garden Taverna', 'Tradicionalna taverna u Plaki sa grckim jelima, domacim vinom i malom bastom u mirnijoj ulici. Mesto je pogodno za veceru posle obilaska Akropolja, a meni kombinuje klasike poput musake, suvlakija i sveze salate sa sezonskim specijalitetima.', 'Adrianou 45, Athens', '+302100000002', 'https://www.visitgreece.gr',
 NULL, 'Grcka tradicionalna kuhinja', '{"pon":"11:00-23:30"}', 28.00, ARRAY['Basta', 'Rezervacije', 'Veganske opcije', 'Lokalno vino'], ST_SetSRID(ST_MakePoint(23.7301, 37.9721), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.athens@spirego.com'),
 NOW(), NOW(), NOW()),

('Museum of Cycladic Culture Athens', 'Muzej posvecen kikladskoj umetnosti, antickim predmetima i kulturnoj istoriji Egeja. Prostor je pregledan, miran i dobar za posetioce koji zele pauzu od guzve, a zbirke lepo objasnjavaju vezu izmedju ostrvske kulture i sire grcke civilizacije.', 'Neofitou Douka 4, Athens', '+302100000003', 'https://cycladic.gr',
 NULL, NULL, '{"pon":"10:00-17:00"}', 12.00, ARRAY['Vodic', 'Suvenirnica', 'Klimatizovano', 'Izlozbe'], ST_SetSRID(ST_MakePoint(23.7414, 37.9763), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Muzej'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.athens@spirego.com'),
 NOW(), NOW(), NOW()),

('Oia Caldera Suites', 'Manji hotel na Santoriniju sa apartmanima uklesanim u belu arhitekturu ostrva i terasama okrenutim ka kalderi. Mesto je namenjeno gostima koji traze mir, pogled i romanticnu atmosferu, ali i lak pristup vidikovcima i restoranima u Oiji.', 'Oia Caldera, Santorini', '+302286000001', 'https://www.visitgreece.gr',
 NULL, NULL, '{"pon":"00:00-24:00"}', 320.00, ARRAY['WiFi', 'Bazen', 'Pogled na more', 'Dorucak', 'Transfer'], ST_SetSRID(ST_MakePoint(25.3760, 36.4625), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Oia Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.santorini@spirego.com'),
 NOW(), NOW(), NOW()),

('Fira Sunset Wine Bar', 'Bar u Firi sa pogledom na kalderu, lokalnim vinima i laganim zalogajima. Posebno je popularan pred zalazak sunca, ali je prijatan i kasnije uvece kada je atmosfera opustenija i kada se ostrvo vidi pod svetlima.', 'Fira Cliffside, Santorini', '+302286000002', 'https://www.visitgreece.gr',
 NULL, 'Vina i meze', '{"pon":"16:00-01:00"}', 24.00, ARRAY['Pogled na more', 'Kokteli', 'Lokalno vino', 'Terasa'], ST_SetSRID(ST_MakePoint(25.4307, 36.4171), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fira Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.santorini@spirego.com'),
 NOW(), NOW(), NOW()),

('Aegean Blue Restaurant', 'Restoran u Oiji koji kombinuje svezu ribu, lokalne sireve, povrce sa ostrva i poznata santorinska vina. Ambijent je elegantan ali opusten, sa terasom koja je najbolja za ranu veceru kada boje neba pocinju da se menjaju.', 'Oia Main Street, Santorini', '+302286000003', 'https://www.visitgreece.gr',
 NULL, 'Mediteranska i morski plodovi', '{"pon":"12:00-23:00"}', 42.00, ARRAY['Terasa', 'Pogled na more', 'Rezervacije', 'Riblji specijaliteti'], ST_SetSRID(ST_MakePoint(25.3757, 36.4615), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Oia Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.santorini@spirego.com'),
 NOW(), NOW(), NOW()),

('Chania Harbor Hotel', 'Hotel u blizini stare luke Hanije, pogodan za goste koji zele da budu blizu setalista, restorana i polaznih tacaka za izlete po zapadnom Kritu. Enterijer kombinuje lokalni kamen, svetle sobe i malu krovnu terasu za dorucak.', 'Old Harbor, Chania', '+302821000001', 'https://www.visitgreece.gr',
 NULL, NULL, '{"pon":"00:00-24:00"}', 150.00, ARRAY['WiFi', 'Dorucak', 'Krovna terasa', 'Transfer'], ST_SetSRID(ST_MakePoint(24.0165, 35.5174), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Chania Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.crete@spirego.com'),
 NOW(), NOW(), NOW()),

('Elafonisi Beach Canteen', 'Jednostavan objekat blizu plaze Elafonisi sa hladnim picima, kafom, sendvicima i osnovnim jelima za posetioce koji ceo dan provode na obali. Nije luksuzno mesto, ali je prakticno za porodice i putnike koji zele brzu pauzu bez napustanja plaze.', 'Elafonisi Beach, Crete', '+302821000002', NULL,
 NULL, 'Brza hrana i kafa', '{"pon":"09:00-19:00"}', 10.00, ARRAY['Kafa', 'Brza hrana', 'Blizu plaze', 'Porodicno'], ST_SetSRID(ST_MakePoint(23.5411, 35.2713), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Elafonisi Beach'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.crete@spirego.com'),
 NOW(), NOW(), NOW()),

('Rhodes Knight Hotel', 'Hotel smesten blizu zidina starog grada Rodosa, sa ambijentom koji podseca na srednjovekovne ulice i mirnim sobama pogodnim za kraci gradski odmor. Lokacija je dobra za obilazak muzeja, kapija i vecernjih taverni.', 'Old Town, Rhodes', '+302241000001', 'https://www.visitgreece.gr',
 NULL, NULL, '{"pon":"00:00-24:00"}', 135.00, ARRAY['WiFi', 'Dorucak', 'Klimatizovano', 'Blizu centra'], ST_SetSRID(ST_MakePoint(28.2248, 36.4435), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rhodes Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.rhodes@spirego.com'),
 NOW(), NOW(), NOW()),

('Lindos Bay Seafood', 'Restoran u blizini zaliva Lindos sa morskim plodovima, grckim salatama i pogledom na vodu. Najbolji je za rucak posle kupanja ili mirnu veceru kada se guzva oko plaze smanji.', 'Lindos Bay, Rhodes', '+302241000002', 'https://www.visitgreece.gr',
 NULL, 'Morski plodovi', '{"pon":"11:00-23:00"}', 34.00, ARRAY['Terasa', 'Pogled na more', 'Rezervacije', 'Riblji specijaliteti'], ST_SetSRID(ST_MakePoint(28.0853, 36.0915), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lindos Bay'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.rhodes@spirego.com'),
 NOW(), NOW(), NOW()),

('Corfu Venetian Boutique Hotel', 'Boutique hotel u starom gradu Krfa, u zgradi inspirisanoj venecijanskom arhitekturom. Pogodan je za goste koji zele atmosferu starog grada, blizinu setalista i laku vezu sa lukom i kulturnim znamenitostima.', 'Corfu Old Town, Corfu', '+302661000001', 'https://www.visitgreece.gr',
 NULL, NULL, '{"pon":"00:00-24:00"}', 175.00, ARRAY['WiFi', 'Dorucak', 'Klimatizovano', 'Transfer'], ST_SetSRID(ST_MakePoint(19.9248, 39.6252), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Corfu Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.corfu@spirego.com'),
 NOW(), NOW(), NOW()),

('Paleokastritsa View Cafe', 'Kafic na obali Paleokastritse sa hladnim picima, kafom, laganim obrocima i pogledom na jednu od najlepših uvala Krfa. Posebno je prijatan posle voznje camcem ili kupanja, kada prija mirnija pauza uz more.', 'Paleokastritsa Bay, Corfu', '+302661000002', NULL,
 NULL, 'Kafa i lagani obroci', '{"pon":"08:00-22:00"}', 14.00, ARRAY['Pogled na more', 'Kafa', 'Terasa', 'Brunch'], ST_SetSRID(ST_MakePoint(19.7099, 39.6723), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafic'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Paleokastritsa'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'manager.corfu@spirego.com'),
 NOW(), NOW(), NOW());

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
     (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com') cc
WHERE o."DestinationId" = d."Id"
  AND d."Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');


-- ============================================
-- 7. ACTIVITIES
-- ============================================
INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Degustacija morskih specijaliteta', 'Lokalna kuhinja - degustacija ribljih specijaliteta',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 25.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Poseta Restoranu'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Nocni provod Budva', 'Zabava uz muziku u budvanskim klubovima',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 10.00, 240, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Nocni provod'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Planinarenje na Durmitoru', 'Pesacka tura kroz prirodu Durmitora',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0.00, 300, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Planinarenje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Setnja starim gradom Kotora', 'Razgledanje istorijskih znamenitosti',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), 
 NOW(), NOW()),
 
 ('Voznja camcem Skadarsko jezero', 'Organizovana voznja camcem kroz prirodu',
 ST_SetSRID(ST_MakePoint(19.091, 42.246), 4326), 15.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Voznja camcem'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

 ('Skijanje Kolasin', 'Skijanje na ski stazama Kolasina',
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


INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Athens History Walk', 'Vodjena setnja kroz Plaku i prostor oko Akropolja sa pricama o antickoj Atini, svakodnevnom zivotu u starim kvartovima i najvaznijim tackama koje turisti cesto promase kada obilaze sami.',
 ST_SetSRID(ST_MakePoint(23.7291, 37.9720), 4326), 18.00, 150, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Razgledanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Traditional Greek Dinner Plaka', 'Vecera u taverni sa nekoliko lokalnih jela, kratkim objasnjenjem sastojaka i preporukom grckih vina. Aktivnost je namenjena putnicima koji zele da upoznaju hranu kroz opusten razgovor i prijatnu atmosferu.',
 ST_SetSRID(ST_MakePoint(23.7301, 37.9721), 4326), 35.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Degustacija hrane'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Santorini Caldera Photo Walk', 'Lagana fotografska setnja kroz Oiju i vidikovce iznad kaldere. Program je prilagodjen zalasku sunca, ali obuhvata i savete za pronalazenje mirnijih ulica i lepih kadrova bez velike guzve.',
 ST_SetSRID(ST_MakePoint(25.3753, 36.4618), 4326), 22.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Fotografisanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Oia Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Santorini Wine Tasting', 'Degustacija lokalnih vina sa Santorinija uz male zalogaje i pricu o vulkanskom tlu koje ostrvskim vinima daje poseban karakter. Aktivnost je dobra za parove i manje grupe koje zele mirniji vecernji program.',
 ST_SetSRID(ST_MakePoint(25.4307, 36.4171), 4326), 48.00, 100, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Degustacija vina'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fira Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Fira Sunset Wine Bar'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Chania Old Harbor Walk', 'Pesacka tura kroz staru luku Hanije, venecijanske ulice, trznicu i mesta koja najbolje pokazuju spoj kritske, otomanske i venecijanske istorije. Tura se zavrsava preporukama za lokalne restorane.',
 ST_SetSRID(ST_MakePoint(24.0170, 35.5170), 4326), 16.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Pesacenje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Chania Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Elafonisi Beach Day', 'Organizovan dan na plazi Elafonisi sa pauzama za kupanje, fotografisanje i lagani obrok. Aktivnost je posebno pogodna za porodice i putnike koji zele opusten raspored bez zurbe.',
 ST_SetSRID(ST_MakePoint(23.5407, 35.2716), 4326), 25.00, 360, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Plivanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Elafonisi Beach'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Elafonisi Beach Canteen'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Rhodes Medieval Tour', 'Obilazak starog grada Rodosa sa fokusom na zidine, kapije, vitesku ulicu i najvaznije istorijske price ostrva. Tura je sadrzajna, ali tempom pogodna i za putnike koji prvi put dolaze na Rodos.',
 ST_SetSRID(ST_MakePoint(28.2240, 36.4430), 4326), 20.00, 140, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Obilazak'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rhodes Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW()),

('Paleokastritsa Boat Ride', 'Voznja camcem oko uvala Paleokastritse, sa kratkim pauzama za kupanje i fotografisanje. Najlepsi deo ture je pogled na zelena brda i svetlu boju mora izmedju stena.',
 ST_SetSRID(ST_MakePoint(19.7097, 39.6725), 4326), 30.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Voznja camcem'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Paleokastritsa'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Paleokastritsa View Cafe'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'maria.admin@spirego.com'),
 NOW(), NOW());

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
     (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com') cc
WHERE a."DestinationId" = d."Id"
  AND d."Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');

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
 NOW(), NOW());

UPDATE "Events"
SET "LocalityId" = (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva')
WHERE "Name" = 'Budva Summer Festival';

UPDATE "Events"
SET "LocalityId" = (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero')
WHERE "Name" = 'Planinarski susret';

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

INSERT INTO "Events"
("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Athens Open Air Classics', 'Athens Open Air Classics donosi vece klasicne muzike u ambijentu istorijskog centra Atine. Program je zamisljen kao miran kulturni dogadjaj za posetioce koji zele da spoje muziku, vecernju setnju i pogled na osvetljene delove grada. Repertoar obuhvata poznate kompozicije u izvodjenju manjeg ansambla, pa atmosfera ostaje intimna i prijatna. Dogadjaj je dobar izbor za turiste koji zele kulturni sadrzaj posle obilaska muzeja i znamenitosti tokom dana.',
 ST_SetSRID(ST_MakePoint(23.7294, 37.9715), 4326), '2026-06-18 20:30', '2026-06-18 23:00', 18.00, 350, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW()),

('Santorini Sunset Wine Festival', 'Santorini Sunset Wine Festival okuplja lokalne vinarije, male proizvodjace hrane i posetioce koji zele da upoznaju ukus ostrva kroz opusten vecernji program. Festival je smesten u Firi, sa pogledom na kalderu i atmosferom koja se menja kako zalazak sunca prelazi u noc. Posetioci mogu da probaju razlicita vina, meze zalogaje i da razgovaraju sa domacinima o tradiciji proizvodnje vina na vulkanskom tlu. Dogadjaj je posebno pogodan za parove i manje grupe koje traze sporiji, ali sadrzajan provod.',
 ST_SetSRID(ST_MakePoint(25.4300, 36.4167), 4326), '2026-07-12 18:00', '2026-07-12 23:30', 35.00, 600, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fira Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Fira Sunset Wine Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW()),

('Oia Summer Lights', 'Oia Summer Lights je letnji vecernji program kroz najpoznatije ulice Oije. Dogadjaj kombinuje male nastupe, svetlosne instalacije, lokalne zanatske proizvode i laganu muziku na vise tacaka u mestu. Ideja je da posetioci dozive Oiju i posle zalaska sunca, kada se guzva smanji i kada belo-plava arhitektura dobije potpuno drugaciji karakter. Program je pogodan za fotografisanje, setnju i opusten izlazak bez klasicne festivalske buke.',
 ST_SetSRID(ST_MakePoint(25.3753, 36.4618), 4326), '2026-08-03 20:00', '2026-08-04 00:30', 12.00, 800, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Nastup'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Oia Santorini'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW()),

('Chania Harbor Food Week', 'Chania Harbor Food Week je program posvecen kritskoj kuhinji, lokalnim proizvodima i restoranima stare luke. Tokom nekoliko dana organizuju se degustacije, kratke radionice, razgovori sa kuvarima i vecernji meni programi u manjim lokalima. Posetioci imaju priliku da probaju sireve, maslinovo ulje, morsku hranu i tradicionalne slatkise, ali i da saznaju vise o nacinu na koji se kritska kuhinja razvijala kroz istoriju. Dogadjaj je idealan za putnike koji zele da upoznaju destinaciju kroz hranu, a ne samo kroz plaze.',
 ST_SetSRID(ST_MakePoint(24.0170, 35.5170), 4326), '2026-09-05 12:00', '2026-09-11 22:00', 10.00, 1000, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Chania Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Chania Harbor Hotel'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW()),

('Rhodes Medieval Night', 'Rhodes Medieval Night je tematsko vece u starom gradu Rodosa, osmisljeno tako da posetioce vrati u atmosferu srednjovekovnih ulica, zanata i muzike. Program ukljucuje vodjene price, manje nastupe, ulicne izvodjace i setnju kroz najlepse delove utvrdjenog jezgra. Dogadjaj nije samo zabavan, vec i edukativan, jer na pristupacan nacin priblizava istoriju ostrva. Posebno je zanimljiv porodicama, parovima i putnicima koji vole nocne obilaske sa jakim vizuelnim dozivljajem.',
 ST_SetSRID(ST_MakePoint(28.2240, 36.4430), 4326), '2026-08-20 19:30', '2026-08-20 23:30', 16.00, 700, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Organizovana Tura'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rhodes Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rhodes Knight Hotel'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW()),

('Corfu Old Town Jazz Evening', 'Corfu Old Town Jazz Evening donosi opusteno muzicko vece na trgovima starog grada Krfa. Program je namenjen posetiocima koji zele mirniji izlazak, dobru muziku i ambijent venecijanskih fasada. Nastupi se odrzavaju u manjim formacijama, pa dogadjaj zadrzava lokalni i prijatan karakter. U kombinaciji sa setnjom, vecerom i pogledom na stare ulice, ovo je lep izbor za turiste koji zele kulturni sadrzaj bez velike guzve.',
 ST_SetSRID(ST_MakePoint(19.9245, 39.6249), 4326), '2026-07-25 21:00', '2026-07-25 23:30', 14.00, 400, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Corfu Old Town'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Corfu Venetian Boutique Hotel'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com'),
 NOW(), NOW());

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
     (SELECT "Id" FROM "Users" WHERE "Email" = 'eleni.creator@spirego.com') cc
WHERE e."DestinationId" = d."Id"
  AND d."Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');


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
 4, 'Pogled i hrana su odlicni, ali se na uslugu cekalo malo duze nego sto sam ocekivala.', 'Approved', NOW());
INSERT INTO "Reviews"
("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
VALUES
((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'),
 5, 'Hotel je bio odlican izbor za prvi dolazak u Atinu. Najvise mi se dopala terasa sa pogledom na Akropolj, posebno uvece kada je sve osvetljeno. Soba nije bila ogromna, ali je bila uredna, tiha i dovoljno blizu glavnih znamenitosti da nismo morali stalno da koristimo prevoz.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'),
 4, 'Lokacija je stvarno velika prednost jer se do Plake i Akropolja stize veoma brzo. Dorucak je bio korektan, ali bih voleo malo vise lokalnih proizvoda umesto standardne hotelske ponude. Osoblje je bilo ljubazno i pomoglo nam je oko preporuka za veceru.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'),
 3, 'Pogled je lep i lokacija je dobra, ali je cena ipak malo jaca za ono sto se dobije. Lift je bio spor, a soba okrenuta ka ulici imala je vise buke nego sto sam ocekivao. Nije lose, ali bih sledeci put proverio i druge opcije u istom delu grada.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'),
 5, 'Vecera u basti je bila jedno od najlepsih iskustava u Atini. Hrana je bila sveza, porcije dovoljno velike, a konobar nam je objasnio razliku izmedju nekoliko lokalnih jela. Atmosfera je opustena i nije delovalo kao tipicno turisticko mesto iako se nalazi u popularnom delu grada.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'),
 4, 'Taverna ima prijatan ambijent i dobra tradicionalna jela. Musaka je bila odlicna, ali se na sto cekalo duze nego sto nam je receno prilikom dolaska. Ipak, osoblje se izvinilo i ponudilo desert, pa je utisak na kraju bio pozitivan.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'),
 2, 'Hrana nije bila losa, ali je guzva bila prevelika i usluga je bila dosta spora. Dobili smo glavno jelo skoro hladno, a racun smo morali da trazimo dva puta. Lokacija je dobra, ali za tu cenu sam ocekivao mnogo organizovaniji servis.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Museum of Cycladic Culture Athens'),
 4, 'Muzej je miran, lepo uredjen i odlican za pauzu od gradske guzve. Posebno su mi se dopali eksponati sa ostrva i kratka objasnjenja koja nisu predugacka. Volela bih da ima malo vise interaktivnog sadrzaja, ali za ljubitelje istorije svakako vredi posete.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Museum of Cycladic Culture Athens'),
 3, 'Zbirka je zanimljiva, ali obilazak nije trajao dugo koliko sam ocekivala. Prostor je prijatan i klimatizovan, sto je leti velika prednost. Preporucila bih ga onima koje zaista zanima umetnost i istorija, ali mozda nije najzabavniji izbor za decu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'),
 5, 'Smestaj je prelep i pogled sa terase je zaista poseban. Najlepse je bilo jutro, pre nego sto ulice postanu pune turista. Osoblje je diskretno i veoma ljubazno, dorucak je donesen na terasu i sve je delovalo pazljivo organizovano.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'),
 4, 'Apartman je bio cist, svetao i vrlo fotogenican, sa prelepim pogledom na kalderu. Jedina mana je sto ima dosta stepenica, pa nije najprakticnije ako nosite vise kofera. Za romantican odmor je stvarno odlican izbor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'),
 3, 'Pogled je fenomenalan, ali cena je visoka i ocekuje se savrsenstvo. Klima je jedne noci slabije radila, a zbog konfiguracije mesta nije bas lako doci do smestaja sa prtljagom. Lepo iskustvo, ali treba znati sta vas ceka.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Fira Sunset Wine Bar'),
 5, 'Najbolji deo veceri bio je pogled na zalazak sunca uz casu lokalnog vina. Osoblje je znalo da preporuci vino prema ukusu, a meze tanjir je bio mnogo bolji nego sto sam ocekivala za bar. Mesto jeste popularno, ali atmosfera nije bila naporna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Fira Sunset Wine Bar'),
 4, 'Vina su odlicna i pogled je zaista vredan dolaska. Rezervacija je skoro obavezna ako zelite dobar sto. Cene su vise, ali to je donekle ocekivano za Firu i ovakav pogled.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aegean Blue Restaurant'),
 4, 'Hrana je bila vrlo dobra, posebno riba i salata sa lokalnim sirom. Terasa je prelepa i osoblje je prijatno, ali porcije nisu velike u odnosu na cenu. Za posebnu veceru svakako preporucujem, samo ne bih dosla potpuno gladna.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aegean Blue Restaurant'),
 2, 'Pogled je odlican, ali restoran nas nije odusevio. Hrana je bila korektna, ali nista posebno za cenu koja je prilicno visoka. Usluga je bila hladna i delovalo je kao da zele sto brze da oslobode sto.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Chania Harbor Hotel'),
 5, 'Hotel je na sjajnoj lokaciji za obilazak Hanije. Ujutru smo brzo stizali do luke, a uvece je bilo lako vratiti se posle vecere. Soba je bila uredna, kupatilo novo, a dorucak na terasi je bio lep pocetak dana.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Chania Harbor Hotel'),
 4, 'Vrlo prijatan hotel, posebno ako planirate dosta setnje po starom gradu. Nije idealan za dolazak autom jer je parkiranje komplikovano u okolini, ali osoblje nam je pomoglo da nadjemo najblizu opciju. Sve ostalo je bilo na dobrom nivou.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Elafonisi Beach Canteen'),
 3, 'Korisno mesto ako provedete ceo dan na plazi, ali ne treba ocekivati nista posebno. Kafa je bila dobra, sendvic prosecan, a cene malo vise nego sto bih volela. Ipak, blizina plaze mnogo znaci kada ste sa decom.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Elafonisi Beach Canteen'),
 2, 'Lokacija je prakticna, ali red je bio dug i ponuda je ogranicena. Razumem da je plaza popularna, ali usluga bi mogla da bude brza i organizovanija. Sledeci put bih poneo svoju hranu i vodu.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rhodes Knight Hotel'),
 4, 'Hotel ima lepu atmosferu i stvarno se uklapa u stari grad Rodosa. Soba je bila manja, ali cista i tiha. Najvise mi se dopalo sto se uvece moze peske do svih glavnih ulica i restorana.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rhodes Knight Hotel'),
 3, 'Ambijent je lep, ali dorucak je bio skroman i soba nije imala dovoljno prirodnog svetla. Lokacija je odlicna za obilazak starog grada, pa bih ga preporucila za kraci boravak, ali ne i za duzi odmor.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lindos Bay Seafood'),
 5, 'Rucak posle kupanja bio je savrsen. Riba je bila sveza, salata jednostavna i ukusna, a pogled na zaliv prelep. Osoblje je bilo brzo i nenametljivo, sto je bas prijalo posle guzve na plazi.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lindos Bay Seafood'),
 4, 'Dobar restoran sa lepim pogledom i korektnim cenama za lokaciju. Morski plodovi su bili dobro spremljeni, ali desert nije bio nista posebno. Sve u svemu, vrlo prijatno mesto za rucak.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'anastasia.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Corfu Venetian Boutique Hotel'),
 5, 'Prelep mali hotel sa mnogo karaktera. Stari grad Krfa je odmah ispred vas, ali je soba bila dovoljno tiha za odmor. Osoblje je dalo odlicne preporuke za restorane i manje poznate ulice za setnju.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'dimitris.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Corfu Venetian Boutique Hotel'),
 4, 'Dobar izbor za boravak u starom gradu. Enterijer je zanimljiv, krevet udoban, a lokacija odlicna. Mana je sto nema mnogo prostora za parkiranje u blizini, ali to je generalno problem u ovom delu Krfa.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ioanna.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Paleokastritsa View Cafe'),
 4, 'Kafic ima divan pogled i prijatan izbor pica posle voznje camcem. Hrana je jednostavna, ali korektna, a terasa je najbolji deo mesta. Volela bih samo malo brzu uslugu u periodu najvece guzve.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'luka.greece.tourist@spirego.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Paleokastritsa View Cafe'),
 3, 'Pogled je lep i kafa je bila dobra, ali cene su turisticke i izbor hrane nije veliki. Za kratku pauzu je sasvim u redu, posebno zbog lokacije, ali ne bih planirao duzi obrok ovde.', 'Approved', NOW());


-- ============================================
-- 10. IMAGES - DESTINATIONS
-- ============================================
WITH source("Url", "AltText", "IsMain", "DestinationName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', 'Athens', true, 'Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka,%20Athens%20%283340582775%29.jpg', 'Athens', false, 'Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Santorini', true, 'Santorini'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', 'Santorini', false, 'Santorini'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Crete', true, 'Crete'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', 'Crete', false, 'Crete'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes', true, 'Rhodes'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Lindos%20Bay.jpg', 'Rhodes', false, 'Rhodes'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%26%20Old%20Fortress.jpg', 'Corfu', true, 'Corfu'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', 'Corfu', false, 'Corfu')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", d."Id", NOW()
FROM source s
JOIN "Destinations" d ON d."Name" = s."DestinationName";

-- 15.9 IMAGES - LOCALITIES
WITH source("Url", "AltText", "IsMain", "LocalityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', 'Plaka Athens', true, 'Plaka Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', 'Acropolis Hill', true, 'Acropolis Hill'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Oia Santorini', true, 'Oia Santorini'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%282602792772%29.jpg', 'Fira Santorini', true, 'Fira Santorini'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Chania Old Town', true, 'Chania Old Town'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', 'Elafonisi Beach', true, 'Elafonisi Beach'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes Old Town', true, 'Rhodes Old Town'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Lindos%20Bay.jpg', 'Lindos Bay', true, 'Lindos Bay'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%28May%202017%29.jpg', 'Corfu Old Town', true, 'Corfu Old Town'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', 'Paleokastritsa', true, 'Paleokastritsa')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", l."Id", NOW()
FROM source s
JOIN "Localities" l ON l."Name" = s."LocalityName";

-- 15.10 IMAGES - OBJECTS
WITH source("Url", "AltText", "IsMain", "ObjectName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', 'Hotel Acropolis View Athens', true, 'Hotel Acropolis View Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', 'Hotel Acropolis View Athens', false, 'Hotel Acropolis View Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', 'Plaka Garden Taverna', true, 'Plaka Garden Taverna'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%20Athens%20%28February%202019%29.jpg', 'Plaka Garden Taverna', false, 'Plaka Garden Taverna'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2827821980944%29.jpg', 'Museum of Cycladic Culture Athens', true, 'Museum of Cycladic Culture Athens'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Oia Caldera Suites', true, 'Oia Caldera Suites'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%282602792772%29.jpg', 'Oia Caldera Suites', false, 'Oia Caldera Suites'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', 'Fira Sunset Wine Bar', true, 'Fira Sunset Wine Bar'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Aegean Blue Restaurant', true, 'Aegean Blue Restaurant'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Chania Harbor Hotel', true, 'Chania Harbor Hotel'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', 'Elafonisi Beach Canteen', true, 'Elafonisi Beach Canteen'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes Knight Hotel', true, 'Rhodes Knight Hotel'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Lindos%20Bay.jpg', 'Lindos Bay Seafood', true, 'Lindos Bay Seafood'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%26%20Old%20Fortress.jpg', 'Corfu Venetian Boutique Hotel', true, 'Corfu Venetian Boutique Hotel'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', 'Paleokastritsa View Cafe', true, 'Paleokastritsa View Cafe')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", o."Id", NOW()
FROM source s
JOIN "Objects" o ON o."Name" = s."ObjectName";

-- 15.11 IMAGES - EVENTS
WITH source("Url", "AltText", "IsMain", "EventName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2827821980944%29.jpg', 'Athens Open Air Classics', true, 'Athens Open Air Classics'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', 'Santorini Sunset Wine Festival', true, 'Santorini Sunset Wine Festival'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Oia Summer Lights', true, 'Oia Summer Lights'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Chania Harbor Food Week', true, 'Chania Harbor Food Week'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes Medieval Night', true, 'Rhodes Medieval Night'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%28May%202017%29.jpg', 'Corfu Old Town Jazz Evening', true, 'Corfu Old Town Jazz Evening')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", e."Id", NOW()
FROM source s
JOIN "Events" e ON e."Name" = s."EventName";

-- 15.12 IMAGES - ACTIVITIES
WITH source("Url", "AltText", "IsMain", "ActivityName") AS (
    VALUES
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%20Athens%20%28February%202019%29.jpg', 'Athens History Walk', true, 'Athens History Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', 'Traditional Greek Dinner Plaka', true, 'Traditional Greek Dinner Plaka'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Santorini Caldera Photo Walk', true, 'Santorini Caldera Photo Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', 'Santorini Wine Tasting', true, 'Santorini Wine Tasting'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Chania Old Harbor Walk', true, 'Chania Old Harbor Walk'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', 'Elafonisi Beach Day', true, 'Elafonisi Beach Day'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes Medieval Tour', true, 'Rhodes Medieval Tour'),
    ('https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', 'Paleokastritsa Boat Ride', true, 'Paleokastritsa Boat Ride')
)
INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
SELECT s."Url", s."AltText", s."IsMain", a."Id", NOW()
FROM source s
JOIN "Activities" a ON a."Name" = s."ActivityName";

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
    'https://upload.wikimedia.org/wikipedia/commons/0/00/Budva_(26871774051).jpg',
    'Budva',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/0/00/Budva_(26871774051).jpg',
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
    'https://www.visit-montenegro.com/wp-content/uploads/2026/01/Depositphotos_668449212_XL-scaled.jpg',
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
    'https://www.montenegro.travel/imagine_cache/og/uploads/banners/1_unique_montengro/1.Cetinje.webp',
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
    'https://s3.eu-central-1.amazonaws.com/web.repository/gradska-static/static-images/06_cetinje/cetinje_hero_1920x1080.jpg    p',
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
    'Igalo Banja',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo Banja'),
    NOW()),
(
    'https://forzatravel.rs/fajlovi/productitem/institut-dr-simo-milosevic-844.jpg',
    'Igalo Banja',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo Banja'),
    NOW()),
(
    'https://igalospa.com/wp-content/uploads/2019/07/podvodna-tus-masaza-institut-igalo.jpg',
    'Igalo Banja',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo Banja'),
    NOW()),
(
    'https://startravelnis.rs/wp-content/uploads/2022/02/igalo-institut-simo-14.jpg',
    'Igalo Banja',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo Banja'),
    NOW()),
(
    'https://beaches-searcher.com/images/beaches/499201004/ME201004.jpg',
    'Igalo Banja',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Igalo Banja'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/d/d2/View_over_Njegusi.jpg',
    'Selo Njegusi',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
    NOW()),
(
    'https://aktuelno.s3.eu-central-1.amazonaws.com/media/aktuelno/2023/02/thumbnail_Pogled-na-panoramu-sela-Dugi-Do-Njegusi.jpg',
    'Selo Njegusi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
    NOW()),
(
    'https://goldtravel.me/wp-content/uploads/lovcen-njegusi-2.jpg',
    'Selo Njegusi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2022/02/06/17/5389266_njegusi-reportaza-njegosev-dan-29_share.jpg',
    'Selo Njegusi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
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
    NOW());

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
    'https://upload.wikimedia.org/wikipedia/commons/3/3c/Jezerski_vrh_na_Lovcenu_-_Njegosev_mauzolej_09.jpg',
    'Njegosev mauzolej',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/1/18/Lovcen.jpg',
    'Njegosev mauzolej',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
    NOW()),
(
    'https://www.cdm.me/wp-content/uploads/2024/11/Mauzolej-foto-05.jpg',
    'Njegosev mauzolej',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
    NOW()),
(
    'https://www.3dvirtualheritage.me/storage/posts/nBkWuggeMo3PI8TY7vUfjVwqzUnEf0kARObRnrmr.png',
    'Njegosev mauzolej',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
    NOW()),
(
    'https://www.montenegrocar.me/data/public/gallery/17/lovcen.jpg',
    'Njegosev mauzolej',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
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
    NOW())
;

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
