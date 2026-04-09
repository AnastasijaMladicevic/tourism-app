/*TRUNCATE TABLE
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
RESTART IDENTITY CASCADE;*/

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
('Grad'),
('Opstina'),
('Region'),
('Stari Grad'),
('Turisticka Zona'),
('Setaliste'),
('Trg'),
('Park');

INSERT INTO "DestinationTypes" ("Name") VALUES
('Grad'),
('Planina'),
('Nacionalni Park'),
('Jezero'),
('Obala'),
('Zaliv'),
('Banja'),
('Stari Grad'),
('Plaza');

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
('Planinarski dom');

INSERT INTO "ActivityTypes" ("Name") VALUES
('Plivanje'),
('Ronjenje'),
('Skijanje'),
('Soping'),
('Paraglajding'),
('Setnja'),
('Planinarenje'),
('Biciklizam'),
('Jahanje'),
('Poseta Restoranu'),
('Nocni Izlazak'),
('Pesacenje'),
('Sport'),
('Relax'),
('Ishrana'),
('Obilazak'),
('Izlazak');

INSERT INTO "EventTypes" ("Name") VALUES
('Koncert'),
('Utakmica'),
('Predstava'),
('Organizovana Tura'),
('Festival'),
('Izlozba'),
('Nastup'),
('Okupljanje');

-- ============================================
-- 3. USERS
-- ============================================
INSERT INTO "Users"
("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt")
VALUES
('Nikola', 'Nikolic', '1990-01-01', 'admin@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin'), NULL, NOW(), NOW()),

('Marko', 'Jovanovic', '1992-05-15', 'marko@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269123456', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Manager'), NULL, NOW(), NOW()),

('Ana', 'Petrovic', '1995-03-20', 'ana@spirego.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', '+38269234567', 'Crna Gora', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'ContentCreator'), NULL, NOW(), NOW()),

('Ana', 'Anic', '1998-07-10', 'ana@gmail.com', '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS', NULL, 'Srbija', 'sr', true, true, false, false,
 (SELECT "Id" FROM "Roles" WHERE "Name" = 'Tourist'), NULL, NOW(), NOW());

