using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260415214000_EnsureTouristObjectColumnsAndConstraints")]
    public class EnsureTouristObjectColumnsAndConstraints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Objects'
                          AND column_name = 'Price'
                    ) THEN
                        ALTER TABLE "Objects" ADD COLUMN "Price" numeric NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Objects'
                          AND column_name = 'Amenities'
                    ) THEN
                        ALTER TABLE "Objects" ADD COLUMN "Amenities" text[] NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_Destinations_Users_ManagedByUserId'
                    ) THEN
                        ALTER TABLE "Destinations" DROP CONSTRAINT "FK_Destinations_Users_ManagedByUserId";
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE "Destinations"
                ADD CONSTRAINT "FK_Destinations_Users_ManagedByUserId"
                FOREIGN KEY ("ManagedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT;
                """);

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_DeletionRequests_ActivityId"
                ON "DeletionRequests" ("ActivityId")
                WHERE "ActivityId" IS NOT NULL AND "Status" = 'Pending';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Ova migracija služi da postojeće baze uskladi sa već izmenjenim modelom.
            // Down je namerno ostavljen bez destruktivnih operacija da ne bi uklonio kolone
            // koje na sveže kreiranoj bazi već dolaze iz prethodne migracije.
        }
    }
}
