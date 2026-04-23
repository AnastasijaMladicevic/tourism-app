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

        private static (User tourist, User otherTourist, User creator, User otherCreator, TouristObject approvedObject, TouristObject pendingObject) SeedBase(AppDbContext ctx)
        {
            var touristRole = new Role { Id = 1, Name = RoleType.Tourist };
            var ccRole = new Role { Id = 2, Name = RoleType.ContentCreator };
            var adminRole = new Role { Id = 3, Name = RoleType.Admin };
            ctx.Roles.AddRange(touristRole, ccRole, adminRole);

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            var objectType = new ObjectType { Id = 1, Name = "Muzej" };
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.ObjectTypes.Add(objectType);
            ctx.SaveChanges();

            var tourist = new User { Id = 10, FirstName = "Tourist", LastName = "One", Email = "tourist1@test.com", PasswordHash = "hash", RoleId = 1, Role = touristRole, IsActive = true, DateOfBirth = new DateTime(1998, 1, 1) };
            var otherTourist = new User { Id = 11, FirstName = "Tourist", LastName = "Two", Email = "tourist2@test.com", PasswordHash = "hash", RoleId = 1, Role = touristRole, IsActive = true, DateOfBirth = new DateTime(1997, 1, 1) };
            var creator = new User { Id = 20, FirstName = "Creator", LastName = "One", Email = "creator1@test.com", PasswordHash = "hash", RoleId = 2, Role = ccRole, IsActive = true, DateOfBirth = new DateTime(1995, 1, 1) };
            var otherCreator = new User { Id = 21, FirstName = "Creator", LastName = "Two", Email = "creator2@test.com", PasswordHash = "hash", RoleId = 2, Role = ccRole, IsActive = true, DateOfBirth = new DateTime(1994, 1, 1) };
            var admin = new User { Id = 30, FirstName = "Admin", LastName = "A", Email = "admin@test.com", PasswordHash = "hash", RoleId = 3, Role = adminRole, IsActive = true, DateOfBirth = new DateTime(1989, 1, 1) };
            ctx.Users.AddRange(tourist, otherTourist, creator, otherCreator, admin);
            ctx.SaveChanges();

            var destination = new Destination
            {
                Id = 1,
                Name = "Kotor",
                DestinationTypeId = destinationType.Id,
                DestinationType = destinationType,
                CreatedByUserId = admin.Id,
                CreatedBy = admin,
                Status = ContentStatus.Approved,
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 }
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
                CreatedBy = admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            ctx.Localities.Add(locality);
            ctx.SaveChanges();

            var approvedObject = new TouristObject
            {
                Id = 1,
                Name = "Pomorski muzej",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                DestinationId = destination.Id,
                Destination = destination,
                LocalityId = locality.Id,
                Locality = locality,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Approved,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var pendingObject = new TouristObject
            {
                Id = 2,
                Name = "Pending objekat",
                ObjectTypeId = objectType.Id,
                ObjectType = objectType,
                DestinationId = destination.Id,
                Destination = destination,
                LocalityId = locality.Id,
                Locality = locality,
                CreatedByUserId = creator.Id,
                CreatedBy = creator,
                Status = ContentStatus.Pending,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            ctx.Objects.AddRange(approvedObject, pendingObject);
            ctx.SaveChanges();

            return (tourist, otherTourist, creator, otherCreator, approvedObject, pendingObject);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeFiltriraPoObjectUserRatingIResponse_VracaTrazeniRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeFiltriraPoObjectUserRatingIResponse_VracaTrazeniRezultat));
            var (tourist, otherTourist, creator, _, approvedObject, _) = SeedBase(ctx);

            ctx.Reviews.AddRange(
                new Review
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    ObjectId = approvedObject.Id,
                    Object = approvedObject,
                    Rating = 5,
                    Text = "Fenomenalno mesto",
                    CreatorResponse = "Hvala puno",
                    Status = ContentStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10)
                },
                new Review
                {
                    Id = 2,
                    UserId = otherTourist.Id,
                    User = otherTourist,
                    ObjectId = approvedObject.Id,
                    Object = approvedObject,
                    Rating = 3,
                    Text = "Moze bolje",
                    Status = ContentStatus.Pending,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                });
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.GetAllAsync(new ReviewQueryDto
            {
                Object = "pomorski",
                User = "tourist one",
                MinRating = 5,
                HasResponse = true,
                Status = "Approved"
            });

            result.Items.Should().HaveCount(1);
            result.Items[0].Text.Should().Be("Fenomenalno mesto");
            result.Items[0].UserFullName.Should().Be("Tourist One");
            result.Items[0].ObjectName.Should().Be("Pomorski muzej");
        }

        [Fact]
        public async Task GetAllAsync_KadaSeKoristiPaginacijaISortPoRatingu_VracaTrazeniSegment()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeKoristiPaginacijaISortPoRatingu_VracaTrazeniSegment));
            var (tourist, otherTourist, _, _, approvedObject, _) = SeedBase(ctx);

            ctx.Reviews.AddRange(
                new Review
                {
                    Id = 1,
                    UserId = tourist.Id,
                    User = tourist,
                    ObjectId = approvedObject.Id,
                    Object = approvedObject,
                    Rating = 5,
                    Text = "Sjajno",
                    Status = ContentStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10)
                },
                new Review
                {
                    Id = 2,
                    UserId = otherTourist.Id,
                    User = otherTourist,
                    ObjectId = approvedObject.Id,
                    Object = approvedObject,
                    Rating = 2,
                    Text = "Slabije",
                    Status = ContentStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new Review
                {
                    Id = 3,
                    UserId = tourist.Id,
                    User = tourist,
                    ObjectId = approvedObject.Id,
                    Object = approvedObject,
                    Rating = 4,
                    Text = "Vrlo dobro",
                    Status = ContentStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                });
            ctx.SaveChanges();

            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.GetAllAsync(new ReviewQueryDto
            {
                Page = 2,
                PageSize = 1,
                SortBy = "rating",
                SortOrder = "desc"
            });

            result.Items.Should().HaveCount(1);
            result.TotalCount.Should().Be(3);
            result.Items[0].Rating.Should().Be(4);
            result.Items[0].Text.Should().Be("Vrlo dobro");
        }

        [Fact]
        public async Task CreateAsync_Tourist_KreiraApprovedRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_Tourist_KreiraApprovedRecenziju));
            var (tourist, _, _, _, approvedObject, _) = SeedBase(ctx);
            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateReviewDto
            {
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Odlican objekat"
            }, tourist.Id, "Tourist");

            result.Status.Should().Be("Approved");
            ctx.Reviews.Single().Status.Should().Be(ContentStatus.Approved);
            ctx.Reviews.Single().UserId.Should().Be(tourist.Id);
        }

        [Fact]
        public async Task CreateAsync_NijeTourist_BacaUnauthorized()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NijeTourist_BacaUnauthorized));
            var (_, _, creator, _, approvedObject, _) = SeedBase(ctx);
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = approvedObject.Id,
                Rating = 5,
                Text = "Test"
            }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*tourists*");
        }

        [Fact]
        public async Task CreateAsync_MozeSamoZaApprovedObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_MozeSamoZaApprovedObjekat));
            var (tourist, _, _, _, _, pendingObject) = SeedBase(ctx);
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = pendingObject.Id,
                Rating = 4,
                Text = "Test"
            }, tourist.Id, "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*approved objects*");
        }

        [Fact]
        public async Task CreateAsync_IstiTouristNeMozeDveRecenzijeZaIstiObjekat()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_IstiTouristNeMozeDveRecenzijeZaIstiObjekat));
            var (tourist, _, _, _, approvedObject, _) = SeedBase(ctx);
            ctx.Reviews.Add(new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Prva", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow });
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateReviewDto
            {
                ObjectId = approvedObject.Id,
                Rating = 4,
                Text = "Druga"
            }, tourist.Id, "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already have a review*");
        }

        [Fact]
        public async Task UpdateAsync_Tourist_MenjaSamoSvojuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Tourist_MenjaSamoSvojuRecenziju));
            var (tourist, _, _, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 3, Text = "Staro", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.UpdateAsync(review.Id, new UpdateReviewDto { Rating = 5, Text = "Novo" }, tourist.Id, "Tourist");

            result.Should().NotBeNull();
            result!.Rating.Should().Be(5);
            result.Text.Should().Be("Novo");
        }

        [Fact]
        public async Task UpdateAsync_Tourist_NeMozeTudjuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Tourist_NeMozeTudjuRecenziju));
            var (_, otherTourist, _, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = otherTourist.Id, ObjectId = approvedObject.Id, Rating = 3, Text = "Staro", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(review.Id, new UpdateReviewDto { Text = "Novo" }, 999, "Tourist"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own reviews*");
        }

        [Fact]
        public async Task RespondAsync_ContentCreator_MozeSamoNaSvomObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(RespondAsync_ContentCreator_MozeSamoNaSvomObjektu));
            var (tourist, _, _, otherCreator, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Komentar", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.RespondAsync(review.Id, new RespondToReviewDto { CreatorResponse = "Hvala" }, otherCreator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*own objects*");
        }

        [Fact]
        public async Task RespondAsync_ContentCreator_DodajeOdgovor()
        {
            using var ctx = CreateInMemoryContext(nameof(RespondAsync_ContentCreator_DodajeOdgovor));
            var (tourist, _, creator, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Komentar", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.RespondAsync(review.Id, new RespondToReviewDto { CreatorResponse = "Hvala vam" }, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().Be("Hvala vam");
        }

        [Fact]
        public async Task UpdateResponseAsync_BacaAkoOdgovorNePostoji()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateResponseAsync_BacaAkoOdgovorNePostoji));
            var (tourist, _, creator, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Komentar", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateResponseAsync(review.Id, new RespondToReviewDto { CreatorResponse = "Novo" }, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*no response to update*");
        }

        [Fact]
        public async Task DeleteResponseAsync_BrsiOdgovorSamoContentCreator()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteResponseAsync_BrsiOdgovorSamoContentCreator));
            var (tourist, _, creator, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Komentar", CreatorResponse = "Odgovor", CreatorResponseAt = DateTime.UtcNow, Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            var result = await svc.DeleteResponseAsync(review.Id, creator.Id, "ContentCreator");

            result.Should().NotBeNull();
            result!.CreatorResponse.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_Tourist_MozeDaObriseSvojuRecenziju()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_Tourist_MozeDaObriseSvojuRecenziju));
            var (tourist, _, _, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 4, Text = "Moja", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            var deleted = await svc.DeleteAsync(review.Id, tourist.Id, "Tourist");

            deleted.Should().BeTrue();
            ctx.Reviews.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_NijeTourist_BacaUnauthorized()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NijeTourist_BacaUnauthorized));
            var (tourist, _, creator, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 4, Text = "Moja", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.Add(review);
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(review.Id, creator.Id, "ContentCreator"))
                .Should().ThrowAsync<UnauthorizedAccessException>()
                .WithMessage("*Only tourists can delete reviews*");
        }

        [Fact]
        public async Task CreateAsync_AzuriraReviewCountIAverageRatingNaObjektu()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_AzuriraReviewCountIAverageRatingNaObjektu));
            var (tourist, otherTourist, _, _, approvedObject, _) = SeedBase(ctx);
            ctx.Reviews.Add(new Review { UserId = otherTourist.Id, ObjectId = approvedObject.Id, Rating = 4, Text = "Postojeca", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow });
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.CreateAsync(new CreateReviewDto { ObjectId = approvedObject.Id, Rating = 5, Text = "Nova" }, tourist.Id, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == approvedObject.Id);
            savedObject.ReviewCount.Should().Be(2);
            savedObject.AverageRating.Should().Be(4.5m);
        }

        [Fact]
        public async Task UpdateAsync_AzuriraAverageRatingKadaSePromeniOcena()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_AzuriraAverageRatingKadaSePromeniOcena));
            var (tourist, otherTourist, _, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Stara ocena", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.AddRange(
                review,
                new Review { UserId = otherTourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Druga ocena", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow });
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.UpdateAsync(review.Id, new UpdateReviewDto { Rating = 2 }, tourist.Id, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == approvedObject.Id);
            savedObject.ReviewCount.Should().Be(2);
            savedObject.AverageRating.Should().Be(3.5m);
        }

        [Fact]
        public async Task DeleteAsync_AzuriraAverageRatingKadaSeObriseRecenzija()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_AzuriraAverageRatingKadaSeObriseRecenzija));
            var (tourist, otherTourist, _, _, approvedObject, _) = SeedBase(ctx);
            var review = new Review { UserId = tourist.Id, ObjectId = approvedObject.Id, Rating = 2, Text = "Za brisanje", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow };
            ctx.Reviews.AddRange(
                review,
                new Review { UserId = otherTourist.Id, ObjectId = approvedObject.Id, Rating = 5, Text = "Ostaje", Status = ContentStatus.Approved, CreatedAt = DateTime.UtcNow });
            ctx.SaveChanges();
            var svc = new ReviewService(ctx, CreateMapper());

            await svc.DeleteAsync(review.Id, tourist.Id, "Tourist");

            var savedObject = ctx.Objects.Single(x => x.Id == approvedObject.Id);
            savedObject.ReviewCount.Should().Be(1);
            savedObject.AverageRating.Should().Be(5m);
        }
    }
}