-- ============================================
-- 4. DESTINATIONS
-- ============================================
INSERT INTO "Destinations"
("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Stari grad Kotor', 'Istorijska lokacija u srcu Kotora',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Kotorski zaliv', 'Poznat po prirodnoj lepoti i Boki Kotorskoj',
 ST_SetSRID(ST_MakePoint(18.770, 42.430), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Zaliv'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Budva', 'Primorski grad poznat po turizmu i starom gradu',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Stari grad Budva', 'Istorijsko jezgro Budve',
 ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Stari Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW()),

('Plaza Mogren', 'Jedna od najlepsih plaza na Jadranu',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 'Approved', true,
 (SELECT "Id" FROM "DestinationTypes" WHERE "Name" = 'Plaza'),
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
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NULL, NOW(), NOW());

UPDATE "Destinations"
SET "ManagedByUserId" = (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com')
WHERE "Name" = 'Stari grad Kotor';

UPDATE "Users"
SET "ManagedDestinationId" = (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor')
WHERE "Email" = 'marko@spirego.com';

-- ============================================
-- 5. LOCALITIES
-- ============================================
INSERT INTO "Localities"
("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
VALUES
('Budva', 'Poznato turisticko mesto na Jadranu',
 ST_SetSRID(ST_MakePoint(18.840, 42.286), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Podgorica', 'Glavni grad Crne Gore',
 ST_SetSRID(ST_MakePoint(19.262, 42.441), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Podgorica'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Zabljak', 'Planinski grad u blizini Durmitora',
 ST_SetSRID(ST_MakePoint(19.123, 43.155), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Herceg Novi', 'Primorski grad na ulazu u Bokokotorski zaliv',
 ST_SetSRID(ST_MakePoint(18.537, 42.453), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Herceg Novi'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Bar', 'Grad poznat po luci i Starom Baru',
 ST_SetSRID(ST_MakePoint(19.100, 42.093), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Bar'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Ulcinj', 'Najjuzniji grad na primorju',
 ST_SetSRID(ST_MakePoint(19.224, 41.929), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Ulcinj'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Kotor', 'Primorski grad poznat po starom gradu',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Cetinje', 'Istorijska prestonica Crne Gore',
 ST_SetSRID(ST_MakePoint(18.924, 42.390), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Cetinje'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Niksic', 'Drugi po velicini grad',
 ST_SetSRID(ST_MakePoint(18.956, 42.773), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Niksic'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW()),

('Tivat', 'Primorski grad poznat po marini',
 ST_SetSRID(ST_MakePoint(18.693, 42.434), 4326), true,
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Tivat'),
 (SELECT "Id" FROM "LocalityTypes" WHERE "Name" = 'Grad'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'), NOW());

-- ============================================
-- 6. OBJECTS
-- ============================================
INSERT INTO "Objects"
("Name", "Description", "Address", "PhoneNumber", "Website", "WorkingHours", "Geolocation", "AverageRating", "ReviewCount",
 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
VALUES
('Hotel Vardar', 'Hotel u srcu starog grada Kotora', 'Stari grad Kotor', '+38232345678', 'https://hotelvardar.com',
 '{"pon":"00:00-24:00"}', ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Restoran Galion', 'Restoran sa pogledom na zaliv', 'Skaljari bb, Kotor', '+38232345679', 'https://galion.me',
 '{"pon":"10:00-23:00"}', ST_SetSRID(ST_MakePoint(18.768, 42.427), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Restoran'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Kotorski zaliv'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'marko@spirego.com'),
 NOW(), NOW(), NOW()),

('Hotel Avala', 'Luksuzni hotel pored mora', 'Budva centar', '+38233456789', 'https://avala.me',
 '{"pon":"00:00-24:00"}', ST_SetSRID(ST_MakePoint(18.838, 42.279), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Hotel'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Mogren Beach Bar', 'Kafic na plazi', 'Plaza Mogren', '+38233456780', NULL,
 '{"pon":"08:00-02:00"}', ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Kafana'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW()),

('Planinarski dom Durmitor', 'Dom za planinare na Durmitoru', 'Durmitor bb', '+38233456781', NULL,
 '{"pon":"00:00-24:00"}', ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0, 0, 'Approved', true,
 (SELECT "Id" FROM "ObjectTypes" WHERE "Name" = 'Planinarski dom'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW(), NOW());

-- ============================================
-- 7. ACTIVITIES
-- ============================================
INSERT INTO "Activities"
("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('Degustacija morskih specijaliteta', 'Lokalna kuhinja - degustacija ribljih specijaliteta',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 25.00, 90, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Poseta Restoranu'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Restoran Galion'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Nocni izlazak Budva', 'Zabava uz muziku u budvanskim klubovima',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), 10.00, 240, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Nocni Izlazak'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Planinarenje na Durmitoru', 'Pesacka tura kroz prirodu Durmitora',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), 0.00, 300, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Planinarenje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW()),

('Setnja starim gradom Kotora', 'Razgledanje istorijskih znamenitosti',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), 0.00, 120, true,
 (SELECT "Id" FROM "ActivityTypes" WHERE "Name" = 'Setnja'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 NULL,
 1,
 (SELECT "Id" FROM "Users" WHERE "Email" = 'admin@spirego.com'),
 NOW(), NOW());

-- ============================================
-- 8. EVENTS
-- ============================================
INSERT INTO "Events"
("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "CreatedAt", "UpdatedAt")
VALUES
('KotorArt festival', 'KotorArt festival predstavlja jedinstven spoj muzike, umetnosti i kulturnog nasleđa u prelepom ambijentu Kotora. Tokom trajanja festivala, posetioci mogu uživati u raznovrsnom programu koji obuhvata koncerte, umetničke performanse i sadržaje inspirisane bogatom tradicijom ovog primorskog grada. Događaj okuplja ljubitelje kulture, domaće i strane goste, stvarajući živu i inspirativnu atmosferu.

Poseban doživljaj pruža spoj savremene umetnosti i istorijskog okruženja, gde svaka večer donosi novo iskustvo i priliku za uživanje u kreativnom izrazu. Festival je idealan za sve koji žele da leto provedu u znaku kulture, dobrog raspoloženja i nezaboravnih trenutaka u jednom od najlepših gradova na Jadranu.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), '2026-07-15 20:00', '2026-07-30 23:00', 20.00, 1000, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Vece klasicne muzike', 'U čarobnoj atmosferi starog grada Kotora, ovo veče klasične muzike nudi jedinstven spoj umetnosti i istorije. Program obuhvata pažljivo odabrane kompozicije koje izvode talentovani muzičari, stvarajući intimnu i sofisticiranu atmosferu. Idealno za sve ljubitelje kulture, muzike i romantičnih večeri pod otvorenim nebom.

Autentični ambijent kamenih trgova i osvetljenih uličica dodatno pojačava doživljaj, pretvarajući svaki ton u posebno emotivno iskustvo. Posetioci će imati priliku da se prepuste zvucima klasične muzike dok uživaju u jedinstvenom spoju tradicije i umetnosti. Ovaj događaj pruža savršenu priliku za opuštanje, inspiraciju i stvaranje nezaboravnih uspomena u jednom od najlepših primorskih gradova.',
 ST_SetSRID(ST_MakePoint(18.771, 42.424), 4326), '2026-08-05 21:00', '2026-08-05 23:00', 15.00, 200, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Koncert'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Kotor'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Vardar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Budva Summer Festival', 'Budva Summer Festival donosi energičan i raznovrstan letnji program namenjen svima koji žele da uživaju u muzici, zabavi i prijatnoj atmosferi na otvorenom. Festival okuplja veliki broj posetilaca i nudi sadržaje koji spajaju savremenu zabavu sa prepoznatljivim mediteranskim duhom Budve. Tokom više festivalskih dana, grad postaje mesto susreta dobre muzike, opuštanja i letnjih uspomena.

Uz atraktivan ambijent i bogat program, posetioci imaju priliku da provedu nezaboravne večeri u društvu prijatelja i porodice. Ovaj događaj je savršen izbor za sve koji žele da iskuse letnju energiju Budve, uživaju u kvalitetnom programu i provedu vreme u jednoj od najpoznatijih turističkih destinacija na crnogorskom primorju.',
 ST_SetSRID(ST_MakePoint(18.837, 42.279), 4326), '2026-07-01 19:00', '2026-07-10 23:00', 10.00, 1500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Festival'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Avala'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('DJ Night Mogren', 'DJ Night Mogren je večernji događaj namenjen ljubiteljima elektronske muzike, plesa i letnje atmosfere pored mora. Smešten u atraktivnom ambijentu plaže Mogren, ovaj događaj okuplja posetioce koji žele da uživaju u modernim ritmovima, dobroj energiji i nezaboravnom noćnom provodu. Spoj muzike, mora i letnje večeri stvara poseban ambijent koji privlači kako turiste tako i lokalne posetioce.

Uz dinamičan program i opuštenu atmosferu, događaj pruža savršenu priliku za druženje, zabavu i uživanje u jedinstvenom noćnom iskustvu na obali. DJ Night Mogren je idealan za sve koji žele da dožive živopisnu letnju scenu Budve i provedu noć ispunjenu muzikom, plesom i odličnim raspoloženjem.',
 ST_SetSRID(ST_MakePoint(18.833, 42.278), 4326), '2026-08-10 22:00', '2026-08-11 03:00', 8.00, 500, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Nastup'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Budva'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Mogren Beach Bar'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW()),

('Planinarski susret', 'Planinarski susret na Durmitoru predstavlja idealnu priliku za sve ljubitelje prirode, pešačenja i boravka na svežem planinskom vazduhu. Događaj okuplja planinare, rekreativce i avanturiste koji žele da provedu dan u druženju, istraživanju prirodnih lepota i uživanju u spektakularnim pejzažima jednog od najlepših planinskih predela. Program je osmišljen tako da spoji aktivan odmor, rekreaciju i zajedničko uživanje u prirodi.

Pored same šetnje i okupljanja, učesnici imaju priliku da upoznaju druge zaljubljenike u planinu i provedu vreme u prijatnoj i opuštenoj atmosferi. Ovaj događaj pruža savršen beg od svakodnevice i mogućnost da se doživi mir, lepota i autentičan duh Durmitora kroz aktivan i ispunjen dan u prirodi.',
 ST_SetSRID(ST_MakePoint(19.123, 43.149), 4326), '2026-09-01 08:00', '2026-09-01 18:00', 5.00, 100, true, 'Approved',
 (SELECT "Id" FROM "EventTypes" WHERE "Name" = 'Okupljanje'),
 (SELECT "Id" FROM "Localities" WHERE "Name" = 'Zabljak'),
 (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Durmitor'),
 (SELECT "Id" FROM "Objects" WHERE "Name" = 'Planinarski dom Durmitor'),
 (SELECT "Id" FROM "Users" WHERE "Email" = 'ana@spirego.com'),
 NOW(), NOW());

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
 5, 'Luksuzno i udobno, vredi svake pare. Dzakuzi vrhunski.', 'Approved', NOW());


-- ============================================
-- 10. IMAGES - DESTINATIONS
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
VALUES
(
    'https://afar.brightspotcdn.com/dims4/default/3a97ce6/2147483647/strip/false/crop/1600x800+0+0/resize/1486x743!/quality/90/?url=https%3A%2F%2Fk3-prod-afar-media.s3.us-west-2.amazonaws.com%2Fbrightspot%2Ff4%2F0e%2Fabb2c7bf50f46954835d19e83029%2Foriginal-956aea8bdeae0f9b8479b054a6ff8e85.jpg',
    'Stari grad Kotor',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://www.mojacrnagora.rs/wp-content/uploads/2018/08/Kotor-Stari-Grad-02-1024x682.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://images.myguide-cdn.com/montenegro/companies/kotor-stari-grad/large/kotor-stari-grad-81619.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://kofer.info/wp-content/uploads/2020/03/shutterstock_1703935768.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
    NOW()),
(
    'https://www.portomontenegro.com/wp-content/uploads/2022/04/faruk-kaymak-b_e5K7B3MzQ-unsplash-2-1-960x800.jpg',
    'Stari grad Kotor',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Kotor'),
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
    'Stari grad Budva',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://butuaresidence.com/wp-content/uploads/2018/03/988242_20190203050212_5c566a9bb7896801fb658cf0jpeg_ls.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://kamenovo.me/wp-content/uploads/2020/07/budva-stari-grad.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://www.vijesti.me/data/images/2025/06/08/00/5651288_ricardova-glava_ls.jpg',
    'Stari grad Budva',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Stari grad Budva'),
    NOW()),
(
    'https://upload.wikimedia.org/wikipedia/commons/2/2c/Mogren_beach_aptil_19_th.jpg',
    'Plaza Mogren',
    true,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://upoznajcrnugoru.com/wp-content/uploads/2018/04/Plaza-Mogren-Budva_fs.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://sharemontenegro.me/wp-content/uploads/2019/06/62000806_632077597307537_4593433872003235840_n.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
    NOW()),
(
    'https://hgbudvanskarivijera.com/media/yootheme/cache/52/mogren-1-2-plaza-52d17106.jpg',
    'Plaza Mogren',
    false,
    (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Plaza Mogren'),
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
    NOW());

-- ============================================
-- 10. IMAGES - EVENTS
-- ============================================
INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
VALUES
(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBA0xI7-o4rZ9sVD3J8u7gNO3NExDx5tGDiw&s',
    'Logo',
    true,
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
    'https://i1.sndcdn.com/avatars-Ai7sk2G6lJfwqYux-Yo4y5A-t500x500.jpg',
    'Poster',
    true,
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

CREATE INDEX IF NOT EXISTS idx_images_main ON "Images"("IsMain") WHERE "IsMain" = true;

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
            WHERE "ObjectId" = NEW."ObjectId" AND "Id" != NEW."Id";
        ELSIF NEW."ActivityId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "ActivityId" = NEW."ActivityId" AND "Id" != NEW."Id";
        ELSIF NEW."EventId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "EventId" = NEW."EventId" AND "Id" != NEW."Id";
        ELSIF NEW."DestinationId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "DestinationId" = NEW."DestinationId" AND "Id" != NEW."Id";
        ELSIF NEW."LocalityId" IS NOT NULL THEN
            UPDATE "Images"
            SET "IsMain" = false
            WHERE "LocalityId" = NEW."LocalityId" AND "Id" != NEW."Id";
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
-- 12. FINAL CHECK
-- ============================================
SELECT '=== FINAL CHECK ===' AS "Status";

SELECT 'Roles:' AS "Table", COUNT(*) AS "Count" FROM "Roles" UNION ALL
SELECT 'LocalityTypes:', COUNT(*) FROM "LocalityTypes" UNION ALL
SELECT 'Localities:', COUNT(*) FROM "Localities" UNION ALL
SELECT 'DestinationTypes:', COUNT(*) FROM "DestinationTypes" UNION ALL
SELECT 'Destinations:', COUNT(*) FROM "Destinations" UNION ALL
SELECT 'ObjectTypes:', COUNT(*) FROM "ObjectTypes" UNION ALL
SELECT 'Objects:', COUNT(*) FROM "Objects" UNION ALL
SELECT 'ActivityTypes:', COUNT(*) FROM "ActivityTypes" UNION ALL
SELECT 'Activities:', COUNT(*) FROM "Activities" UNION ALL
SELECT 'EventTypes:', COUNT(*) FROM "EventTypes" UNION ALL
SELECT 'Events:', COUNT(*) FROM "Events" UNION ALL
SELECT 'Users:', COUNT(*) FROM "Users" UNION ALL
SELECT 'Reviews:', COUNT(*) FROM "Reviews";

SELECT "Id", "FirstName", "LastName", "Email", "RoleId"
FROM "Users"
ORDER BY "Id";

SELECT "Id", "Email", "PasswordHash"
FROM "Users";
