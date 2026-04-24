using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260424203000_AddDestinationDisplayTitleAndFixGreeceMedia")]
    public class AddDestinationDisplayTitleAndFixGreeceMedia : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisplayTitle",
                table: "Destinations",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "Country" = 'Grcka',
                    "Language" = 'el',
                    "UpdatedAt" = NOW()
                WHERE "Email" = 'luka.greece.tourist@spirego.com';

                UPDATE "Destinations"
                SET "DisplayTitle" = CASE "Name"
                    WHEN 'Athens' THEN 'Anticka istorija, gradski ritam i pogled na Akropolj'
                    WHEN 'Santorini' THEN 'Bela sela, kaldera i zalasci sunca iznad mora'
                    WHEN 'Crete' THEN 'Veliko ostrvo sa plazama, lukama i lokalnim ukusima'
                    WHEN 'Rhodes' THEN 'Srednjovekovne ulice, tvrdjave i svetle uvale'
                    WHEN 'Corfu' THEN 'Venecijanske fasade, zelenilo i jonske uvale'
                    ELSE "DisplayTitle"
                END,
                    "UpdatedAt" = NOW()
                WHERE "Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM "Images" i
                USING "Destinations" d
                WHERE i."DestinationId" = d."Id"
                  AND d."Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');

                DELETE FROM "Images" i
                USING "Localities" l
                WHERE i."LocalityId" = l."Id"
                  AND l."Name" IN ('Plaka Athens', 'Acropolis Hill', 'Oia Santorini', 'Fira Santorini', 'Chania Old Town', 'Elafonisi Beach', 'Rhodes Old Town', 'Lindos Bay', 'Corfu Old Town', 'Paleokastritsa');

                DELETE FROM "Images" i
                USING "Objects" o
                WHERE i."ObjectId" = o."Id"
                  AND o."Name" IN ('Hotel Acropolis View Athens', 'Plaka Garden Taverna', 'Museum of Cycladic Culture Athens', 'Oia Caldera Suites', 'Fira Sunset Wine Bar', 'Aegean Blue Restaurant', 'Chania Harbor Hotel', 'Elafonisi Beach Canteen', 'Rhodes Knight Hotel', 'Lindos Bay Seafood', 'Corfu Venetian Boutique Hotel', 'Paleokastritsa View Cafe');

                DELETE FROM "Images" i
                USING "Events" e
                WHERE i."EventId" = e."Id"
                  AND e."Name" IN ('Athens Open Air Classics', 'Santorini Sunset Wine Festival', 'Oia Summer Lights', 'Chania Harbor Food Week', 'Rhodes Medieval Night', 'Corfu Old Town Jazz Evening');

                DELETE FROM "Images" i
                USING "Activities" a
                WHERE i."ActivityId" = a."Id"
                  AND a."Name" IN ('Athens History Walk', 'Traditional Greek Dinner Plaka', 'Santorini Caldera Photo Walk', 'Santorini Wine Tasting', 'Chania Old Harbor Walk', 'Elafonisi Beach Day', 'Rhodes Medieval Tour', 'Paleokastritsa Boat Ride');

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                VALUES
                ('https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80', 'Athens', true, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'), NOW()),
                ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Athens', false, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Athens'), NOW()),
                ('https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80', 'Santorini', true, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'), NOW()),
                ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Santorini', false, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Santorini'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Crete', true, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'), NOW()),
                ('https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80', 'Crete', false, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Crete'), NOW()),
                ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Rhodes', true, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'), NOW()),
                ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Rhodes', false, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Rhodes'), NOW()),
                ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Corfu', true, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Corfu', false, (SELECT "Id" FROM "Destinations" WHERE "Name" = 'Corfu'), NOW());

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                VALUES
                ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Plaka Athens', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Plaka Athens'), NOW()),
                ('https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80', 'Acropolis Hill', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Acropolis Hill'), NOW()),
                ('https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80', 'Oia Santorini', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Oia Santorini'), NOW()),
                ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Fira Santorini', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Fira Santorini'), NOW()),
                ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Chania Old Town', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Chania Old Town'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Elafonisi Beach'), NOW()),
                ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Rhodes Old Town', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Rhodes Old Town'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Lindos Bay', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Lindos Bay'), NOW()),
                ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Corfu Old Town', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Corfu Old Town'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa', true, (SELECT "Id" FROM "Localities" WHERE "Name" = 'Paleokastritsa'), NOW());

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                VALUES
                ('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', 'Hotel Acropolis View Athens', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'), NOW()),
                ('https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80', 'Hotel Acropolis View Athens', false, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Hotel Acropolis View Athens'), NOW()),
                ('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 'Plaka Garden Taverna', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'), NOW()),
                ('https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80', 'Plaka Garden Taverna', false, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Plaka Garden Taverna'), NOW()),
                ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Museum of Cycladic Culture Athens', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Museum of Cycladic Culture Athens'), NOW()),
                ('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80', 'Oia Caldera Suites', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'), NOW()),
                ('https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80', 'Oia Caldera Suites', false, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Oia Caldera Suites'), NOW()),
                ('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', 'Fira Sunset Wine Bar', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Fira Sunset Wine Bar'), NOW()),
                ('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80', 'Aegean Blue Restaurant', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Aegean Blue Restaurant'), NOW()),
                ('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80', 'Chania Harbor Hotel', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Chania Harbor Hotel'), NOW()),
                ('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach Canteen', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Elafonisi Beach Canteen'), NOW()),
                ('https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80', 'Rhodes Knight Hotel', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Rhodes Knight Hotel'), NOW()),
                ('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 'Lindos Bay Seafood', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Lindos Bay Seafood'), NOW()),
                ('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', 'Corfu Venetian Boutique Hotel', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Corfu Venetian Boutique Hotel'), NOW()),
                ('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa View Cafe', true, (SELECT "Id" FROM "Objects" WHERE "Name" = 'Paleokastritsa View Cafe'), NOW());

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                VALUES
                ('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80', 'Athens Open Air Classics', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Athens Open Air Classics'), NOW()),
                ('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Santorini Sunset Wine Festival', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Santorini Sunset Wine Festival'), NOW()),
                ('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', 'Oia Summer Lights', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Oia Summer Lights'), NOW()),
                ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Chania Harbor Food Week', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Chania Harbor Food Week'), NOW()),
                ('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', 'Rhodes Medieval Night', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Rhodes Medieval Night'), NOW()),
                ('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80', 'Corfu Old Town Jazz Evening', true, (SELECT "Id" FROM "Events" WHERE "Name" = 'Corfu Old Town Jazz Evening'), NOW());

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                VALUES
                ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Athens History Walk', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Athens History Walk'), NOW()),
                ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Traditional Greek Dinner Plaka', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Traditional Greek Dinner Plaka'), NOW()),
                ('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', 'Santorini Caldera Photo Walk', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Santorini Caldera Photo Walk'), NOW()),
                ('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Santorini Wine Tasting', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Santorini Wine Tasting'), NOW()),
                ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Chania Old Harbor Walk', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Chania Old Harbor Walk'), NOW()),
                ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach Day', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Elafonisi Beach Day'), NOW()),
                ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Rhodes Medieval Tour', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Rhodes Medieval Tour'), NOW()),
                ('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa Boat Ride', true, (SELECT "Id" FROM "Activities" WHERE "Name" = 'Paleokastritsa Boat Ride'), NOW());
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "Country" = 'Srbija',
                    "Language" = 'sr',
                    "UpdatedAt" = NOW()
                WHERE "Email" = 'luka.greece.tourist@spirego.com';

                UPDATE "Destinations"
                SET "DisplayTitle" = NULL,
                    "UpdatedAt" = NOW()
                WHERE "Name" IN ('Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');
                """);

            migrationBuilder.DropColumn(
                name: "DisplayTitle",
                table: "Destinations");
        }
    }
}
