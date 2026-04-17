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
    public class ActivityServiceTests
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

        private static ActivityService CreateService(AppDbContext ctx)
        {
            return new ActivityService(ctx, CreateMapper());
        }

        private static (Role ccRole, Role managerRole, Role adminRole, ActivityType activityType,
            Destination destination, Destination otherDestination, Locality locality, Locality otherLocality,
            User creator, User otherCreator, User manager, User otherManager, User admin)
            SeedBase(AppDbContext ctx)
        {
            var ccRole = new Role { Id = 1, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };
            var adminRole = new Role { Id = 3, Name = RoleType.Admin };
            ctx.Roles.AddRange(ccRole, managerRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var activityType = new ActivityType { Id = 1, Name = "Setnja" };

            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ActivityTypes.Add(activityType);
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

            return (ccRole, managerRole, adminRole, activityType, destination, otherDestination, locality, otherLocality,
                creator, otherCreator, manager, otherManager, admin);
        }

        [Fact]
        public async Task CreateAsync_ContentCreator_KreiraAktivnost_StatusJePending()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_KreiraAktivnost_StatusJePending));
            var (_, _, _, activityType, _, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activityTypeId = activityType.Id;
            var localityId = locality.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new ActivityService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateActivityDto
            {
                Name = "Pesacka tura",
                ActivityTypeId = activityTypeId,
                LocalityId = localityId
            }, creatorId, "ContentCreator");

            result.Name.Should().Be("Pesacka tura");
            result.Status.Should().Be("Pending");

            var saved = ctx.Activities.Single();
            saved.Status.Should().Be(ContentStatus.Pending);
            saved.CreatedByUserId.Should().Be(creatorId);
        }

        [Fact]
        public async Task CreateAsync_NijeContentCreator_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NijeContentCreator_BacaException));
            var (_, _, _, activityType, _, _, locality, _, _, _, manager, _, _) = SeedBase(ctx);

            var activityTypeId = activityType.Id;
            var localityId = locality.Id;
            var managerId = manager.Id;

            ctx.ChangeTracker.Clear();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateActivityDto
            {
                Name = "Tura",
                ActivityTypeId = activityTypeId,
                LocalityId = localityId
            }, managerId, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only content creators can create activities*");
        }

        [Fact]
        public async Task CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_DestinationIdSeAutomatskiPreuzimaIzLocalityId));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activityTypeId = activityType.Id;
            var localityId = locality.Id;
            var destinationId = destination.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.CreateAsync(new CreateActivityDto
            {
                Name = "Setnja",
                ActivityTypeId = activityTypeId,
                LocalityId = localityId
            }, creatorId, "ContentCreator");

            ctx.Activities.Single().DestinationId.Should().Be(destinationId);
        }

        [Fact]
        public async Task CreateAsync_ContentCreator_PostavljaIsActiveNaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ContentCreator_PostavljaIsActiveNaFalse));
            var (_, _, _, activityType, _, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var svc = CreateService(ctx);

            var dto = new CreateActivityDto
            {
                Name = "Planinarenje",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                Longitude = 18.77,
                Latitude = 42.42
            };

            var result = await svc.CreateAsync(dto, creator.Id, "ContentCreator");

            result.Should().NotBeNull();

            var saved = ctx.Activities.First();
            saved.Name.Should().Be("Planinarenje");
            saved.Status.Should().Be(ContentStatus.Pending);
            saved.IsActive.Should().BeTrue();
            saved.CreatedByUserId.Should().Be(creator.Id);
        }

        [Fact]
        public async Task CreateAsync_LocalityIDestinationNisuKonzistentni_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_LocalityIDestinationNisuKonzistentni_BacaException));
            var (_, _, _, activityType, _, otherDestination, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activityTypeId = activityType.Id;
            var localityId = locality.Id;
            var otherDestinationId = otherDestination.Id;
            var creatorId = creator.Id;

            ctx.ChangeTracker.Clear();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateActivityDto
            {
                Name = "Setnja",
                ActivityTypeId = activityTypeId,
                LocalityId = localityId,
                DestinationId = otherDestinationId
            }, creatorId, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Locality does not belong to the specified destination*");
        }

        [Fact]
        public async Task UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojuAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ContentCreator_MozeDaMenjaSamoSvojuAktivnost));
            var (_, _, _, activityType, destination, _, locality, _, creator, otherCreator, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Tudja aktivnost",
                ActivityTypeId = activityType.Id,
                ActivityType = activityType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = otherCreator.Id,
                CreatedBy = otherCreator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(activity.Id, new UpdateActivityDto { Name = "Novo ime" }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own activities*");
        }

        [Fact]
        public async Task UpdateAsync_NijeContentCreator_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_NijeContentCreator_BacaException));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(activity.Id, new UpdateActivityDto { Name = "Novo ime" }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only content creators can update activities*");
        }

        [Fact]
        public async Task UpdateAsync_ApprovedAktivnost_OstajeApproved()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_ApprovedAktivnost_OstajeApproved));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Approved aktivnost",
                ActivityTypeId = activityType.Id,
                ActivityType = activityType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.UpdateAsync(activity.Id, new UpdateActivityDto { Name = "Novo ime" }, creator.Id, "ContentCreator");

            ctx.Activities.Single().Status.Should().Be(ContentStatus.Approved);
            ctx.Activities.Single().Name.Should().Be("Novo ime");
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_MozeDirektnoDaObriseSvojuAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_MozeDirektnoDaObriseSvojuAktivnost));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            var deleted = await svc.DeleteAsync(activity.Id, creator.Id, "ContentCreator");

            deleted.Should().BeTrue();
            ctx.Activities.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_NeMozeDaObriseTudjuAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_NeMozeDaObriseTudjuAktivnost));
            var (_, _, _, activityType, destination, _, locality, _, creator, otherCreator, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Tudja aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = otherCreator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(activity.Id, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own activities*");
        }

        [Fact]
        public async Task DeleteAsync_NijeContentCreator_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NijeContentCreator_BacaException));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(activity.Id, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only content creators can delete activities*");
        }

        [Fact]
        public async Task DeleteAsync_ContentCreator_NeMozeDirektnoDaObriseApprovedAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ContentCreator_NeMozeDirektnoDaObriseApprovedAktivnost));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Name = "Approved aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Activities.Add(activity);
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(activity.Id, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Submit a deletion request instead*");
        }

        [Fact]
        public async Task ApproveAsync_AktivnostBezMainSlike_BacaGresku()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_AktivnostBezMainSlike_BacaGresku));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(1, new ApproveContentDto { Approve = true }, manager.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*main image*");
        }

        [Fact]
        public async Task ApproveAsync_AktivnostSaMainSlikom_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_AktivnostSaMainSlikom_Uspeh));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Aktivnost",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            ctx.Images.Add(new Image
            {
                ActivityId = 1,
                Url = "img.jpg",
                IsMain = true
            });

            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());

            var result = await svc.ApproveAsync(1, new ApproveContentDto { Approve = true }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");
        }

        [Fact]
        public async Task GetByIdAsync_PostojiSaMainSlikom_VracaDto()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_PostojiSaMainSlikom_VracaDto));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            var activity = new Activity
            {
                Id = 1,
                Name = "Setnja",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved,
                IsActive = true
            };

            ctx.Activities.Add(activity);

            ctx.Images.Add(new Image
            {
                ActivityId = activity.Id,
                Url = "main.jpg",
                IsMain = true,
                CreatedAt = DateTime.UtcNow
            });

            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());
            var result = await svc.GetByIdAsync(1);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Setnja");
        }

        [Fact]
        public async Task GetByIdAsync_BezMainSlike_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_BezMainSlike_VracaNull));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, _, _, _) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Setnja",
                ActivityTypeId = activityType.Id,
                LocalityId = locality.Id,
                DestinationId = destination.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Approved
            });

            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());
            var result = await svc.GetByIdAsync(1);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetMyAsync_ContentCreator_VidiSamoSvojeAktivnostiNezavisnoOdStatusa()
        {
            using var ctx = CreateInMemoryContext(nameof(GetMyAsync_ContentCreator_VidiSamoSvojeAktivnostiNezavisnoOdStatusa));
            var (_, _, _, activityType, destination, _, locality, _, creator, otherCreator, _, _, _) = SeedBase(ctx);

            ctx.Activities.AddRange(
                new Activity
                {
                    Id = 1,
                    Name = "Moja pending aktivnost",
                    ActivityTypeId = activityType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Activity
                {
                    Id = 2,
                    Name = "Moja rejected aktivnost",
                    ActivityTypeId = activityType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Rejected,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Activity
                {
                    Id = 3,
                    Name = "Tudja aktivnost",
                    ActivityTypeId = activityType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = otherCreator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());
            var result = await svc.GetMyAsync(creator.Id, new ActivityQueryDto { SortBy = "name", SortOrder = "asc" });

            result.TotalCount.Should().Be(2);
            result.Items.Select(x => x.Name).Should().Equal("Moja pending aktivnost", "Moja rejected aktivnost");
            result.Items.Select(x => x.Status).Should().Equal("Pending", "Rejected");
        }

        [Fact]
        public async Task GetForManagerAsync_ManagerVidiSamoAktivnostiSvojeDestinacijeNezavisnoOdStatusa()
        {
            using var ctx = CreateInMemoryContext(nameof(GetForManagerAsync_ManagerVidiSamoAktivnostiSvojeDestinacijeNezavisnoOdStatusa));
            var (_, _, _, activityType, destination, otherDestination, locality, otherLocality, creator, _, manager, otherManager, _) = SeedBase(ctx);

            ctx.Activities.AddRange(
                new Activity
                {
                    Id = 1,
                    Name = "Pending moja aktivnost",
                    ActivityTypeId = activityType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Activity
                {
                    Id = 2,
                    Name = "Rejected moja aktivnost",
                    ActivityTypeId = activityType.Id,
                    DestinationId = destination.Id,
                    LocalityId = locality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Rejected,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Activity
                {
                    Id = 3,
                    Name = "Aktivnost druge destinacije",
                    ActivityTypeId = activityType.Id,
                    DestinationId = otherDestination.Id,
                    LocalityId = otherLocality.Id,
                    CreatedByUserId = creator.Id,
                    Status = ContentStatus.Pending,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            manager.ManagedDestinationId = destination.Id;
            otherManager.ManagedDestinationId = otherDestination.Id;
            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());
            var result = await svc.GetForManagerAsync(manager.Id, new ActivityQueryDto { SortBy = "name", SortOrder = "asc" });

            result.TotalCount.Should().Be(2);
            result.Items.Select(x => x.Name).Should().Equal("Pending moja aktivnost", "Rejected moja aktivnost");
            result.Items.Select(x => x.Status).Should().Equal("Pending", "Rejected");
        }

        [Fact]
        public async Task GetForManagerByIdAsync_OdgovorniManagerMozeDaDobijeIPendingAktivnost()
        {
            using var ctx = CreateInMemoryContext(nameof(GetForManagerByIdAsync_OdgovorniManagerMozeDaDobijeIPendingAktivnost));
            var (_, _, _, activityType, destination, _, locality, _, creator, _, manager, _, _) = SeedBase(ctx);

            ctx.Activities.Add(new Activity
            {
                Id = 1,
                Name = "Manager pending aktivnost",
                ActivityTypeId = activityType.Id,
                DestinationId = destination.Id,
                LocalityId = locality.Id,
                CreatedByUserId = creator.Id,
                Status = ContentStatus.Pending,
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            ctx.SaveChanges();

            var svc = new ActivityService(ctx, CreateMapper());
            var result = await svc.GetForManagerByIdAsync(1, manager.Id);

            result.Should().NotBeNull();
            result!.Status.Should().Be("Pending");
            result.Name.Should().Be("Manager pending aktivnost");
        }
    }
}
