using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260424233000_RefreshSpainGreeceMediaAndRegionFocus")]
    public class RefreshSpainGreeceMediaAndRegionFocus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Regions"
                SET "CenterLongitude" = 20.7505,
                    "CenterLatitude" = 43.8914,
                    "DefaultMapZoom" = 7.2,
                    "UpdatedAt" = NOW()
                WHERE "Code" = 'RS';

                UPDATE "Regions"
                SET "CenterLongitude" = 12.4964,
                    "CenterLatitude" = 42.4279,
                    "DefaultMapZoom" = 6.4,
                    "UpdatedAt" = NOW()
                WHERE "Code" = 'IT';

                UPDATE "Regions"
                SET "CenterLongitude" = 23.6500,
                    "CenterLatitude" = 38.3500,
                    "DefaultMapZoom" = 6.4,
                    "UpdatedAt" = NOW()
                WHERE "Code" = 'GR';

                UPDATE "Destinations"
                SET "DisplayTitle" = CASE "Name"
                    WHEN 'Barcelona' THEN 'Arhitektura, more i veceri u gotickoj cetvrti'
                    WHEN 'Madrid' THEN 'Muzeji, bulevari i gradska energija do kasno u noc'
                    WHEN 'Valencia' THEN 'Paelja, futuristicka arhitektura i mediteranski tempo'
                    ELSE "DisplayTitle"
                END,
                    "UpdatedAt" = NOW()
                WHERE "Name" IN ('Barcelona', 'Madrid', 'Valencia')
                  AND COALESCE("DisplayTitle", '') = '';

                UPDATE "Objects"
                SET "CuisineType" = CASE "Name"
                    WHEN 'Plaka Garden Taverna' THEN 'Grcka tradicionalna'
                    WHEN 'Fira Sunset Wine Bar' THEN 'Vina i meze'
                    WHEN 'Aegean Blue Restaurant' THEN 'Mediteranska i morski plodovi'
                    WHEN 'Elafonisi Beach Canteen' THEN 'Brza hrana i kafa'
                    WHEN 'Lindos Bay Seafood' THEN 'Mediteranska i morski plodovi'
                    WHEN 'Paleokastritsa View Cafe' THEN 'Kafa i lagani obroci'
                    WHEN 'Tapas House Gothic' THEN 'Tapas i mediteranska'
                    WHEN 'Barceloneta Sunset Bar' THEN 'Kokteli i bar food'
                    WHEN 'Oceanic Bistro Valencia' THEN 'Mediteranska i spanska'
                    WHEN 'Mogren Beach Bar' THEN 'Mediteranska i bar food'
                    WHEN 'Restoran Jezero' THEN 'Crnogorska i riblji specijaliteti'
                    ELSE "CuisineType"
                END,
                    "UpdatedAt" = NOW()
                WHERE "Name" IN (
                    'Plaka Garden Taverna', 'Fira Sunset Wine Bar', 'Aegean Blue Restaurant',
                    'Elafonisi Beach Canteen', 'Lindos Bay Seafood', 'Paleokastritsa View Cafe',
                    'Tapas House Gothic', 'Barceloneta Sunset Bar', 'Oceanic Bistro Valencia',
                    'Mogren Beach Bar', 'Restoran Jezero'
                );
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM "Images" i
                USING "Destinations" d
                WHERE i."DestinationId" = d."Id"
                  AND d."Name" IN ('Barcelona', 'Madrid', 'Valencia', 'Athens', 'Santorini', 'Crete', 'Rhodes', 'Corfu');

                DELETE FROM "Images" i
                USING "Localities" l
                WHERE i."LocalityId" = l."Id"
                  AND l."Name" IN (
                    'Gothic Quarter Barcelona', 'Barceloneta Beach', 'Gran Via Madrid', 'Ciudad de las Artes Valencia',
                    'Plaka Athens', 'Acropolis Hill', 'Oia Santorini', 'Fira Santorini', 'Chania Old Town',
                    'Elafonisi Beach', 'Rhodes Old Town', 'Lindos Bay', 'Corfu Old Town', 'Paleokastritsa'
                  );

                DELETE FROM "Images" i
                USING "Objects" o
                WHERE i."ObjectId" = o."Id"
                  AND o."Name" IN (
                    'Hotel Casa Batllo Suites', 'Tapas House Gothic', 'Barceloneta Sunset Bar', 'Hotel Gran Via Palace', 'Oceanic Bistro Valencia',
                    'Hotel Acropolis View Athens', 'Plaka Garden Taverna', 'Museum of Cycladic Culture Athens', 'Oia Caldera Suites',
                    'Fira Sunset Wine Bar', 'Aegean Blue Restaurant', 'Chania Harbor Hotel', 'Elafonisi Beach Canteen',
                    'Rhodes Knight Hotel', 'Lindos Bay Seafood', 'Corfu Venetian Boutique Hotel', 'Paleokastritsa View Cafe'
                  );

                DELETE FROM "Images" i
                USING "Events" e
                WHERE i."EventId" = e."Id"
                  AND e."Name" IN (
                    'Barcelona Summer Lights', 'Barceloneta Sunset Session', 'Madrid Culture Week', 'Valencia Paella Fest',
                    'Athens Open Air Classics', 'Santorini Sunset Wine Festival', 'Oia Summer Lights', 'Chania Harbor Food Week',
                    'Rhodes Medieval Night', 'Corfu Old Town Jazz Evening'
                  );

                DELETE FROM "Images" i
                USING "Activities" a
                WHERE i."ActivityId" = a."Id"
                  AND a."Name" IN (
                    'Gothic Tapas Walk', 'Barceloneta Sunset Ride', 'Madrid Architecture Walk', 'Valencia Paella Experience',
                    'Athens History Walk', 'Traditional Greek Dinner Plaka', 'Santorini Caldera Photo Walk', 'Santorini Wine Tasting',
                    'Chania Old Harbor Walk', 'Elafonisi Beach Day', 'Rhodes Medieval Tour', 'Paleokastritsa Boat Ride'
                  );

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Barcelona%20Skyline.jpg', 'Barcelona', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Barcelona';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Madrid', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Madrid';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Valencia', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Valencia';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', 'Athens', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Athens';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Santorini', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Santorini';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Crete', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Crete';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Rhodes';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "DestinationId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%26%20Old%20Fortress.jpg', 'Corfu', TRUE, d."Id", NOW()
                FROM "Destinations" d WHERE d."Name" = 'Corfu';

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', 'Gothic Quarter Barcelona', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Gothic Quarter Barcelona';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', 'Barceloneta Beach', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Barceloneta Beach';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', 'Gran Via Madrid', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Gran Via Madrid';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', 'Ciudad de las Artes Valencia', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Ciudad de las Artes Valencia';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', 'Plaka Athens', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Plaka Athens';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', 'Acropolis Hill', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Acropolis Hill';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', 'Oia Santorini', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Oia Santorini';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%282602792772%29.jpg', 'Fira Santorini', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Fira Santorini';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', 'Chania Old Town', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Chania Old Town';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', 'Elafonisi Beach', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Elafonisi Beach';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', 'Rhodes Old Town', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Rhodes Old Town';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Lindos%20Bay.jpg', 'Lindos Bay', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Lindos Bay';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%28May%202017%29.jpg', 'Corfu Old Town', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Corfu Old Town';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "LocalityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', 'Paleokastritsa', TRUE, l."Id", NOW()
                FROM "Localities" l WHERE l."Name" = 'Paleokastritsa';

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Barcelona%20Skyline.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Hotel Casa Batllo Suites';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Tapas House Gothic';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Barceloneta Sunset Bar';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Hotel Gran Via Palace';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Oceanic Bistro Valencia';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2828359594671%29.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Hotel Acropolis View Athens';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Plaka Garden Taverna';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2827821980944%29.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Museum of Cycladic Culture Athens';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Oia Caldera Suites';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Fira Sunset Wine Bar';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Aegean Blue Restaurant';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Chania Harbor Hotel';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Elafonisi Beach Canteen';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Rhodes Knight Hotel';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Lindos%20Bay.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Lindos Bay Seafood';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%26%20Old%20Fortress.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Corfu Venetian Boutique Hotel';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ObjectId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', o."Name", TRUE, o."Id", NOW()
                FROM "Objects" o WHERE o."Name" = 'Paleokastritsa View Cafe';

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Barcelona Summer Lights';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Barceloneta Sunset Session';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Madrid Culture Week';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Valencia Paella Fest';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Athens%20Acropolis%20%2827821980944%29.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Athens Open Air Classics';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Santorini Sunset Wine Festival';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Oia Summer Lights';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Chania Harbor Food Week';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Rhodes Medieval Night';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "EventId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Corfu%20old%20town%20%28May%202017%29.jpg', e."Name", TRUE, e."Id", NOW()
                FROM "Events" e WHERE e."Name" = 'Corfu Old Town Jazz Evening';

                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gothic%20Quarter%2C%20Barcelona.JPG', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Gothic Tapas Walk';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/La%20Barceloneta.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Barceloneta Sunset Ride';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Gran%20Via%2C%20Madrid.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Madrid Architecture Walk';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Arts%20and%20Sciences%2C%20Valencia%20%2852395812264%29.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Valencia Paella Experience';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%20Athens%20%28February%202019%29.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Athens History Walk';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Plaka%2C%20Athens%20%283340582775%29.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Traditional Greek Dinner Plaka';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Oia%2C%20Santorini.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Santorini Caldera Photo Walk';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Fira%2C%20Santorini%20%288302758240%29.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Santorini Wine Tasting';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Street%20detail%20in%20Chania%20old%20town.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Chania Old Harbor Walk';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Elafonisi%20Beach.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Elafonisi Beach Day';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes%27%20old%20town.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Rhodes Medieval Tour';
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "ActivityId", "CreatedAt")
                SELECT 'https://commons.wikimedia.org/wiki/Special:FilePath/Paleokastritsa.jpg', a."Name", TRUE, a."Id", NOW()
                FROM "Activities" a WHERE a."Name" = 'Paleokastritsa Boat Ride';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
