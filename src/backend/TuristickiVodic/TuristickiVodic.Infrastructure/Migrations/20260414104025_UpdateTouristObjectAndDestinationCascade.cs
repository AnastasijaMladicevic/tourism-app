using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTouristObjectAndDestinationCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects");

            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects");

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects",
                column: "DestinationId",
                principalTable: "Destinations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects");

            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects");

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects",
                column: "DestinationId",
                principalTable: "Destinations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
