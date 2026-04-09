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
    public class EventServiceTests
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

        private static (Role ccRole, Role managerRole, Role adminRole, EventType eventType, Destination destination,
            Destination otherDestination, Locality locality, Locality otherLocality, User creator, User otherCreator,
            User manager, User otherManager, User admin)
            SeedBase(AppDbContext ctx)
        {
            var ccRole = new Role { Id = 1, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };
            var adminRole = new Role { Id = 3, Name = RoleType.Admin };
            ctx.Roles.AddRange(ccRole, managerRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var eventType = new EventType { Id = 1, Name = "Koncert" };
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.EventTypes.Add(eventType);
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

            var otherManager = new User
            {
                Id = 11,
                FirstName = "Other",
                LastName = "Manager",
                Email = "othermanager@test.com",
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
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var creator = new User
            {
                Id = 20,
                FirstName = "Creator",
                LastName = "C",
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
                FirstName = "Other",
                LastName = "Creator",
                Email = "othercreator@test.com",
                PasswordHash = "hash",
                RoleId = ccRole.Id,
                Role = ccRole,
                IsActive = true,
                DateOfBirth = new DateTime(1996, 1, 1)
            };

            ctx.Users.AddRange(manager, otherManager, admin, creator, otherCreator);
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
                Status = ContentStatus.Approved,
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 }
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
                Status = ContentStatus.Approved,
                Geolocation = new Point(18.84, 42.29) { SRID = 4326 }
            };

            ctx.Destinations.AddRange(destination, otherDestination);
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
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var otherLocality = new Locality
            {
                Id = 2,
                Name = "Centar Budve",
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                LocalityTypeId = localityType.Id,
                LocalityType = localityType,
                CreatedByUserId = admin.Id,
                CreatedBy = admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Localities.AddRange(locality, otherLocality);
            ctx.SaveChanges();

            return (ccRole, managerRole, adminRole, eventType, destination, otherDestination, locality, otherLocality,
                creator, otherCreator, manager, otherManager, admin);
        }

        [Fact]
        public async Task CreateAsync_ContentCreator_KreiraEvent_StatusJePending()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_KreiraEvent_StatusJePending));
            var (_, _, _, eventType, _, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var eventTypeId = eventType.Id;
            var localityId = locality.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateEventDto
            {
                Name = "Sea Dance",
                EventTypeId = eventTypeId,
                LocalityId = localityId,
                StartDate = new DateTime(2026, 5, 1, 18, 0, 0, DateTimeKind.Utc)
            }, creatorId, "ContentCreator");

            result.Name.Should().Be("Sea Dance");
            result.Status.Should().Be("Pending");

            var saved = ctx.Events.Single();
            saved.Status.Should().Be(ContentStatus.Pending);
            saved.CreatedByUserId.Should().Be(creatorId);
        }

        [Fact]
        public async Task CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var eventTypeId = eventType.Id;
            var localityId = locality.Id;
            var destinationId = destination.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = eventTypeId,
                LocalityId = localityId,
                StartDate = new DateTime(2026, 5, 2, 20, 0, 0, DateTimeKind.Utc)
            }, creatorId, "ContentCreator");

            result.Should().NotBeNull();
            result.DestinationId.Should().Be(destinationId);

            ctx.Events.Single().DestinationId.Should().Be(destinationId);
        }

        [Fact]
        public async Task CreateAsync_LocalityIDestinationNisuKonzistentni_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_LocalityIDestinationNisuKonzistentni_BacaException));
            var (_, _, _, eventType, _, otherDestination, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var eventTypeId = eventType.Id;
            var localityId = locality.Id;
            var otherDestinationId = otherDestination.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = eventTypeId,
                LocalityId = localityId,
                DestinationId = otherDestinationId,
                StartDate = new DateTime(2026, 5, 3, 20, 0, 0, DateTimeKind.Utc)
            }, creatorId, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Locality does not belong to the specified destination*");
        }

        [Fact]
        public async Task UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojEvent()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojEvent));
            var (_, _, _, eventType, destination, _, locality, _, creator, otherCreator, _, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Tudji event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = otherCreator.Id,
                CreatedBy = otherCreator,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 5, 4, 19, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateEventDto { Name = "Novo ime" }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own events*");
        }

        [Fact]
        public async Task UpdateAsync_ApprovedEvent_OstajeApproved()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ApprovedEvent_OstajeApproved));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Approved event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                StartDate = new DateTime(2026, 5, 5, 19, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.UpdateAsync(1, new UpdateEventDto { Name = "Novo ime" }, creator.Id, "ContentCreator");

            ctx.Events.Single().Status.Should().Be(ContentStatus.Approved);
            ctx.Events.Single().Name.Should().Be("Novo ime");
        }

        [Fact]
        public async Task UpdateAsync_Manager_NeMozeDaMenjaSadrzajEventa()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Manager_NeMozeDaMenjaSadrzajEventa));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Event",
                EventTypeId = eventType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 5, 6, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateEventDto { Name = "Novo ime" }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only content creators can update events.*");
        }

        [Fact]
        public async Task ApproveAsync_Manager_OdobravaPendingEventUSvojojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_OdobravaPendingEventUSvojojDestinaciji));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            var ev = new Event
            {
                Id = 1,
                Name = "Pending event",
                EventTypeId = eventType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 5, 7, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Events.Add(ev);
            ctx.SaveChanges();

            ctx.Images.Add(new Image
            {
                Id = 1,
                EventId = ev.Id,
                Url = "event-main.jpg",
                IsMain = true
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.ApproveAsync(1, new ApproveContentDto { Approve = true }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");

            var saved = ctx.Events.Single();
            saved.Status.Should().Be(ContentStatus.Approved);
            saved.ApprovedByUserId.Should().Be(manager.Id);
            saved.ApprovedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task ApproveAsync_Manager_NeMozeVanSvojeDestinacije()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_NeMozeVanSvojeDestinacije));
            var (_, _, _, eventType, _, otherDestination, _, otherLocality, creator, _, manager, _, _) = SeedBase(ctx);

            var ev = new Event
            {
                Name = "Pending event",
                EventTypeId = eventType.Id,
                LocalityId = otherLocality.Id,
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 5, 8, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Events.Add(ev);
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(ev.Id, new ApproveContentDto { Approve = true }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_MozeDirektnoDaObriseSvojNeodobrenEvent()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_MozeDirektnoDaObriseSvojNeodobrenEvent));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Pending event",
                EventTypeId = eventType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 5, 9, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            var deleted = await svc.DeleteAsync(1, creator.Id, "ContentCreator");

            deleted.Should().BeTrue();
            ctx.Events.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_NeMozeDirektnoDaObriseApprovedEvent()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_NeMozeDirektnoDaObriseApprovedEvent));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Approved event",
                EventTypeId = eventType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                StartDate = new DateTime(2026, 5, 10, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(1, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Submit a deletion request*");
        }

        [Fact]
        public async Task GetAllAsync_ZaOdredjeniDan_VracaSamoEventoveZaTajDan()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_ZaOdredjeniDan_VracaSamoEventoveZaTajDan));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Events.AddRange(
                new Event
                {
                    Id = 1,
                    Name = "Danas",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = new DateTime(2026, 6, 1, 10, 0, 0, DateTimeKind.Utc),
                    EndDate = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc)
                },
                new Event
                {
                    Id = 2,
                    Name = "Sutra",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = new DateTime(2026, 6, 2, 10, 0, 0, DateTimeKind.Utc)
                });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.GetAllAsync(new EventFilterDto { Date = new DateTime(2026, 6, 1) });

            result.Should().HaveCount(1);
            result.Single().Name.Should().Be("Danas");
        }

        [Fact]
        public async Task GetAllAsync_Narednih7Dana_VracaSamoEventoveUOpsegu()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_Narednih7Dana_VracaSamoEventoveUOpsegu));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var today = DateTime.UtcNow.Date;

            ctx.Events.AddRange(
                new Event
                {
                    Id = 1,
                    Name = "Za 3 dana",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = today.AddDays(3)
                },
                new Event
                {
                    Id = 2,
                    Name = "Za 10 dana",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = today.AddDays(10)
                });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.GetAllAsync(new EventFilterDto { NextDays = 7 });

            result.Select(x => x.Name).Should().ContainSingle().Which.Should().Be("Za 3 dana");
        }

        [Fact]
        public async Task GetAllAsync_OdDoDatuma_VracaEventoveUKoriscenomOpsegu()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_OdDoDatuma_VracaEventoveUKoriscenomOpsegu));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Events.AddRange(
                new Event
                {
                    Id = 1,
                    Name = "Prvi",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = new DateTime(2026, 7, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                new Event
                {
                    Id = 2,
                    Name = "Drugi",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = new DateTime(2026, 7, 15, 10, 0, 0, DateTimeKind.Utc)
                },
                new Event
                {
                    Id = 3,
                    Name = "Treci",
                    EventTypeId = eventType.Id,
                    LocalityId = locality.Id,
                    DestinationId = destination.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    StartDate = new DateTime(2026, 8, 1, 10, 0, 0, DateTimeKind.Utc)
                });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            var result = await svc.GetAllAsync(new EventFilterDto
            {
                StartDate = new DateTime(2026, 7, 1),
                EndDate = new DateTime(2026, 7, 31)
            });

            result.Should().HaveCount(2);
            result.Select(x => x.Name).Should().Contain(new[] { "Prvi", "Drugi" });
        }

        [Fact]
        public async Task GetAllAsync_NextDaysRazlicitOd7I30_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_NextDaysRazlicitOd7I30_BacaException));
            SeedBase(ctx);
            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.GetAllAsync(new EventFilterDto { NextDays = 5 }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*NextDays can only be 7 or 30.*");
        }

        [Fact]
        public async Task ApproveAsync_EventBezMainSlike_BacaGresku()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_EventBezMainSlike_BacaGresku));
            var (_, _, _, eventType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Event",
                EventTypeId = eventType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                StartDate = new DateTime(2026, 7, 1, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new EventService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(1, new ApproveContentDto { Approve = true }, manager.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*main image*");
        }

        [Fact]
        public async Task ApproveAsync_EventSaMainSlikom_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_EventSaMainSlikom_Uspeh));

            var managerRole = new Role
            {
                Id = 3,
                Name = RoleType.Manager
            };

            var destinationType = new DestinationType
            {
                Id = 1,
                Name = "Primorje"
            };

            var eventType = new EventType
            {
                Id = 1,
                Name = "Festival"
            };

            var manager = new User
            {
                Id = 10,
                FirstName = "M",
                LastName = "Manager",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1985, 1, 1),
                ManagedDestinationId = 1
            };

            var destination = new Destination
            {
                Id = 1,
                Name = "Destinacija",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                CreatedByUserId = 1,
                ManagedByUserId = manager.Id,
                Status = ContentStatus.Approved
            };

            var ev = new Event
            {
                Id = 1,
                Name = "Event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = 5,
                StartDate = DateTime.UtcNow.AddDays(1),
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Roles.Add(managerRole);
            ctx.DestinationTypes.Add(destinationType);
            ctx.EventTypes.Add(eventType);
            ctx.Users.Add(manager);
            ctx.Destinations.Add(destination);
            ctx.Events.Add(ev);
            ctx.Images.Add(new Image
            {
                Id = 1,
                EventId = ev.Id,
                Url = "img.jpg",
                IsMain = true
            });

            ctx.SaveChanges();

            var service = new EventService(ctx, CreateMapper());

            var result = await service.ApproveAsync(
                1,
                new ApproveContentDto { Approve = true },
                manager.Id,
                "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");
        }
    }
}
