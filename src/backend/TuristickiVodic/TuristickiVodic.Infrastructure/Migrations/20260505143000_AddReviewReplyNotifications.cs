using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260505143000_AddReviewReplyNotifications")]
    public partial class AddReviewReplyNotifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReviewId",
                table: "Notifications",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ReviewId",
                table: "Notifications",
                column: "ReviewId");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Reviews_ReviewId",
                table: "Notifications",
                column: "ReviewId",
                principalTable: "Reviews",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Reviews_ReviewId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_ReviewId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ReviewId",
                table: "Notifications");
        }
    }
}
