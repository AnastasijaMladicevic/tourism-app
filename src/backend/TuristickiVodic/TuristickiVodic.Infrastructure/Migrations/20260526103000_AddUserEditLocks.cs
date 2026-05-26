using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260526103000_AddUserEditLocks")]
    public class AddUserEditLocks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "EditLockedByUserId" integer NULL;
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "EditLockAcquiredAtUtc" timestamp with time zone NULL;
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "EditLockExpiresAtUtc" timestamp with time zone NULL;
                """);

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_Users_EditLockExpiresAtUtc"
                ON "Users" ("EditLockExpiresAtUtc");
                CREATE INDEX IF NOT EXISTS "IX_Users_EditLockedByUserId"
                ON "Users" ("EditLockedByUserId");
                """);

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_Users_Users_EditLockedByUserId'
                    ) THEN
                        ALTER TABLE "Users"
                        ADD CONSTRAINT "FK_Users_Users_EditLockedByUserId"
                        FOREIGN KEY ("EditLockedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "EditLockedByUserId" = NULL,
                    "EditLockAcquiredAtUtc" = NULL,
                    "EditLockExpiresAtUtc" = NULL
                WHERE "EditLockExpiresAtUtc" IS NOT NULL
                  AND "EditLockExpiresAtUtc" < NOW();
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Namerno bez destruktivnog down-a.
        }
    }
}
