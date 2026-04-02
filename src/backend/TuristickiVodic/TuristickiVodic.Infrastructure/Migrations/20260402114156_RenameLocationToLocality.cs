using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameLocationToLocality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Locations_LocationId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_Events_Locations_LocationId",
                table: "Events");

            migrationBuilder.DropForeignKey(
                name: "FK_Favorites_Locations_LocationId",
                table: "Favorites");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_Locations_LocationId",
                table: "Images");

            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Locations_LocationId",
                table: "Objects");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "LocationTypes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Image_OnlyOne",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_LocationId",
                table: "Favorites");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Objects",
                newName: "LocalityId");

            migrationBuilder.RenameIndex(
                name: "IX_Objects_LocationId",
                table: "Objects",
                newName: "IX_Objects_LocalityId");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Images",
                newName: "LocalityId");

            migrationBuilder.RenameIndex(
                name: "IX_Images_LocationId",
                table: "Images",
                newName: "IX_Images_LocalityId");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Favorites",
                newName: "LocalityId");

            migrationBuilder.RenameIndex(
                name: "IX_Favorites_LocationId",
                table: "Favorites",
                newName: "IX_Favorites_LocalityId");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Events",
                newName: "LocalityId");

            migrationBuilder.RenameIndex(
                name: "IX_Events_LocationId",
                table: "Events",
                newName: "IX_Events_LocalityId");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Activities",
                newName: "LocalityId");

            migrationBuilder.RenameIndex(
                name: "IX_Activities_LocationId",
                table: "Activities",
                newName: "IX_Activities_LocalityId");

            migrationBuilder.CreateTable(
                name: "LocalityTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocalityTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Localities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Geolocation = table.Column<Point>(type: "geometry", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DestinationId = table.Column<int>(type: "integer", nullable: false),
                    LocalityTypeId = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Localities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Localities_Destinations_DestinationId",
                        column: x => x.DestinationId,
                        principalTable: "Destinations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Localities_LocalityTypes_LocalityTypeId",
                        column: x => x.LocalityTypeId,
                        principalTable: "LocalityTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Localities_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Image_OnlyOne",
                table: "Images",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"EventId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"LocalityId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_LocalityId",
                table: "Favorites",
                columns: new[] { "UserId", "LocalityId" },
                unique: true,
                filter: "\"LocalityId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"RouteId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"LocalityId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Localities_CreatedByUserId",
                table: "Localities",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Localities_DestinationId",
                table: "Localities",
                column: "DestinationId");

            migrationBuilder.CreateIndex(
                name: "IX_Localities_Geolocation",
                table: "Localities",
                column: "Geolocation")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_Localities_LocalityTypeId",
                table: "Localities",
                column: "LocalityTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Localities_LocalityId",
                table: "Activities",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Events_Localities_LocalityId",
                table: "Events",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Favorites_Localities_LocalityId",
                table: "Favorites",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Images_Localities_LocalityId",
                table: "Images",
                column: "LocalityId",
                principalTable: "Localities",
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
                name: "FK_Activities_Localities_LocalityId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_Events_Localities_LocalityId",
                table: "Events");

            migrationBuilder.DropForeignKey(
                name: "FK_Favorites_Localities_LocalityId",
                table: "Favorites");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_Localities_LocalityId",
                table: "Images");

            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects");

            migrationBuilder.DropTable(
                name: "Localities");

            migrationBuilder.DropTable(
                name: "LocalityTypes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Image_OnlyOne",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_LocalityId",
                table: "Favorites");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites");

            migrationBuilder.RenameColumn(
                name: "LocalityId",
                table: "Objects",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Objects_LocalityId",
                table: "Objects",
                newName: "IX_Objects_LocationId");

            migrationBuilder.RenameColumn(
                name: "LocalityId",
                table: "Images",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Images_LocalityId",
                table: "Images",
                newName: "IX_Images_LocationId");

            migrationBuilder.RenameColumn(
                name: "LocalityId",
                table: "Favorites",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Favorites_LocalityId",
                table: "Favorites",
                newName: "IX_Favorites_LocationId");

            migrationBuilder.RenameColumn(
                name: "LocalityId",
                table: "Events",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Events_LocalityId",
                table: "Events",
                newName: "IX_Events_LocationId");

            migrationBuilder.RenameColumn(
                name: "LocalityId",
                table: "Activities",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Activities_LocalityId",
                table: "Activities",
                newName: "IX_Activities_LocationId");

            migrationBuilder.CreateTable(
                name: "LocationTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    DestinationId = table.Column<int>(type: "integer", nullable: false),
                    LocationTypeId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Geolocation = table.Column<Point>(type: "geometry", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Destinations_DestinationId",
                        column: x => x.DestinationId,
                        principalTable: "Destinations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Locations_LocationTypes_LocationTypeId",
                        column: x => x.LocationTypeId,
                        principalTable: "LocationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Locations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Image_OnlyOne",
                table: "Images",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"EventId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"LocationId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_LocationId",
                table: "Favorites",
                columns: new[] { "UserId", "LocationId" },
                unique: true,
                filter: "\"LocationId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"RouteId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"LocationId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_CreatedByUserId",
                table: "Locations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_DestinationId",
                table: "Locations",
                column: "DestinationId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Geolocation",
                table: "Locations",
                column: "Geolocation")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_LocationTypeId",
                table: "Locations",
                column: "LocationTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Locations_LocationId",
                table: "Activities",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Events_Locations_LocationId",
                table: "Events",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Favorites_Locations_LocationId",
                table: "Favorites",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Images_Locations_LocationId",
                table: "Images",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Locations_LocationId",
                table: "Objects",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
