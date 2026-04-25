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
                SELECT v."Url", v."AltText", v."IsMain", d."Id", NOW()
                FROM (VALUES
                    ('https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80', 'Athens', true),
                    ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Athens', false),
                    ('https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80', 'Santorini', true),
                    ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Santorini', false),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Crete', true),
                    ('https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80', 'Crete', false),
                    ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Rhodes', true),
                    ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Rhodes', false),
                    ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Corfu', true),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Corfu', false)
                ) AS v("Url", "AltText", "IsMain")
                JOIN "Destinations" d ON d."Name" = v."AltText";

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT v."Url", v."AltText", v."IsMain", l."Id", NOW()
                FROM (VALUES
                    ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Plaka Athens', true),
                    ('https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80', 'Acropolis Hill', true),
                    ('https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80', 'Oia Santorini', true),
                    ('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80', 'Fira Santorini', true),
                    ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Chania Old Town', true),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach', true),
                    ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Rhodes Old Town', true),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Lindos Bay', true),
                    ('https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80', 'Corfu Old Town', true),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa', true)
                ) AS v("Url", "AltText", "IsMain")
                JOIN "Localities" l ON l."Name" = v."AltText";

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT v."Url", v."AltText", v."IsMain", o."Id", NOW()
                FROM (VALUES
                    ('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', 'Hotel Acropolis View Athens', true),
                    ('https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80', 'Hotel Acropolis View Athens', false),
                    ('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 'Plaka Garden Taverna', true),
                    ('https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80', 'Plaka Garden Taverna', false),
                    ('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80', 'Museum of Cycladic Culture Athens', true),
                    ('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80', 'Oia Caldera Suites', true),
                    ('https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80', 'Oia Caldera Suites', false),
                    ('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', 'Fira Sunset Wine Bar', true),
                    ('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80', 'Aegean Blue Restaurant', true),
                    ('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80', 'Chania Harbor Hotel', true),
                    ('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach Canteen', true),
                    ('https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80', 'Rhodes Knight Hotel', true),
                    ('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 'Lindos Bay Seafood', true),
                    ('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', 'Corfu Venetian Boutique Hotel', true),
                    ('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa View Cafe', true)
                ) AS v("Url", "AltText", "IsMain")
                JOIN "Objects" o ON o."Name" = v."AltText";

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT v."Url", v."AltText", v."IsMain", e."Id", NOW()
                FROM (VALUES
                    ('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80', 'Athens Open Air Classics', true),
                    ('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Santorini Sunset Wine Festival', true),
                    ('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', 'Oia Summer Lights', true),
                    ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Chania Harbor Food Week', true),
                    ('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', 'Rhodes Medieval Night', true),
                    ('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80', 'Corfu Old Town Jazz Evening', true)
                ) AS v("Url", "AltText", "IsMain")
                JOIN "Events" e ON e."Name" = v."AltText";

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT v."Url", v."AltText", v."IsMain", a."Id", NOW()
                FROM (VALUES
                    ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Athens History Walk', true),
                    ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Traditional Greek Dinner Plaka', true),
                    ('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', 'Santorini Caldera Photo Walk', true),
                    ('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Santorini Wine Tasting', true),
                    ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Chania Old Harbor Walk', true),
                    ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Elafonisi Beach Day', true),
                    ('https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80', 'Rhodes Medieval Tour', true),
                    ('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', 'Paleokastritsa Boat Ride', true)
                ) AS v("Url", "AltText", "IsMain")
                JOIN "Activities" a ON a."Name" = v."AltText";
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
