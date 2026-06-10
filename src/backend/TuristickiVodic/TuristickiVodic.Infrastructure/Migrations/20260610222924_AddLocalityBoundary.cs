using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocalityBoundary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Geometry>(
                name: "Boundary",
                table: "Localities",
                type: "geometry",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Localities_Boundary",
                table: "Localities",
                column: "Boundary")
                .Annotation("Npgsql:IndexMethod", "GIST");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Localities_Boundary",
                table: "Localities");

            migrationBuilder.DropColumn(
                name: "Boundary",
                table: "Localities");
        }
    }
}
