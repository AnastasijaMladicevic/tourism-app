using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Services
{
    public class EventPlannerServiceTests
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

        private static (User tourist, User otherTourist, User manager,
            Destination destination, Locality locality, EventType eventType) SeedBase(AppDbContext ctx)
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
            var eventType = new EventType { Id = 1, Name = "Festival" };

            ctx.Users.AddRange(tourist, otherTourist, manager);
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.EventTypes.Add(eventType);
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
            ctx.SaveChanges();

            return (tourist, otherTourist, manager, destination, locality, eventType);
        }

        [Fact]
        public async Task GetMyPlannerAsync_VracaSamoStavkeTrenutnogKorisnika()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyPlannerAsync_VracaSamoStavkeTrenutnogKorisnika));
            var (tourist, otherTourist, _, destination, locality, eventType) = SeedBase(ctx);

            var event1 = new Event
            {
                Id = 1,
                Name = "Koncert",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(3),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            var event2 = new Event
            {
                Id = 2,
                Name = "Festival",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(5),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            var event3 = new Event
            {
                Id = 3,
                Name = "Tudji event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = otherTourist.Id,
                StartDate = DateTime.UtcNow.AddDays(4),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            ctx.Events.AddRange(event1, event2, event3);

            ctx.EventPlannerItems.AddRange(
                new EventPlannerItem
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = event1.Id,
                    Event = event1,
                    AddedAt = DateTime.UtcNow.AddMinutes(-10)
                },
                new EventPlannerItem
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = event2.Id,
                    Event = event2,
                    AddedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new EventPlannerItem
                {
                    Id = 3,
                    UserId = otherTourist.Id,
                    User = otherTourist,
                    EventId = event3.Id,
                    Event = event3,
                    AddedAt = DateTime.UtcNow
                });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            var result = await service.GetMyPlannerAsync(tourist.Id, new EventPlannerQueryDto());

            result.Items.Should().HaveCount(2);
            result.Items.Should().OnlyContain(x => x.UserId == tourist.Id);
            result.Items.Select(x => x.EventName).Should().Contain(new[] { "Koncert", "Festival" });
        }

        [Fact]
        public async Task GetMyPlannerAsync_KadaSeFiltriraPoDestinacijiTipuIStatusu_VracaTrazeniRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyPlannerAsync_KadaSeFiltriraPoDestinacijiTipuIStatusu_VracaTrazeniRezultat));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            var concert = new Event
            {
                Id = 1,
                Name = "Koncert",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(3),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            var pendingEvent = new Event
            {
                Id = 2,
                Name = "Pending festival",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(5),
                Status = ContentStatus.Pending,
                IsActive = true
            };

            ctx.Events.AddRange(concert, pendingEvent);
            ctx.EventPlannerItems.AddRange(
                new EventPlannerItem
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = concert.Id,
                    Event = concert,
                    AddedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new EventPlannerItem
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = pendingEvent.Id,
                    Event = pendingEvent,
                    AddedAt = DateTime.UtcNow.AddMinutes(-2)
                });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            var result = await service.GetMyPlannerAsync(tourist.Id, new EventPlannerQueryDto
            {
                Destination = "kotor",
                EventType = "festival",
                Status = "Approved",
                IsActive = true
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].EventName.Should().Be("Koncert");
            result.Items[0].DestinationName.Should().Be("Kotor");
        }

        [Fact]
        public async Task GetMyPlannerAsync_KadaSeKoristiPaginacijaISortPoAddedAt_VracaTrazeniSegment()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyPlannerAsync_KadaSeKoristiPaginacijaISortPoAddedAt_VracaTrazeniSegment));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            var event1 = new Event
            {
                Id = 1,
                Name = "Koncert",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(3),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            var event2 = new Event
            {
                Id = 2,
                Name = "Festival",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(4),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            ctx.Events.AddRange(event1, event2);
            ctx.EventPlannerItems.AddRange(
                new EventPlannerItem
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = event1.Id,
                    Event = event1,
                    AddedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new EventPlannerItem
                {
                    Id = 2,
                    UserId = tourist.Id,
                    User = tourist,
                    EventId = event2.Id,
                    Event = event2,
                    AddedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            var result = await service.GetMyPlannerAsync(tourist.Id, new EventPlannerQueryDto
            {
                Page = 2,
                PageSize = 1,
                SortBy = "addedAt",
                SortOrder = "desc"
            });

            result.Items.Should().HaveCount(1);
            result.TotalCount.Should().Be(2);
            result.Items[0].EventName.Should().Be("Koncert");
        }

        [Fact]
        public async Task AddAsync_TouristMozeDaDodaAktivanIOdobrenBuduciEvent()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_TouristMozeDaDodaAktivanIOdobrenBuduciEvent));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Sea Dance",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(7),
                EndDate = DateTime.UtcNow.AddDays(7).AddHours(2),
                Status = ContentStatus.Approved,
                IsActive = true
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            var result = await service.AddAsync(new CreateEventPlannerDto { EventId = 1 }, tourist.Id);

            result.Should().NotBeNull();
            result.EventId.Should().Be(1);
            result.UserId.Should().Be(tourist.Id);
            result.EventName.Should().Be("Sea Dance");
            result.Status.Should().Be("Approved");
            ctx.EventPlannerItems.Should().ContainSingle();
        }

        [Fact]
        public async Task AddAsync_IstiEventNeMozeDvaPutaDaSeDodaIstomKorisniku()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_IstiEventNeMozeDvaPutaDaSeDodaIstomKorisniku));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            var ev = new Event
            {
                Id = 1,
                Name = "Festival",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(3),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            ctx.Events.Add(ev);
            ctx.EventPlannerItems.Add(new EventPlannerItem
            {
                Id = 1,
                UserId = tourist.Id,
                User = tourist,
                EventId = ev.Id,
                Event = ev,
                AddedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateEventPlannerDto { EventId = 1 }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already in your planner*");
        }

        [Fact]
        public async Task AddAsync_NeaktivanEventNeMozeDaSeDoda()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_NeaktivanEventNeMozeDaSeDoda));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Neaktivan event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(2),
                Status = ContentStatus.Approved,
                IsActive = false
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateEventPlannerDto { EventId = 1 }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only active events*");
        }

        [Fact]
        public async Task AddAsync_NeodobrenEventNeMozeDaSeDoda()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_NeodobrenEventNeMozeDaSeDoda));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Pending event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(2),
                Status = ContentStatus.Pending,
                IsActive = true
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateEventPlannerDto { EventId = 1 }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only approved events*");
        }

        [Fact]
        public async Task AddAsync_ProsliEventNeMozeDaSeDoda()
        {
            using var ctx = CreateInMemoryContext(nameof(AddAsync_ProsliEventNeMozeDaSeDoda));
            var (tourist, _, _, destination, locality, eventType) = SeedBase(ctx);

            ctx.Events.Add(new Event
            {
                Id = 1,
                Name = "Prosli event",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(-3),
                EndDate = DateTime.UtcNow.AddDays(-2),
                Status = ContentStatus.Approved,
                IsActive = true
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            await service.Invoking(s => s.AddAsync(new CreateEventPlannerDto { EventId = 1 }, tourist.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Past events cannot be added*");
        }

        [Fact]
        public async Task RemoveAsync_KorisnikMozeDaUkloniSamoSvojuStavku()
        {
            using var ctx = CreateInMemoryContext(nameof(RemoveAsync_KorisnikMozeDaUkloniSamoSvojuStavku));
            var (tourist, otherTourist, _, destination, locality, eventType) = SeedBase(ctx);

            var ev = new Event
            {
                Id = 1,
                Name = "Festival",
                EventTypeId = eventType.Id,
                EventType = eventType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = tourist.Id,
                StartDate = DateTime.UtcNow.AddDays(4),
                Status = ContentStatus.Approved,
                IsActive = true
            };

            ctx.Events.Add(ev);
            ctx.EventPlannerItems.Add(new EventPlannerItem
            {
                Id = 100,
                UserId = otherTourist.Id,
                User = otherTourist,
                EventId = ev.Id,
                Event = ev,
                AddedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var service = new EventPlannerService(ctx);

            var removed = await service.RemoveAsync(100, tourist.Id);

            removed.Should().BeFalse();
            ctx.EventPlannerItems.Should().ContainSingle(x => x.Id == 100);
        }
    }
}
