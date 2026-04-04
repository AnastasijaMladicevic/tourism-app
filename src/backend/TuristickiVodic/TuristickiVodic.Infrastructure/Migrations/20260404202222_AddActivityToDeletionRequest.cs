using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityToDeletionRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests");

            migrationBuilder.AddColumn<int>(
                name: "ActivityId",
                table: "DeletionRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeletionRequests_ActivityId",
                table: "DeletionRequests",
                column: "ActivityId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"EventId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_DeletionRequests_Activities_ActivityId",
                table: "DeletionRequests",
                column: "ActivityId",
                principalTable: "Activities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeletionRequests_Activities_ActivityId",
                table: "DeletionRequests");

            migrationBuilder.DropIndex(
                name: "IX_DeletionRequests_ActivityId",
                table: "DeletionRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests");

            migrationBuilder.DropColumn(
                name: "ActivityId",
                table: "DeletionRequests");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"EventId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");
        }
    }
}
