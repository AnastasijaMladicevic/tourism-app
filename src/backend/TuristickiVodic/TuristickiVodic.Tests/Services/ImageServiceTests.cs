using AutoMapper;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Mappings;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class ImageServiceTests
    {
        private static AppDbContext CreateContext() =>
            new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        private static IMapper CreateMapper() =>
            new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>())
                .CreateMapper();

        private static TouristObject SeedObject(AppDbContext ctx, int id = 1, int createdByUserId = 5)
        {
            var obj = new TouristObject
            {
                Id = id,
                Name = $"Objekat{id}",
                CreatedByUserId = createdByUserId,
                ObjectTypeId = 1,
                LocalityId = 1
            };
            ctx.Objects.Add(obj);
            ctx.SaveChanges();
            return obj;
        }

        private static Activity SeedActivity(AppDbContext ctx, int id = 1, int createdByUserId = 5)
        {
            var act = new Activity
            {
                Id = id,
                Name = $"Aktivnost{id}",
                CreatedByUserId = createdByUserId,
                ActivityTypeId = 1
            };
            ctx.Activities.Add(act);
            ctx.SaveChanges();
            return act;
        }

        private static Event SeedEvent(AppDbContext ctx, int id = 1, int createdByUserId = 5)
        {
            var ev = new Event
            {
                Id = id,
                Name = $"Event{id}",
                CreatedByUserId = createdByUserId,
                EventTypeId = 1,
                StartDate = DateTime.UtcNow.AddDays(1)
            };
            ctx.Events.Add(ev);
            ctx.SaveChanges();
            return ev;
        }

        private static Destination SeedDestination(AppDbContext ctx, int id = 1, int? managedByUserId = null)
        {
            var dest = new Destination
            {
                Id = id,
                Name = $"Destinacija{id}",
                DestinationTypeId = 1,
                CreatedByUserId = 1,
                ManagedByUserId = managedByUserId
            };
            ctx.Destinations.Add(dest);
            ctx.SaveChanges();
            return dest;
        }

        private static Locality SeedLocality(AppDbContext ctx, int id = 1, int destinationId = 1)
        {
            var loc = new Locality
            {
                Id = id,
                Name = $"Lokalitet{id}",
                DestinationId = destinationId,
                LocalityTypeId = 1
            };
            ctx.Localities.Add(loc);
            ctx.SaveChanges();
            return loc;
        }

        private static Image SeedImage(AppDbContext ctx, bool isMain,
            int? objectId = null, int? activityId = null, int? eventId = null,
            int? destinationId = null, int? localityId = null)
        {
            var img = new Image
            {
                Url = $"https://img/{Guid.NewGuid()}.jpg",
                IsMain = isMain,
                ObjectId = objectId,
                ActivityId = activityId,
                EventId = eventId,
                DestinationId = destinationId,
                LocalityId = localityId,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Images.Add(img);
            ctx.SaveChanges();
            return img;
        }

        [Fact]
        public async Task GetByIdAsync_KadSlikaPostoji_VracaDto()
        {
            using var ctx = CreateContext();
            var img = SeedImage(ctx, isMain: true, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.GetByIdAsync(img.Id);

            result.Should().NotBeNull();
            result!.Url.Should().Be(img.Url);
            result.IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task AddToObjectAsync_PrvaSlika_IsMainTrue_Uspeh()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, createdByUserId: 5);
            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.AddToObjectAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 5, "ContentCreator");

            result.IsMain.Should().BeTrue();
            result.ObjectId.Should().Be(1);
        }

        [Fact]
        public async Task AddToObjectAsync_TudjiObjekat_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, createdByUserId: 99);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToObjectAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AddToActivityAsync_TudjaAktivnost_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedActivity(ctx, createdByUserId: 99);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToActivityAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AddToEventAsync_TudjiEvent_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedEvent(ctx, createdByUserId: 99);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToEventAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AddToDestinationAsync_NijeAdmin_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedDestination(ctx);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToDestinationAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 5, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AddToLocalityAsync_OdgovorniManager_Uspeh()
        {
            using var ctx = CreateContext();
            SeedDestination(ctx, managedByUserId: 10);
            SeedLocality(ctx, destinationId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.AddToLocalityAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 10, "Manager");

            result.LocalityId.Should().Be(1);
            result.IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task AddToLocalityAsync_ManagerVanSvojeDestinacije_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedDestination(ctx, managedByUserId: 99);
            SeedLocality(ctx, destinationId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToLocalityAsync(1, new AddImageDto { Url = "a.jpg", IsMain = true }, 10, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AddToObjectAsync_PrvaSlika_IsMainFalse_BacaGresku()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, createdByUserId: 5);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToObjectAsync(1, new AddImageDto { Url = "a.jpg", IsMain = false }, 5, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*First image*must be*main*");
        }

        [Fact]
        public async Task AddToDestinationAsync_DrugaMainSlika_BacaGresku()
        {
            using var ctx = CreateContext();
            SeedDestination(ctx);
            SeedImage(ctx, isMain: true, destinationId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.AddToDestinationAsync(1, new AddImageDto { Url = "b.jpg", IsMain = true }, 1, "Admin"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already has a main image*");
        }

        [Fact]
        public async Task GetForDestinationAsync_NepostojecaDestinacija_BacaKeyNotFoundException()
        {
            using var ctx = CreateContext();
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.GetForDestinationAsync(999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task GetMainForLocalityAsync_NepostojeciLokalitet_BacaKeyNotFoundException()
        {
            using var ctx = CreateContext();
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.GetMainForLocalityAsync(999))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateAsync_MenjaUrlIAltText_UspesnoAzuriraSliku()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);
            var img = SeedImage(ctx, isMain: true, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            var dto = new UpdateImageDto
            {
                Url = "https://novo.com/slika.jpg",
                AltText = "Nova slika"
            };

            var result = await svc.UpdateAsync(img.Id, dto, 5, "ContentCreator");

            result.Should().NotBeNull();
            result!.Url.Should().Be("https://novo.com/slika.jpg");
            result.AltText.Should().Be("Nova slika");
            result.IsMain.Should().BeTrue();

            var updated = await ctx.Images.FindAsync(img.Id);
            updated.Should().NotBeNull();
            updated!.Url.Should().Be("https://novo.com/slika.jpg");
            updated.AltText.Should().Be("Nova slika");
            updated.IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task UpdateAsync_PromenaIsMainMoraKrozSetMainImage()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);
            SeedImage(ctx, isMain: true, objectId: 1);
            var secondary = SeedImage(ctx, isMain: false, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(secondary.Id, new UpdateImageDto { IsMain = true }, 5, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*SetMainImage*");
        }

        [Fact]
        public async Task UpdateAsync_TudjaSlikaObjekta_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 99);
            var img = SeedImage(ctx, isMain: true, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(img.Id, new UpdateImageDto { Url = "x.jpg" }, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task DeleteAsync_JedinaMainSlika_BacaGresku()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);
            var img = SeedImage(ctx, isMain: true, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(img.Id, 5, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*must always have a main image*");
        }

        [Fact]
        public async Task DeleteAsync_TudjaSlika_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 99);
            var img = SeedImage(ctx, isMain: true, objectId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(img.Id, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task GetForObjectAsync_VracaSamoSlikeObjektaIMainJePrva()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);
            SeedObject(ctx, id: 2, createdByUserId: 5);
            SeedImage(ctx, isMain: false, objectId: 1);
            SeedImage(ctx, isMain: true, objectId: 1);
            SeedImage(ctx, isMain: true, objectId: 2);
            var svc = new ImageService(ctx, CreateMapper());

            var result = (await svc.GetForObjectAsync(1)).ToList();

            result.Should().HaveCount(2);
            result.First().IsMain.Should().BeTrue();
            result.All(x => x.ObjectId == 1).Should().BeTrue();
        }

        [Fact]
        public async Task GetMainForEventAsync_KadaPostoji_VracaMain()
        {
            using var ctx = CreateContext();
            SeedEvent(ctx, id: 1, createdByUserId: 5);
            SeedImage(ctx, isMain: false, eventId: 1);
            var main = SeedImage(ctx, isMain: true, eventId: 1);
            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.GetMainForEventAsync(1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(main.Id);
            result.IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task SetMainImageAsync_DrugaSlikaPostajeMain_Uspeh()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);

            var oldMain = SeedImage(ctx, isMain: true, objectId: 1);
            var newMain = SeedImage(ctx, isMain: false, objectId: 1);

            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.SetMainImageAsync(newMain.Id, 5, "ContentCreator");

            result.IsMain.Should().BeTrue();

            var images = ctx.Images.Where(i => i.ObjectId == 1).OrderBy(i => i.Id).ToList();
            images.Single(i => i.Id == oldMain.Id).IsMain.Should().BeFalse();
            images.Single(i => i.Id == newMain.Id).IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task SetMainImageAsync_TudjaSlika_BacaUnauthorized()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 99);

            var main = SeedImage(ctx, isMain: true, objectId: 1);
            var other = SeedImage(ctx, isMain: false, objectId: 1);

            var svc = new ImageService(ctx, CreateMapper());

            await svc.Invoking(s => s.SetMainImageAsync(other.Id, 5, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task SetMainImageAsync_KadJeVecMain_VracaIstogBezPromene()
        {
            using var ctx = CreateContext();
            SeedObject(ctx, id: 1, createdByUserId: 5);

            var main = SeedImage(ctx, isMain: true, objectId: 1);
            SeedImage(ctx, isMain: false, objectId: 1);

            var svc = new ImageService(ctx, CreateMapper());

            var result = await svc.SetMainImageAsync(main.Id, 5, "ContentCreator");

            result.Id.Should().Be(main.Id);
            result.IsMain.Should().BeTrue();
            ctx.Images.Count(i => i.ObjectId == 1 && i.IsMain).Should().Be(1);
        }
    }
}
