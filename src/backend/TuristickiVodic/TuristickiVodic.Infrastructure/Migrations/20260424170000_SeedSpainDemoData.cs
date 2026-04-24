using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260424170000_SeedSpainDemoData")]
    public class SeedSpainDemoData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Lucia', 'Romero', DATE '1988-05-14', 'lucia.admin@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       '+34600000001', 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Admin'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'lucia.admin@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Carmen', 'Alvarez', DATE '1992-09-08', 'carmen.creator@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       '+34600000002', 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'ContentCreator'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'carmen.creator@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Mateo', 'Garcia', DATE '1990-02-11', 'manager.barcelona@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       '+34600000003', 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Manager'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'manager.barcelona@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Javier', 'Ortega', DATE '1989-11-03', 'manager.madrid@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       '+34600000004', 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Manager'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'manager.madrid@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Paula', 'Moreno', DATE '1991-07-22', 'manager.valencia@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       '+34600000005', 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Manager'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'manager.valencia@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Diego', 'Santos', DATE '1996-04-18', 'diego.tourist@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       NULL, 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Tourist'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'diego.tourist@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Sofia', 'Marin', DATE '1997-01-26', 'sofia.tourist@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       NULL, 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Tourist'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'sofia.tourist@spirego.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Elena', 'Ruiz', DATE '1995-10-10', 'elena.tourist@spirego.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       NULL, 'Spanija', 'es', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Tourist'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'elena.tourist@spirego.com');
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Destinations"
                ("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
                SELECT 'Barcelona', 'Katalonski grad poznat po arhitekturi, plazama i energicnom gradskom zivotu.',
                       ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326), 'Approved', true,
                       dt."Id", rg."Id", u."Id", NULL, NOW(), NOW()
                FROM "DestinationTypes" dt
                CROSS JOIN "Regions" rg
                CROSS JOIN "Users" u
                WHERE dt."Name" = 'Grad'
                  AND rg."Code" = 'ES'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Destinations" d WHERE d."Name" = 'Barcelona');

                INSERT INTO "Destinations"
                ("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
                SELECT 'Madrid', 'Glavni grad Spanije sa bogatom kulturnom scenom, galerijama i gradskim trgovima.',
                       ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326), 'Approved', true,
                       dt."Id", rg."Id", u."Id", NULL, NOW(), NOW()
                FROM "DestinationTypes" dt
                CROSS JOIN "Regions" rg
                CROSS JOIN "Users" u
                WHERE dt."Name" = 'Grad'
                  AND rg."Code" = 'ES'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Destinations" d WHERE d."Name" = 'Madrid');

                INSERT INTO "Destinations"
                ("Name", "Description", "Geolocation", "Status", "IsActive", "DestinationTypeId", "RegionId", "CreatedByUserId", "ManagedByUserId", "CreatedAt", "UpdatedAt")
                SELECT 'Valencia', 'Mediteranski grad poznat po paelji, modernoj arhitekturi i opustenoj obali.',
                       ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326), 'Approved', true,
                       dt."Id", rg."Id", u."Id", NULL, NOW(), NOW()
                FROM "DestinationTypes" dt
                CROSS JOIN "Regions" rg
                CROSS JOIN "Users" u
                WHERE dt."Name" = 'Grad'
                  AND rg."Code" = 'ES'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Destinations" d WHERE d."Name" = 'Valencia');

                WITH manager_assignments AS (
                    SELECT d."Id" AS destination_id, u."Id" AS manager_id
                    FROM (VALUES
                        ('Barcelona', 'manager.barcelona@spirego.com'),
                        ('Madrid', 'manager.madrid@spirego.com'),
                        ('Valencia', 'manager.valencia@spirego.com')
                    ) AS map(destination_name, manager_email)
                    JOIN "Destinations" d ON d."Name" = map.destination_name
                    JOIN "Users" u ON u."Email" = map.manager_email
                    WHERE d."RegionId" = (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES')
                )
                UPDATE "Destinations" d
                SET "ManagedByUserId" = m.manager_id
                FROM manager_assignments m
                WHERE d."Id" = m.destination_id
                  AND d."ManagedByUserId" IS DISTINCT FROM m.manager_id;

                WITH manager_assignments AS (
                    SELECT d."Id" AS destination_id, u."Id" AS manager_id
                    FROM (VALUES
                        ('Barcelona', 'manager.barcelona@spirego.com'),
                        ('Madrid', 'manager.madrid@spirego.com'),
                        ('Valencia', 'manager.valencia@spirego.com')
                    ) AS map(destination_name, manager_email)
                    JOIN "Destinations" d ON d."Name" = map.destination_name
                    JOIN "Users" u ON u."Email" = map.manager_email
                    WHERE d."RegionId" = (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES')
                )
                UPDATE "Users" u
                SET "ManagedDestinationId" = m.destination_id
                FROM manager_assignments m
                WHERE u."Id" = m.manager_id
                  AND u."ManagedDestinationId" IS DISTINCT FROM m.destination_id;
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Localities"
                ("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
                SELECT 'Gothic Quarter Barcelona', 'Istorijsko jezgro Barselone sa uskim ulicama, trgovima i bogatom gastronomijom.',
                       ST_SetSRID(ST_MakePoint(2.1760, 41.3839), 4326), true,
                       d."Id", lt."Id", u."Id", NOW()
                FROM "Destinations" d
                CROSS JOIN "LocalityTypes" lt
                CROSS JOIN "Users" u
                WHERE d."Name" = 'Barcelona'
                  AND lt."Name" = 'Stari Grad'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Localities" l WHERE l."Name" = 'Gothic Quarter Barcelona');

                INSERT INTO "Localities"
                ("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
                SELECT 'Barceloneta Beach', 'Zivopisna barselonska plaza poznata po setalistu, sportovima i zalascima sunca.',
                       ST_SetSRID(ST_MakePoint(2.1966, 41.3780), 4326), true,
                       d."Id", lt."Id", u."Id", NOW()
                FROM "Destinations" d
                CROSS JOIN "LocalityTypes" lt
                CROSS JOIN "Users" u
                WHERE d."Name" = 'Barcelona'
                  AND lt."Name" = 'Plaza'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Localities" l WHERE l."Name" = 'Barceloneta Beach');

                INSERT INTO "Localities"
                ("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
                SELECT 'Gran Via Madrid', 'Centralna gradska osa Madrida sa pozoristima, prodavnicama i istorijskim zgradama.',
                       ST_SetSRID(ST_MakePoint(-3.7058, 40.4202), 4326), true,
                       d."Id", lt."Id", u."Id", NOW()
                FROM "Destinations" d
                CROSS JOIN "LocalityTypes" lt
                CROSS JOIN "Users" u
                WHERE d."Name" = 'Madrid'
                  AND lt."Name" = 'Centar grada'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Localities" l WHERE l."Name" = 'Gran Via Madrid');

                INSERT INTO "Localities"
                ("Name", "Description", "Geolocation", "IsActive", "DestinationId", "LocalityTypeId", "CreatedByUserId", "CreatedAt")
                SELECT 'Ciudad de las Artes Valencia', 'Savremeni kulturni kvart Valensije sa futuristickom arhitekturom i velikim javnim prostorima.',
                       ST_SetSRID(ST_MakePoint(-0.3516, 39.4553), 4326), true,
                       d."Id", lt."Id", u."Id", NOW()
                FROM "Destinations" d
                CROSS JOIN "LocalityTypes" lt
                CROSS JOIN "Users" u
                WHERE d."Name" = 'Valencia'
                  AND lt."Name" = 'Kulturna cetvrt'
                  AND u."Email" = 'lucia.admin@spirego.com'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Localities" l WHERE l."Name" = 'Ciudad de las Artes Valencia');

                UPDATE "Localities" l
                SET "CreatedByUserId" = d."ManagedByUserId",
                    "UpdatedAt" = NOW()
                FROM "Destinations" d
                WHERE l."DestinationId" = d."Id"
                  AND d."RegionId" = (SELECT "Id" FROM "Regions" WHERE "Code" = 'ES')
                  AND d."ManagedByUserId" IS NOT NULL;
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Hotel Casa Batllo Suites', 'Boutique hotel u istorijskom jezgru Barselone sa pogledom na gradske krovove.',
                       'Gothic Quarter, Barcelona', '+34930000001', 'https://www.barcelonaturisme.com', NULL, NULL,
                       '{"pon":"00:00-24:00"}', 210.00, ARRAY['WiFi', 'Rooftop', 'Dorucak', 'Transfer'],
                       ST_SetSRID(ST_MakePoint(2.1746, 41.3856), 4326), 0, 0, 'Approved', true,
                       ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ObjectTypes" ot
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE ot."Name" = 'Hotel'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Gothic Quarter Barcelona'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = 'Hotel Casa Batllo Suites');

                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Tapas House Gothic', 'Moderan restoran sa tapas jelima, lokalnim vinima i kasnim vecernjim servisom.',
                       'Carrer del Bisbe, Barcelona', '+34930000002', 'https://www.barcelonaturisme.com', NULL, 'Tapas i mediteranska',
                       '{"pon":"12:00-23:30"}', 38.00, ARRAY['WiFi', 'Terasa', 'Rezervacije', 'Veganske opcije'],
                       ST_SetSRID(ST_MakePoint(2.1758, 41.3835), 4326), 0, 0, 'Approved', true,
                       ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ObjectTypes" ot
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE ot."Name" = 'Restoran'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Gothic Quarter Barcelona'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = 'Tapas House Gothic');

                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Barceloneta Sunset Bar', 'Bar uz plazu sa koktelima, muzikom i otvorenom terasom prema moru.',
                       'Passeig Maritim, Barcelona', '+34930000003', 'https://www.barcelonaturisme.com', NULL, 'Kokteli i bar food',
                       '{"pon":"10:00-02:00"}', 18.00, ARRAY['Kokteli', 'Muzika', 'Pogled na more', 'Terasa'],
                       ST_SetSRID(ST_MakePoint(2.1955, 41.3783), 4326), 0, 0, 'Approved', true,
                       ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ObjectTypes" ot
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE ot."Name" = 'Bar'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Barceloneta Beach'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = 'Barceloneta Sunset Bar');

                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Hotel Gran Via Palace', 'Elegantni gradski hotel u centru Madrida, pogodan za obilaske i poslovna putovanja.',
                       'Gran Via 42, Madrid', '+34910000001', 'https://www.esmadrid.com', NULL, NULL,
                       '{"pon":"00:00-24:00"}', 195.00, ARRAY['WiFi', 'Spa', 'Parking', 'Dorucak'],
                       ST_SetSRID(ST_MakePoint(-3.7049, 40.4205), 4326), 0, 0, 'Approved', true,
                       ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ObjectTypes" ot
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE ot."Name" = 'Hotel'
                  AND d."Name" = 'Madrid'
                  AND l."Name" = 'Gran Via Madrid'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = 'Hotel Gran Via Palace');

                INSERT INTO "Objects"
                ("Name", "Description", "Address", "PhoneNumber", "Website", "MenuUrl", "CuisineType", "WorkingHours", "Price", "Amenities", "Geolocation", "AverageRating", "ReviewCount",
                 "Status", "IsActive", "ObjectTypeId", "LocalityId", "DestinationId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Oceanic Bistro Valencia', 'Restoran inspirisan mediteranskom kuhinjom u modernom delu Valensije.',
                       'Avinguda del Professor Lopez Pinero, Valencia', '+34960000001', 'https://www.visitvalencia.com', NULL, 'Mediteranska i spanjolska',
                       '{"pon":"11:00-23:00"}', 34.00, ARRAY['Terasa', 'Pogled na vodu', 'Porodicno', 'Rezervacije'],
                       ST_SetSRID(ST_MakePoint(-0.3508, 39.4557), 4326), 0, 0, 'Approved', true,
                       ot."Id", l."Id", d."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ObjectTypes" ot
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE ot."Name" = 'Restoran'
                  AND d."Name" = 'Valencia'
                  AND l."Name" = 'Ciudad de las Artes Valencia'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Objects" o WHERE o."Name" = 'Oceanic Bistro Valencia');
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Activities"
                ("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Gothic Tapas Walk', 'Vecernja setnja kroz istorijski deo Barselone uz tapas degustaciju i lokalna vina.',
                       ST_SetSRID(ST_MakePoint(2.1759, 41.3836), 4326), 28.00, 120, true,
                       at."Id", l."Id", d."Id", o."Id", 1, cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ActivityTypes" at
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE at."Name" = 'Degustacija hrane'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Gothic Quarter Barcelona'
                  AND o."Name" = 'Tapas House Gothic'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Activities" a WHERE a."Name" = 'Gothic Tapas Walk');

                INSERT INTO "Activities"
                ("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Barceloneta Sunset Ride', 'Lagani biciklisticki obilazak obale uz zavrsetak na plazi tokom zalaska sunca.',
                       ST_SetSRID(ST_MakePoint(2.1959, 41.3781), 4326), 18.00, 90, true,
                       at."Id", l."Id", d."Id", NULL, 1, cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ActivityTypes" at
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE at."Name" = 'Biciklizam'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Barceloneta Beach'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Activities" a WHERE a."Name" = 'Barceloneta Sunset Ride');

                INSERT INTO "Activities"
                ("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Madrid Architecture Walk', 'Pesacka tura kroz centar Madrida sa fokusom na fasade, trgove i gradske price.',
                       ST_SetSRID(ST_MakePoint(-3.7052, 40.4204), 4326), 0.00, 150, true,
                       at."Id", l."Id", d."Id", NULL, 1, cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ActivityTypes" at
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Users" cc
                WHERE at."Name" = 'Razgledanje'
                  AND d."Name" = 'Madrid'
                  AND l."Name" = 'Gran Via Madrid'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Activities" a WHERE a."Name" = 'Madrid Architecture Walk');

                INSERT INTO "Activities"
                ("Name", "Description", "Geolocation", "Price", "DurationMinutes", "IsActive", "ActivityTypeId", "LocalityId", "DestinationId", "ObjectId", "Status", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Valencia Paella Experience', 'Gastronomsko iskustvo uz mediteranske ukuse i prezentaciju pripreme paelje.',
                       ST_SetSRID(ST_MakePoint(-0.3510, 39.4556), 4326), 32.00, 110, true,
                       at."Id", l."Id", d."Id", o."Id", 1, cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "ActivityTypes" at
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE at."Name" = 'Degustacija hrane'
                  AND d."Name" = 'Valencia'
                  AND l."Name" = 'Ciudad de las Artes Valencia'
                  AND o."Name" = 'Oceanic Bistro Valencia'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Activities" a WHERE a."Name" = 'Valencia Paella Experience');
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Events"
                ("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Barcelona Summer Lights', 'Letnji festivalski program sa muzikom, ulicnim performansima i nocnim obilascima istorijskog centra.',
                       ST_SetSRID(ST_MakePoint(2.1756, 41.3840), 4326),
                       TIMESTAMPTZ '2026-07-18 19:30:00Z', TIMESTAMPTZ '2026-07-20 23:30:00Z', 18.00, 1200, true, 'Approved',
                       et."Id", l."Id", d."Id", o."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "EventTypes" et
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE et."Name" = 'Festival'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Gothic Quarter Barcelona'
                  AND o."Name" = 'Hotel Casa Batllo Suites'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Name" = 'Barcelona Summer Lights');

                INSERT INTO "Events"
                ("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Barceloneta Sunset Session', 'Vecernji nastup na otvorenom sa DJ setovima i plaznim ambijentom.',
                       ST_SetSRID(ST_MakePoint(2.1961, 41.3782), 4326),
                       TIMESTAMPTZ '2026-08-09 20:00:00Z', TIMESTAMPTZ '2026-08-10 00:30:00Z', 12.00, 500, true, 'Approved',
                       et."Id", l."Id", d."Id", o."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "EventTypes" et
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE et."Name" = 'Nastup'
                  AND d."Name" = 'Barcelona'
                  AND l."Name" = 'Barceloneta Beach'
                  AND o."Name" = 'Barceloneta Sunset Bar'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Name" = 'Barceloneta Sunset Session');

                INSERT INTO "Events"
                ("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Madrid Culture Week', 'Nedeljni gradski program sa manjim izlozbama, muzikom i vodjenim setnjama kroz centar.',
                       ST_SetSRID(ST_MakePoint(-3.7056, 40.4201), 4326),
                       TIMESTAMPTZ '2026-09-10 17:00:00Z', TIMESTAMPTZ '2026-09-14 22:00:00Z', 15.00, 900, true, 'Approved',
                       et."Id", l."Id", d."Id", o."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "EventTypes" et
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE et."Name" = 'Festival'
                  AND d."Name" = 'Madrid'
                  AND l."Name" = 'Gran Via Madrid'
                  AND o."Name" = 'Hotel Gran Via Palace'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Name" = 'Madrid Culture Week');

                INSERT INTO "Events"
                ("Name", "Description", "Geolocation", "StartDate", "EndDate", "Price", "MaxVisitors", "IsActive", "Status", "EventTypeId", "LocalityId", "DestinationId", "ObjectId", "CreatedByUserId", "ApprovedByUserId", "ApprovedAt", "CreatedAt", "UpdatedAt")
                SELECT 'Valencia Paella Fest', 'Gastronomski sajam sa degustacijama, live cooking segmentima i lokalnim proizvodjacima.',
                       ST_SetSRID(ST_MakePoint(-0.3513, 39.4555), 4326),
                       TIMESTAMPTZ '2026-10-03 12:00:00Z', TIMESTAMPTZ '2026-10-03 21:00:00Z', 10.00, 700, true, 'Approved',
                       et."Id", l."Id", d."Id", o."Id", cc."Id", d."ManagedByUserId", NOW(), NOW(), NOW()
                FROM "EventTypes" et
                CROSS JOIN "Destinations" d
                CROSS JOIN "Localities" l
                CROSS JOIN "Objects" o
                CROSS JOIN "Users" cc
                WHERE et."Name" = 'Sajam'
                  AND d."Name" = 'Valencia'
                  AND l."Name" = 'Ciudad de las Artes Valencia'
                  AND o."Name" = 'Oceanic Bistro Valencia'
                  AND cc."Email" = 'carmen.creator@spirego.com'
                  AND l."DestinationId" = d."Id"
                  AND o."DestinationId" = d."Id"
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Name" = 'Valencia Paella Fest');
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Sjajna lokacija i odlican dorucak, hotel je idealan za obilazak Barselone.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'diego.tourist@spirego.com'
                  AND o."Name" = 'Hotel Casa Batllo Suites'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Veoma prijatan smestaj i lep pogled sa krova, recepcija je bila brza i ljubazna.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'sofia.tourist@spirego.com'
                  AND o."Name" = 'Hotel Casa Batllo Suites'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Tapasi su bili fantasticni, a osoblje je davalo odlicne preporuke za vino.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'elena.tourist@spirego.com'
                  AND o."Name" = 'Tapas House Gothic'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Odlicna hrana i fina atmosfera, samo je bilo malo guzve u vecernjem terminu.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'diego.tourist@spirego.com'
                  AND o."Name" = 'Tapas House Gothic'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Savrsen zalazak sunca, muzika taman koliko treba i super kokteli.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'sofia.tourist@spirego.com'
                  AND o."Name" = 'Barceloneta Sunset Bar'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Hotel je tih i uredan, a Gran Via je odlicna baza za gradske obilaske.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'elena.tourist@spirego.com'
                  AND o."Name" = 'Hotel Gran Via Palace'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Paelja je bila odlicna, a ambijent moderan i opusten.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'diego.tourist@spirego.com'
                  AND o."Name" = 'Oceanic Bistro Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Dobra usluga i lep pogled na moderni deo grada, preporuka za veceru.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'sofia.tourist@spirego.com'
                  AND o."Name" = 'Oceanic Bistro Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

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
                    'Hotel Casa Batllo Suites',
                    'Tapas House Gothic',
                    'Barceloneta Sunset Bar',
                    'Hotel Gran Via Palace',
                    'Oceanic Bistro Valencia'
                );
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80',
                       'Barcelona', true, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Barcelona'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=1200&q=80',
                       'Barcelona', false, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Barcelona'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
                       'Madrid', true, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Madrid'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
                       'Madrid', false, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Madrid'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80',
                       'Valencia', true, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
                       'Valencia', false, d."Id", NOW()
                FROM "Destinations" d
                WHERE d."Name" = 'Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80',
                       'Gothic Quarter Barcelona', true, l."Id", NOW()
                FROM "Localities" l
                WHERE l."Name" = 'Gothic Quarter Barcelona'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
                       'Barceloneta Beach', true, l."Id", NOW()
                FROM "Localities" l
                WHERE l."Name" = 'Barceloneta Beach'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
                       'Gran Via Madrid', true, l."Id", NOW()
                FROM "Localities" l
                WHERE l."Name" = 'Gran Via Madrid'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80',
                       'Ciudad de las Artes Valencia', true, l."Id", NOW()
                FROM "Localities" l
                WHERE l."Name" = 'Ciudad de las Artes Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
                       'Hotel Casa Batllo Suites', true, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Hotel Casa Batllo Suites'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80',
                       'Hotel Casa Batllo Suites', false, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Hotel Casa Batllo Suites'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
                       'Tapas House Gothic', true, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Tapas House Gothic'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                       'Tapas House Gothic', false, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Tapas House Gothic'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
                       'Barceloneta Sunset Bar', true, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Barceloneta Sunset Bar'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
                       'Barceloneta Sunset Bar', false, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Barceloneta Sunset Bar'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
                       'Hotel Gran Via Palace', true, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Hotel Gran Via Palace'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80',
                       'Hotel Gran Via Palace', false, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Hotel Gran Via Palace'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
                       'Oceanic Bistro Valencia', true, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Oceanic Bistro Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
                       'Oceanic Bistro Valencia', false, o."Id", NOW()
                FROM "Objects" o
                WHERE o."Name" = 'Oceanic Bistro Valencia'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
                       'Barcelona Summer Lights', true, e."Id", NOW()
                FROM "Events" e
                WHERE e."Name" = 'Barcelona Summer Lights'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
                       'Barceloneta Sunset Session', true, e."Id", NOW()
                FROM "Events" e
                WHERE e."Name" = 'Barceloneta Sunset Session'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
                       'Madrid Culture Week', true, e."Id", NOW()
                FROM "Events" e
                WHERE e."Name" = 'Madrid Culture Week'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                       'Valencia Paella Fest', true, e."Id", NOW()
                FROM "Events" e
                WHERE e."Name" = 'Valencia Paella Fest'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
                       'Gothic Tapas Walk', true, a."Id", NOW()
                FROM "Activities" a
                WHERE a."Name" = 'Gothic Tapas Walk'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
                       'Barceloneta Sunset Ride', true, a."Id", NOW()
                FROM "Activities" a
                WHERE a."Name" = 'Barceloneta Sunset Ride'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
                       'Madrid Architecture Walk', true, a."Id", NOW()
                FROM "Activities" a
                WHERE a."Name" = 'Madrid Architecture Walk'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
                       'Valencia Paella Experience', true, a."Id", NOW()
                FROM "Activities" a
                WHERE a."Name" = 'Valencia Paella Experience'
                  AND EXISTS (SELECT 1 FROM "Destinations")
                  AND NOT EXISTS (SELECT 1 FROM "Images" i WHERE i."Url" = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
