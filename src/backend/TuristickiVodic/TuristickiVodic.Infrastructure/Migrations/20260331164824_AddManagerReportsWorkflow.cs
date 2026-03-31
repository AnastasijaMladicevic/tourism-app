using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManagerReportsWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ManagerReports_ReportedUserId",
                table: "ManagerReports");

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "ManagerReports",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManagerReports_ReportedUserId",
                table: "ManagerReports",
                column: "ReportedUserId",
                unique: true,
                filter: "\"Status\" = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ManagerReports_ReportedUserId",
                table: "ManagerReports");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "ManagerReports");

            migrationBuilder.CreateIndex(
                name: "IX_ManagerReports_ReportedUserId",
                table: "ManagerReports",
                column: "ReportedUserId");
        }
    }
}
