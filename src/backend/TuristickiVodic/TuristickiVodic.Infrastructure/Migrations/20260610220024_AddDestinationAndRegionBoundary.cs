using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDestinationAndRegionBoundary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Geometry>(
                name: "Boundary",
                table: "Regions",
                type: "geometry",
                nullable: true);

            migrationBuilder.AddColumn<Geometry>(
                name: "Boundary",
                table: "Destinations",
                type: "geometry",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Regions_Boundary",
                table: "Regions",
                column: "Boundary")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_Destinations_Boundary",
                table: "Destinations",
                column: "Boundary")
                .Annotation("Npgsql:IndexMethod", "GIST");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Regions_Boundary",
                table: "Regions");

            migrationBuilder.DropIndex(
                name: "IX_Destinations_Boundary",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "Boundary",
                table: "Regions");

            migrationBuilder.DropColumn(
                name: "Boundary",
                table: "Destinations");
        }
    }
}
