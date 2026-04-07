using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class ManagerReportServiceTests
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
            User manager, User otherManager, User admin, User contentCreator, User otherContentCreator, User tourist,
            Destination destination, Destination otherDestination, Locality locality, Locality otherLocality,
            ObjectType objectType, EventType eventType) SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var ccRole = new Role { Id = 2, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 3, Name = RoleType.Manager };
            var adminRole = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(touristRole, ccRole, managerRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var objectType = new ObjectType { Id = 1, Name = "Muzej" };
            var eventType = new EventType { Id = 1, Name = "Festival" };
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ObjectTypes.Add(objectType);
            ctx.EventTypes.Add(eventType);
            ctx.SaveChanges();

            var manager = new User
            {
                Id = 10,
                FirstName = "Manager",
                LastName = "One",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            var otherManager = new User
            {
                Id = 11,
                FirstName = "Manager",
                LastName = "Two",
                Email = "manager2@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1991, 1, 1)
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
                DateOfBirth = new DateTime(1989, 1, 1)
            };
            var contentCreator = new User
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
            var otherContentCreator = new User
            {
                Id = 21,
                FirstName = "Creator",
                LastName = "Two",
                Email = "creator2@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1996, 1, 1)
            };
            var tourist = new User
            {
                Id = 22,
                FirstName = "Tourist",
                LastName = "T",
                Email = "tourist@test.com",
                PasswordHash = "hash",
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                DateOfBirth = new DateTime(1997, 1, 1)
            };
            ctx.Users.AddRange(manager, otherManager, admin, contentCreator, otherContentCreator, tourist);
            ctx.SaveChanges();

            var destination = new Destination
            {
                Id = 1,
                Name = "Kotor",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                ManagedByUserId = manager.Id,
                ManagedBy = manager,
                CreatedByUserId = admin.Id,
                CreatedBy = admin,
                Status = ContentStatus.Approved
            };
            var otherDestination = new Destination
            {
                Id = 2,
                Name = "Budva",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                ManagedByUserId = otherManager.Id,
                ManagedBy = otherManager,
                CreatedByUserId = admin.Id,
                CreatedBy = admin,
                Status = ContentStatus.Approved
            };
            ctx.Destinations.AddRange(destination, otherDestination);
            ctx.SaveChanges();

            manager.ManagedDestinationId = destination.Id;
            manager.ManagedDestination = destination;
            otherManager.ManagedDestinationId = otherDestination.Id;
            otherManager.ManagedDestination = otherDestination;
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
                CreatedBy = admin,
                IsActive = true
            };
            var otherLocality = new Locality
            {
                Id = 2,
                Name = "Centar",
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                LocalityTypeId = localityType.Id,
                LocalityType = localityType,
                CreatedByUserId = admin.Id,
                CreatedBy = admin,
                IsActive = true
            };
            ctx.Localities.AddRange(locality, otherLocality);
            ctx.SaveChanges();

            return (touristRole, ccRole, managerRole, adminRole, manager, otherManager, admin, contentCreator, otherContentCreator, tourist, destination, otherDestination, locality, otherLocality, objectType, eventType);
        }

        [Fact]
        public async Task CreateAsync_ManagerMozeDaPrijaviSamoContentCreatorSaObjektomUIstojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ManagerMozeDaPrijaviSamoContentCreatorSaObjektomUIstojDestinaciji));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, objectType, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Muzej mora",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved
            });
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var result = await service.CreateAsync(new CreateManagerReportDto
            {
                ReportedUserId = creator.Id,
                Reason = "Neprimeren sadrzaj"
            }, manager.Id);

            result.Should().NotBeNull();
            result.ManagerId.Should().Be(manager.Id);
            result.ReportedUserId.Should().Be(creator.Id);
            result.Status.Should().Be("Pending");
            ctx.ManagerReports.Should().ContainSingle();
        }

        [Fact]
        public async Task CreateAsync_KadPostojiPendingPrijavaZaIstogContentCreatora_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_KadPostojiPendingPrijavaZaIstogContentCreatora_BacaException));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, objectType, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Muzej",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved
            });

            ctx.ManagerReports.Add(new ManagerReport
            {
                Id = 1,
                ManagerId = manager.Id,
                ReportedUserId = creator.Id,
                Reason = "Prva prijava",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            await service.Invoking(s => s.CreateAsync(new CreateManagerReportDto
            {
                ReportedUserId = creator.Id,
                Reason = "Druga prijava"
            }, manager.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*pending report*");
        }

        [Fact]
        public async Task GetForManagerAsync_ManagerVidiSamoSvojePrijave()
        {
            using var ctx = CreateInMemoryContext(nameof(GetForManagerAsync_ManagerVidiSamoSvojePrijave));
            var (_, _, _, _, manager, otherManager, _, creator, otherCreator, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.ManagerReports.AddRange(
                new ManagerReport { Id = 1, ManagerId = manager.Id, ReportedUserId = creator.Id, Reason = "R1", Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow },
                new ManagerReport { Id = 2, ManagerId = otherManager.Id, ReportedUserId = otherCreator.Id, Reason = "R2", Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
            );
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var result = (await service.GetForManagerAsync(manager.Id)).ToList();

            result.Should().HaveCount(1);
            result[0].ManagerId.Should().Be(manager.Id);
            result[0].Reason.Should().Be("R1");
        }

        [Fact]
        public async Task GetAllAsync_AdminVidiSvePrijave()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_AdminVidiSvePrijave));
            var (_, _, _, _, manager, otherManager, _, creator, otherCreator, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.ManagerReports.AddRange(
                new ManagerReport { Id = 1, ManagerId = manager.Id, ReportedUserId = creator.Id, Reason = "R1", Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow },
                new ManagerReport { Id = 2, ManagerId = otherManager.Id, ReportedUserId = otherCreator.Id, Reason = "R2", Status = ContentStatus.Rejected, CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
            );
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var result = (await service.GetAllAsync()).ToList();

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task ReviewAsync_AdminOdobriPrijavu_KorisnikGubiCCPostajeTouristBivaBlacklisted()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_AdminOdobriPrijavu_KorisnikGubiCCPostajeTouristBivaBlacklisted));
            var (touristRole, ccRole, _, _, manager, _, admin, creator, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.ManagerReports.Add(new ManagerReport
            {
                Id = 1,
                ManagerId = manager.Id,
                Manager = manager,
                ReportedUserId = creator.Id,
                ReportedUser = creator,
                Reason = "Neprimeren sadrzaj",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var result = await service.ReviewAsync(1, new ReviewManagerReportDto
            {
                Approve = true
            }, admin.Id);

            result.Should().NotBeNull();

            var updatedUser = await ctx.Users.FindAsync(creator.Id);
            updatedUser.Should().NotBeNull();
            updatedUser!.RoleId.Should().Be(touristRole.Id);
            updatedUser.Role.Should().NotBeNull();
            updatedUser.Role!.Name.Should().Be(RoleType.Tourist);
            updatedUser.IsBlacklisted.Should().BeTrue();

            var updatedReport = await ctx.ManagerReports.FindAsync(1);
            updatedReport.Should().NotBeNull();
            updatedReport!.Status.Should().Be(ContentStatus.Approved);
            updatedReport.ResolvedByUserId.Should().Be(admin.Id);
            updatedReport.ResolvedAt.Should().NotBeNull();

            ccRole.Name.Should().Be(RoleType.ContentCreator);
        }

        [Fact]
        public async Task WithdrawAsync_ManagerMozeDaPovuceSamoSvojuPendingPrijavu()
        {
            using var ctx = CreateInMemoryContext(nameof(WithdrawAsync_ManagerMozeDaPovuceSamoSvojuPendingPrijavu));
            var (_, _, _, _, manager, otherManager, _, creator, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.ManagerReports.AddRange(
                new ManagerReport { Id = 1, ManagerId = manager.Id, ReportedUserId = creator.Id, Reason = "Moja", Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow },
                new ManagerReport { Id = 2, ManagerId = otherManager.Id, ReportedUserId = creator.Id, Reason = "Tudja", Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow }
            );
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var deleted = await service.WithdrawAsync(1, manager.Id);

            deleted.Should().BeTrue();
            ctx.ManagerReports.Should().HaveCount(1);

            await service.Invoking(s => s.WithdrawAsync(2, manager.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*only their own reports*");
        }

        [Fact]
        public async Task CreateAsync_ContentCreatorSaAktivnoscuAliBezObjektaIEventa_KreiraPrijavu()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreatorSaAktivnoscuAliBezObjektaIEventa_KreiraPrijavu));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, _, _) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Setnja",
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved
            });
            ctx.SaveChanges();

            var service = new ManagerReportService(ctx);

            var result = await service.CreateAsync(new CreateManagerReportDto
            {
                ReportedUserId = creator.Id,
                Reason = "Neprimeren sadrzaj"
            }, manager.Id);

            result.Should().NotBeNull();
            result.ReportedUserId.Should().Be(creator.Id);
            result.ManagerId.Should().Be(manager.Id);
            result.Status.Should().Be("Pending");
            ctx.ManagerReports.Should().ContainSingle();
        }
    }
}