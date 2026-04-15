using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416000000_SeedTouristObjectDemoData")]
    public class SeedTouristObjectDemoData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Mila', 'Milic', DATE '1997-04-12', 'mila@gmail.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       NULL, 'Srbija', 'sr', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Tourist'
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'mila@gmail.com');

                INSERT INTO "Users"
                ("FirstName", "LastName", "DateOfBirth", "Email", "PasswordHash", "PhoneNumber", "Country", "Language",
                 "IsVerified", "IsActive", "IsBlacklisted", "HasRequestedCreatorRole", "RoleId", "ManagedDestinationId", "CreatedAt", "UpdatedAt", "ProfileImageUrl")
                SELECT 'Ivan', 'Ivanic', DATE '1996-09-03', 'ivan@gmail.com',
                       '$2y$11$7H.XPw9lUVO4vWdMPbPjeeuCoMPQerWAC.OXPjX8DNlxuvMFQptAS',
                       NULL, 'Crna Gora', 'sr', true, true, false, false,
                       r."Id", NULL, NOW(), NOW(), '/images/profiles/default_icon.png'
                FROM "Roles" r
                WHERE r."Name" = 'Tourist'
                  AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Email" = 'ivan@gmail.com');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET
                    "Price" = CASE "Name"
                        WHEN 'Hotel Vardar' THEN 145.00
                        WHEN 'Restoran Galion' THEN 35.00
                        WHEN 'Hotel Avala' THEN 180.00
                        WHEN 'Mogren Beach Bar' THEN 12.00
                        WHEN 'Planinarski dom Durmitor' THEN 55.00
                        ELSE "Price"
                    END,
                    "Amenities" = CASE "Name"
                        WHEN 'Hotel Vardar' THEN ARRAY['WiFi', 'Parking', 'Spa', 'Dorucak']
                        WHEN 'Restoran Galion' THEN ARRAY['WiFi', 'Terasa', 'Pogled na more', 'Rezervacije']
                        WHEN 'Hotel Avala' THEN ARRAY['WiFi', 'Bazen', 'Spa', 'Parking', 'Dorucak']
                        WHEN 'Mogren Beach Bar' THEN ARRAY['Terasa', 'Pogled na more', 'Kokteli', 'Muzika']
                        WHEN 'Planinarski dom Durmitor' THEN ARRAY['Parking', 'Restoran', 'Grejanje', 'Pogled na planinu']
                        ELSE "Amenities"
                    END
                WHERE "Name" IN (
                    'Hotel Vardar',
                    'Restoran Galion',
                    'Hotel Avala',
                    'Mogren Beach Bar',
                    'Planinarski dom Durmitor'
                );
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Lep hotel i odlicna lokacija, dorucak moze biti bolji.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ivan@gmail.com'
                  AND o."Name" = 'Hotel Vardar'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Fenomenalna usluga i pogled, vraticu se opet.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ivan@gmail.com'
                  AND o."Name" = 'Restoran Galion'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Vrlo prijatan smestaj i sjajan pogled sa terase.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'mila@gmail.com'
                  AND o."Name" = 'Hotel Avala'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Odlicno mesto za pice posle plaze.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ivan@gmail.com'
                  AND o."Name" = 'Mogren Beach Bar'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Opustena atmosfera i super muzika predvece.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'mila@gmail.com'
                  AND o."Name" = 'Mogren Beach Bar'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Savrsena baza za planinarenje, osoblje veoma ljubazno.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'mila@gmail.com'
                  AND o."Name" = 'Planinarski dom Durmitor'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Topla preporuka za ljubitelje prirode i planine.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ivan@gmail.com'
                  AND o."Name" = 'Planinarski dom Durmitor'
                  AND (SELECT COUNT(*) FROM "Reviews" r WHERE r."ObjectId" = o."Id" AND r."Status" = 'Approved') < 2
                  AND NOT EXISTS (SELECT 1 FROM "Reviews" r WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id");
                """);

            migrationBuilder.Sql(
                """
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
                WHERE "Name" IN (
                    'Hotel Vardar',
                    'Restoran Galion',
                    'Hotel Avala',
                    'Mogren Beach Bar',
                    'Planinarski dom Durmitor'
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
