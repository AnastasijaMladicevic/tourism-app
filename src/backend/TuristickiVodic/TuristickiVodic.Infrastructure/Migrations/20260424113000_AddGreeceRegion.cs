using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260424113000_AddGreeceRegion")]
    public class AddGreeceRegion : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Code" = 'ME' OR "Name" = 'Crna Gora'
                    ) THEN
                        UPDATE "Regions"
                        SET
                            "Name" = 'Crna Gora',
                            "Code" = 'ME',
                            "Description" = 'Podrazumevani region aplikacije.',
                            "CenterLongitude" = 19.3744,
                            "CenterLatitude" = 42.7087,
                            "DefaultMapZoom" = 8.0,
                            "IsDefault" = TRUE,
                            "IsActive" = TRUE,
                            "UpdatedAt" = TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        WHERE "Code" = 'ME' OR "Name" = 'Crna Gora';
                    ELSE
                        INSERT INTO "Regions" (
                            "Id",
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            1,
                            'Crna Gora',
                            'ME',
                            'Podrazumevani region aplikacije.',
                            19.3744,
                            42.7087,
                            8.0,
                            TRUE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-23 17:45:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Code" = 'RS' OR "Name" = 'Srbija'
                    ) THEN
                        UPDATE "Regions"
                        SET
                            "Name" = 'Srbija',
                            "Code" = 'RS',
                            "Description" = 'Region za sadrzaj iz Srbije.',
                            "CenterLongitude" = 21.0059,
                            "CenterLatitude" = 44.0165,
                            "DefaultMapZoom" = 7.0,
                            "IsDefault" = FALSE,
                            "IsActive" = TRUE,
                            "UpdatedAt" = TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        WHERE "Code" = 'RS' OR "Name" = 'Srbija';
                    ELSE
                        INSERT INTO "Regions" (
                            "Id",
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            2,
                            'Srbija',
                            'RS',
                            'Region za sadrzaj iz Srbije.',
                            21.0059,
                            44.0165,
                            7.0,
                            FALSE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-23 17:45:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Code" = 'ES' OR "Name" = 'Spanija'
                    ) THEN
                        UPDATE "Regions"
                        SET
                            "Name" = 'Spanija',
                            "Code" = 'ES',
                            "Description" = 'Region za sadrzaj iz Spanije.',
                            "CenterLongitude" = -3.7492,
                            "CenterLatitude" = 40.4637,
                            "DefaultMapZoom" = 6.0,
                            "IsDefault" = FALSE,
                            "IsActive" = TRUE,
                            "UpdatedAt" = TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        WHERE "Code" = 'ES' OR "Name" = 'Spanija';
                    ELSE
                        INSERT INTO "Regions" (
                            "Id",
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            3,
                            'Spanija',
                            'ES',
                            'Region za sadrzaj iz Spanije.',
                            -3.7492,
                            40.4637,
                            6.0,
                            FALSE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-23 17:45:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Code" = 'IT' OR "Name" = 'Italija'
                    ) THEN
                        UPDATE "Regions"
                        SET
                            "Name" = 'Italija',
                            "Code" = 'IT',
                            "Description" = 'Region za sadrzaj iz Italije.',
                            "CenterLongitude" = 12.5674,
                            "CenterLatitude" = 41.8719,
                            "DefaultMapZoom" = 6.0,
                            "IsDefault" = FALSE,
                            "IsActive" = TRUE,
                            "UpdatedAt" = TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        WHERE "Code" = 'IT' OR "Name" = 'Italija';
                    ELSE
                        INSERT INTO "Regions" (
                            "Id",
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            4,
                            'Italija',
                            'IT',
                            'Region za sadrzaj iz Italije.',
                            12.5674,
                            41.8719,
                            6.0,
                            FALSE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-23 17:45:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Code" = 'GR' OR "Name" = 'Grcka'
                    ) THEN
                        UPDATE "Regions"
                        SET
                            "Name" = 'Grcka',
                            "Code" = 'GR',
                            "Description" = 'Region za sadrzaj iz Grcke.',
                            "CenterLongitude" = 21.8243,
                            "CenterLatitude" = 39.0742,
                            "DefaultMapZoom" = 6.0,
                            "IsDefault" = FALSE,
                            "IsActive" = TRUE,
                            "UpdatedAt" = TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        WHERE "Code" = 'GR' OR "Name" = 'Grcka';
                    ELSIF EXISTS (
                        SELECT 1
                        FROM "Regions"
                        WHERE "Id" = 5
                    ) THEN
                        INSERT INTO "Regions" (
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            'Grcka',
                            'GR',
                            'Region za sadrzaj iz Grcke.',
                            21.8243,
                            39.0742,
                            6.0,
                            FALSE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-24 11:30:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    ELSE
                        INSERT INTO "Regions" (
                            "Id",
                            "Name",
                            "Code",
                            "Description",
                            "CenterLongitude",
                            "CenterLatitude",
                            "DefaultMapZoom",
                            "IsDefault",
                            "IsActive",
                            "CreatedAt",
                            "UpdatedAt"
                        )
                        VALUES (
                            5,
                            'Grcka',
                            'GR',
                            'Region za sadrzaj iz Grcke.',
                            21.8243,
                            39.0742,
                            6.0,
                            FALSE,
                            TRUE,
                            TIMESTAMPTZ '2026-04-24 11:30:00Z',
                            TIMESTAMPTZ '2026-04-24 11:30:00Z'
                        );
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                SELECT setval(
                    pg_get_serial_sequence('"Regions"', 'Id'),
                    COALESCE((SELECT MAX("Id") FROM "Regions"), 1),
                    true);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM "Regions"
                WHERE "Id" = 5
                  AND "Code" = 'GR'
                  AND "Name" = 'Grcka';
                """);
        }
    }
}
