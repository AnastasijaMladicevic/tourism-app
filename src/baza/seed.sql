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
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png');

INSERT INTO "Users"
("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
VALUES
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
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW(), '/images/profiles/default_icon.png');

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


-- ============================================
-- 6. OBJECTS
-- ============================================
INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Vardar', 'Hotel u srcu starog grada Kotora', 'Stari grad Kotor', '+38232345678', 'https://hotelvardar.com',
 '{"pon":"00:00-24:00"}', 145.00, ARRAY['WiFi', 'Parking', 'Spa', 'Dorucak'], ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restoran Galion', 'Restoran sa pogledom na zaliv', 'Skaljari bb, Kotor', '+38232345679', 'https://galion.me',
 '{"pon":"10:00-23:00"}', 35.00, ARRAY['WiFi', 'Terasa', 'Pogled na more', 'Rezervacije'], ST_SetSRID(ST_MakePoint(18.768, 42.427), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Avala', 'Luksuzni hotel pored mora', 'Budva centar', '+38233456789', 'https://avala.me',
 '{"pon":"00:00-24:00"}', 180.00, ARRAY['WiFi', 'Bazen', 'Spa', 'Parking', 'Dorucak'], ST_SetSRID(ST_MakePoint(18.838, 42.279), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari grad Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Mogren Beach Bar', 'Kafic na plazi', 'Plaza Mogren', '+38233456780', NULL,
 '{"pon":"08:00-02:00"}', 12.00, ARRAY['Terasa', 'Pogled na more', 'Kokteli', 'Muzika'], ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafana'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Planinarski dom Durmitor', 'Dom za planinare na Durmitoru', 'Durmitor bb', '+38233456781', NULL,
 '{"pon":"00:00-24:00"}', 55.00, ARRAY['Parking', 'Restoran', 'Grejanje', 'Pogled na planinu'], ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Planinarski dom'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Crno jezero'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Biblioteka Niksic', 'Gradska biblioteka u Nikšiću', 'Trg Slobode, Nikšić',  '+38220000001', NULL,
 '{"pon":"08:00-20:00"}', NULL, ARRAY['WiFi', 'Citaonica', 'Klimatizovano'], ST_SetSRID(ST_MakePoint(18.956, 42.774), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Biblioteka'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Crkva Svetog Nikole Bar', 'Pravoslavna crkva u Starom Baru', 'Stari Bar', '+38220000002', NULL,
 '{"pon":"06:00-18:00"}', NULL, ARRAY['Vodic', 'Mirno okruzenje'], ST_SetSRID(ST_MakePoint(19.142, 42.097), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Crkva'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Stari Bar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),
 
 ('Restoran Jezero', 'Restoran sa pogledom na Skadarsko jezero',  'Virpazar bb', '+38220000003', NULL,
 '{"pon":"09:00-22:00"}', 22.00, ARRAY['Terasa', 'Pogled na jezero', 'Parking', 'Rezervacije'], ST_SetSRID(ST_MakePoint(19.091, 42.246), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

 ('Hotel Bianca Kolasin', 'Popularan hotel u Kolasinu',  'Kolasin centar', '+38220000004', NULL,
 '{"pon":"00:00-24:00"}', 130.00, ARRAY['WiFi', 'Spa', 'Parking', 'Dorucak', 'Ski ostava'], ST_SetSRID(ST_MakePoint(19.522, 42.822), 4326), 0, 0, 'Approved', true,
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
 NOW(), NOW())
 ;

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
 4, 'Restoran je fantastican, hrana odlicna, pogled prelep!', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ana@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 5, 'Luksuzno i udobno, vredi svake pare. Dzakuzi vrhunski.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 4, 'Lep hotel i odlicna lokacija, dorucak moze biti bolji.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 4, 'Vrlo prijatan smestaj i sjajan pogled sa terase.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 5, 'Fenomenalna usluga i pogled, vraticu se opet.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 4, 'Opustena atmosfera i super muzika predvece.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 5, 'Odlicno mesto za pice posle plaze.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'mila@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 5, 'Savrsena baza za planinarenje, osoblje veoma ljubazno.', 'Approved', NOW()),

((SELECT "Id" FROM "Users" WHERE "Email" = 'ivan@gmail.com'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 4, 'Topla preporuka za ljubitelje prirode i planine.', 'Approved', NOW());


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
    'https://upload.wikimedia.org/wikipedia/commons/6/63/Igalo3_by_Klackalica.jpg',
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
    'https://i.ytimg.com/vi/FkusxN_I2gA/maxresdefault.jpg',
    'Selo Njegusi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
    NOW()),
(
    'https://aktuelno.s3.eu-central-1.amazonaws.com/media/aktuelno/2023/02/thumbnail_Jedno-od-sacuvanih-guvna-u-selu-Dugi-Do-Njegusi-pod-snijegom.jpg',
    'Selo Njegusi',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Selo Njegusi'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/8/8c/Lovcen-008-p1010045.jpg',
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
    'https://nparkovi.me/educational_corner/lovcen/npark-lovcen-02t.jpg',
    'Lovcen',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Lovcen'),
    NOW()),

(
    'https://storage.medialib.dev/media/kotor-cable-car/2025/06/19/17503687890escg2e9w71ys2nb-i_1497x842.jpg',
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
    'https://apartments-sofija.com/wp-content/uploads/skadarsko-jezero-crna-gora-1.jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://www.portomontenegro.com/wp-content/uploads/2022/05/skadar-national-park-825x465.jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://visitadabojana.com/wp-content/uploads/2025/10/pavlova-strana-viewpoint.webp',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://parksdinarides.org/wp-content/uploads/2022/04/Skadarsko-jezero-4..jpg',
    'Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Skadarsko jezero'),
    NOW()),

(
    'https://upload.wikimedia.org/wikipedia/commons/0/0e/Kola%C5%A1in_Town_Center.jpg',
    'Kolasin',
    false,
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
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kolasin'),
    NOW()),
    
(
    'https://kolasin1450.com/img/home/skijaliste1.jpg',
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
    'https://sharemontenegro.me/wp-content/uploads/2019/02/viber-image-1280x853.jpg',
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
    'https://zabljak.me/wp-content/uploads/2025/06/slika-zabljak-slider-06.jpg',
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
    'https://rtnk.me/wp-content/uploads/2025/09/Untitled-design-30.png',
    'Trg Slobode',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Trg_Slobode_NK.JPG',
    'Trg Slobode',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2020/01/02/00/4911722_20200102190116_74bf8f62ea2dc9beeca3e77c529a990ee429ad8d67f875e64bff8c89fe95dbe7_share.jpg',
    'Trg Slobode',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Trg Slobode'),
    NOW()),
(
    'https://me.ekapija.com/thumbs/niksic_050323_tw1024.jpg',
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
    'https://images.trvl-media.com/lodging/9000000/8210000/8207000/8206933/2064a2f1.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
    'Porto Montenegro',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/683356911.jpg?k=f8c9f35b3acc86c083776cf1fe2947e00f359fd5f265394430e82a4bc2378b43&o=',
    'Porto Montenegro',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Porto Montenegro'),
    NOW()),
(
    'https://me.ekapija.com/thumbs169/niksic_050323_tw1024.jpg',
    'Spomen park Slobode Niksic',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://rtnk.me/wp-content/uploads/2024/09/spomen-kompleks-sloboda-foto-RTCG.jpeg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://onogost.me/wp-content/uploads/2023/08/IMG-ce6b0b6e8eb214a51739afacf4b2173e-V-1024x768.jpg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://s3.eu-south-1.wasabisys.com/in4s.net/2021/02/Niksic-trg-Slobode.jpg',
    'Spomen park Slobode Niksic',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Spomen park Slobode Niksic'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/a/ad/Petar_II_Petrovi%C4%87-Njego%C5%A1_mausoleum_08.jpg',
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
    'https://adrion5senses.eu/wp-content/uploads/sw_win/files/strict_cache/1040x6608aaebc16a31607216b5ea7255d611811-l.jpg',
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
    'https://www.danas.rs/wp-content/uploads/2017/08/00_Lovcen-1.jpg',
    'Njegosev mauzolej',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Njegosev mauzolej'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/5/53/Virpazar.jpg',
    'Virpazar',
    true,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Virpazar'),
    NOW()),
(
    'https://www.ekapija.com/thumbs169/naselje_virpazar_na_skadarskom_jezeru_1_050925_tw1024.jpg',
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
    'https://tinymontenegro.com/wp-content/uploads/2023/10/imageedit_1_2824406581.jpg',
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
    'https://upload.wikimedia.org/wikipedia/commons/a/a9/Crno_jezero_%28Durmitor%29.jpg',
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
    'https://podgorica.travel/wp-content/uploads/2024/05/biogradsko-lake.jpg',
    'Biogradsko jezero',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Biogradsko jezero'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/0/0c/Biogradsko_jezero4.jpg',
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
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/144223095.jpg?k=d4bd79559ef5e7fbdc95e84b3c945ea62a730fc194992f4328b0635694225719&o=',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://www.gradnja.rs/wp-content/uploads/2023/12/trg-zabljak-konkurs-04.jpg',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://zabljak.me/wp-content/uploads/2024/06/O-Zabljak-6.webp',
    'Centar Zabljaka',
    false,
    (SELECT "Id" FROM "Localities" WHERE "Name" = 'Centar Zabljaka'),
    NOW()),
(
    'https://zabljak.me/wp-content/uploads/2025/06/slika-zabljak-slider-06.jpg',
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
    'https://onogost.me/wp-content/uploads/2021/03/bbb_0.jpg',
    'Biblioteka Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://bibliotekank.me/wp-content/uploads/2025/05/Biblioteka-Njegos.jpg',
    'Biblioteka Niksic',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Biblioteka Niksic'),
    NOW()),
(
    'https://onogost.me/wp-content/uploads/2022/09/154027101_447757199800263_2417071867195548541_n.jpg',
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
    'https://www.ekapija.com/thumbs169/crkva_svetog_nikole_stari_grad_bar_031224_tw1024.jpg',
    'Crkva Svetog Nikole Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
    NOW()),
(
    'https://s3.eu-south-1.wasabisys.com/in4s.net/2019/04/crkva-sv-Nikole-u-Baru.jpg',
    'Crkva Svetog Nikole Bar',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Crkva Svetog Nikole Bar'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/14/Gj29LMFOkJ0Uj2gFTgW7O9Eab4bldkTUzZfYmfaQ.png',
    'Restoran Jezero',
    true,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://bankar.me/wp-content/uploads/2023/03/restoran-jezero-e1679131895469.jpg',
    'Restoran Jezero',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Jezero'),
    NOW()),
(
    'https://foodbook.me/storage/restaurants/495/53kcPdHYXiiYrXl3Clx4xNnzsI9jSCDQWQinQs4u.jpeg',
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
    'https://www.kongresniturizam.com/storage/objects/BJU4szY2A66Ga5KK.jpg',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://www.kongresniturizam.com/storage/objects/iDePcQLPEZgcGGcT.jpg',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://imgcy.trivago.com/c_fill,d_dummy.jpeg,e_sharpen:60,f_auto,h_627,q_auto,w_1200/hotelier-images/37/95/f3ad44894d237c95c00e61b7b0f5f8e2c82512f95629fd1cd3e22ad5cc8f.jpeg',
    'Hotel Bianca Kolasin',
    false,
    (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Bianca Kolasin'),
    NOW()),
(
    'https://imgcy.trivago.com/c_fill,d_dummy.jpeg,e_sharpen:60,f_auto,h_627,q_auto,w_1200/hotelier-images/37/95/f3ad44894d237c95c00e61b7b0f5f8e2c82512f95629fd1cd3e22ad5cc8f.jpeg',
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
    'https://putovanjazapet.com/wp-content/uploads/2025/06/Skadarsko-jezero-voznja-camcem-1024x683.jpg',
    'Voznja camcem Skadarsko jezero',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Voznja camcem Skadarsko jezero'),
    NOW()),
(
    'https://montesoltravel.me/assets/images/uploads/58/4.jpg',
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
    'https://skijalista.me/wp-content/uploads/DJI_0765.jpg',
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
    'https://kolasin1450.com/img/home/skijaliste1.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://kolasin1450.com/img/home/skijaliste8.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW()),
(
    'https://srbijazamlade.rs/fajlovi/productitem/kolasin-1600-skijaliste_5ffefd29559fc.jpg',
    'Skijanje Kolasin',
    false,
    (SELECT "Id" FROM "Activities" WHERE "Name" = 'Skijanje Kolasin'),
    NOW())
    ;


    
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

CREATE OR REPLACE FUNCTION update_object_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Objects"
    SET
        "AverageRating" = (
            SELECT COALESCE(ROUND(AVG("Rating")::numeric, 2), 0)
            FROM "Reviews"
            WHERE "ObjectId" = COALESCE(NEW."ObjectId", OLD."ObjectId")
              AND "Status" = 'Approved'
        ),
        "ReviewCount" = (
            SELECT COUNT(*)
            FROM "Reviews"
            WHERE "ObjectId" = COALESCE(NEW."ObjectId", OLD."ObjectId")
              AND "Status" = 'Approved'
        )
    WHERE "Id" = COALESCE(NEW."ObjectId", OLD."ObjectId");

    RETURN COALESCE(NEW, OLD);
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
