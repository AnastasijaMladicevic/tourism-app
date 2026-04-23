using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260423123000_EnsureReviewRatingTriggerAndAdditionalReviews")]
    public class EnsureReviewRatingTriggerAndAdditionalReviews : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 3, 'Sobe su udobne i lokacija je dobra za skijanje, ali spa zona je bila prevelika guzva tokom vikenda.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ana@gmail.com'
                  AND o."Name" = 'Hotel Bianca Kolasin'
                  AND NOT EXISTS (
                      SELECT 1 FROM "Reviews" r
                      WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id"
                  );

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Dobar dorucak i prijatan ambijent, osoblje brzo reaguje na zahteve.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ivan@gmail.com'
                  AND o."Name" = 'Hotel Bianca Kolasin'
                  AND NOT EXISTS (
                      SELECT 1 FROM "Reviews" r
                      WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id"
                  );

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 5, 'Riba je bila sveza, a terasa uz jezero je najlepsi deo vecere pred zalazak sunca.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'ana@gmail.com'
                  AND o."Name" = 'Restoran Jezero'
                  AND NOT EXISTS (
                      SELECT 1 FROM "Reviews" r
                      WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id"
                  );

                INSERT INTO "Reviews" ("UserId", "ObjectId", "Rating", "Text", "Status", "CreatedAt")
                SELECT u."Id", o."Id", 4, 'Pogled i hrana su odlicni, ali se na uslugu cekalo malo duze nego sto sam ocekivala.', 'Approved', NOW()
                FROM "Users" u
                CROSS JOIN "Objects" o
                WHERE u."Email" = 'mila@gmail.com'
                  AND o."Name" = 'Restoran Jezero'
                  AND NOT EXISTS (
                      SELECT 1 FROM "Reviews" r
                      WHERE r."UserId" = u."Id" AND r."ObjectId" = o."Id"
                  );
                """);

            migrationBuilder.Sql(
                """
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
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM "Reviews" r
                USING "Users" u, "Objects" o
                WHERE r."UserId" = u."Id"
                  AND r."ObjectId" = o."Id"
                  AND (
                      (u."Email" = 'ana@gmail.com'
                       AND o."Name" = 'Hotel Bianca Kolasin'
                       AND r."Text" = 'Sobe su udobne i lokacija je dobra za skijanje, ali spa zona je bila prevelika guzva tokom vikenda.')
                      OR
                      (u."Email" = 'ivan@gmail.com'
                       AND o."Name" = 'Hotel Bianca Kolasin'
                       AND r."Text" = 'Dobar dorucak i prijatan ambijent, osoblje brzo reaguje na zahteve.')
                      OR
                      (u."Email" = 'ana@gmail.com'
                       AND o."Name" = 'Restoran Jezero'
                       AND r."Text" = 'Riba je bila sveza, a terasa uz jezero je najlepsi deo vecere pred zalazak sunca.')
                      OR
                      (u."Email" = 'mila@gmail.com'
                       AND o."Name" = 'Restoran Jezero'
                       AND r."Text" = 'Pogled i hrana su odlicni, ali se na uslugu cekalo malo duze nego sto sam ocekivala.')
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
                    );
                """);
        }
    }
}
