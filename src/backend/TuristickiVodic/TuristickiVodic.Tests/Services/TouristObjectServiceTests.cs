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
    public class TouristObjectServiceTests
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

        private static TouristObjectService CreateService(AppDbContext ctx) =>
        new(ctx, CreateMapper(), new FakeTranslationService());
        
        private static (ObjectType objectType, Destination destination, Destination otherDestination, Locality locality, Locality otherLocality, User creator, User otherCreator, User manager, User admin)
            SeedBase(AppDbContext ctx)
        {
            var ccRole = new Role { Id = 1, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };
            var adminRole = new Role { Id = 3, Name = RoleType.Admin };
            ctx.Roles.AddRange(ccRole, managerRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var objectType = new ObjectType { Id = 1, Name = "Muzej" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            ctx.DestinationTypes.Add(destinationType);
            ctx.ObjectTypes.Add(objectType);
            ctx.LocalityTypes.Add(localityType);
            ctx.SaveChanges();

            var manager = new User { Id = 10, FirstName = "Manager", LastName = "M", Email = "manager@test.com", PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole, IsActive = true, DateOfBirth = new DateTime(1990, 1, 1) };
            var admin = new User { Id = 11, FirstName = "Admin", LastName = "A", Email = "admin@test.com", PasswordHash = "hash", RoleId = adminRole.Id, Role = adminRole, IsActive = true, DateOfBirth = new DateTime(1990, 1, 1) };
            var creator = new User { Id = 20, FirstName = "Creator", LastName = "C", Email = "cc@test.com", PasswordHash = "hash", RoleId = ccRole.Id, Role = ccRole, IsActive = true, DateOfBirth = new DateTime(1995, 1, 1) };
            var otherCreator = new User { Id = 21, FirstName = "Other", LastName = "CC", Email = "othercc@test.com", PasswordHash = "hash", RoleId = ccRole.Id, Role = ccRole, IsActive = true, DateOfBirth = new DateTime(1996, 1, 1) };
            ctx.Users.AddRange(manager, admin, creator, otherCreator);
            ctx.SaveChanges();

            var destination = new Destination { Id = 1, Name = "Kotor", DestinationTypeId = destinationType.Id, DestinationType = destinationType, ManagedByUserId = manager.Id, CreatedByUserId = admin.Id, Status = ContentStatus.Approved };
            var otherDestination = new Destination { Id = 2, Name = "Budva", DestinationTypeId = destinationType.Id, DestinationType = destinationType, CreatedByUserId = admin.Id, Status = ContentStatus.Approved };
            ctx.Destinations.AddRange(destination, otherDestination);
            ctx.SaveChanges();

            var locality = new Locality { Id = 1, Name = "Stari grad", DestinationId = destination.Id, Destination = destination, LocalityTypeId = localityType.Id, LocalityType = localityType, CreatedByUserId = admin.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
            var otherLocality = new Locality { Id = 2, Name = "Centar Budve", DestinationId = otherDestination.Id, Destination = otherDestination, LocalityTypeId = localityType.Id, LocalityType = localityType, CreatedByUserId = admin.Id, IsActive = true, CreatedAt = DateTime.UtcNow };
            ctx.Localities.AddRange(locality, otherLocality);
            ctx.SaveChanges();

            return (objectType, destination, otherDestination, locality, otherLocality, creator, otherCreator, manager, admin);
        }

        [Fact]
        public async Task CreateAsync_ContentCreator_KreiraObjekat_AutomatskiPreuzimaDestinacijuIzLokaliteta()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_KreiraObjekat_AutomatskiPreuzimaDestinacijuIzLokaliteta));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            var result = await svc.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                MenuUrl = " https://example.com/menu ",
                Price = 150m,
                Amenities = new[] { "WiFi", "Parking", "wifi" },
                Longitude = 18.77,
                Latitude = 42.42,
            }, creator.Id, "ContentCreator");

            result.Name.Should().Be("Pomorski muzej");
            result.MenuUrl.Should().Be("https://example.com/menu");
            result.Price.Should().Be(150m);
            result.Amenities.Should().Equal("WiFi", "Parking");
            ctx.Objects.Single().DestinationId.Should().Be(destination.Id);
            ctx.Objects.Single().LocalityId.Should().Be(locality.Id);
            ctx.Objects.Single().MenuUrl.Should().Be("https://example.com/menu");
            ctx.Objects.Single().Price.Should().Be(150m);
            ctx.Objects.Single().Amenities.Should().Equal("WiFi", "Parking");
            ctx.Objects.Single().Status.Should().Be(ContentStatus.Pending);
        }

        [Fact]
        public async Task CreateAsync_LokalitetMozeBitiNull()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_LokalitetMozeBitiNull));
            var (objectType, destination, _, _, _, creator, _, _, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            var result = await svc.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Objekat bez lokaliteta",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id
            }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            ctx.Objects.Single().LocalityId.Should().BeNull();
            ctx.Objects.Single().DestinationId.Should().Be(destination.Id);
        }

        [Fact]
        public async Task CreateAsync_NepostojecaDestinacija_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NepostojecaDestinacija_BacaException));
            var (objectType, _, _, _, _, creator, _, _, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            await svc.Invoking(s => s.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                DestinationId = 999
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Destination not found*");
        }

        [Fact]
        public async Task CreateAsync_LocalityMoraPripadatiDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_LocalityMoraPripadatiDestinaciji));
            var (objectType, destination, _, _, otherLocality, creator, _, _, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            await svc.Invoking(s => s.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                LocalityId = otherLocality.Id
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*does not belong to the selected destination*");
        }

        [Fact]
        public async Task UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojObjekat));
            var (objectType, destination, _, locality, _, creator, otherCreator, _, _) = SeedBase(ctx);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = otherCreator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();
            var svc = CreateService(ctx);

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateTouristObjectDto { Name = "Novo ime" }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own objects*");
        }

        [Fact]
        public async Task UpdateAsync_PromenaDestinacije_CistiLokalitetAkoNePripadaNovojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_PromenaDestinacije_CistiLokalitetAkoNePripadaNovojDestinaciji));
            var (objectType, destination, otherDestination, locality, _, creator, _, _, _) = SeedBase(ctx);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();
            var svc = CreateService(ctx);

            var result = await svc.UpdateAsync(1, new UpdateTouristObjectDto { DestinationId = otherDestination.Id }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.DestinationId.Should().Be(otherDestination.Id);
            result.LocalityId.Should().BeNull();
        }

        [Fact]
        public async Task UpdateAsync_PromenaLokaliteta_AutomatskiMenjaIDestinaciju()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_PromenaLokaliteta_AutomatskiMenjaIDestinaciju));
            var (objectType, destination, _, locality, otherLocality, creator, _, _, _) = SeedBase(ctx);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();
            var svc = CreateService(ctx);

            var result = await svc.UpdateAsync(1, new UpdateTouristObjectDto { LocalityId = otherLocality.Id }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.LocalityId.Should().Be(otherLocality.Id);
            result.DestinationId.Should().Be(otherLocality.DestinationId);
        }

        [Fact]
        public async Task UpdateAsync_MenjaPriceIAmenities()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_MenjaPriceIAmenities));
            var (objectType, destination, _, _, _, creator, _, _, _) = SeedBase(ctx);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Price = 80m,
                Amenities = new[] { "WiFi" },
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();
            var svc = CreateService(ctx);

            var result = await svc.UpdateAsync(1, new UpdateTouristObjectDto
            {
                MenuUrl = " https://example.com/new-menu ",
                Price = 125m,
                Amenities = new[] { "Parking", "WiFi", "parking" }
            }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.MenuUrl.Should().Be("https://example.com/new-menu");
            result!.Price.Should().Be(125m);
            result.Amenities.Should().Equal("Parking", "WiFi");
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_NeMozeApprovedObjekatDirektno()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_NeMozeApprovedObjekatDirektno));
            var (objectType, destination, _, _, _, creator, _, _, _) = SeedBase(ctx);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();
            var svc = CreateService(ctx);

            await svc.Invoking(s => s.DeleteAsync(1, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*deletion request*");
        }

        [Fact]
        public async Task ApproveAsync_RejectObjektaBezMainSlike_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_RejectObjektaBezMainSlike_Uspeh));
            var (objectType, destination, _, locality, _, creator, _, manager, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var result = await svc.ApproveAsync(1, new ApproveContentDto
            {
                Approve = false,
                RejectionReason = "Nedovoljno podataka"
            }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Rejected");
            result.RejectionReason.Should().Be("Nedovoljno podataka");
        }

        [Fact]
        public async Task GetAllAsync_KadaSeFiltriraPoProsecnojOceni_VracaSamoObjekteUNaZadatomOpsegu()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeFiltriraPoProsecnojOceni_VracaSamoObjekteUNaZadatomOpsegu));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Objekat 1",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    AverageRating = 4.8m,
                    ReviewCount = 12,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Objekat 2",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    AverageRating = 3.2m,
                    ReviewCount = 7,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.Images.AddRange(
                new Image
                {
                    Id = 1,
                    ObjectId = 1,
                    Url = "https://test.com/1.jpg",
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Image
                {
                    Id = 2,
                    ObjectId = 2,
                    Url = "https://test.com/2.jpg",
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = CreateService(ctx);

            var result = await svc.GetAllAsync(new TouristObjectQueryDto
            {
                MinRating = 4.0m,
                MaxRating = 5.0m
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Objekat 1");
            result.Items[0].AverageRating.Should().Be(4.8m);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeFiltriraPoAmenities_VracaSamoObjekteKojiImajuSveTrazenePogodnosti()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeFiltriraPoAmenities_VracaSamoObjekteKojiImajuSveTrazenePogodnosti));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Hotel sa svim pogodnostima",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    Amenities = new[] { "WiFi", "Parking", "Spa" },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Hotel bez parkinga",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    Amenities = new[] { "WiFi", "Spa" },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.Images.AddRange(
                new Image
                {
                    Id = 1,
                    ObjectId = 1,
                    Url = "https://test.com/object-1.jpg",
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Image
                {
                    Id = 2,
                    ObjectId = 2,
                    Url = "https://test.com/object-2.jpg",
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = CreateService(ctx);

            var result = await svc.GetAllAsync(new TouristObjectQueryDto
            {
                Amenities = new[] { "WiFi", "Parking" }
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Hotel sa svim pogodnostima");
            result.Items[0].Amenities.Should().Contain(new[] { "WiFi", "Parking" });
        }

        [Fact]
        public async Task GetAllAsync_SaSearchParametrom_PrioritizujeNazivPaOpisPaAmenities()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_SaSearchParametrom_PrioritizujeNazivPaOpisPaAmenities));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);

            var typeMatchType = new ObjectType { Id = 2, Name = "WiFi resort" };
            ctx.ObjectTypes.Add(typeMatchType);

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Zeta WiFi Palace",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 4,
                    Name = "Gamma Stay",
                    ObjectTypeId = typeMatchType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Alpha Relax",
                    Description = "Savrsen hotel sa jakim wifi signalom",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 3,
                    Name = "Beta Comfort",
                    Amenities = new[] { "WiFi", "Parking" },
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.Images.AddRange(
                new Image { Id = 1, ObjectId = 1, Url = "search-1.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 4, ObjectId = 4, Url = "search-4.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 2, ObjectId = 2, Url = "search-2.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 3, ObjectId = 3, Url = "search-3.jpg", IsMain = true, CreatedAt = DateTime.UtcNow });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetAllAsync(new TouristObjectQueryDto { Search = "wifi" });

            result.TotalCount.Should().Be(4);
            result.Items.Select(x => x.Name).Should().Equal("Zeta WiFi Palace", "Gamma Stay", "Alpha Relax", "Beta Comfort");
        }

        [Fact]
        public async Task GetNearbyAsync_UKruguVracaSamoJavneObjekteSortiranePoUdaljenosti()
        {
            using var ctx = CreateInMemoryContext(nameof(GetNearbyAsync_UKruguVracaSamoJavneObjekteSortiranePoUdaljenosti));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Blizi objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    Geolocation = new Point(18.7705, 42.4243) { SRID = 4326 },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Dalji objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    Geolocation = new Point(18.7750, 42.4280) { SRID = 4326 },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 3,
                    Name = "Van kruga",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Approved,
                    IsActive = true,
                    Geolocation = new Point(18.84, 42.29) { SRID = 4326 },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 4,
                    Name = "Pending objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = true,
                    Geolocation = new Point(18.7706, 42.4244) { SRID = 4326 },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.Images.AddRange(
                new Image { Id = 1, ObjectId = 1, Url = "blizi.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 2, ObjectId = 2, Url = "dalji.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 3, ObjectId = 3, Url = "vankruga.jpg", IsMain = true, CreatedAt = DateTime.UtcNow },
                new Image { Id = 4, ObjectId = 4, Url = "pending.jpg", IsMain = true, CreatedAt = DateTime.UtcNow });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetNearbyAsync(new NearbyTouristObjectQueryDto
            {
                Latitude = 42.4243,
                Longitude = 18.7705,
                RadiusMeters = 1000
            });

            result.TotalCount.Should().Be(2);
            result.Items.Should().HaveCount(2);
            result.Items.Select(x => x.Name).Should().Equal("Blizi objekat", "Dalji objekat");
            result.Items[0].DistanceMeters.Should().NotBeNull();
            result.Items[1].DistanceMeters.Should().NotBeNull();
            result.Items[0].DistanceMeters!.Value.Should().BeLessThan(result.Items[1].DistanceMeters!.Value);
        }

        [Fact]
        public async Task GetByIdAsync_VracaIListuApprovedRecenzija()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_VracaIListuApprovedRecenzija));
            var (objectType, destination, _, locality, _, creator, otherCreator, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat 1",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                LocalityId = locality.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                IsActive = true,
                AverageRating = 5m,
                ReviewCount = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            ctx.Images.Add(new Image
            {
                Id = 1,
                ObjectId = 1,
                Url = "https://test.com/1.jpg",
                IsMain = true,
                CreatedAt = DateTime.UtcNow
            });

            ctx.Reviews.AddRange(
                new Review
                {
                    Id = 1,
                    UserId = creator.Id,
                    User = creator,
                    ObjectId = 1,
                    Rating = 5,
                    Text = "Odlicno",
                    Status = ContentStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new Review
                {
                    Id = 2,
                    UserId = otherCreator.Id,
                    User = otherCreator,
                    ObjectId = 1,
                    Rating = 2,
                    Text = "Pending review",
                    Status = ContentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetByIdAsync(1);

            result.Should().NotBeNull();
            result!.Reviews.Should().HaveCount(1);
            result.Reviews[0].Text.Should().Be("Odlicno");
            result.Reviews[0].UserFullName.Should().Be("Creator C");
        }

        [Fact]
        public async Task GetMyAsync_ContentCreator_VidiSamoSvojeObjekteNezavisnoOdStatusa()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyAsync_ContentCreator_VidiSamoSvojeObjekteNezavisnoOdStatusa));
            var (objectType, destination, _, locality, _, creator, otherCreator, _, _) = SeedBase(ctx);

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Moj pending objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Moj rejected objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Rejected,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 3,
                    Name = "Tudji objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = otherCreator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetMyAsync(creator.Id, new TouristObjectQueryDto { SortBy = "name", SortOrder = "asc" });

            result.TotalCount.Should().Be(2);
            result.Items.Select(x => x.Name).Should().Equal("Moj pending objekat", "Moj rejected objekat");
            result.Items.Select(x => x.Status).Should().Equal("Pending", "Rejected");
        }

        [Fact]
        public async Task GetForManagerAsync_ManagerVidiSamoObjekteSvojeDestinacijeNezavisnoOdStatusa()
        {
            using var ctx = CreateInMemoryContext(nameof(GetForManagerAsync_ManagerVidiSamoObjekteSvojeDestinacijeNezavisnoOdStatusa));
            var (objectType, destination, otherDestination, locality, otherLocality, creator, _, manager, _) = SeedBase(ctx);

            var managerRole = ctx.Roles.Single(r => r.Name == RoleType.Manager);

            var otherManager = new User
            {
                Id = 12,
                FirstName = "Other",
                LastName = "Manager",
                Email = "othermanager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1991, 1, 1)
            };

            ctx.Users.Add(otherManager);
            otherDestination.ManagedByUserId = otherManager.Id;

            ctx.Objects.AddRange(
                new TouristObject
                {
                    Id = 1,
                    Name = "Pending moj objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 2,
                    Name = "Rejected moj objekat",
                    ObjectTypeId = objectType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Rejected,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TouristObject
                {
                    Id = 3,
                    Name = "Objekat druge destinacije",
                    ObjectTypeId = objectType.Id,
                    DestinationId = otherDestination.Id,
                    LocalityId = otherLocality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetForManagerAsync(manager.Id, new TouristObjectQueryDto { SortBy = "name", SortOrder = "asc" });

            result.TotalCount.Should().Be(2);
            result.Items.Select(x => x.Name).Should().Equal("Pending moj objekat", "Rejected moj objekat");
            result.Items.Select(x => x.Status).Should().Equal("Pending", "Rejected");
        }

        [Fact]
        public async Task GetForManagerByIdAsync_OdgovorniManagerMozeDaDobijeIPendingObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetForManagerByIdAsync_OdgovorniManagerMozeDaDobijeIPendingObjekat));
            var (objectType, destination, _, locality, _, creator, _, manager, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Manager pending objekat",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                LocalityId = locality.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            ctx.SaveChanges();

            var svc = CreateService(ctx);
            var result = await svc.GetForManagerByIdAsync(1, manager.Id);

            result.Should().NotBeNull();
            result!.Status.Should().Be("Pending");
            result.Name.Should().Be("Manager pending objekat");
        }

        private class FakeTranslationService : ITranslationService
        {
            public Task<string> GetTextAsync(
                string entityType,
                int entityId,
                string fieldName,
                string originalText,
                string languageCode)
            {
                return Task.FromResult(originalText);
            }

            public Task<string> GetOrCreateTextAsync(
                string entityType,
                int entityId,
                string fieldName,
                string originalText,
                string languageCode)
            {
                return Task.FromResult(originalText);
            }

            public Task GenerateIfMissingAsync(
                string entityType,
                int entityId,
                string fieldName,
                string originalText,
                IEnumerable<string> targetLanguages)
            {
                return Task.CompletedTask;
            }
        }
    }
}
