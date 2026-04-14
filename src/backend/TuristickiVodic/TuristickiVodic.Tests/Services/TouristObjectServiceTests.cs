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

        private static TouristObjectService CreateService(AppDbContext ctx) => new(ctx, CreateMapper());

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
        public async Task CreateAsync_ContentCreator_KreiraObjekat_SaObaveznomDestinacijom()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_KreiraObjekat_SaObaveznomDestinacijom));
            var (objectType, destination, _, locality, _, creator, _, _, _) = SeedBase(ctx);
            var svc = CreateService(ctx);

            var result = await svc.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = objectType.Id,
                DestinationId = destination.Id,
                LocalityId = locality.Id,
                Longitude = 18.77,
                Latitude = 42.42,
            }, creator.Id, "ContentCreator");

            result.Name.Should().Be("Pomorski muzej");
            ctx.Objects.Single().DestinationId.Should().Be(destination.Id);
            ctx.Objects.Single().LocalityId.Should().Be(locality.Id);
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
        public async Task UpdateAsync_LocalityMoraPripadatiNovojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_LocalityMoraPripadatiNovojDestinaciji));
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

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateTouristObjectDto { LocalityId = otherLocality.Id }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*does not belong to the selected destination*");
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
    }
}
