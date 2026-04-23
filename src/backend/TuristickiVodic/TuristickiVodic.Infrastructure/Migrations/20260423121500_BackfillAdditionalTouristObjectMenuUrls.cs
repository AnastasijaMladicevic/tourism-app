using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260423121500_BackfillAdditionalTouristObjectMenuUrls")]
    public class BackfillAdditionalTouristObjectMenuUrls : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = 'https://www.avalaresort.com/explore'
                WHERE "Name" = 'Hotel Avala'
                  AND ("MenuUrl" IS NULL OR "MenuUrl" = '');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = 'https://www.tripadvisor.com/Restaurant_Review-g12596460-d4115622-Reviews-Restoran_Jezero-Vranjina_Podgorica_Municipality.html'
                WHERE "Name" = 'Restoran Jezero'
                  AND ("MenuUrl" IS NULL OR "MenuUrl" = '');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = 'https://www.biancaresort.com/explore'
                WHERE "Name" = 'Hotel Bianca Kolasin'
                  AND ("MenuUrl" IS NULL OR "MenuUrl" = '');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Objects"
                SET "MenuUrl" = NULL
                WHERE ("Name" = 'Hotel Avala' AND "MenuUrl" = 'https://www.avalaresort.com/explore')
                   OR ("Name" = 'Restoran Jezero' AND "MenuUrl" = 'https://www.tripadvisor.com/Restaurant_Review-g12596460-d4115622-Reviews-Restoran_Jezero-Vranjina_Podgorica_Municipality.html')
                   OR ("Name" = 'Hotel Bianca Kolasin' AND "MenuUrl" = 'https://www.biancaresort.com/explore');
                """);
        }
    }
}
