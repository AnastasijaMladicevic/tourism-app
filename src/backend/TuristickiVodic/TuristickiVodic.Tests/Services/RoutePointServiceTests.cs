using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class RoutePointServiceTests
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

        private static (Role touristRole, Role ccRole, Role managerRole, Role adminRole,
            User owner, User otherUser, User admin,
            Route route, Route otherRoute,
            RoutePoint point1, RoutePoint point2, RoutePoint point3, RoutePoint otherRoutePoint1, RoutePoint otherRoutePoint2)
            SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var ccRole = new Role { Id = 2, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 3, Name = RoleType.Manager };
            var adminRole = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(touristRole, ccRole, managerRole, adminRole);
            ctx.SaveChanges();

            var owner = new User
            {
                Id = 10,
                FirstName = "Owner",
                LastName = "User",
                Email = "owner@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(1998, 1, 1)
            };

            var otherUser = new User
            {
                Id = 11,
                FirstName = "Other",
                LastName = "User",
                Email = "other@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1997, 1, 1)
            };

            var admin = new User
            {
                Id = 12,
                FirstName = "Admin",
                LastName = "A",
                Email = "admin@test.com",
                PasswordHash = "hash",
                RoleId = adminRole.Id,
                Role = adminRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            ctx.Users.AddRange(owner, otherUser, admin);
            ctx.SaveChanges();

            var route = new Route
            {
                Id = 1,
                Name = "Moja ruta",
                Description = "Opis",
                Difficulty = "Easy",
                LengthKm = 5.5m,
                CreatedByUserId = owner.Id,
                CreatedBy = owner,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var otherRoute = new Route
            {
                Id = 2,
                Name = "Druga ruta",
                Description = "Opis 2",
                Difficulty = "Medium",
                LengthKm = 8.0m,
                CreatedByUserId = otherUser.Id,
                CreatedBy = otherUser,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            };

            ctx.Routes.AddRange(route, otherRoute);
            ctx.SaveChanges();

            var point1 = new RoutePoint
            {
                Id = 1,
                RouteId = route.Id,
                Route = route,
                Order = 1,
                Geolocation = new Point(18.70, 42.40) { SRID = 4326 },
                PointName = "A",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var point2 = new RoutePoint
            {
                Id = 2,
                RouteId = route.Id,
                Route = route,
                Order = 2,
                Geolocation = new Point(18.71, 42.41) { SRID = 4326 },
                PointName = "B",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var point3 = new RoutePoint
            {
                Id = 3,
                RouteId = route.Id,
                Route = route,
                Order = 3,
                Geolocation = new Point(18.72, 42.42) { SRID = 4326 },
                PointName = "C",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var otherRoutePoint1 = new RoutePoint
            {
                Id = 4,
                RouteId = otherRoute.Id,
                Route = otherRoute,
                Order = 1,
                Geolocation = new Point(19.00, 43.00) { SRID = 4326 },
                PointName = "X",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var otherRoutePoint2 = new RoutePoint
            {
                Id = 5,
                RouteId = otherRoute.Id,
                Route = otherRoute,
                Order = 2,
                Geolocation = new Point(19.10, 43.10) { SRID = 4326 },
                PointName = "Y",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            ctx.RoutePoints.AddRange(point1, point2, point3, otherRoutePoint1, otherRoutePoint2);
            ctx.SaveChanges();

            return (touristRole, ccRole, managerRole, adminRole,
                owner, otherUser, admin,
                route, otherRoute,
                point1, point2, point3, otherRoutePoint1, otherRoutePoint2);
        }

        [Fact]
        public async Task GetByRouteAsync_VracaSveTackeZaRutuSortiranePoOrder()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByRouteAsync_VracaSveTackeZaRutuSortiranePoOrder));
            var (_, _, _, _, _, _, _, route, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            var result = (await svc.GetByRouteAsync(route.Id)).ToList();

            result.Should().HaveCount(3);
            result.Select(x => x.Order).Should().Equal((short)1, (short)2, (short)3);
        }

        [Fact]
        public async Task GetByRouteAsync_KadaRutaNePostoji_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByRouteAsync_KadaRutaNePostoji_BacaException));
            SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.GetByRouteAsync(999))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Route not found*");
        }

        [Fact]
        public async Task GetByIdAsync_KadaTackaPostoji_VracaDto()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_KadaTackaPostoji_VracaDto));
            var (_, _, _, _, _, _, _, _, _, point1, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            var result = await svc.GetByIdAsync(point1.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(point1.Id);
            result.RouteId.Should().Be(point1.RouteId);
            result.Order.Should().Be(1);
            result.Longitude.Should().BeApproximately(18.70, 0.001);
            result.Latitude.Should().BeApproximately(42.40, 0.001);
        }

        [Fact]
        public async Task GetByIdAsync_KadaTackaNePostoji_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_KadaTackaNePostoji_VracaNull));
            SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            var result = await svc.GetByIdAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task AddAsync_SamoVlasnikRuteMozeDaDodaTacku()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_SamoVlasnikRuteMozeDaDodaTacku));
            var (_, _, _, _, _, otherUser, _, route, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.AddAsync(route.Id, new CreateRoutePointDto
            {
                Order = 4,
                Longitude = 18.73,
                Latitude = 42.43,
                PointName = "D"
            }, otherUser.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own routes*");
        }

        [Fact]
        public async Task AddAsync_OrderMoraBitiJedinstvenUOkviruRute()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_OrderMoraBitiJedinstvenUOkviruRute));
            var (_, _, _, _, owner, _, _, route, _, _, point2, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.AddAsync(route.Id, new CreateRoutePointDto
            {
                Order = point2.Order,
                Longitude = 18.90,
                Latitude = 42.90,
                PointName = "Duplikat"
            }, owner.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already exists on this route*");
        }

        [Fact]
        public async Task AddAsync_DodavanjeTackeAzuriraRouteUpdatedAt()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_DodavanjeTackeAzuriraRouteUpdatedAt));
            var (_, _, _, _, owner, _, _, route, _, _, _, _, _, _) = SeedBase(ctx);

            var oldUpdatedAt = route.UpdatedAt;

            var svc = new RoutePointService(ctx);

            var result = await svc.AddAsync(route.Id, new CreateRoutePointDto
            {
                Order = 4,
                Longitude = 18.73,
                Latitude = 42.43,
                PointName = "D"
            }, owner.Id);

            result.Should().NotBeNull();
            ctx.RoutePoints.Count(p => p.RouteId == route.Id).Should().Be(4);

            var savedRoute = ctx.Routes.Single(r => r.Id == route.Id);
            savedRoute.UpdatedAt.Should().BeAfter(oldUpdatedAt);
        }

        [Fact]
        public async Task UpdateAsync_SamoVlasnikRuteMozeDaMenjaTacku()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_SamoVlasnikRuteMozeDaMenjaTacku));
            var (_, _, _, _, _, otherUser, _, _, _, point1, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.UpdateAsync(point1.Id, new UpdateRoutePointDto
            {
                PointName = "Novo ime"
            }, otherUser.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own routes*");
        }

        [Fact]
        public async Task UpdateAsync_KadaTackaNePostoji_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_KadaTackaNePostoji_VracaNull));
            var (_, _, _, _, owner, _, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            var result = await svc.UpdateAsync(999, new UpdateRoutePointDto
            {
                PointName = "Novo"
            }, owner.Id);

            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateAsync_OrderMoraOstatiJedinstven()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_OrderMoraOstatiJedinstven));
            var (_, _, _, _, owner, _, _, _, _, point1, point2, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.UpdateAsync(point1.Id, new UpdateRoutePointDto
            {
                Order = point2.Order
            }, owner.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already exists on this route*");
        }

        [Fact]
        public async Task UpdateAsync_MenjaOrderGeolokacijuIPointNameIAzuriraRouteUpdatedAt()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_MenjaOrderGeolokacijuIPointNameIAzuriraRouteUpdatedAt));
            var (_, _, _, _, owner, _, _, route, _, point1, _, _, _, _) = SeedBase(ctx);

            var oldUpdatedAt = route.UpdatedAt;

            var svc = new RoutePointService(ctx);

            var result = await svc.UpdateAsync(point1.Id, new UpdateRoutePointDto
            {
                Order = 10,
                Longitude = 20.10,
                Latitude = 44.10,
                PointName = "Izmenjena tacka"
            }, owner.Id);

            result.Should().NotBeNull();
            result!.Order.Should().Be(10);
            result.Longitude.Should().BeApproximately(20.10, 0.001);
            result.Latitude.Should().BeApproximately(44.10, 0.001);
            result.PointName.Should().Be("Izmenjena tacka");

            var savedRoute = ctx.Routes.Single(r => r.Id == route.Id);
            savedRoute.UpdatedAt.Should().BeAfter(oldUpdatedAt);
        }

        [Fact]
        public async Task DeleteAsync_SamoVlasnikRuteMozeDaBriseTacku()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_SamoVlasnikRuteMozeDaBriseTacku));
            var (_, _, _, _, _, otherUser, _, _, _, point1, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.DeleteAsync(point1.Id, otherUser.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own routes*");
        }

        [Fact]
        public async Task DeleteAsync_KadaTackaNePostoji_VracaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_KadaTackaNePostoji_VracaFalse));
            var (_, _, _, _, owner, _, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            var result = await svc.DeleteAsync(999, owner.Id);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAsync_BrisanjeJeZabranjenoAkoBiRutaOstalaSaManjeOd2Tacke()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_BrisanjeJeZabranjenoAkoBiRutaOstalaSaManjeOd2Tacke));
            var (_, _, _, _, owner, _, _, _, otherRoute, _, _, _, otherRoutePoint1, _) = SeedBase(ctx);

            ctx.RoutePoints.Remove(ctx.RoutePoints.Single(p => p.Id == 5));
            ctx.SaveChanges();

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.DeleteAsync(otherRoutePoint1.Id, owner.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task DeleteAsync_KadaRutaImaTacno2Tacke_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_KadaRutaImaTacno2Tacke_BacaException));
            var (_, _, _, _, _, otherUser, _, _, otherRoute, _, _, _, otherRoutePoint1, _) = SeedBase(ctx);

            var svc = new RoutePointService(ctx);

            await svc.Invoking(s => s.DeleteAsync(otherRoutePoint1.Id, otherUser.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*at least 2 points*");
        }

        [Fact]
        public async Task DeleteAsync_BrisanjeTackeAzuriraRouteUpdatedAt()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_BrisanjeTackeAzuriraRouteUpdatedAt));
            var (_, _, _, _, owner, _, _, route, _, point1, _, _, _, _) = SeedBase(ctx);

            var oldUpdatedAt = route.UpdatedAt;

            var svc = new RoutePointService(ctx);

            var deleted = await svc.DeleteAsync(point1.Id, owner.Id);

            deleted.Should().BeTrue();
            ctx.RoutePoints.Any(p => p.Id == point1.Id).Should().BeFalse();

            var savedRoute = ctx.Routes.Single(r => r.Id == route.Id);
            savedRoute.UpdatedAt.Should().BeAfter(oldUpdatedAt);
        }
    }
}