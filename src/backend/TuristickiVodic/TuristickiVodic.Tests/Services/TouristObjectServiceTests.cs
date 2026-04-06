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
                .UseInMemoryDatabase(dbName)
                .Options;

            return new AppDbContext(options);
        }

        private static IMapper CreateMapper()
        {
            var config = new MapperConfiguration(cfg =>
                cfg.AddProfile<MappingProfile>());
            return config.CreateMapper();
        }

        private static (Role ccRole, Role managerRole, Role adminRole, ObjectType objectType, Destination destination, Locality locality, User creator, User otherCreator, User manager, User admin)
            SeedBase(AppDbContext ctx, bool destinationHasManager = true)
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

            var manager = new User
            {
                Id = 10,
                FirstName = "Manager",
                LastName = "M",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var admin = new User
            {
                Id = 11,
                FirstName = "Admin",
                LastName = "A",
                Email = "admin@test.com",
                PasswordHash = "hash",
                RoleId = adminRole.Id,
                Role = adminRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var creator = new User
            {
                Id = 20,
                FirstName = "Creator",
                LastName = "C",
                Email = "cc@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            var otherCreator = new User
            {
                Id = 21,
                FirstName = "Other",
                LastName = "CC",
                Email = "othercc@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1996, 1, 1)
            };

            ctx.Users.AddRange(manager, admin, creator, otherCreator);
            ctx.SaveChanges();

            var destination = new Destination
            {
                Id = 1,
                Name = "Kotor",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                ManagedByUserId = destinationHasManager ? manager.Id : null,
                CreatedByUserId = admin.Id,
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
                CreatedByUserId = admin.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Localities.Add(locality);
            ctx.SaveChanges();

            return (ccRole, managerRole, adminRole, objectType, destination, locality, creator, otherCreator, manager, admin);
        }

        [Fact]
        public async Task CreateAsync_ContentCreator_KreiraObjekat_StatusJePending()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_KreiraObjekat_StatusJePending));
            var (_, _, _, objectType, _, locality, creator, _, _, _) = SeedBase(ctx);

            var svc = new TouristObjectService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                Longitude = 18.77,
                Latitude = 42.42,
                IsActive = true
            }, creator.Id, "ContentCreator");

            result.Name.Should().Be("Pomorski muzej");

            var saved = ctx.Objects.First();
            saved.Status.Should().Be(ContentStatus.Pending);
            saved.CreatedByUserId.Should().Be(creator.Id);
        }

        [Fact]
        public async Task CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId));
            var (_, _, _, objectType, destination, locality, creator, _, _, _) = SeedBase(ctx);

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id
            }, creator.Id, "ContentCreator");

            ctx.Objects.First().DestinationId.Should().Be(destination.Id);
        }

        [Fact]
        public async Task CreateAsync_NepostojeciLocality_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NepostojeciLocality_BacaException));
            var (_, _, _, objectType, _, _, creator, _, _, _) = SeedBase(ctx);

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = 999
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Locality not found*");
        }

        [Fact]
        public async Task UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojObjekat));
            var (_, _, _, objectType, destination, locality, creator, otherCreator, _, _) = SeedBase(ctx);

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

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateTouristObjectDto
            {
                Name = "Novo ime"
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own objects*");
        }

        [Fact]
        public async Task UpdateAsync_ApprovedObjekat_OstajeApproved()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ApprovedObjekat_OstajeApproved));
            var (_, _, _, objectType, destination, locality, creator, _, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.UpdateAsync(1, new UpdateTouristObjectDto
            {
                Name = "Novo ime"
            }, creator.Id, "ContentCreator");

            ctx.Objects.First().Status.Should().Be(ContentStatus.Approved);
        }

        [Fact]
        public async Task ApproveAsync_Manager_OdobravaPendingObjekatUSvojojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_OdobravaPendingObjekatUSvojojDestinaciji));
            var (_, _, _, objectType, destination, locality, creator, _, manager, _) = SeedBase(ctx);

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

            var svc = new TouristObjectService(ctx, CreateMapper());

            var result = await svc.ApproveAsync(1, new ApproveContentDto
            {
                Approve = true
            }, manager.Id, "Manager");

            result!.Status.Should().Be("Approved");
        }

        [Fact]
        public async Task ApproveAsync_Manager_NeMozeVanSvojeDestinacije()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_NeMozeVanSvojeDestinacije));
            var (_, _, _, objectType, _, locality, creator, _, manager, admin) = SeedBase(ctx);

            var otherDestinationType = ctx.DestinationTypes.First();
            var localityType = ctx.LocalityTypes.First();

            var otherDestination = new Destination
            {
                Id = 2,
                Name = "Budva",
                DestinationTypeId = otherDestinationType.Id,
                DestinationType = otherDestinationType,
                ManagedByUserId = 999,
                CreatedByUserId = admin.Id,
                Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(otherDestination);
            ctx.SaveChanges();

            var otherLocality = new Locality
            {
                Id = 2,
                Name = "Stari grad Budva",
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                LocalityTypeId = localityType.Id,
                LocalityType = localityType,
                CreatedByUserId = admin.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Localities.Add(otherLocality);
            ctx.SaveChanges();

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = otherLocality.Id,
                Locality = otherLocality,
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(1, new ApproveContentDto
            {
                Approve = true
            }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*responsible manager for this destination*");
        }

        [Fact]
        public async Task ApproveAsync_Admin_NeOdobravaDirektno_BacaUnauthorizedAccessException()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Admin_NeOdobravaDirektno_BacaUnauthorizedAccessException));
            var (_, _, _, objectType, destination, locality, creator, _, _, admin) = SeedBase(ctx, destinationHasManager: false);

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

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(1, new ApproveContentDto
            {
                Approve = true
            }, admin.Id, "Admin"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Admins do not directly approve tourist objects*");
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_MozeDirektnoDaObriseSamoSvojPendingObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_MozeDirektnoDaObriseSamoSvojPendingObjekat));
            var (_, _, _, objectType, destination, locality, creator, _, _, _) = SeedBase(ctx);

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

            var svc = new TouristObjectService(ctx, CreateMapper());

            var result = await svc.DeleteAsync(1, creator.Id, "ContentCreator");

            result.Should().BeTrue();
            ctx.Objects.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_ApprovedObjekat_NeBriseSeDirektno()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ApprovedObjekat_NeBriseSeDirektno));
            var (_, _, _, objectType, destination, locality, creator, _, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat",
                ObjectTypeId = objectType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new TouristObjectService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(1, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*approved object directly*");
        }
    }
}