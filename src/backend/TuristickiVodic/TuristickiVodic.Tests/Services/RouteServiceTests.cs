using AutoMapper;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Mappings;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class RouteServiceTests
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

        private static IMapper CreateMapper()
        {
            var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
            return config.CreateMapper();
        }

        private static (Role touristRole, Role ccRole, Role managerRole, Role adminRole,
            User tourist, User otherTourist, User creator, User manager, User admin,
            Route route, Route otherRoute)
            SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var ccRole = new Role { Id = 2, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 3, Name = RoleType.Manager };
            var adminRole = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(touristRole, ccRole, managerRole, adminRole);
            ctx.SaveChanges();

            var tourist = new User
            {
                Id = 10,
                FirstName = "Tourist",
                LastName = "One",
                Email = "tourist1@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(1998, 1, 1)
            };

            var otherTourist = new User
            {
                Id = 11,
                FirstName = "Tourist",
                LastName = "Two",
                Email = "tourist2@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(1997, 1, 1)
            };

            var creator = new User
            {
                Id = 20,
                FirstName = "Creator",
                LastName = "One",
                Email = "creator@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            var manager = new User
            {
                Id = 30,
                FirstName = "Manager",
                LastName = "One",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var admin = new User
            {
                Id = 40,
                FirstName = "Admin",
                LastName = "A",
                Email = "admin@test.com",
                PasswordHash = "hash",
                RoleId = adminRole.Id,
                Role = adminRole,
                IsActive = true,
                DateOfBirth = new DateTime(1989, 1, 1)
            };

            ctx.Users.AddRange(tourist, otherTourist, creator, manager, admin);
            ctx.SaveChanges();

            var route = new Route
            {
                Id = 1,
                Name = "Moja ruta",
                Description = "Opis",
                Difficulty = "Easy",
                LengthKm = 5.5m,
                CreatedByUserId = tourist.Id,
                CreatedBy = tourist,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                RoutePoints = new List<RoutePoint>()
            };

            var otherRoute = new Route
            {
                Id = 2,
                Name = "Tudja ruta",
                Description = "Opis 2",
                Difficulty = "Medium",
                LengthKm = 8.2m,
                CreatedByUserId = otherTourist.Id,
                CreatedBy = otherTourist,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                RoutePoints = new List<RoutePoint>()
            };

            ctx.Routes.AddRange(route, otherRoute);
            ctx.SaveChanges();

            ctx.RoutePoints.AddRange(
                new RoutePoint
                {
                    RouteId = route.Id,
                    Route = route,
                    Order = 1,
                    Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                    PointName = "P1",
                    CreatedAt = DateTime.UtcNow
                },
                new RoutePoint
                {
                    RouteId = route.Id,
                    Route = route,
                    Order = 2,
                    Geolocation = new Point(18.78, 42.43) { SRID = 4326 },
                    PointName = "P2",
                    CreatedAt = DateTime.UtcNow
                },
                new RoutePoint
                {
                    RouteId = otherRoute.Id,
                    Route = otherRoute,
                    Order = 1,
                    Geolocation = new Point(19.00, 43.00) { SRID = 4326 },
                    PointName = "OP1",
                    CreatedAt = DateTime.UtcNow
                },
                new RoutePoint
                {
                    RouteId = otherRoute.Id,
                    Route = otherRoute,
                    Order = 2,
                    Geolocation = new Point(19.10, 43.10) { SRID = 4326 },
                    PointName = "OP2",
                    CreatedAt = DateTime.UtcNow
                });
            ctx.SaveChanges();

            return (touristRole, ccRole, managerRole, adminRole,
                tourist, otherTourist, creator, manager, admin, route, otherRoute);
        }

        [Fact]
        public async Task GetAllAsync_VracaSveRute()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_VracaSveRute));
            SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.GetAllAsync(new RouteQueryDto());

            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeFiltriraPoDifficultyICreatedBy_VracaTrazeniRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeFiltriraPoDifficultyICreatedBy_VracaTrazeniRezultat));
            var (_, _, _, _, tourist, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Routes.Add(new Route
            {
                Id = 3,
                Name = "Kreator ruta",
                Description = "Planinska staza",
                Difficulty = "Hard",
                LengthKm = 12.3m,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow.AddHours(-1)
            });
            ctx.SaveChanges();

            var svc = new RouteService(ctx);

            var result = await svc.GetAllAsync(new RouteQueryDto
            {
                Difficulty = "hard",
                CreatedBy = "creator one"
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Kreator ruta");
            result.Items[0].CreatedByUserId.Should().Be(creator.Id);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeKoristiPaginacijaISortPoLength_VracaTrazeniSegment()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeKoristiPaginacijaISortPoLength_VracaTrazeniSegment));
            var (_, _, _, _, tourist, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.Routes.Add(new Route
            {
                Id = 3,
                Name = "Najduza ruta",
                Description = "Opis 3",
                Difficulty = "Hard",
                LengthKm = 15.1m,
                CreatedByUserId = tourist.Id,
                CreatedBy = tourist,
                CreatedAt = DateTime.UtcNow.AddMinutes(-1),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-1)
            });
            ctx.SaveChanges();

            var svc = new RouteService(ctx);

            var result = await svc.GetAllAsync(new RouteQueryDto
            {
                Page = 2,
                PageSize = 1,
                SortBy = "length",
                SortOrder = "desc"
            });

            result.Items.Should().HaveCount(1);
            result.TotalCount.Should().Be(3);
            result.Items[0].Name.Should().Be("Tudja ruta");
        }

        [Fact]
        public async Task GetByIdAsync_KadaRutaPostoji_VracaDto()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_KadaRutaPostoji_VracaDto));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.GetByIdAsync(route.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(route.Id);
            result.Name.Should().Be("Moja ruta");
            result.CreatedByUserId.Should().Be(tourist.Id);
            result.RoutePoints.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetByIdAsync_KadaRutaNePostoji_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_KadaRutaNePostoji_VracaNull));
            SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.GetByIdAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateAsync_UlogovaniKorisnikMozeDaKreiraRutu()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_UlogovaniKorisnikMozeDaKreiraRutu));
            var (_, _, _, _, _, _, creator, _, _, _, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.CreateAsync(new CreateRouteDto
            {
                Name = "Nova ruta",
                Description = "Opis",
                Difficulty = "Easy",
                LengthKm = 4.2m,
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40, PointName = "A" },
                    new CreateRoutePointDto { Order = 2, Longitude = 18.71, Latitude = 42.41, PointName = "B" }
                }
            }, creator.Id);

            result.Should().NotBeNull();
            result.Name.Should().Be("Nova ruta");
            result.CreatedByUserId.Should().Be(creator.Id);
            result.RoutePoints.Should().HaveCount(2);

            ctx.Routes.Count().Should().Be(3);
            ctx.RoutePoints.Count(p => p.RouteId == result.Id).Should().Be(2);
        }

        [Fact]
        public async Task CreateAsync_RutaMoraImatiMinimum2Tacke()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_RutaMoraImatiMinimum2Tacke));
            var (_, _, _, _, tourist, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.CreateAsync(new CreateRouteDto
            {
                Name = "Nevalidna ruta",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40, PointName = "A" }
                }
            }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*at least 2 points*");
        }

        [Fact]
        public async Task CreateAsync_RedosledTacakaMoraBitiJedinstven()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_RedosledTacakaMoraBitiJedinstven));
            var (_, _, _, _, tourist, _, _, _, _, _, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.CreateAsync(new CreateRouteDto
            {
                Name = "Nevalidna ruta",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40, PointName = "A" },
                    new CreateRoutePointDto { Order = 1, Longitude = 18.71, Latitude = 42.41, PointName = "B" }
                }
            }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*unique order values*");
        }

        [Fact]
        public async Task UpdateAsync_SamoVlasnikMozeDaMenjaRutu()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_SamoVlasnikMozeDaMenjaRutu));
            var (_, _, _, _, tourist, otherTourist, _, _, _, _, otherRoute) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.UpdateAsync(otherRoute.Id, new UpdateRouteDto
            {
                Name = "Novo ime"
            }, tourist.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own routes*");
        }

        [Fact]
        public async Task UpdateAsync_VlasnikMenjaOsnovnaPolja()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_VlasnikMenjaOsnovnaPolja));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.UpdateAsync(route.Id, new UpdateRouteDto
            {
                Name = "Izmenjena ruta",
                Description = "Novi opis",
                Difficulty = "Hard",
                LengthKm = 9.9m
            }, tourist.Id);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Izmenjena ruta");
            result.Description.Should().Be("Novi opis");
            result.Difficulty.Should().Be("Hard");
            result.LengthKm.Should().Be(9.9m);
        }

        [Fact]
        public async Task UpdateAsync_AkoSuProsledjeneNoveTacke_ZamenjujuSveStare()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_AkoSuProsledjeneNoveTacke_ZamenjujuSveStare));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            var result = await svc.UpdateAsync(route.Id, new UpdateRouteDto
            {
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 20.00, Latitude = 44.00, PointName = "N1" },
                    new CreateRoutePointDto { Order = 2, Longitude = 20.10, Latitude = 44.10, PointName = "N2" },
                    new CreateRoutePointDto { Order = 3, Longitude = 20.20, Latitude = 44.20, PointName = "N3" }
                }
            }, tourist.Id);

            result.Should().NotBeNull();
            result!.RoutePoints.Should().HaveCount(3);
            result.RoutePoints.Select(p => p.Order).Should().Equal((short)1, (short)2, (short)3);

            ctx.RoutePoints.Count(p => p.RouteId == route.Id).Should().Be(3);
        }

        [Fact]
        public async Task UpdateAsync_NoveTackeMorajuImatiMinimum2()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_NoveTackeMorajuImatiMinimum2));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.UpdateAsync(route.Id, new UpdateRouteDto
            {
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 20.00, Latitude = 44.00, PointName = "N1" }
                }
            }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*at least 2 points*");
        }

        [Fact]
        public async Task UpdateAsync_NoviRedosledTacakaMoraBitiJedinstven()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_NoviRedosledTacakaMoraBitiJedinstven));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.UpdateAsync(route.Id, new UpdateRouteDto
            {
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 20.00, Latitude = 44.00, PointName = "N1" },
                    new CreateRoutePointDto { Order = 1, Longitude = 20.10, Latitude = 44.10, PointName = "N2" }
                }
            }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*unique order values*");
        }

        [Fact]
        public async Task DeleteAsync_SamoVlasnikMozeDaBriseRutu()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_SamoVlasnikMozeDaBriseRutu));
            var (_, _, _, _, tourist, _, _, _, _, _, otherRoute) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.DeleteAsync(otherRoute.Id, tourist.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own routes*");
        }

        [Fact]
        public async Task DeleteAsync_RutaNeMozeDaSeObriseAkoJeUFavoritima()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_RutaNeMozeDaSeObriseAkoJeUFavoritima));
            var (_, _, _, _, tourist, otherTourist, _, _, _, route, _) = SeedBase(ctx);

            ctx.Favorites.Add(new Favorite
            {
                UserId = otherTourist.Id,
                RouteId = route.Id,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new RouteService(ctx);

            await svc.Invoking(s => s.DeleteAsync(route.Id, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*favorites*");
        }

        [Fact]
        public async Task DeleteAsync_VlasnikMozeDaObriseRutuKojaNijeUFavoritima()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_VlasnikMozeDaObriseRutuKojaNijeUFavoritima));
            var (_, _, _, _, tourist, _, _, _, _, route, _) = SeedBase(ctx);

            var svc = new RouteService(ctx);

            var deleted = await svc.DeleteAsync(route.Id, tourist.Id);

            deleted.Should().BeTrue();
            ctx.Routes.Any(r => r.Id == route.Id).Should().BeFalse();
        }
    }
}
