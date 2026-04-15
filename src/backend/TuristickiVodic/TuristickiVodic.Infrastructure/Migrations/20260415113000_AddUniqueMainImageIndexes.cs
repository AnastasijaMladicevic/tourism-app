using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    public partial class AddUniqueMainImageIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Destinations_Users_ManagedByUserId",
                table: "Destinations");

            migrationBuilder.AddColumn<string[]>(
                name: "Amenities",
                table: "Objects",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Objects",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Destinations_Users_ManagedByUserId",
                table: "Destinations",
                column: "ManagedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "IX_DeletionRequests_ActivityId",
                table: "DeletionRequests",
                column: "ActivityId",
                unique: true,
                filter: "\"ActivityId\" IS NOT NULL AND \"Status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_Images_ActivityId_IsMain_MainUnique",
                table: "Images",
                columns: new[] { "ActivityId", "IsMain" },
                unique: true,
                filter: "\"ActivityId\" IS NOT NULL AND \"IsMain\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_Images_DestinationId_IsMain_MainUnique",
                table: "Images",
                columns: new[] { "DestinationId", "IsMain" },
                unique: true,
                filter: "\"DestinationId\" IS NOT NULL AND \"IsMain\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_Images_EventId_IsMain_MainUnique",
                table: "Images",
                columns: new[] { "EventId", "IsMain" },
                unique: true,
                filter: "\"EventId\" IS NOT NULL AND \"IsMain\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_Images_LocalityId_IsMain_MainUnique",
                table: "Images",
                columns: new[] { "LocalityId", "IsMain" },
                unique: true,
                filter: "\"LocalityId\" IS NOT NULL AND \"IsMain\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_Images_ObjectId_IsMain_MainUnique",
                table: "Images",
                columns: new[] { "ObjectId", "IsMain" },
                unique: true,
                filter: "\"ObjectId\" IS NOT NULL AND \"IsMain\" = TRUE");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Destinations_Users_ManagedByUserId",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "Amenities",
                table: "Objects");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Objects");

            migrationBuilder.DropIndex(
                name: "IX_DeletionRequests_ActivityId",
                table: "DeletionRequests");

            migrationBuilder.DropIndex(
                name: "IX_Images_ActivityId_IsMain_MainUnique",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_DestinationId_IsMain_MainUnique",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_EventId_IsMain_MainUnique",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_LocalityId_IsMain_MainUnique",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_ObjectId_IsMain_MainUnique",
                table: "Images");

            migrationBuilder.AddForeignKey(
                name: "FK_Destinations_Users_ManagedByUserId",
                table: "Destinations",
                column: "ManagedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
