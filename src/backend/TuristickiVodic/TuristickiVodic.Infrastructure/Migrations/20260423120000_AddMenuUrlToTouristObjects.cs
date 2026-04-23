using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260423120000_AddMenuUrlToTouristObjects")]
    public class AddMenuUrlToTouristObjects : Migration
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
                          AND column_name = 'MenuUrl'
                    ) THEN
                        ALTER TABLE "Objects" ADD COLUMN "MenuUrl" character varying(2000) NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = 'https://galion.me/menu/'
                WHERE "Name" = 'Restoran Galion'
                  AND ("MenuUrl" IS NULL OR "MenuUrl" = '');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = 'https://www.dotyourspot.com/EfQ3u4/'
                WHERE "Name" = 'Mogren Beach Bar'
                  AND ("MenuUrl" IS NULL OR "MenuUrl" = '');
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
                          AND column_name = 'MenuUrl'
                    ) THEN
                        ALTER TABLE "Objects" DROP COLUMN "MenuUrl";
                    END IF;
                END $$;
                """);
        }
    }
}
