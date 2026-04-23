using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    public partial class AddRegionsAndUserPreferredRegion : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Regions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CenterLongitude = table.Column<double>(type: "double precision", nullable: true),
                    CenterLatitude = table.Column<double>(type: "double precision", nullable: true),
                    DefaultMapZoom = table.Column<double>(type: "double precision", nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Regions", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Regions",
                columns: new[]
                {
                    "Id", "Name", "Code", "Description", "CenterLongitude", "CenterLatitude",
                    "DefaultMapZoom", "IsDefault", "IsActive", "CreatedAt", "UpdatedAt"
                },
                values: new object[,]
                {
                    {
                        1, "Crna Gora", "ME", "Podrazumevani region aplikacije.",
                        19.3744, 42.7087, 8.0, true, true,
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc),
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc)
                    },
                    {
                        2, "Srbija", "RS", "Region za sadržaj iz Srbije.",
                        21.0059, 44.0165, 7.0, false, true,
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc),
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc)
                    },
                    {
                        3, "Spanija", "ES", "Region za sadrzaj iz Spanije.",
                        -3.7492, 40.4637, 6.0, false, true,
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc),
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc)
                    },
                    {
                        4, "Italija", "IT", "Region za sadržaj iz Italije.",
                        12.5674, 41.8719, 6.0, false, true,
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc),
                        new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc)
                    }
                });

            migrationBuilder.Sql(
                """
                SELECT setval(
                    pg_get_serial_sequence('"Regions"', 'Id'),
                    COALESCE((SELECT MAX("Id") FROM "Regions"), 1),
                    true);
                """);

            migrationBuilder.AddColumn<int>(
                name: "PreferredRegionId",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RegionId",
                table: "Destinations",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Destinations_RegionId",
                table: "Destinations",
                column: "RegionId");

            migrationBuilder.CreateIndex(
                name: "IX_Regions_Code",
                table: "Regions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Regions_IsDefault",
                table: "Regions",
                column: "IsDefault",
                unique: true,
                filter: "\"IsDefault\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_Regions_Name",
                table: "Regions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_PreferredRegionId",
                table: "Users",
                column: "PreferredRegionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Destinations_Regions_RegionId",
                table: "Destinations",
                column: "RegionId",
                principalTable: "Regions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Regions_PreferredRegionId",
                table: "Users",
                column: "PreferredRegionId",
                principalTable: "Regions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Destinations_Regions_RegionId",
                table: "Destinations");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Regions_PreferredRegionId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Destinations_RegionId",
                table: "Destinations");

            migrationBuilder.DropIndex(
                name: "IX_Users_PreferredRegionId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RegionId",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "PreferredRegionId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Regions");
        }
    }
}
