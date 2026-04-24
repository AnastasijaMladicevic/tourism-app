using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    public partial class SyncDisplayTitleSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Activities'
                          AND column_name = 'DisplayTitle'
                    ) THEN
                        ALTER TABLE "Activities" DROP COLUMN "DisplayTitle";
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Destinations'
                          AND column_name = 'DisplayTitle'
                    ) THEN
                        ALTER TABLE "Destinations"
                        ADD COLUMN "DisplayTitle" character varying(250);
                    END IF;
                END $$;
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
                          AND table_name = 'Destinations'
                          AND column_name = 'DisplayTitle'
                    ) THEN
                        ALTER TABLE "Destinations" DROP COLUMN "DisplayTitle";
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Activities'
                          AND column_name = 'DisplayTitle'
                    ) THEN
                        ALTER TABLE "Activities"
                        ADD COLUMN "DisplayTitle" character varying(250);
                    END IF;
                END $$;
                """);
        }
    }
}
