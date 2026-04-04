using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Activities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "Activities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Activities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Activities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Activities_ApprovedByUserId",
                table: "Activities",
                column: "ApprovedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Users_ApprovedByUserId",
                table: "Activities",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Users_ApprovedByUserId",
                table: "Activities");

            migrationBuilder.DropIndex(
                name: "IX_Activities_ApprovedByUserId",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Activities");
        }
    }
}
