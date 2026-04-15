using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class FavoriteServiceTests
    {
        private static AppDbContext CreateInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"{dbName}_{Guid.NewGuid()}")
                .Options;

            var ctx = new AppDbContext(options);
            ctx.Database.EnsureDeleted();
            ctx.Database.EnsureCreated();
            return ctx;
        }

        private static (User tourist, User otherTourist, User manager, Destination destination, Locality locality,
            Activity activity, Route route, TouristObject touristObject) SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };
            ctx.Roles.AddRange(touristRole, managerRole);

            var tourist = new User
            {
                Id = 10,
                FirstName = "Ana",
                LastName = "A",
                Email = "ana@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(2000, 1, 1)
            };

            var otherTourist = new User
            {
                Id = 11,
                FirstName = "Iva",
                LastName = "I",
                Email = "iva@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(2001, 1, 1)
            };

            var manager = new User
            {
                Id = 12,
                FirstName = "Manager",
                LastName = "M",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var activityType = new ActivityType { Id = 1, Name = "Setnja" };
            var objectType = new ObjectType { Id = 1, Name = "Muzej" };

            ctx.Users.AddRange(tourist, otherTourist, manager);
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ActivityTypes.Add(activityType);
            ctx.ObjectTypes.Add(objectType);
            ctx.SaveChanges();

            var destination = new Destination
            {
                Id = 1,
                Name = "Kotor",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                ManagedByUserId = manager.Id,
                CreatedByUserId = manager.Id,
                Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(destination);
            ctx.SaveChanges();

            var locality = new Locality
            {
                Id = 1,
                Name = "Stari grad",
                DestinationId = destination.Id,
                Destination = destination,
                LocalityTypeId = localityType.Id,
                LocalityType = localityType,
                CreatedByUserId = manager.Id,
                IsActive = true
            };
            ctx.Localities.Add(locality);

            var activity = new Activity
            {
                Id = 1,
                Name = "Pesacka tura",
                ActivityTypeId = activityType.Id,
                ActivityType = activityType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = manager.Id,
                Status = ContentStatus.Approved
            };
            ctx.Activities.Add(activity);

            var route = new Route
            {
                Id = 1,
                Name = "Staza 1",
                CreatedByUserId = tourist.Id,
                CreatedBy = tourist
            };
            ctx.Routes.Add(route);

            var touristObject = new TouristObject
            {
                Id = 1,
                Name = "Muzej mora",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = manager.Id,
                Status = ContentStatus.Approved
            };
            ctx.Objects.Add(touristObject);
            ctx.SaveChanges();

            return (tourist, otherTourist, manager, destination, locality, activity, route, touristObject);
        }

        [Fact]
        public async Task GetMyFavoritesAsync_VracaSamoFavoriteTrenutnogKorisnika()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyFavoritesAsync_VracaSamoFavoriteTrenutnogKorisnika));
            var (tourist, otherTourist, _, destination, locality, _, _, _) = SeedBase(ctx);

            ctx.Favorites.AddRange(
                new Favorite
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    DestinationId = destination.Id,
                    Destination = destination,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new Favorite
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    LocalityId = locality.Id,
                    Locality = locality,
                    CreatedAt = DateTime.UtcNow
                },
                new Favorite
                {
                    Id = 3,
                    UserId = otherTourist.Id,
                    User = otherTourist,
                    DestinationId = destination.Id,
                    Destination = destination,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = new FavoriteService(ctx);

            var result = await service.GetMyFavoritesAsync(tourist.Id, new FavoriteQueryDto());

            result.Items.Should().HaveCount(2);
            result.Items.Should().OnlyContain(f => f.UserId == tourist.Id);
            result.Items[0].LocalityName.Should().Be("Stari grad");
            result.Items[1].DestinationName.Should().Be("Kotor");
        }

        [Fact]
        public async Task GetMyFavoritesAsync_KadaSeFiltriraPoTipuIVrsiPretraga_VracaTrazeniRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyFavoritesAsync_KadaSeFiltriraPoTipuIVrsiPretraga_VracaTrazeniRezultat));
            var (tourist, _, _, destination, locality, activity, route, touristObject) = SeedBase(ctx);

            ctx.Favorites.AddRange(
                new Favorite
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    DestinationId = destination.Id,
                    Destination = destination,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new Favorite
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    RouteId = route.Id,
                    Route = route,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new Favorite
                {
                    Id = 3,
                    UserId = tourist.Id,
                    User = tourist,
                    ObjectId = touristObject.Id,
                    Object = touristObject,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = new FavoriteService(ctx);

            var result = await service.GetMyFavoritesAsync(tourist.Id, new FavoriteQueryDto
            {
                Type = "object",
                Search = "muzej"
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].ObjectName.Should().Be("Muzej mora");
        }

        [Fact]
        public async Task GetMyFavoritesAsync_KadaSeKoristiPaginacijaISortPoNazivu_VracaTrazeniSegment()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyFavoritesAsync_KadaSeKoristiPaginacijaISortPoNazivu_VracaTrazeniSegment));
            var (tourist, _, _, destination, locality, activity, route, touristObject) = SeedBase(ctx);

            ctx.Favorites.AddRange(
                new Favorite
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    DestinationId = destination.Id,
                    Destination = destination,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new Favorite
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    RouteId = route.Id,
                    Route = route,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new Favorite
                {
                    Id = 3,
                    UserId = tourist.Id,
                    User = tourist,
                    ActivityId = activity.Id,
                    Activity = activity,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = new FavoriteService(ctx);

            var result = await service.GetMyFavoritesAsync(tourist.Id, new FavoriteQueryDto
            {
                Page = 2,
                PageSize = 1,
                SortBy = "name",
                SortOrder = "asc"
            });

            result.Items.Should().HaveCount(1);
            result.TotalCount.Should().Be(3);
            result.Items[0].ActivityName.Should().Be("Pesacka tura");
        }

        [Fact]
        public async Task AddAsync_KadaNijeProsledjenTacnoJedanEntitet_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_KadaNijeProsledjenTacnoJedanEntitet_BacaException));
            var (tourist, _, _, destination, _, _, _, _) = SeedBase(ctx);
            var service = new FavoriteService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateFavoriteDto
            {
                DestinationId = destination.Id,
                RouteId = 1
            }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Exactly one*");
        }

        [Fact]
        public async Task AddAsync_DuplikatFavoritaJeBlokiran()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_DuplikatFavoritaJeBlokiran));
            var (tourist, _, _, destination, _, _, _, _) = SeedBase(ctx);

            ctx.Favorites.Add(new Favorite
            {
                UserId = tourist.Id,
                DestinationId = destination.Id,
                CreatedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var service = new FavoriteService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateFavoriteDto { DestinationId = destination.Id }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already in your favorites*");
        }

        [Fact]
        public async Task RemoveAsync_KorisnikNeMozeDaObriseTudjFavorit()
        {
            using var ctx = CreateInMemoryContext(nameof(RemoveAsync_KorisnikNeMozeDaObriseTudjFavorit));
            var (_, otherTourist, _, destination, _, _, _, _) = SeedBase(ctx);

            var favorite = new Favorite
            {
                Id = 100,
                UserId = otherTourist.Id,
                DestinationId = destination.Id,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Favorites.Add(favorite);
            await ctx.SaveChangesAsync();

            var service = new FavoriteService(ctx);

            var removed = await service.RemoveAsync(favorite.Id, 10);

            removed.Should().BeFalse();
            ctx.Favorites.Should().ContainSingle(f => f.Id == favorite.Id);
        }
    }
}
