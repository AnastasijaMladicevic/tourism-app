using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260425001500_SeedItalyAndSerbiaDemoData")]
    public class SeedItalyAndSerbiaDemoData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
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
                """);

            migrationBuilder.Sql(
                """
                WITH source("FirstName", "LastName", "DateOfBirth", "Email", "PhoneNumber", "Country", "Language", "RoleName") AS (
                    VALUES
                    ('Giulia', 'Bianchi', DATE '1988-06-14', 'giulia.admin@spirego.com', '+390600000001', 'Italija', 'it', 'Admin'),
                    ('Lorenzo', 'Conti', DATE '1991-04-03', 'lorenzo.creator@spirego.com', '+390600000002', 'Italija', 'it', 'ContentCreator'),
                    ('Alessandro', 'Ricci', DATE '1989-08-27', 'manager.rome@spirego.com', '+390600000003', 'Italija', 'it', 'Manager'),
                    ('Martina', 'Greco', DATE '1990-11-19', 'manager.venice@spirego.com', '+390600000004', 'Italija', 'it', 'Manager'),
                    ('Sara', 'Galli', DATE '1992-01-08', 'manager.florence@spirego.com', '+390600000005', 'Italija', 'it', 'Manager'),
                    ('Chiara', 'Rossi', DATE '1997-07-12', 'chiara.italy.tourist@spirego.com', NULL, 'Italija', 'it', 'Tourist'),
                    ('Marco', 'Esposito', DATE '1995-03-30', 'marco.italy.tourist@spirego.com', NULL, 'Italija', 'it', 'Tourist'),
                    ('Bianca', 'Ferri', DATE '1998-10-21', 'bianca.italy.tourist@spirego.com', NULL, 'Italija', 'it', 'Tourist'),
                    ('Milica', 'Petrovic', DATE '1987-02-11', 'milica.admin.serbia@spirego.com', '+381640000001', 'Srbija', 'sr', 'Admin'),
                    ('Jelena', 'Nikolic', DATE '1992-05-18', 'jelena.creator@spirego.com', '+381640000002', 'Srbija', 'sr', 'ContentCreator'),
                    ('Stefan', 'Jovanovic', DATE '1989-09-02', 'manager.belgrade@spirego.com', '+381640000003', 'Srbija', 'sr', 'Manager'),
                    ('Ana', 'Markovic', DATE '1990-12-14', 'manager.novisad@spirego.com', '+381640000004', 'Srbija', 'sr', 'Manager'),
                    ('Nikola', 'Savic', DATE '1988-04-25', 'manager.zlatibor@spirego.com', '+381640000005', 'Srbija', 'sr', 'Manager'),
                    ('Tamara', 'Ilic', DATE '1997-01-17', 'tamara.serbia.tourist@spirego.com', NULL, 'Srbija', 'sr', 'Tourist'),
                    ('Andrija', 'Stojanovic', DATE '1996-08-09', 'andrija.serbia.tourist@spirego.com', NULL, 'Srbija', 'sr', 'Tourist'),
                    ('Teodora', 'Pavlovic', DATE '1998-06-06', 'teodora.serbia.tourist@spirego.com', NULL, 'Srbija', 'sr', 'Tourist')
                )
                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT s."FirstName", s."LastName", s."DateOfBirth", s."Email",
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       s."PhoneNumber", s."Country", s."Language",
                       true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM source s
                JOIN "Roles" r ON r."Name" = s."RoleName"
                WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = s."Email");
                """);

            migrationBuilder.Sql(
                """
                WITH source("Name", "DisplayTitle", "Description", "Longitude", "Latitude", "DestinationTypeName", "RegionCode", "AdminEmail") AS (
                    VALUES
                    ('Rome', 'Rimske ulice, fontane i vecere u Trastevereu',
                     'Rim je grad u kojem se svakodnevni ritam mesa sa antickim slojevima istorije, trgovima, fontanama i dugim vecerama. Putnik u jednom danu moze da obidje Koloseum, da sedne na kafu u malom baru i da zavrsi vece uz testeninu i vino u Trastevereu.',
                     12.4964, 41.9028, 'Grad', 'IT', 'giulia.admin@spirego.com'),
                    ('Venice', 'Kanali, kameni prolazi i veceri oko San Marka',
                     'Venecija nudi sporiji ritam obilaska, setnje preko mostova i male gastronomske pauze uz poglede na kanale. Grad je posebno zanimljiv putnicima koji vole atmosferu, umetnost i osecaj da je gotovo svaka ulica scenografija.',
                     12.3155, 45.4408, 'Grad', 'IT', 'giulia.admin@spirego.com'),
                    ('Florence', 'Renesansa, mostovi i toskanski ritam grada',
                     'Firenca spaja umetnost, zanatstvo i toskansku gastronomiju na malom prostoru koji je lako obici peske. Grad je odlican za putnike koji zele da kombiniju muzeje, panoramske poglede, lagan gradski tempo i ozbiljno dobru hranu.',
                     11.2558, 43.7696, 'Grad', 'IT', 'giulia.admin@spirego.com'),
                    ('Belgrade', 'Tvrdjava, gradske ulice i nocni ritam prestonice',
                     'Beograd je grad sirokih bulevara, tvrdjave iznad usca i kafana koje zive do kasno. Posetioci ovde lako kombinuju istorijske tacke, moderni gradski ritam, dobru kafu i vecere koje se cesto produze vise nego sto je planirano.',
                     20.4573, 44.8176, 'Grad', 'RS', 'milica.admin.serbia@spirego.com'),
                    ('Novi Sad', 'Trgovi, tvrdjava i lagani tempo uz Dunav',
                     'Novi Sad ima mirniji ritam, ali bogat gradski sadrzaj, uredjene trgove, dobru gastronomsku scenu i jak kulturni identitet. Posebno je prijatan za putnike koji vole setnju, dobru hranu i pogled sa Petrovaradina prema Dunavu i gradu.',
                     19.8335, 45.2671, 'Grad', 'RS', 'milica.admin.serbia@spirego.com'),
                    ('Zlatibor', 'Planinski vazduh, vidikovci i opusten ritam dana',
                     'Zlatibor je destinacija za sporiji planinski ritam, panoramske poglede, duge setnje i odmor uz lokalne specijalitete. Pogodan je i za kratke vikend odmore i za duze boravke kada neko zeli da kombinuje prirodu, wellness i lakse aktivnosti napolju.',
                     19.7023, 43.7299, 'Planina', 'RS', 'milica.admin.serbia@spirego.com')
                )
                INSERT INTO "Destinations"
                ("Name", "DisplayTitle", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
                SELECT s."Name", s."DisplayTitle", s."Description",
                       ST_SetSRID(ST_MakePoint(s."Longitude", s."Latitude"), 4326),
                       'Approved', true, dt."Id", rg."Id", admin."Id", NULL, NOW(), NOW()
                FROM source s
                JOIN "DestinationTypes" dt ON dt."Name" = s."DestinationTypeName"
                JOIN "Regions" rg ON rg."Code" = s."RegionCode"
                JOIN "Users" admin ON admin."Email" = s."AdminEmail"
                WHERE NOT EXISTS (SELECT 1 FROM "Destinations" d WHERE d."Name" = s."Name");

                WITH assignments("DestinationName", "ManagerEmail") AS (
                    VALUES
                    ('Rome', 'manager.rome@spirego.com'),
                    ('Venice', 'manager.venice@spirego.com'),
                    ('Florence', 'manager.florence@spirego.com'),
                    ('Belgrade', 'manager.belgrade@spirego.com'),
                    ('Novi Sad', 'manager.novisad@spirego.com'),
                    ('Zlatibor', 'manager.zlatibor@spirego.com')
                )
                UPDATE "Destinations" d
                SET "ManagedByUserId" = u."Id"
                FROM assignments a
                JOIN "Users" u ON u."Email" = a."ManagerEmail"
                WHERE d."Name" = a."DestinationName"
                  AND d."ManagedByUserId" IS DISTINCT FROM u."Id";

                WITH assignments("DestinationName", "ManagerEmail") AS (
                    VALUES
                    ('Rome', 'manager.rome@spirego.com'),
                    ('Venice', 'manager.venice@spirego.com'),
                    ('Florence', 'manager.florence@spirego.com'),
                    ('Belgrade', 'manager.belgrade@spirego.com'),
                    ('Novi Sad', 'manager.novisad@spirego.com'),
                    ('Zlatibor', 'manager.zlatibor@spirego.com')
                )
                UPDATE "Users" u
                SET "ManagedDestinationId" = d."Id"
                FROM assignments a
                JOIN "Destinations" d ON d."Name" = a."DestinationName"
                WHERE u."Email" = a."ManagerEmail"
                  AND u."ManagedDestinationId" IS DISTINCT FROM d."Id";
                """);

            migrationBuilder.Sql(
                """
                WITH source("Name", "Description", "Longitude", "Latitude", "DestinationName", "LocalityTypeName", "AdminEmail") AS (
                    VALUES
                    ('Trastevere Rome', 'Kvart sa uskim ulicama, restoranima, vinskim barovima i vecernjom atmosferom po kojoj je Rim prepoznatljiv.', 12.4712, 41.8895, 'Rome', 'Stari Grad', 'giulia.admin@spirego.com'),
                    ('Colosseum District', 'Istorijski deo Rima oko Koloseuma i okolnih arheoloskih tacaka, pogodan za prve obilaske grada.', 12.4922, 41.8902, 'Rome', 'Istorijska lokacija', 'giulia.admin@spirego.com'),
                    ('San Marco Venice', 'Najpoznatiji centralni prostor Venecije sa trgovima, bazilikom i stalnim tokom posetilaca tokom celog dana.', 12.3378, 45.4340, 'Venice', 'Stari Grad', 'giulia.admin@spirego.com'),
                    ('Grand Canal Venice', 'Glavna gradska vodena osa sa pogledima na palate, mostove i neprekidno kretanje vodenog saobracaja.', 12.3310, 45.4380, 'Venice', 'Centar grada', 'giulia.admin@spirego.com'),
                    ('Duomo Florence', 'Istorijsko jezgro oko katedrale koje je uvek puno setaca, manjih prodavnica i lokala za kratku pauzu izmedju obilazaka.', 11.2558, 43.7731, 'Florence', 'Stari Grad', 'giulia.admin@spirego.com'),
                    ('Ponte Vecchio Florence', 'Zona oko najpoznatijeg firentinskog mosta, popularna za setnje u kasno popodne i panoramske fotografije.', 11.2531, 43.7679, 'Florence', 'Istorijska lokacija', 'giulia.admin@spirego.com'),
                    ('Terazije Belgrade', 'Siri centar Beograda sa hotelima, starim gradskim fasadama i lakim pristupom pesackim zonama.', 20.4623, 44.8141, 'Belgrade', 'Centar grada', 'milica.admin.serbia@spirego.com'),
                    ('Kalemegdan Belgrade', 'Tvrdjava i park iznad usca, omiljena tacka za setnju, pogled i krace predah pauze.', 20.4489, 44.8230, 'Belgrade', 'Tvrdjava', 'milica.admin.serbia@spirego.com'),
                    ('Trg Slobode Novi Sad', 'Glavni gradski trg Novog Sada, pregledan i prijatan za obilazak peske sa mnogo kafica u neposrednoj blizini.', 19.8423, 45.2554, 'Novi Sad', 'Centar grada', 'milica.admin.serbia@spirego.com'),
                    ('Petrovaradin Fortress', 'Petrovaradinska tvrdjava sa vidikovcima, tunelima i jednim od najlepsih pogleda na grad i Dunav.', 19.8644, 45.2528, 'Novi Sad', 'Tvrdjava', 'milica.admin.serbia@spirego.com'),
                    ('Kraljev Trg Zlatibor', 'Centralni plato Zlatibora sa hotelima, setalistem i lakim pristupom glavnim sadrzajima planinskog centra.', 19.7005, 43.7287, 'Zlatibor', 'Centar grada', 'milica.admin.serbia@spirego.com'),
                    ('Tornik Viewpoint', 'Vidikovac i siri prostor Tornika, odlican za panorame, kratke pauze i aktivnosti na otvorenom.', 19.6409, 43.6945, 'Zlatibor', 'Vidikovac', 'milica.admin.serbia@spirego.com')
                )
                INSERT INTO "Localities"
                ("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
                SELECT s."Name", s."Description",
                       ST_SetSRID(ST_MakePoint(s."Longitude", s."Latitude"), 4326),
                       true, d."Id", lt."Id", admin."Id", NOW()
                FROM source s
                JOIN "Destinations" d ON d."Name" = s."DestinationName"
                JOIN "LocalityTypes" lt ON lt."Name" = s."LocalityTypeName"
                JOIN "Users" admin ON admin."Email" = s."AdminEmail"
                WHERE NOT EXISTS (SELECT 1 FROM "Localities" l WHERE l."Name" = s."Name");

                UPDATE "Localities" l
                SET "CreatedByUserId" = d."ManagedByUserId",
                    "UpdatedAt" = NOW()
                FROM "Destinations" d
                WHERE l."DestinationId" = d."Id"
                  AND d."Name" IN ('Rome', 'Venice', 'Florence', 'Belgrade', 'Novi Sad', 'Zlatibor')
                  AND d."ManagedByUserId" IS NOT NULL;
                """);

            migrationBuilder.Sql(
                """
                WITH source("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Longitude", "Latitude", "ObjectTypeName", "LocalityName", "DestinationName", "CreatorEmail") AS (
                    VALUES
                    ('Hotel Artemide Rome', 'Hotel u centralnom delu Rima sa komfornim sobama, krovnim barom i lokacijom pogodnom za obilazak glavnih znamenitosti peske.', 'Via Nazionale 22, Rome', '+3906499911', 'https://www.hotelartemide.it/', NULL, NULL, '{"pon":"00:00-24:00"}', 240.00, ARRAY['WiFi', 'Spa', 'Dorucak', 'Rooftop']::text[], 12.4938, 41.9017, 'Hotel', 'Colosseum District', 'Rome', 'lorenzo.creator@spirego.com'),
                    ('Rione 13 Trastevere', 'Restoran u Trastevereu fokusiran na rimske klasike, pizzu i opustenu vecernju atmosferu. Dobar je izbor kada neko zeli da spoji kvartovsku setnju i konkretnu veceru.', 'Via Roma Libera 19, Rome', '+39065817418', 'https://www.rione13ristorante.com/en', 'https://www.rione13ristorante.com/en/menu', 'Rimska i italijanska', '{"pon":"12:00-23:30"}', 32.00, ARRAY['Rezervacije', 'Terasa', 'Vegetarijanske opcije', 'Vinska karta']::text[], 12.4707, 41.8898, 'Restoran', 'Trastevere Rome', 'Rome', 'lorenzo.creator@spirego.com'),
                    ('Hotel Canaletto Venice', 'Miran hotel u istorijskom jezgru Venecije sa tradicionalnim enterijerom i lakim pristupom mostovima i trgovima.', 'Castello 5487, Venice', '+390415220518', 'https://www.hotelcanaletto.com/', NULL, NULL, '{"pon":"00:00-24:00"}', 265.00, ARRAY['WiFi', 'Dorucak', 'Concierge', 'Bar']::text[], 12.3391, 45.4364, 'Hotel', 'San Marco Venice', 'Venice', 'lorenzo.creator@spirego.com'),
                    ('Bistrot de Venise', 'Restoran koji naglasak stavlja na istorijsku venecijansku kuhinju, ribu i pazljivo uparivanje jela i vina. Ambijent je formalniji, ali usluga i lokacija opravdavaju sporiji, duzi obrok.', 'San Marco 4685, Venice', '+390415236651', 'https://www.bistrotdevenise.com/en/', 'https://www.bistrotdevenise.com/en/menu/', 'Venecijanska i morski plodovi', '{"pon":"12:00-22:30"}', 48.00, ARRAY['Rezervacije', 'Vinska karta', 'Morski plodovi', 'Fine dining']::text[], 12.3369, 45.4375, 'Restoran', 'San Marco Venice', 'Venice', 'lorenzo.creator@spirego.com'),
                    ('Hotel Davanzati Florence', 'Manji hotel u srcu Firence, miran i praktican za obilazak starog jezgra bez oslanjanja na prevoz. Dobro funkcionise za parove i za kratke gradske boravke.', 'Via Porta Rossa 5, Florence', '+39055286666', 'https://www.hoteldavanzati.it/?lang=eng', NULL, NULL, '{"pon":"00:00-24:00"}', 230.00, ARRAY['WiFi', 'Dorucak', 'Happy hour', 'Transfer']::text[], 11.2529, 43.7697, 'Hotel', 'Ponte Vecchio Florence', 'Florence', 'lorenzo.creator@spirego.com'),
                    ('La Loggia Firenze', 'Panoramski restoran sa pogledom na Firencu, jelima koja spajaju toskansku bazu i moderniji pristup servisu. Posebno je dobar za duzi rucak ili veceru sa pogledom.', 'Piazzale Michelangelo 1, Florence', '+390552342832', 'https://ristorantelaloggia.it/en/menus/', 'https://ristorantelaloggia.it/en/menus/', 'Toskanska i moderna italijanska', '{"pon":"11:00-23:00"}', 55.00, ARRAY['Pogled na grad', 'Rezervacije', 'Vinska karta', 'Terasa']::text[], 11.2552, 43.7635, 'Restoran', 'Ponte Vecchio Florence', 'Florence', 'lorenzo.creator@spirego.com'),
                    ('Hotel Moskva Belgrade', 'Istorijski hotel u centru Beograda koji je dobar izbor za goste kojima je bitna lokacija i prepoznatljiv gradski ambijent. Koristan je i za poslovna putovanja i za kratke gradske vikende.', 'Terazije 20, Belgrade', '+381113648999', 'https://hotelmoskva.rs/', NULL, NULL, '{"pon":"00:00-24:00"}', 185.00, ARRAY['WiFi', 'Spa', 'Dorucak', 'Poslasticarnica']::text[], 20.4613, 44.8135, 'Hotel', 'Terazije Belgrade', 'Belgrade', 'jelena.creator@spirego.com'),
                    ('Restoran Frans Beograd', 'Veliki gradski restoran sa sirokim jelovnikom, bastom i ponudom koja pokriva i klasicna domaca jela i internacionalnije izbore. Dobro radi i za porodicne ruckove i za duza vecernja sedenja.', 'Bulevar oslobodjenja 18G, Belgrade', '+381652641944', 'https://frans.rs/', 'https://frans.rs/menu/jelovnik/', 'Srpska i internacionalna', '{"pon":"09:00-23:30"}', 27.00, ARRAY['Basta', 'Rezervacije', 'Parking', 'Vegetarijanske opcije']::text[], 20.4691, 44.7976, 'Restoran', 'Terazije Belgrade', 'Belgrade', 'jelena.creator@spirego.com'),
                    ('Hotel Pupin Novi Sad', 'Moderan gradski hotel sa centralnom pozicijom i lakim pristupom trgovima, pesackoj zoni i obali Dunava. Cesto je dobar kompromis izmedju komfora, lokacije i urednog servisa.', 'Narodnih Heroja 3, Novi Sad', '+381212156000', 'https://hotelpupin.rs/en/', NULL, NULL, '{"pon":"00:00-24:00"}', 170.00, ARRAY['WiFi', 'Parking', 'Dorucak', 'Fitness']::text[], 19.8414, 45.2559, 'Hotel', 'Trg Slobode Novi Sad', 'Novi Sad', 'jelena.creator@spirego.com'),
                    ('Kalem by Zak Novi Sad', 'Restoran i gradski lounge sa savremenijom ponudom, koktelima i urbanim ambijentom. Praktican je za goste koji hoce ozbiljniji rucak, ali i opusteniji vecernji izlazak bez napustanja centra.', 'Narodnih Heroja 3, Novi Sad', '+381668888021', 'https://hotelpupin.rs/en/dining/kalem-by-zak/', 'https://hotelpupin.rs/en/dining/kalem-by-zak/menu-kalem/', 'Moderna evropska i lokalna', '{"pon":"08:00-23:30"}', 24.00, ARRAY['Terasa', 'Kokteli', 'Rezervacije', 'Dorucak']::text[], 19.8417, 45.2560, 'Restoran', 'Trg Slobode Novi Sad', 'Novi Sad', 'jelena.creator@spirego.com'),
                    ('Hotel Zlatibor Mountain Resort', 'Veliki planinski hotel sa wellness ponudom i lakim pristupom centralnom delu Zlatibora. Dobar je izbor za goste koji hoce da kombinuju smestaj, pogled i usluge u okviru jednog kompleksa.', 'Miladina Pecinara 31a, Zlatibor', '+381318450000', 'https://www.hotelzlatibor-resort.com/en/', NULL, NULL, '{"pon":"00:00-24:00"}', 160.00, ARRAY['WiFi', 'Spa', 'Parking', 'Bazen']::text[], 19.7014, 43.7284, 'Hotel', 'Kraljev Trg Zlatibor', 'Zlatibor', 'jelena.creator@spirego.com'),
                    ('Lobby Bar Zlatibor', 'Bar i neformalni gastro kutak u centru Zlatibora sa laganijim jelima, koktelima i prijatnim mestom za pauzu tokom dana. Dobar je za opusten tempo, kafu i kasniji vecernji izlazak bez velike organizacije.', 'Miladina Pecinara 31a, Zlatibor', '+381318450001', 'https://www.hotelzlatibor-resort.com/en/lobby-bar/', 'https://www.hotelzlatibor-resort.com/en/menu-lobby-bar/', 'Bar food i internacionalna', '{"pon":"09:00-00:30"}', 16.00, ARRAY['Kokteli', 'Pogled', 'Terasa', 'Dessert menu']::text[], 19.7011, 43.7282, 'Bar', 'Kraljev Trg Zlatibor', 'Zlatibor', 'jelena.creator@spirego.com')
                )
                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT s."Name", s."Description", s."Address", s."PhoneNumber", s."Website", s."MenuUrl", s."CuisineType", s."WorkingHours", s."Price", s."Amenities",
                       ST_SetSRID(ST_MakePoint(s."Longitude", s."Latitude"), 4326), 0, 0,
                       'Approved', true, ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM source s
                JOIN "ObjectTypes" ot ON ot."Name" = s."ObjectTypeName"
                JOIN "Localities" l ON l."Name" = s."LocalityName"
                JOIN "Destinations" d ON d."Name" = s."DestinationName"
                JOIN "Users" cc ON cc."Email" = s."CreatorEmail"
                WHERE l."DestinationId" = d."Id"
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = s."Name");
                """);

            migrationBuilder.Sql(
                """
                WITH source("Name", "Description", "Longitude", "Latitude", "Price", "DurationMinutes", "ActivityTypeName", "LocalityName", "DestinationName", "ObjectName", "CreatorEmail") AS (
                    VALUES
                    ('Trastevere Food Walk', 'Lagani gastronomski obilazak Trasteverea sa fokusom na rimske klasike, male ulice i mesta gde se najlepse vidi kako kvart zivi uvece.', 12.4709, 41.8899, 29.00, 120, 'Degustacija hrane', 'Trastevere Rome', 'Rome', 'Rione 13 Trastevere', 'lorenzo.creator@spirego.com'),
                    ('Grand Canal Evening Walk', 'Setnja uz kanal i okolne prolaze, sa kratkim stajanjima na tackama odakle se najbolje vidi promena svetla predvece.', 12.3312, 45.4382, 0.00, 90, 'Razgledanje', 'Grand Canal Venice', 'Venice', NULL, 'lorenzo.creator@spirego.com'),
                    ('Florence Sunset View Walk', 'Kraca ruta za posetioce koji zele da predvece prodju kroz istorijski centar i zavrse setnju na mestu odakle grad izgleda najfotogenicnije.', 11.2538, 43.7682, 0.00, 100, 'Razgledanje', 'Ponte Vecchio Florence', 'Florence', NULL, 'lorenzo.creator@spirego.com'),
                    ('Belgrade Fortress Sunset Walk', 'Setnja kroz Kalemegdan sa naglaskom na pogled ka uscu, kratke istorijske price i preporuke za nastavak veceri u centru.', 20.4487, 44.8233, 0.00, 105, 'Razgledanje', 'Kalemegdan Belgrade', 'Belgrade', NULL, 'jelena.creator@spirego.com'),
                    ('Petrovaradin Fortress Walk', 'Obilazak tvrdjave i njenih glavnih tacaka sa dovoljno vremena za pogled na Novi Sad i krace fotografske pauze.', 19.8641, 45.2529, 0.00, 95, 'Razgledanje', 'Petrovaradin Fortress', 'Novi Sad', NULL, 'jelena.creator@spirego.com'),
                    ('Zlatibor Panorama Ride', 'Lagano iskustvo kretanja kroz centralni deo Zlatibora i dalje prema vidikovcima, namenjeno gostima koji zele mirniji tempo i dobar pogled.', 19.6660, 43.7030, 18.00, 130, 'Razgledanje', 'Tornik Viewpoint', 'Zlatibor', NULL, 'jelena.creator@spirego.com')
                )
                INSERT INTO "Activities"
                ("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT s."Name", s."Description",
                       ST_SetSRID(ST_MakePoint(s."Longitude", s."Latitude"), 4326),
                       s."Price", s."DurationMinutes", true,
                       at."Id", l."Id", d."Id", o."Id", 1, cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM source s
                JOIN "ActivityTypes" at ON at."Name" = s."ActivityTypeName"
                JOIN "Localities" l ON l."Name" = s."LocalityName"
                JOIN "Destinations" d ON d."Name" = s."DestinationName"
                JOIN "Users" cc ON cc."Email" = s."CreatorEmail"
                LEFT JOIN "Objects" o ON o."Name" = s."ObjectName"
                WHERE l."DestinationId" = d."Id"
                  AND (o."Id" IS NULL OR o."DestinationId" = d."Id")
                  AND NOT EXISTS (SELECT 1 FROM "Activities" a WHERE a."Name" = s."Name");
                """);

            migrationBuilder.Sql(
                """
                WITH source("Name", "Description", "Longitude", "Latitude", "StartDate", "EndDate", "Price", "MaxVisitors", "EventTypeName", "LocalityName", "DestinationName", "ObjectName", "CreatorEmail") AS (
                    VALUES
                    ('Rome Piazza Music Evening', 'Vecernji koncert manjeg formata namenjen posetiocima koji posle obilaska grada zele mirniji kulturni program i dobru lokaciju za nastavak setnje. Atmosfera je opustena, bez prevelike guzve, sa fokusom na muziku i ambijent kvarta.', 12.4711, 41.8897, TIMESTAMPTZ '2026-09-11 18:30:00Z', TIMESTAMPTZ '2026-09-11 22:30:00Z', 14.00, 300, 'Koncert', 'Trastevere Rome', 'Rome', 'Rione 13 Trastevere', 'lorenzo.creator@spirego.com'),
                    ('Venice Lagoon Taste Week', 'Program degustacija i manjih kulinarskih prezentacija inspirisan venecijanskim jelima i sastojcima iz lagune. Događaj je zamisljen kao sporiji gradski festival za goste koji uz razgledanje zele i ozbiljniji gastronomski sadrzaj.', 12.3369, 45.4374, TIMESTAMPTZ '2026-10-07 12:00:00Z', TIMESTAMPTZ '2026-10-11 21:00:00Z', 20.00, 450, 'Festival', 'San Marco Venice', 'Venice', 'Bistrot de Venise', 'lorenzo.creator@spirego.com'),
                    ('Florence Artisan Evenings', 'Serija vecernjih okupljanja sa manjim radionicama, muzikom i fokusom na detalje koji Firencu cine gradom zanata i umetnosti. Dobra je opcija za posetioce koji zele sadrzaj izmedju klasicnog obilaska i formalnog koncerta.', 11.2540, 43.7684, TIMESTAMPTZ '2026-09-25 17:00:00Z', TIMESTAMPTZ '2026-09-27 22:00:00Z', 12.00, 350, 'Festival', 'Ponte Vecchio Florence', 'Florence', 'La Loggia Firenze', 'lorenzo.creator@spirego.com'),
                    ('Belgrade Coffee and Jazz Night', 'Manji vecernji program sa jazz nastupom i toplijom lounge atmosferom, namenjen gostima koji vole centar grada i laganiji izlazak. Uslovljen je sedećim formatom i nije preglasan, pa dobro odgovara i turistima koji sutradan nastavljaju obilazak.', 20.4612, 44.8134, TIMESTAMPTZ '2026-11-05 18:00:00Z', TIMESTAMPTZ '2026-11-05 23:00:00Z', 9.00, 220, 'Nastup', 'Terazije Belgrade', 'Belgrade', 'Hotel Moskva Belgrade', 'jelena.creator@spirego.com'),
                    ('Novi Sad Gourmet Weekend', 'Dvodevni gradski gastro program sa degustacijama, koktelima i manjim live cooking segmentima. Ideja je da posetioci spoje vikend u centru Novog Sada, setnju do tvrdjave i nekoliko kvalitetnih obroka na maloj udaljenosti.', 19.8418, 45.2559, TIMESTAMPTZ '2026-10-16 14:00:00Z', TIMESTAMPTZ '2026-10-18 22:00:00Z', 11.00, 400, 'Sajam', 'Trg Slobode Novi Sad', 'Novi Sad', 'Kalem by Zak Novi Sad', 'jelena.creator@spirego.com'),
                    ('Zlatibor Mountain Taste Days', 'Planinski vikend program sa laganijim gastro ponudama, toplim napicima i muzikom prikladnom za opusten kraj dana. Koncept je prilagodjen gostima koji zele da posle setnje ili spa dana imaju jednostavan, prijatan vecernji sadrzaj.', 19.7010, 43.7283, TIMESTAMPTZ '2026-12-12 15:00:00Z', TIMESTAMPTZ '2026-12-13 22:00:00Z', 8.00, 260, 'Festival', 'Kraljev Trg Zlatibor', 'Zlatibor', 'Lobby Bar Zlatibor', 'jelena.creator@spirego.com')
                )
                INSERT INTO "Events"
                ("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT s."Name", s."Description",
                       ST_SetSRID(ST_MakePoint(s."Longitude", s."Latitude"), 4326),
                       s."StartDate", s."EndDate", s."Price", s."MaxVisitors", true, 'Approved',
                       et."Id", l."Id", d."Id", o."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM source s
                JOIN "EventTypes" et ON et."Name" = s."EventTypeName"
                JOIN "Localities" l ON l."Name" = s."LocalityName"
                JOIN "Destinations" d ON d."Name" = s."DestinationName"
                JOIN "Users" cc ON cc."Email" = s."CreatorEmail"
                LEFT JOIN "Objects" o ON o."Name" = s."ObjectName"
                WHERE l."DestinationId" = d."Id"
                  AND (o."Id" IS NULL OR o."DestinationId" = d."Id")
                  AND NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Name" = s."Name");
                """);

            migrationBuilder.Sql(
                """
                WITH source("UserEmail", "ObjectName", "Rating", "Text") AS (
                    VALUES
                    ('chiara.italy.tourist@spirego.com', 'Hotel Artemide Rome', 5, 'Lokacija je bila odlicna za prvi obilazak Rima, a osoblje je brzo resavalo sitne zahteve oko kasnog check-ina. Soba nije bila ogromna, ali je sve delovalo uredno i kvalitetno odrzavano.'),
                    ('marco.italy.tourist@spirego.com', 'Hotel Artemide Rome', 4, 'Dopao mi se rooftop i cinjenica da se vecina znamenitosti moze obici peske. Jedino je dorucak bio jaci prvi dan nego drugog jutra, ali ukupni utisak je i dalje vrlo dobar.'),
                    ('bianca.italy.tourist@spirego.com', 'Rione 13 Trastevere', 5, 'Hrana je stigla brzo i nijedno jelo nije delovalo genericki, sto mi je bilo vazno jer sam htela bas rimski fazon vecere. Konobari su lepo objasnili sta je jace, a sta lakse za deljenje.'),
                    ('marco.italy.tourist@spirego.com', 'Rione 13 Trastevere', 3, 'Pasta je bila dobra, ali je terasa bila dosta bucna i cekali smo duze na drugo pice nego sto bih voleo. Vratio bih se zbog hrane, ali ne u najudarnijem terminu.'),
                    ('chiara.italy.tourist@spirego.com', 'Hotel Canaletto Venice', 4, 'Hotel ima lep, starinski karakter i osoblje je dalo korisne savete za kretanje kroz manje prometne ulice. Soba je bila tiha, mada bi kupatilo moglo da se osvezi.'),
                    ('bianca.italy.tourist@spirego.com', 'Hotel Canaletto Venice', 3, 'Boravak je bio prijatan i lokacija je vrlo dobra za pesacke obilaske, ali je prostor delovao malo skuplje nego sto realno nudi. Ako je cilj centar Venecije bez mnogo komplikacija, hotel i dalje radi posao.'),
                    ('marco.italy.tourist@spirego.com', 'Bistrot de Venise', 5, 'Ovde se stvarno oseca da kuhinja ima identitet i da neko vodi racuna o detaljima, ne samo o prezentaciji. Usluga je bila mirna i profesionalna, bez onog osecaja da te ubrzavaju da oslobodis sto.'),
                    ('chiara.italy.tourist@spirego.com', 'Bistrot de Venise', 4, 'Jela su bila vrlo dobra, posebno riba i vino uz veceru, ali cene su vise i to treba imati u vidu. Za jedno vece u Veneciji kada zelis ozbiljniji obrok, izbor je opravdan.'),
                    ('bianca.italy.tourist@spirego.com', 'Hotel Davanzati Florence', 4, 'Hotel je prijatan i deluje toplije od klasicnih gradskih hotela, sto mi je posebno prijalo posle dugog dana po muzeju. Lokacija je jaka strana, a dorucak je bio sasvim korektan.'),
                    ('marco.italy.tourist@spirego.com', 'Hotel Davanzati Florence', 5, 'Osoblje je bilo zaista gostoljubivo i nekoliko sitnih preporuka za veceru nam je znacilo vise nego bilo koji turisticki vodič. Sve je bilo cisto, mirno i bez neprijatnih iznenadjenja.'),
                    ('chiara.italy.tourist@spirego.com', 'La Loggia Firenze', 3, 'Pogled je sjajan i vredan dolaska, ali su neka jela vise igrala na utisak nego na dubinu ukusa. Nije lose, samo treba ici sa idejom da placas i lokaciju i atmosferu.'),
                    ('bianca.italy.tourist@spirego.com', 'La Loggia Firenze', 5, 'Vece ovde je bilo jedno od najboljih u Firenci jer se dobar pogled uklopio sa opustenom uslugom i finim ritmom posluživanja. Nije mesto za brz obrok, ali za duzu veceru radi odlicno.'),
                    ('tamara.serbia.tourist@spirego.com', 'Hotel Moskva Belgrade', 5, 'Svidelo mi se sto hotel ima prepoznatljiv karakter i ne deluje kao bilo koji moderan lanac bez identiteta. Lokacija je odlicna za peske i za dnevni obilazak i za vecernji povratak.'),
                    ('andrija.serbia.tourist@spirego.com', 'Hotel Moskva Belgrade', 4, 'Soba je bila uredna i mirna, a osoblje profesionalno, ali je ceo dozivljaj vise klasicno gradski nego luksuzan. Ipak, zbog lokacije i atmosfere bih ga opet uzeo za kraci boravak.'),
                    ('teodora.serbia.tourist@spirego.com', 'Restoran Frans Beograd', 4, 'Jelovnik je sirok i lako je naci nesto i za ljude koji vole klasiku i za one koji hoce laksi obrok. Usluga je bila dobra, samo je terasa bila dosta puna pa je ritam malo usporio.'),
                    ('tamara.serbia.tourist@spirego.com', 'Restoran Frans Beograd', 3, 'Hrana je korektna i porcije su ozbiljne, ali mesto vise volim za duze sedenje i drustvo nego za nesto posebno gastronomsko. Ako neko ocekuje mirniji restoran, guzva moze malo da zasmeta.'),
                    ('andrija.serbia.tourist@spirego.com', 'Hotel Pupin Novi Sad', 5, 'Hotel je uredan, moderan i vrlo praktican kada hoces da budes blizu glavnog trga i pesacke zone. Posebno mi je znacilo sto sve deluje novo i dobro organizovano bez nepotrebne pompe.'),
                    ('teodora.serbia.tourist@spirego.com', 'Hotel Pupin Novi Sad', 4, 'Lokacija je jaka strana, a dorucak i prijava su prosli bez problema. Jedino je pogled iz sobe bio manje zanimljiv nego sto sam ocekivala po fotografijama.'),
                    ('tamara.serbia.tourist@spirego.com', 'Kalem by Zak Novi Sad', 5, 'Mesto ima fin balans izmedju ozbiljnog rucka i opustenije gradske energije, pa je lako ostati duze nego sto planiras. Hrana nije bila teska, a kokteli su bili iznad ocekivanja.'),
                    ('andrija.serbia.tourist@spirego.com', 'Kalem by Zak Novi Sad', 4, 'Ambijent je vrlo prijatan i lokacija zgodna kada si vec u centru, a meni ima dovoljno izbora da grupa lako nadje zajednicki termin. Cene nisu najnize, ali servis je bio uredan i brz.'),
                    ('teodora.serbia.tourist@spirego.com', 'Hotel Zlatibor Mountain Resort', 3, 'Hotel ima dosta sadrzaja i dobra je baza za kraci odmor, ali u spicu se oseca da kroz zajednicke prostore prolazi veliki broj gostiju. Kada je cilj prakticnost i spa, to ne mora da bude problem.'),
                    ('tamara.serbia.tourist@spirego.com', 'Hotel Zlatibor Mountain Resort', 4, 'Spa i lokacija u centru su mi bili najveci plus, a osoblje je bilo vrlo korektno kada smo trazili kasniji check-out. Dobar je izbor ako zelis da sve bude na jednom mestu.'),
                    ('andrija.serbia.tourist@spirego.com', 'Lobby Bar Zlatibor', 2, 'Piće je bilo okej, ali je usluga tog dana bila sporija nego sto sam ocekivao, a muzika je bila glasnija nego sto prija kada hoces samo kratku pauzu. Za opusten razgovor nisam uhvatio pravi termin.'),
                    ('teodora.serbia.tourist@spirego.com', 'Lobby Bar Zlatibor', 4, 'Kad smo svratili ranije popodne atmosfera je bila dosta prijatnija i mesto je lepo leglo za kratki predah posle setnje. Karta pica je solidna, a prostor deluje moderno i uredno.')
                )
                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", s."Rating", s."Text", 'Approved', NOW()
                FROM source s
                JOIN "Users" u ON u."Email" = s."UserEmail"
                JOIN "Objects" o ON o."Name" = s."ObjectName"
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "Reviews" r
                    WHERE r."UserId" = u."Id"
                      AND r."ObjectId" = o."Id"
                );

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
                    ),
                    "UpdatedAt" = NOW()
                WHERE o."Name" IN (
                    'Hotel Artemide Rome', 'Rione 13 Trastevere', 'Hotel Canaletto Venice', 'Bistrot de Venise',
                    'Hotel Davanzati Florence', 'La Loggia Firenze', 'Hotel Moskva Belgrade', 'Restoran Frans Beograd',
                    'Hotel Pupin Novi Sad', 'Kalem by Zak Novi Sad', 'Hotel Zlatibor Mountain Resort', 'Lobby Bar Zlatibor'
                );
                """);

            migrationBuilder.Sql(
                """
                WITH source("Url", "AltText", "DestinationName") AS (
                    VALUES
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Rome%20Montage%202017.png', 'Rome', 'Rome'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Venice', 'Venice'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Florence', 'Florence'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Belgrade', 'Belgrade'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Novi Sad', 'Novi Sad'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Zlatibor', 'Zlatibor')
                )
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT s."Url", s."AltText", TRUE, d."Id", NOW()
                FROM source s
                JOIN "Destinations" d ON d."Name" = s."DestinationName"
                WHERE NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."DestinationId" = d."Id" AND i."IsMain" = TRUE);

                WITH source("Url", "AltText", "LocalityName") AS (
                    VALUES
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Trastevere Rome', 'Trastevere Rome'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%20%28Rome%29.jpg', 'Colosseum District', 'Colosseum District'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Piazza%20San%20Marco%2C%20Venice.jpg', 'San Marco Venice', 'San Marco Venice'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Grand Canal Venice', 'Grand Canal Venice'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Duomo Florence', 'Duomo Florence'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Ponte Vecchio Florence', 'Ponte Vecchio Florence'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Terazije Belgrade', 'Terazije Belgrade'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Kalemegdan Belgrade', 'Kalemegdan Belgrade'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Trg Slobode Novi Sad', 'Trg Slobode Novi Sad'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Petrovaradin.jpg', 'Petrovaradin Fortress', 'Petrovaradin Fortress'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Kraljev Trg Zlatibor', 'Kraljev Trg Zlatibor'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Planina%20Zlatibor.JPG', 'Tornik Viewpoint', 'Tornik Viewpoint')
                )
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT s."Url", s."AltText", TRUE, l."Id", NOW()
                FROM source s
                JOIN "Localities" l ON l."Name" = s."LocalityName"
                WHERE NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."LocalityId" = l."Id" AND i."IsMain" = TRUE);

                WITH source("Url", "AltText", "ObjectName") AS (
                    VALUES
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%20%28Rome%29.jpg', 'Hotel Artemide Rome', 'Hotel Artemide Rome'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Rione 13 Trastevere', 'Rione 13 Trastevere'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Piazza%20San%20Marco%2C%20Venice.jpg', 'Hotel Canaletto Venice', 'Hotel Canaletto Venice'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Bistrot de Venise', 'Bistrot de Venise'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Hotel Davanzati Florence', 'Hotel Davanzati Florence'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'La Loggia Firenze', 'La Loggia Firenze'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Hotel Moskva Belgrade', 'Hotel Moskva Belgrade'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Restoran Frans Beograd', 'Restoran Frans Beograd'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Hotel Pupin Novi Sad', 'Hotel Pupin Novi Sad'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Kalem by Zak Novi Sad', 'Kalem by Zak Novi Sad'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Hotel Zlatibor Mountain Resort', 'Hotel Zlatibor Mountain Resort'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Lobby Bar Zlatibor', 'Lobby Bar Zlatibor')
                )
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT s."Url", s."AltText", TRUE, o."Id", NOW()
                FROM source s
                JOIN "Objects" o ON o."Name" = s."ObjectName"
                WHERE NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."ObjectId" = o."Id" AND i."IsMain" = TRUE);

                WITH source("Url", "AltText", "EventName") AS (
                    VALUES
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Rome Piazza Music Evening', 'Rome Piazza Music Evening'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Venice Lagoon Taste Week', 'Venice Lagoon Taste Week'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Florence%20Duomo.jpg', 'Florence Artisan Evenings', 'Florence Artisan Evenings'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Terazije%20Belgrade.jpg', 'Belgrade Coffee and Jazz Night', 'Belgrade Coffee and Jazz Night'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Novi%20Sad%20-%20Trg%20Slobode.JPG', 'Novi Sad Gourmet Weekend', 'Novi Sad Gourmet Weekend'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Zlatibor-panorama.jpg', 'Zlatibor Mountain Taste Days', 'Zlatibor Mountain Taste Days')
                )
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT s."Url", s."AltText", TRUE, e."Id", NOW()
                FROM source s
                JOIN "Events" e ON e."Name" = s."EventName"
                WHERE NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."EventId" = e."Id" AND i."IsMain" = TRUE);

                WITH source("Url", "AltText", "ActivityName") AS (
                    VALUES
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Roma%20Trastevere.jpg', 'Trastevere Food Walk', 'Trastevere Food Walk'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Venice%20Grand%20Canal.JPG', 'Grand Canal Evening Walk', 'Grand Canal Evening Walk'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Ponte%20vecchio.jpg', 'Florence Sunset View Walk', 'Florence Sunset View Walk'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Kalemegdan%2C%20Belgrade.jpg', 'Belgrade Fortress Sunset Walk', 'Belgrade Fortress Sunset Walk'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Petrovaradin.jpg', 'Petrovaradin Fortress Walk', 'Petrovaradin Fortress Walk'),
                    ('https://commons.wikimedia.org/wiki/Special:FilePath/Planina%20Zlatibor.JPG', 'Zlatibor Panorama Ride', 'Zlatibor Panorama Ride')
                )
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT s."Url", s."AltText", TRUE, a."Id", NOW()
                FROM source s
                JOIN "Activities" a ON a."Name" = s."ActivityName"
                WHERE NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."ActivityId" = a."Id" AND i."IsMain" = TRUE);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
