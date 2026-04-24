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
                ALTER TABLE "Images" DISABLE TRIGGER USER;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-QEG8VZiL6ZY?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Athens'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Athens' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Zg6ONyndHUs?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Athens'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Athens' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-ReKxstaml64?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Santorini'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Santorini' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-43xyqHpv-wo?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Santorini'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Santorini' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-3MYSN2Rmsy8?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Crete'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Crete' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Kpvlf_5LH2g?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Crete'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Crete' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-ekHPI4AasQ4?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Rhodes' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-aMf02DjwvHk?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Rhodes' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-TPINQdPbxSw?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Corfu'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Corfu' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-9l5c5GEUkmM?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Corfu'
                FROM "Destinations" d
                WHERE i."DestinationId" = d."Id" AND d."Name" = 'Corfu' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-v4kApMw3gRg?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Plaka Athens'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Plaka Athens';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-QEG8VZiL6ZY?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Acropolis Hill'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Acropolis Hill';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-D_RunLbrt4M?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Oia Santorini'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Oia Santorini';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-yfU0jIj-VQI?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Fira Santorini'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Fira Santorini';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-OEEGwOM5oMI?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Chania Old Town'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Chania Old Town';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-5zlWuHjPREo?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Elafonisi Beach'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Elafonisi Beach';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Ad-Zb6nS4j8?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes Old Town'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Rhodes Old Town';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-pSYOjfuAQDg?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Lindos Bay'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Lindos Bay';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-9l5c5GEUkmM?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Corfu Old Town'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Corfu Old Town';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-3ttu3CB1-WE?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Paleokastritsa'
                FROM "Localities" l
                WHERE i."LocalityId" = l."Id" AND l."Name" = 'Paleokastritsa';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Hotel Acropolis View Athens'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Hotel Acropolis View Athens' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Hotel Acropolis View Athens'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Hotel Acropolis View Athens' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Plaka Garden Taverna'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Plaka Garden Taverna' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Plaka Garden Taverna'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Plaka Garden Taverna' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-QEG8VZiL6ZY?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Museum of Cycladic Culture Athens'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Museum of Cycladic Culture Athens';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-ReKxstaml64?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Oia Caldera Suites'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Oia Caldera Suites' AND i."IsMain" = TRUE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-43xyqHpv-wo?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Oia Caldera Suites'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Oia Caldera Suites' AND i."IsMain" = FALSE;

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Fira Sunset Wine Bar'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Fira Sunset Wine Bar';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Aegean Blue Restaurant'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Aegean Blue Restaurant';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Chania Harbor Hotel'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Chania Harbor Hotel';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Kpvlf_5LH2g?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Elafonisi Beach Canteen'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Elafonisi Beach Canteen';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes Knight Hotel'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Rhodes Knight Hotel';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-pSYOjfuAQDg?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Lindos Bay Seafood'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Lindos Bay Seafood';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Corfu Venetian Boutique Hotel'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Corfu Venetian Boutique Hotel';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-n86ho7hWyJ8?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Paleokastritsa View Cafe'
                FROM "Objects" o
                WHERE i."ObjectId" = o."Id" AND o."Name" = 'Paleokastritsa View Cafe';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Athens Open Air Classics'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Athens Open Air Classics';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Santorini Sunset Wine Festival'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Santorini Sunset Wine Festival';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-43xyqHpv-wo?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Oia Summer Lights'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Oia Summer Lights';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Chania Harbor Food Week'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Chania Harbor Food Week';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Ad-Zb6nS4j8?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes Medieval Night'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Rhodes Medieval Night';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Corfu Old Town Jazz Evening'
                FROM "Events" e
                WHERE i."EventId" = e."Id" AND e."Name" = 'Corfu Old Town Jazz Evening';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-v4kApMw3gRg?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Athens History Walk'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Athens History Walk';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Traditional Greek Dinner Plaka'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Traditional Greek Dinner Plaka';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-D_RunLbrt4M?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Santorini Caldera Photo Walk'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Santorini Caldera Photo Walk';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Santorini Wine Tasting'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Santorini Wine Tasting';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-OEEGwOM5oMI?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Chania Old Harbor Walk'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Chania Old Harbor Walk';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Kpvlf_5LH2g?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Elafonisi Beach Day'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Elafonisi Beach Day';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-Ad-Zb6nS4j8?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Rhodes Medieval Tour'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Rhodes Medieval Tour';

                UPDATE "Images" i
                SET "Url" = 'https://images.unsplash.com/photo-3ttu3CB1-WE?auto=format&fit=crop&w=1200&q=80',
                    "AltText" = 'Paleokastritsa Boat Ride'
                FROM "Activities" a
                WHERE i."ActivityId" = a."Id" AND a."Name" = 'Paleokastritsa Boat Ride';

                ALTER TABLE "Images" ENABLE TRIGGER USER;
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
