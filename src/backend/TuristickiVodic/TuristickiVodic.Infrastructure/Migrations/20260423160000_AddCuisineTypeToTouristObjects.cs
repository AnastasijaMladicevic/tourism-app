using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260423160000_AddCuisineTypeToTouristObjects")]
    public class AddCuisineTypeToTouristObjects : Migration
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
                          AND column_name = 'CuisineType'
                    ) THEN
                        ALTER TABLE "Objects" ADD COLUMN "CuisineType" character varying(100) NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "CuisineType" = 'Mediteranska i morski plodovi'
                WHERE "Name" = 'Restoran Galion'
                  AND ("CuisineType" IS NULL OR "CuisineType" = '');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "CuisineType" = 'Mediteranska i bar food'
                WHERE "Name" = 'Mogren Beach Bar'
                  AND ("CuisineType" IS NULL OR "CuisineType" = '');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "CuisineType" = 'Crnogorska i riblji specijaliteti'
                WHERE "Name" = 'Restoran Jezero'
                  AND ("CuisineType" IS NULL OR "CuisineType" = '');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Objects'
                          AND column_name = 'CuisineType'
                    ) THEN
                        ALTER TABLE "Objects" DROP COLUMN "CuisineType";
                    END IF;
                END $$;
                """);
        }
    }
}
