using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260418093000_AddUserLocationTracking")]
    public class AddUserLocationTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "LastLocationAccuracyMeters",
                table: "Users",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<Point>(
                name: "LastKnownLocation",
                table: "Users",
                type: "geometry",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLocationUpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_LastKnownLocation",
                table: "Users",
                column: "LastKnownLocation")
                .Annotation("Npgsql:IndexMethod", "GIST");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_LastKnownLocation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLocationAccuracyMeters",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastKnownLocation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLocationUpdatedAt",
                table: "Users");
        }
    }
}
