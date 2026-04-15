using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Images_ActivityId",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_DestinationId",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_EventId",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_LocalityId",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_ObjectId",
                table: "Images");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Images_ActivityId",
                table: "Images",
                column: "ActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_Images_DestinationId",
                table: "Images",
                column: "DestinationId");

            migrationBuilder.CreateIndex(
                name: "IX_Images_EventId",
                table: "Images",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_Images_LocalityId",
                table: "Images",
                column: "LocalityId");

            migrationBuilder.CreateIndex(
                name: "IX_Images_ObjectId",
                table: "Images",
                column: "ObjectId");
        }
    }
}
