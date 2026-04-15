using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260415223000_BackfillTouristObjectRatings")]
    public class BackfillTouristObjectRatings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Objects" o
                SET
                    "AverageRating" = COALESCE((
                        SELECT ROUND(AVG(r."Rating")::numeric, 2)
                        FROM "Reviews" r
                        WHERE r."ObjectId" = o."Id"
                          AND r."Status" = 'Approved'
                    ), 0),
                    "ReviewCount" = (
                        SELECT COUNT(*)
                        FROM "Reviews" r
                        WHERE r."ObjectId" = o."Id"
                          AND r."Status" = 'Approved'
                    );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
