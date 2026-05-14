using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260514093000_AddCreatorRoleRequestStatus")]
    public partial class AddCreatorRoleRequestStatus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatorRoleRequestStatus",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "None");

            migrationBuilder.Sql("""
                UPDATE "Users"
                SET "CreatorRoleRequestStatus" = 'Pending'
                WHERE "HasRequestedCreatorRole" = TRUE;
                """);

            migrationBuilder.Sql("""
                UPDATE "Users" AS u
                SET "CreatorRoleRequestStatus" = 'Approved'
                FROM "Roles" AS r
                WHERE u."RoleId" = r."Id"
                  AND r."Name" = 'ContentCreator'
                  AND u."CreatorRoleRequestStatus" = 'None';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatorRoleRequestStatus",
                table: "Users");
        }
    }
}
