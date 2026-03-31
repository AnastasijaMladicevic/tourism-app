using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationToFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId",
                table: "Favorites");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites");

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "Favorites",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_LocationId",
                table: "Favorites",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_ActivityId",
                table: "Favorites",
                columns: new[] { "UserId", "ActivityId" },
                unique: true,
                filter: "\"ActivityId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_DestinationId",
                table: "Favorites",
                columns: new[] { "UserId", "DestinationId" },
                unique: true,
                filter: "\"DestinationId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_LocationId",
                table: "Favorites",
                columns: new[] { "UserId", "LocationId" },
                unique: true,
                filter: "\"LocationId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_ObjectId",
                table: "Favorites",
                columns: new[] { "UserId", "ObjectId" },
                unique: true,
                filter: "\"ObjectId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_RouteId",
                table: "Favorites",
                columns: new[] { "UserId", "RouteId" },
                unique: true,
                filter: "\"RouteId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"RouteId\" IS NOT NULL THEN 1 ELSE 0 END +\r\n                   CASE WHEN \"LocationId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_Favorites_Locations_LocationId",
                table: "Favorites",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Favorites_Locations_LocationId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_LocationId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_ActivityId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_DestinationId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_LocationId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_ObjectId",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_RouteId",
                table: "Favorites");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "Favorites");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId",
                table: "Favorites",
                column: "UserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Favorite_OnlyOne",
                table: "Favorites",
                sql: "(CASE WHEN \"ObjectId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"ActivityId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"DestinationId\" IS NOT NULL THEN 1 ELSE 0 END +\n                   CASE WHEN \"RouteId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");
        }
    }
}
