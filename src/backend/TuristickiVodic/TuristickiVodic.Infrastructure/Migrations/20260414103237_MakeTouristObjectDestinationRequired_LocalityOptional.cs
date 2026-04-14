using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeTouristObjectDestinationRequired_LocalityOptional : Migration
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

            migrationBuilder.AlterColumn<int>(
                name: "LocalityId",
                table: "Objects",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "DestinationId",
                table: "Objects",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects");

            migrationBuilder.DropForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects");

            migrationBuilder.AlterColumn<int>(
                name: "LocalityId",
                table: "Objects",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DestinationId",
                table: "Objects",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Destinations_DestinationId",
                table: "Objects",
                column: "DestinationId",
                principalTable: "Destinations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Objects_Localities_LocalityId",
                table: "Objects",
                column: "LocalityId",
                principalTable: "Localities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
