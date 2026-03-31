using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEventDeletionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DeletionRequests_ObjectId",
                table: "DeletionRequests");

            migrationBuilder.AlterColumn<int>(
                name: "ObjectId",
                table: "DeletionRequests",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "EventId",
                table: "DeletionRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeletionRequests_EventId",
                table: "DeletionRequests",
                column: "EventId",
                unique: true,
                filter: "\"EventId\" IS NOT NULL AND \"Status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_DeletionRequests_ObjectId",
                table: "DeletionRequests",
                column: "ObjectId",
                unique: true,
                filter: "\"ObjectId\" IS NOT NULL AND \"Status\" = 'Pending'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"EventId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_DeletionRequests_Events_EventId",
                table: "DeletionRequests",
                column: "EventId",
                principalTable: "Events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeletionRequests_Events_EventId",
                table: "DeletionRequests");

            migrationBuilder.DropIndex(
                name: "IX_DeletionRequests_EventId",
                table: "DeletionRequests");

            migrationBuilder.DropIndex(
                name: "IX_DeletionRequests_ObjectId",
                table: "DeletionRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletionRequest_OnlyOne",
                table: "DeletionRequests");

            migrationBuilder.DropColumn(
                name: "EventId",
                table: "DeletionRequests");

            migrationBuilder.AlterColumn<int>(
                name: "ObjectId",
                table: "DeletionRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeletionRequests_ObjectId",
                table: "DeletionRequests",
                column: "ObjectId",
                unique: true,
                filter: "\"Status\" = 'Pending'");
        }
    }
}
