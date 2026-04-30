using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260430190000_BackfillCreatorOwnershipByRole")]
    public class BackfillCreatorOwnershipByRole : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH role_assignments AS (
                    SELECT *
                    FROM (VALUES
                        ('ME', 'admin@spirego.com', 'ana@spirego.com'),
                        ('ES', 'lucia.admin@spirego.com', 'carmen.creator@spirego.com'),
                        ('IT', 'giulia.admin@spirego.com', 'lorenzo.creator@spirego.com'),
                        ('RS', 'milica.admin.serbia@spirego.com', 'jelena.creator@spirego.com')
                    ) AS map(region_code, admin_email, creator_email)
                ),
                destination_regions AS (
                    SELECT
                        d."Id" AS destination_id,
                        COALESCE(
                            r."Code",
                            CASE
                                WHEN d."Name" IN (
                                    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
                                    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo',
                                    'Lovcen', 'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav'
                                ) THEN 'ME'
                                ELSE NULL
                            END
                        ) AS region_code,
                        d."ManagedByUserId" AS manager_user_id
                    FROM "Destinations" d
                    LEFT JOIN "Regions" r ON r."Id" = d."RegionId"
                ),
                destination_ownership AS (
                    SELECT
                        dr.destination_id,
                        dr.manager_user_id,
                        admin_user."Id" AS admin_user_id,
                        creator_user."Id" AS creator_user_id
                    FROM destination_regions dr
                    JOIN role_assignments ra ON ra.region_code = dr.region_code
                    JOIN "Users" admin_user ON admin_user."Email" = ra.admin_email
                    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
                )
                UPDATE "Destinations" d
                SET "CreatedByUserId" = ownership.admin_user_id,
                    "UpdatedAt" = NOW()
                FROM destination_ownership ownership
                WHERE d."Id" = ownership.destination_id
                  AND d."CreatedByUserId" IS DISTINCT FROM ownership.admin_user_id;

                WITH destination_ownership AS (
                    SELECT d."Id" AS destination_id, d."ManagedByUserId" AS manager_user_id
                    FROM "Destinations" d
                    WHERE d."ManagedByUserId" IS NOT NULL
                )
                UPDATE "Localities" l
                SET "CreatedByUserId" = ownership.manager_user_id,
                    "UpdatedAt" = NOW()
                FROM destination_ownership ownership
                WHERE l."DestinationId" = ownership.destination_id
                  AND l."CreatedByUserId" IS DISTINCT FROM ownership.manager_user_id;

                UPDATE "Objects" o
                SET "DestinationId" = l."DestinationId"
                FROM "Localities" l
                WHERE o."LocalityId" = l."Id"
                  AND o."DestinationId" IS DISTINCT FROM l."DestinationId";

                UPDATE "Activities" a
                SET "DestinationId" = l."DestinationId"
                FROM "Localities" l
                WHERE a."LocalityId" = l."Id"
                  AND a."DestinationId" IS DISTINCT FROM l."DestinationId";

                UPDATE "Events" e
                SET "DestinationId" = l."DestinationId"
                FROM "Localities" l
                WHERE e."LocalityId" = l."Id"
                  AND e."DestinationId" IS DISTINCT FROM l."DestinationId";

                WITH role_assignments AS (
                    SELECT *
                    FROM (VALUES
                        ('ME', 'ana@spirego.com'),
                        ('ES', 'carmen.creator@spirego.com'),
                        ('IT', 'lorenzo.creator@spirego.com'),
                        ('RS', 'jelena.creator@spirego.com')
                    ) AS map(region_code, creator_email)
                ),
                destination_regions AS (
                    SELECT
                        d."Id" AS destination_id,
                        COALESCE(
                            r."Code",
                            CASE
                                WHEN d."Name" IN (
                                    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
                                    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo',
                                    'Lovcen', 'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav'
                                ) THEN 'ME'
                                ELSE NULL
                            END
                        ) AS region_code,
                        d."ManagedByUserId" AS manager_user_id
                    FROM "Destinations" d
                    LEFT JOIN "Regions" r ON r."Id" = d."RegionId"
                ),
                destination_content AS (
                    SELECT
                        dr.destination_id,
                        dr.manager_user_id,
                        creator_user."Id" AS creator_user_id
                    FROM destination_regions dr
                    JOIN role_assignments ra ON ra.region_code = dr.region_code
                    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
                )
                UPDATE "Objects" o
                SET "CreatedByUserId" = content.creator_user_id,
                    "ApprovedByUserId" = content.manager_user_id,
                    "ApprovedAt" = CASE
                        WHEN o."Status"::text IN ('Approved', '1') THEN COALESCE(o."ApprovedAt", NOW())
                        ELSE o."ApprovedAt"
                    END,
                    "UpdatedAt" = NOW()
                FROM destination_content content
                WHERE o."DestinationId" = content.destination_id
                  AND (
                        o."CreatedByUserId" IS DISTINCT FROM content.creator_user_id
                     OR o."ApprovedByUserId" IS DISTINCT FROM content.manager_user_id
                     OR (o."Status"::text IN ('Approved', '1') AND o."ApprovedAt" IS NULL)
                  );

                WITH role_assignments AS (
                    SELECT *
                    FROM (VALUES
                        ('ME', 'ana@spirego.com'),
                        ('ES', 'carmen.creator@spirego.com'),
                        ('IT', 'lorenzo.creator@spirego.com'),
                        ('RS', 'jelena.creator@spirego.com')
                    ) AS map(region_code, creator_email)
                ),
                destination_regions AS (
                    SELECT
                        d."Id" AS destination_id,
                        COALESCE(
                            r."Code",
                            CASE
                                WHEN d."Name" IN (
                                    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
                                    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo',
                                    'Lovcen', 'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav'
                                ) THEN 'ME'
                                ELSE NULL
                            END
                        ) AS region_code,
                        d."ManagedByUserId" AS manager_user_id
                    FROM "Destinations" d
                    LEFT JOIN "Regions" r ON r."Id" = d."RegionId"
                ),
                destination_content AS (
                    SELECT
                        dr.destination_id,
                        dr.manager_user_id,
                        creator_user."Id" AS creator_user_id
                    FROM destination_regions dr
                    JOIN role_assignments ra ON ra.region_code = dr.region_code
                    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
                )
                UPDATE "Activities" a
                SET "CreatedByUserId" = content.creator_user_id,
                    "ApprovedByUserId" = content.manager_user_id,
                    "ApprovedAt" = CASE
                        WHEN a."Status"::text IN ('Approved', '1') THEN COALESCE(a."ApprovedAt", NOW())
                        ELSE a."ApprovedAt"
                    END,
                    "UpdatedAt" = NOW()
                FROM destination_content content
                WHERE a."DestinationId" = content.destination_id
                  AND (
                        a."CreatedByUserId" IS DISTINCT FROM content.creator_user_id
                     OR a."ApprovedByUserId" IS DISTINCT FROM content.manager_user_id
                     OR (a."Status"::text IN ('Approved', '1') AND a."ApprovedAt" IS NULL)
                  );

                WITH role_assignments AS (
                    SELECT *
                    FROM (VALUES
                        ('ME', 'ana@spirego.com'),
                        ('ES', 'carmen.creator@spirego.com'),
                        ('IT', 'lorenzo.creator@spirego.com'),
                        ('RS', 'jelena.creator@spirego.com')
                    ) AS map(region_code, creator_email)
                ),
                destination_regions AS (
                    SELECT
                        d."Id" AS destination_id,
                        COALESCE(
                            r."Code",
                            CASE
                                WHEN d."Name" IN (
                                    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
                                    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo',
                                    'Lovcen', 'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav'
                                ) THEN 'ME'
                                ELSE NULL
                            END
                        ) AS region_code,
                        d."ManagedByUserId" AS manager_user_id
                    FROM "Destinations" d
                    LEFT JOIN "Regions" r ON r."Id" = d."RegionId"
                ),
                destination_content AS (
                    SELECT
                        dr.destination_id,
                        dr.manager_user_id,
                        creator_user."Id" AS creator_user_id
                    FROM destination_regions dr
                    JOIN role_assignments ra ON ra.region_code = dr.region_code
                    JOIN "Users" creator_user ON creator_user."Email" = ra.creator_email
                )
                UPDATE "Events" e
                SET "CreatedByUserId" = content.creator_user_id,
                    "ApprovedByUserId" = content.manager_user_id,
                    "ApprovedAt" = CASE
                        WHEN e."Status"::text IN ('Approved', '1') THEN COALESCE(e."ApprovedAt", NOW())
                        ELSE e."ApprovedAt"
                    END,
                    "UpdatedAt" = NOW()
                FROM destination_content content
                WHERE e."DestinationId" = content.destination_id
                  AND (
                        e."CreatedByUserId" IS DISTINCT FROM content.creator_user_id
                     OR e."ApprovedByUserId" IS DISTINCT FROM content.manager_user_id
                     OR (e."Status"::text IN ('Approved', '1') AND e."ApprovedAt" IS NULL)
                  );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
