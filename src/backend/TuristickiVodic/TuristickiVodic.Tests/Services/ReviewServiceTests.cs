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
    public class ReviewServiceTests
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
            Destination destination, Destination otherDestination,
            Locality locality, Locality otherLocality,
            ObjectType objectType,
            User tourist, User otherTourist,
            User creator, User otherCreator,
            User manager, User otherManager, User admin,
            TouristObject approvedObject, TouristObject pendingObject, TouristObject otherApprovedObject)
            SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var ccRole = new Role { Id = 2, Name = RoleType.ContentCreator };
            var managerRole = new Role { Id = 3, Name = RoleType.Manager };
            var adminRole = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(touristRole, ccRole, managerRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var objectType = new ObjectType { Id = 1, Name = "Muzej" };

            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ObjectTypes.Add(objectType);
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
                Email = "creator1@test.com",
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
                DateOfBirth = new DateTime(1994, 1, 1)
            };

            var manager = new User
            {
                Id = 30,
                FirstName = "Manager",
                LastName = "One",
                Email = "manager1@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var otherManager = new User
            {
                Id = 31,
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

            ctx.Users.AddRange(tourist, otherTourist, creator, otherCreator, manager, otherManager, admin);
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

            var approvedObject = new TouristObject
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
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var pendingObject = new TouristObject
            {
                Id = 2,
                Name = "Pending objekat",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = locality.Id,
                Locality = locality,
                DestinationId = destination.Id,
                Destination = destination,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var otherApprovedObject = new TouristObject
            {
                Id = 3,
                Name = "Budva muzej",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                LocalityId = otherLocality.Id,
                Locality = otherLocality,
                DestinationId = otherDestination.Id,
                Destination = otherDestination,
                CreatedByUserId = otherCreator.Id,
                CreatedBy = otherCreator,
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Objects.AddRange(approvedObject, pendingObject, otherApprovedObject);
            ctx.SaveChanges();

            return (touristRole, ccRole, managerRole, adminRole,
                destination, otherDestination, locality, otherLocality, objectType,
                tourist, otherTourist, creator, otherCreator, manager, otherManager, admin,
                approvedObject, pendingObject, otherApprovedObject);
        }

        [Fact]
        public async Task CreateAsync_Tourist_MozeDaNapiseRecenzijuZaApprovedObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_Tourist_MozeDaNapiseRecenzijuZaApprovedObjekat));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var objectId = approvedObject.Id;
            var touristId = tourist.Id;
            ctx.ChangeTracker.Clear();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateReviewDto
            {
                ObjectId = objectId,
                Rating = 5,
                Text = "Odlican objekat"
            }, touristId, "Tourist");

            result.Rating.Should().Be(5);
            result.Status.Should().Be("Pending");
            ctx.Reviews.Single().UserId.Should().Be(touristId);
            ctx.Reviews.Single().ObjectId.Should().Be(objectId);
            ctx.Reviews.Single().Status.Should().Be(ContentStatus.Pending);
        }

        [Fact]
        public async Task CreateAsync_NijeTourist_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NijeTourist_BacaException));
            var (_, _, _, _, _, _, _, _, _, _, _, creator, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Test"
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only tourists can write reviews*");
        }

        [Fact]
        public async Task CreateAsync_MozeSamoZaApprovedObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_MozeSamoZaApprovedObjekat));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, _, _, _, _, pendingObject, _) = SeedBase(ctx);

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = pendingObject.Id,
                Rating = 4,
                Text = "Nije odobren"
            }, tourist.Id, "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*approved objects*");
        }

        [Fact]
        public async Task CreateAsync_JedanTouristMozeImatiSamoJednuRecenzijuPoObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_JedanTouristMozeImatiSamoJednuRecenzijuPoObjektu));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            ctx.Reviews.Add(new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Postojeca",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = approvedObject.Id,
                Rating = 3,
                Text = "Nova"
            }, tourist.Id, "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already have a review*");
        }

        [Fact]
        public async Task UpdateAsync_Tourist_MozeDaMenjaSamoSvojuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Tourist_MozeDaMenjaSamoSvojuRecenziju));
            var (_, _, _, _, _, _, _, _, _, tourist, otherTourist, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = otherTourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Tudja recenzija",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(review.Id, new UpdateReviewDto
            {
                Rating = 2,
                Text = "Novo"
            }, tourist.Id, "Tourist"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own reviews*");
        }

        [Fact]
        public async Task UpdateAsync_Tourist_MenjaSvojuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Tourist_MenjaSvojuRecenziju));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Stari tekst",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.UpdateAsync(review.Id, new UpdateReviewDto
            {
                Rating = 5,
                Text = "Novi tekst"
            }, tourist.Id, "Tourist");

            result.Should().NotBeNull();
            result!.Rating.Should().Be(5);
            result.Text.Should().Be("Novi tekst");
        }

        [Fact]
        public async Task RespondAsync_ContentCreator_MozeSamoNaRecenzijeSvojihObjekata()
        {
            using var ctx = CreateInMemoryContext(nameof(RespondAsync_ContentCreator_MozeSamoNaRecenzijeSvojihObjekata));
            var (_, _, _, _, _, _, _, _, _, tourist, _, creator, _, _, _, _, _, _, otherApprovedObject) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = otherApprovedObject.Id,
                Object = otherApprovedObject,
                Rating = 4,
                Text = "Komentar",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.RespondAsync(review.Id, new RespondToReviewDto
            {
                CreatorResponse = "Hvala"
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own objects*");
        }

        [Fact]
        public async Task RespondAsync_ContentCreator_DodajeOdgovor()
        {
            using var ctx = CreateInMemoryContext(nameof(RespondAsync_ContentCreator_DodajeOdgovor));
            var (_, _, _, _, _, _, _, _, _, tourist, _, creator, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.RespondAsync(review.Id, new RespondToReviewDto
            {
                CreatorResponse = "Hvala vam"
            }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().Be("Hvala vam");
            result.CreatorResponseAt.Should().NotBeNull();
        }

        [Fact]
        public async Task UpdateResponseAsync_ContentCreator_MenjaSvojOdgovor()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateResponseAsync_ContentCreator_MenjaSvojOdgovor));
            var (_, _, _, _, _, _, _, _, _, tourist, _, creator, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                CreatorResponse = "Stari odgovor",
                CreatorResponseAt = DateTime.UtcNow.AddDays(-1),
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.UpdateResponseAsync(review.Id, new RespondToReviewDto
            {
                CreatorResponse = "Novi odgovor"
            }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().Be("Novi odgovor");
        }

        [Fact]
        public async Task DeleteResponseAsync_ContentCreator_BriseSvojOdgovor()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteResponseAsync_ContentCreator_BriseSvojOdgovor));
            var (_, _, _, _, _, _, _, _, _, tourist, _, creator, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                CreatorResponse = "Odgovor",
                CreatorResponseAt = DateTime.UtcNow,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.DeleteResponseAsync(review.Id, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().BeNull();
            result.CreatorResponseAt.Should().BeNull();
        }

        [Fact]
        public async Task DeleteResponseAsync_Manager_MozeDaObriseOdgovorUSvojojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteResponseAsync_Manager_MozeDaObriseOdgovorUSvojojDestinaciji));
            var (_, _, _, _, _, _, _, _, _, tourist, _, creator, _, manager, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                CreatorResponse = "Odgovor",
                CreatorResponseAt = DateTime.UtcNow,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.DeleteResponseAsync(review.Id, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().BeNull();
        }

        [Fact]
        public async Task ApproveAsync_Manager_OdobravaRecenzijuUSvojojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_OdobravaRecenzijuUSvojojDestinaciji));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, manager, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.ApproveAsync(review.Id, new ApproveReviewDto { Approve = true }, manager.Id, "Manager");

            result.Should().NotBeNull();
            result!.Status.Should().Be("Approved");
            ctx.Reviews.Single().ReviewedByUserId.Should().Be(manager.Id);
        }

        [Fact]
        public async Task ApproveAsync_Manager_NeMozeVanSvojeDestinacije()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveAsync_Manager_NeMozeVanSvojeDestinacije));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, manager, _, _, _, _, otherApprovedObject) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = otherApprovedObject.Id,
                Object = otherApprovedObject,
                Rating = 5,
                Text = "Super",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.ApproveAsync(review.Id, new ApproveReviewDto { Approve = true }, manager.Id, "Manager"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task DeleteAsync_Tourist_MozeDaObriseSvojuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_Tourist_MozeDaObriseSvojuRecenziju));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Moja recenzija",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var deleted = await svc.DeleteAsync(review.Id, tourist.Id, "Tourist");

            deleted.Should().BeTrue();
            ctx.Reviews.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_Tourist_NeMozeDaObriseTudjuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_Tourist_NeMozeDaObriseTudjuRecenziju));
            var (_, _, _, _, _, _, _, _, _, tourist, otherTourist, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = otherTourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Tudja recenzija",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(review.Id, tourist.Id, "Tourist"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own reviews*");
        }

        [Fact]
        public async Task DeleteAsync_Manager_MozeDaObriseRecenzijuUSvojojDestinaciji()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_Manager_MozeDaObriseRecenzijuUSvojojDestinaciji));
            var (_, _, _, _, _, _, _, _, _, tourist, _, _, _, manager, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Object = approvedObject,
                Rating = 5,
                Text = "Super",
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var deleted = await svc.DeleteAsync(review.Id, manager.Id, "Manager");

            deleted.Should().BeTrue();
            ctx.Reviews.Should().BeEmpty();
        }

        [Fact]
        public async Task CreateAsync_AzuriraReviewCountIAverageRatingNaObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_AzuriraReviewCountIAverageRatingNaObjektu));
            var (_, _, _, _, _, _, _, _, _, tourist, otherTourist, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            ctx.Reviews.Add(new Review
            {
                UserId = otherTourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Postojeca recenzija",
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var objectId = approvedObject.Id;
            var touristId = tourist.Id;
            ctx.ChangeTracker.Clear();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.CreateAsync(new CreateReviewDto
            {
                ObjectId = objectId,
                Rating = 5,
                Text = "Nova recenzija"
            }, touristId, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == objectId);
            savedObject.ReviewCount.Should().Be(2);
            savedObject.AverageRating.Should().Be(4.5m);
        }

        [Fact]
        public async Task UpdateAsync_AzuriraAverageRatingNaObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_AzuriraAverageRatingNaObjektu));
            var (_, _, _, _, _, _, _, _, _, tourist, otherTourist, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review1 = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Prva",
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            var review2 = new Review
            {
                UserId = otherTourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 3,
                Text = "Druga",
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Reviews.AddRange(review1, review2);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.UpdateAsync(review1.Id, new UpdateReviewDto
            {
                Rating = 1,
                Text = "Izmenjena"
            }, tourist.Id, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == approvedObject.Id);
            savedObject.ReviewCount.Should().Be(2);
            savedObject.AverageRating.Should().Be(2.0m);
        }

        [Fact]
        public async Task DeleteAsync_AzuriraReviewCountIAverageRatingNaObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_AzuriraReviewCountIAverageRatingNaObjektu));
            var (_, _, _, _, _, _, _, _, _, tourist, otherTourist, _, _, _, _, _, approvedObject, _, _) = SeedBase(ctx);

            var review1 = new Review
            {
                UserId = tourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Prva",
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            var review2 = new Review
            {
                UserId = otherTourist.Id,
                ObjectId = approvedObject.Id,
                Rating = 3,
                Text = "Druga",
                Status = ContentStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Reviews.AddRange(review1, review2);
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            await svc.DeleteAsync(review1.Id, tourist.Id, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == approvedObject.Id);
            savedObject.ReviewCount.Should().Be(1);
            savedObject.AverageRating.Should().Be(3.0m);
        }
    }
}