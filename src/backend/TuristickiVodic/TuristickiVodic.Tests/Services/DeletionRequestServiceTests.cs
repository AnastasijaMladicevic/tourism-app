using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class DeletionRequestServiceTests
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
            User manager, User otherManager, User admin, User creator, User otherCreator, User tourist,
            Destination destination, Destination otherDestination,
            Locality locality, Locality otherLocality,
            ObjectType objectType, EventType eventType, ActivityType activityType) SeedBase(AppDbContext ctx)
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
            var activityType = new ActivityType { Id = 1, Name = "Tura" };
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ObjectTypes.Add(objectType);
            ctx.EventTypes.Add(eventType);
            ctx.ActivityTypes.Add(activityType);
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
            var otherCreator = new User
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
            ctx.Users.AddRange(manager, otherManager, admin, creator, otherCreator, tourist);
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

            return (touristRole, ccRole, managerRole, adminRole, manager, otherManager, admin, creator, otherCreator, tourist,
                destination, otherDestination, locality, otherLocality, objectType, eventType, activityType);
        }

        [Fact]
        public async Task CreateForObjectAsync_ContentCreatorMozeZaSvojApprovedObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForObjectAsync_ContentCreatorMozeZaSvojApprovedObjekat));
            var (_, _, _, _, _, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
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

            var service = new DeletionRequestService(ctx);

            var result = await service.CreateForObjectAsync(1, new CreateDeletionRequestDto { Reason = "Zastareo sadrzaj" }, creator.Id);

            result.Should().NotBeNull();
            result.ObjectId.Should().Be(1);
            result.RequestedByUserId.Should().Be(creator.Id);
            result.Status.Should().Be("Pending");
            ctx.DeletionRequests.Should().ContainSingle();
        }

        [Fact]
        public async Task CreateForObjectAsync_KadaNijeVlasnik_BacaUnauthorized()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForObjectAsync_KadaNijeVlasnik_BacaUnauthorized));
            var (_, _, _, _, _, _, _, creator, otherCreator, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
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

            var service = new DeletionRequestService(ctx);

            await service.Invoking(s => s.CreateForObjectAsync(1, new CreateDeletionRequestDto(), otherCreator.Id))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own objects*");
        }

        [Fact]
        public async Task CreateForObjectAsync_KadaObjekatNijeApproved_BacaInvalidOperation()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForObjectAsync_KadaObjekatNijeApproved_BacaInvalidOperation));
            var (_, _, _, _, _, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pending objekat",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Pending
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            await service.Invoking(s => s.CreateForObjectAsync(1, new CreateDeletionRequestDto(), creator.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only approved objects*");
        }

        [Fact]
        public async Task CreateForObjectAsync_KadaVecPostojiPendingZaIstiObjekat_BacaInvalidOperation()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForObjectAsync_KadaVecPostojiPendingZaIstiObjekat_BacaInvalidOperation));
            var (_, _, _, _, _, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
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
            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ObjectId = 1,
                RequestedByUserId = creator.Id,
                Reason = "Prvi zahtev",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            await service.Invoking(s => s.CreateForObjectAsync(1, new CreateDeletionRequestDto(), creator.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already pending*");
        }

        [Fact]
        public async Task CreateForEventAsync_ContentCreatorMozeZaSvojApprovedEvent()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForEventAsync_ContentCreatorMozeZaSvojApprovedEvent));
            var (_, _, _, _, _, _, _, creator, _, _, destination, _, locality, _, _, eventType, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Karneval",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                StartDate = DateTime.UtcNow.AddDays(5)
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.CreateForEventAsync(1, new CreateDeletionRequestDto { Reason = "Otktazan dogadjaj" }, creator.Id);

            result.Should().NotBeNull();
            result.EventId.Should().Be(1);
            result.RequestedByUserId.Should().Be(creator.Id);
            result.Status.Should().Be("Pending");
            ctx.DeletionRequests.Should().ContainSingle();
        }

        [Fact]
        public async Task CreateForEventAsync_KadaVecPostojiPendingZaIstiEvent_BacaInvalidOperation()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateForEventAsync_KadaVecPostojiPendingZaIstiEvent_BacaInvalidOperation));
            var (_, _, _, _, _, _, _, creator, _, _, destination, _, locality, _, _, eventType, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Karneval",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                StartDate = DateTime.UtcNow.AddDays(5)
            });
            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                EventId = 1,
                RequestedByUserId = creator.Id,
                Reason = "Prvi zahtev",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            await service.Invoking(s => s.CreateForEventAsync(1, new CreateDeletionRequestDto(), creator.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already pending*");
        }

        [Fact]
        public async Task GetByUserIdAsync_ContentCreatorVidiSamoSvojeZahteve()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByUserIdAsync_ContentCreatorVidiSamoSvojeZahteve));
            var (_, _, _, _, _, _, _, creator, otherCreator, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.DeletionRequests.AddRange(
                new DeletionRequest { Id = 1, RequestedByUserId = creator.Id, ObjectId = 100, Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new DeletionRequest { Id = 2, RequestedByUserId = otherCreator.Id, EventId = 200, Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow.AddMinutes(-5), UpdatedAt = DateTime.UtcNow }
            );
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = (await service.GetByUserIdAsync(creator.Id)).ToList();

            result.Should().HaveCount(1);
            result[0].RequestedByUserId.Should().Be(creator.Id);
            result[0].ObjectId.Should().Be(100);
        }

        [Fact]
        public async Task GetByIdForUserAsync_KadaJeTudjiZahtev_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdForUserAsync_KadaJeTudjiZahtev_VracaNull));
            var (_, _, _, _, _, _, _, creator, otherCreator, _, _, _, _, _, _, _, _) = SeedBase(ctx);

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                RequestedByUserId = otherCreator.Id,
                EventId = 200,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.GetByIdForUserAsync(1, creator.Id);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAllAsync_ManagerVidiSamoZahteveZaSvojuDestinaciju()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_ManagerVidiSamoZahteveZaSvojuDestinaciju));
            var (_, _, _, _, manager, otherManager, _, creator, otherCreator, _, destination, otherDestination, locality, otherLocality, objectType, eventType, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Objekat u Kotoru",
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
            ctx.Events.Add(new Event
            {
                Id = 2,
                Name = "Event u Budvi",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = otherLocality.Id,
                Locality = otherLocality,
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                CreatedByUserId = otherCreator.Id,
                CreatedBy = otherCreator,
                Status = ContentStatus.Approved,
                StartDate = DateTime.UtcNow.AddDays(3)
            });
            ctx.SaveChanges();

            ctx.DeletionRequests.AddRange(
                new DeletionRequest { Id = 1, ObjectId = 1, RequestedByUserId = creator.Id, Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new DeletionRequest { Id = 2, EventId = 2, RequestedByUserId = otherCreator.Id, Status = ContentStatus.Pending, CreatedAt = DateTime.UtcNow.AddMinutes(-5), UpdatedAt = DateTime.UtcNow }
            );
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = (await service.GetAllAsync(manager.Id, "Manager")).ToList();

            result.Should().HaveCount(1);
            result[0].ObjectId.Should().Be(1);
            result[0].RequestedByUserId.Should().Be(creator.Id);
        }

        [Fact]
        public async Task ReviewAsync_ManagerZaSvojuDestinacijuOdobriZahtev_BriseObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_ManagerZaSvojuDestinacijuOdobriZahtev_BriseObjekat));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
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

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ObjectId = 1,
                RequestedByUserId = creator.Id,
                RequestedBy = creator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.ReviewAsync(1, new ApproveDeletionRequestDto { Approve = true }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");
            result.ReviewedByUserId.Should().Be(manager.Id);
            (await ctx.Objects.FindAsync(1)).Should().BeNull();
        }

        [Fact]
        public async Task ReviewAsync_KadaManagerNijeZaTudjuDestinaciju_BacaUnauthorized()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_KadaManagerNijeZaTudjuDestinaciju_BacaUnauthorized));
            var (_, _, _, _, manager, _, _, _, otherCreator, _, _, otherDestination, _, otherLocality, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Budva muzej",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = otherLocality.Id,
                Locality = otherLocality,
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                CreatedByUserId = otherCreator.Id,
                CreatedBy = otherCreator,
                Status = ContentStatus.Approved
            });
            ctx.SaveChanges();

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ObjectId = 1,
                RequestedByUserId = otherCreator.Id,
                RequestedBy = otherCreator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            await service.Invoking(s => s.ReviewAsync(1, new ApproveDeletionRequestDto { Approve = true }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task ReviewAsync_KadaManagerOdbijeZahtev_ZapisOstajeAUContentSeNeBrise()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_KadaManagerOdbijeZahtev_ZapisOstajeAUContentSeNeBrise));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

            ctx.Objects.Add(new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
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

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ObjectId = 1,
                RequestedByUserId = creator.Id,
                RequestedBy = creator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.ReviewAsync(1, new ApproveDeletionRequestDto { Approve = false, RejectionReason = "Ne prihvata se" }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Rejected");
            result.RejectionReason.Should().Be("Ne prihvata se");
            (await ctx.Objects.FindAsync(1)).Should().NotBeNull();
            (await ctx.DeletionRequests.FindAsync(1)).Should().NotBeNull();
        }

        [Fact]
        public async Task ReviewAsync_KadaManagerOdobriZahtev_ZapisSeBriseZbogCascadeKonfiguracije()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_KadaManagerOdobriZahtev_ZapisSeBriseZbogCascadeKonfiguracije));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, objectType, _, _) = SeedBase(ctx);

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
            ctx.SaveChanges();

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ObjectId = 1,
                RequestedByUserId = creator.Id,
                RequestedBy = creator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.ReviewAsync(1, new ApproveDeletionRequestDto
            {
                Approve = true
            }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");

            var requestAfterReview = await ctx.DeletionRequests.FindAsync(1);
            requestAfterReview.Should().BeNull();

            var objectAfterReview = await ctx.Objects.FindAsync(1);
            objectAfterReview.Should().BeNull();
        }

        [Fact]
        public async Task ReviewAsync_KadaJeAktivnostOdobrena_BriseAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(ReviewAsync_KadaJeAktivnostOdobrena_BriseAktivnost));
            var (_, _, _, _, manager, _, _, creator, _, _, destination, _, locality, _, _, _, activityType) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Setnja",
                ActivityTypeId = activityType.Id,
                ActivityType = activityType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                IsActive = true
            });
            ctx.SaveChanges();

            ctx.DeletionRequests.Add(new DeletionRequest
            {
                Id = 1,
                ActivityId = 1,
                RequestedByUserId = creator.Id,
                RequestedBy = creator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var service = new DeletionRequestService(ctx);

            var result = await service.ReviewAsync(1, new ApproveDeletionRequestDto
            {
                Approve = true
            }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");

            var deletedActivity = await ctx.Activities.FindAsync(1);
            deletedActivity.Should().BeNull();
        }
    }
}