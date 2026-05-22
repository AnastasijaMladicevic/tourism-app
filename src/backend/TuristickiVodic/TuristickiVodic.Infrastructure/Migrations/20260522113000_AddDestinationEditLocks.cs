using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    public partial class AddDestinationEditLocks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EditLockAcquiredAtUtc",
                table: "Destinations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EditLockExpiresAtUtc",
                table: "Destinations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EditLockedByUserId",
                table: "Destinations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Destinations_EditLockExpiresAtUtc",
                table: "Destinations",
                column: "EditLockExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Destinations_EditLockedByUserId",
                table: "Destinations",
                column: "EditLockedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Destinations_Users_EditLockedByUserId",
                table: "Destinations",
                column: "EditLockedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Destinations_Users_EditLockedByUserId",
                table: "Destinations");

            migrationBuilder.DropIndex(
                name: "IX_Destinations_EditLockExpiresAtUtc",
                table: "Destinations");

            migrationBuilder.DropIndex(
                name: "IX_Destinations_EditLockedByUserId",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "EditLockAcquiredAtUtc",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "EditLockExpiresAtUtc",
                table: "Destinations");

            migrationBuilder.DropColumn(
                name: "EditLockedByUserId",
                table: "Destinations");
        }
    }
}
