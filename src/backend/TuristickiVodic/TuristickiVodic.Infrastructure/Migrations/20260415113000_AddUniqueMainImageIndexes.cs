using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    public partial class AddUniqueMainImageIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }
    }
}
