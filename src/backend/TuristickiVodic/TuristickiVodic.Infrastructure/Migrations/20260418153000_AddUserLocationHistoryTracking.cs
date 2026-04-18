using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260418153000_AddUserLocationHistoryTracking")]
    public class AddUserLocationHistoryTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserLocationHistories",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Location = table.Column<Point>(type: "geometry", nullable: false),
                    AccuracyMeters = table.Column<double>(type: "double precision", nullable: true),
                    SpeedMetersPerSecond = table.Column<double>(type: "double precision", nullable: true),
                    HeadingDegrees = table.Column<double>(type: "double precision", nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLocationHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserLocationHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserLocationHistories_Location",
                table: "UserLocationHistories",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_UserLocationHistories_UserId_RecordedAt",
                table: "UserLocationHistories",
                columns: new[] { "UserId", "RecordedAt" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserLocationHistories");
        }
    }
}
