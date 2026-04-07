using AutoMapper;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Services.Mappings;
using Xunit;
using FluentAssertions;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Tests.Mappings
{
    /// <summary>
    /// Testovi za MappingProfile pokrivaju:
    /// - Konfiguracija je validna (AssertConfigurationIsValid)
    /// - User -> UserDto pravilno mapira RoleName i polja
    /// - CreateUserDto -> User postavlja defaulte (IsActive=true, IsBlacklisted=false itd.)
    /// - UpdateUserDto -> User ignorise null vrednosti (ForAllMembers + Condition)
    /// - Destination -> DestinationDto mapira Geolocation X/Y u Longitude/Latitude i Status kao string
    /// </summary>
    public class MappingProfileTests
    {
        private readonly IMapper _mapper;

        public MappingProfileTests()
        {
            var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
            config.AssertConfigurationIsValid(); // Odmah pada ako nešto nije mapirano
            _mapper = config.CreateMapper();
        }

        // ═══════════════════════════════════════════
        //  Konfiguracija
        // ═══════════════════════════════════════════

        [Fact]
        public void MappingProfile_KonfiguracijaJeValidna_NemaBacenjaException()
        {
            // AssertConfigurationIsValid je već pozvan u konstruktoru.
            // Ovaj test eksplicitno dokumentuje da je konfiguracija validna.
            var action = () => new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>())
                .AssertConfigurationIsValid();
            action.Should().NotThrow();
        }

        // ═══════════════════════════════════════════
        //  User -> UserDto
        // ═══════════════════════════════════════════

        [Fact]
        public void UserToUserDto_MapiraRoleNameIzRoleEnum()
        {
            var user = new User
            {
                Id = 1, FirstName = "Marko", LastName = "Marković",
                Email = "marko@test.com", PasswordHash = "hash",
                IsActive = true, IsVerified = false, IsBlacklisted = false,
                Language = "sr", DateOfBirth = new DateTime(1990, 1, 1),
                CreatedAt = DateTime.UtcNow,
                Role = new Role { Id = 1, Name = RoleType.Tourist },
                RoleId = 1
            };

            var dto = _mapper.Map<UserDto>(user);

            dto.Id.Should().Be(1);
            dto.FirstName.Should().Be("Marko");
            dto.LastName.Should().Be("Marković");
            dto.Email.Should().Be("marko@test.com");
            dto.RoleName.Should().Be("Tourist");
            dto.IsActive.Should().BeTrue();
            dto.IsVerified.Should().BeFalse();
        }

        [Fact]
        public void UserToUserDto_AdminUloga_MapiraSeKaoAdmin()
        {
            var user = new User
            {
                Id = 2, FirstName = "Admin", LastName = "A", Email = "admin@test.com",
                PasswordHash = "hash", IsActive = true, IsVerified = true,
                Language = "sr", DateOfBirth = new DateTime(1980, 1, 1),
                Role = new Role { Id = 4, Name = RoleType.Admin }, RoleId = 4
            };

            var dto = _mapper.Map<UserDto>(user);

            dto.RoleName.Should().Be("Admin");
        }

        // ═══════════════════════════════════════════
        //  CreateUserDto -> User
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateUserDtoToUser_MapiraOsnovnaPolja()
        {
            var dto = new CreateUserDto
            {
                FirstName = "Stefan", LastName = "Stefanović",
                Email = "stefan@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 6, 15),
                PhoneNumber = "0641234567", Country = "Srbija", Language = "sr"
            };

            var user = _mapper.Map<User>(dto);

            user.FirstName.Should().Be("Stefan");
            user.LastName.Should().Be("Stefanović");
            user.Email.Should().Be("stefan@test.com");
            user.PhoneNumber.Should().Be("0641234567");
            user.Country.Should().Be("Srbija");
            user.Language.Should().Be("sr");
            // PasswordHash se ne mapira — Ignore
            user.PasswordHash.Should().BeNullOrEmpty();
        }

        [Fact]
        public void CreateUserDtoToUser_IsActiveJeTrue_IsBlacklistedJeFalse()
        {
            // Novi korisnik mora biti aktivan i ne na blacklisti
            var dto = new CreateUserDto
            {
                FirstName = "Test", LastName = "T", Email = "t@t.com",
                Password = "lozinka1", DateOfBirth = new DateTime(2000, 1, 1)
            };

            var user = _mapper.Map<User>(dto);

            user.IsActive.Should().BeTrue();
            user.IsBlacklisted.Should().BeFalse();
            user.IsVerified.Should().BeFalse();
        }

        // ═══════════════════════════════════════════
        //  UpdateUserDto -> User  (null-ignoring)
        // ═══════════════════════════════════════════

        [Fact]
        public void UpdateUserDtoToUser_NullPoljaSeIgnorisu()
        {
            // ForAllMembers + Condition(srcMember != null) — null ne sme da prepiše vrednost
            var existing = new User
            {
                FirstName = "OriginalnoIme", LastName = "OriginalnoPrezi",
                Email = "orig@orig.com", PasswordHash = "hash",
                Language = "sr", DateOfBirth = new DateTime(1990, 1, 1),
                Role = new Role { Name = RoleType.Tourist }, RoleId = 1
            };

            var updateDto = new UpdateUserDto
            {
                FirstName = "NovIme",
                LastName = null  // ne menja se
            };

            _mapper.Map(updateDto, existing);

            existing.FirstName.Should().Be("NovIme");
            existing.LastName.Should().Be("OriginalnoPrezi"); // ostaje nepromenjeno
        }

        [Fact]
        public void UpdateUserDtoToUser_SvaPoljaNull_NistaSeMenjaVrednostima()
        {
            var existing = new User
            {
                FirstName = "Ime", LastName = "Prezime",
                Email = "e@e.com", PasswordHash = "hash",
                Language = "sr", Country = "Srbija",
                DateOfBirth = new DateTime(1990, 1, 1),
                Role = new Role { Name = RoleType.Tourist }, RoleId = 1
            };

            _mapper.Map(new UpdateUserDto(), existing);

            existing.FirstName.Should().Be("Ime");
            existing.LastName.Should().Be("Prezime");
            existing.Country.Should().Be("Srbija");
        }

        // ═══════════════════════════════════════════
        //  Destination -> DestinationDto
        // ═══════════════════════════════════════════

        [Fact]
        public void DestinationToDto_GeolokacijaSeMapiraULongitudLatitude()
        {
            var dest = new Destination
            {
                Id = 1, Name = "Kotor", Status = ContentStatus.Approved,
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                DestinationTypeId = 1,
                DestinationType = new DestinationType { Id = 1, Name = "Stari Grad" },
                CreatedByUserId = 99
            };

            var dto = _mapper.Map<DestinationDto>(dest);

            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
        }

        [Fact]
        public void DestinationToDto_BezGeolokacije_LongLatJeNull()
        {
            var dest = new Destination
            {
                Id = 2, Name = "Budva", Status = ContentStatus.Approved,
                Geolocation = null,
                DestinationTypeId = 1,
                DestinationType = new DestinationType { Id = 1, Name = "Plaza" },
                CreatedByUserId = 99
            };

            var dto = _mapper.Map<DestinationDto>(dest);

            dto.Longitude.Should().BeNull();
            dto.Latitude.Should().BeNull();
        }

        [Fact]
        public void DestinationToDto_StatusSeMapiraKaoString()
        {
            var dest = new Destination
            {
                Id = 3, Name = "Bar", Status = ContentStatus.Pending,
                DestinationTypeId = 1,
                DestinationType = new DestinationType { Id = 1, Name = "Luka" },
                CreatedByUserId = 99
            };

            var dto = _mapper.Map<DestinationDto>(dest);

            dto.Status.Should().Be("Pending");
        }

        [Fact]
        public void DestinationToDto_DestinationTypeName_MapiraSe()
        {
            var dest = new Destination
            {
                Id = 4, Name = "Ulcinj", Status = ContentStatus.Approved,
                DestinationTypeId = 2,
                DestinationType = new DestinationType { Id = 2, Name = "Istorijski Grad" },
                CreatedByUserId = 99
            };

            var dto = _mapper.Map<DestinationDto>(dest);

            dto.DestinationTypeName.Should().Be("Istorijski Grad");
        }

        // ═══════════════════════════════════════════
        //  Locality -> LocalityDto
        // ═══════════════════════════════════════════

        [Fact]
        public void LocalityToDto_MapiraOsnovnaPolja()
        {
            var locality = new Locality
            {
                Id = 1,
                Name = "Stara Varos",
                Description = "Istorijsko jezgro",
                IsActive = true,
                DestinationId = 5,
                Destination = new Destination { Id = 5, Name = "Kotor", CreatedByUserId = 99 },
                LocalityTypeId = 2,
                LocalityType = new LocalityType { Id = 2, Name = "Centar" },
                CreatedByUserId = 10,
                CreatedAt = new DateTime(2024, 1, 15)
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.Id.Should().Be(1);
            dto.Name.Should().Be("Stara Varos");
            dto.Description.Should().Be("Istorijsko jezgro");
            dto.IsActive.Should().BeTrue();
            dto.DestinationId.Should().Be(5);
            dto.LocalityTypeId.Should().Be(2);
            dto.CreatedByUserId.Should().Be(10);
        }

        [Fact]
        public void LocalityToDto_DestinationName_MapiraSeIzNavigacije()
        {
            var locality = new Locality
            {
                Id = 2,
                Name = "Dobrota",
                DestinationId = 5,
                Destination = new Destination { Id = 5, Name = "Kotor", CreatedByUserId = 99 },
                LocalityTypeId = 1,
                LocalityType = new LocalityType { Id = 1, Name = "Primorje" }
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.DestinationName.Should().Be("Kotor");
        }

        [Fact]
        public void LocalityToDto_LocalityTypeName_MapiraSeIzNavigacije()
        {
            var locality = new Locality
            {
                Id = 3,
                Name = "Prcanj",
                DestinationId = 5,
                Destination = new Destination { Id = 5, Name = "Kotor", CreatedByUserId = 99 },
                LocalityTypeId = 3,
                LocalityType = new LocalityType { Id = 3, Name = "Primorsko Naselje" }
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.LocalityTypeName.Should().Be("Primorsko Naselje");
        }

        [Fact]
        public void LocalityToDto_GeolokacijaSeMapiraULongitudeLatitude()
        {
            var locality = new Locality
            {
                Id = 4,
                Name = "L1",
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                DestinationId = 1,
                Destination = new Destination { Id = 1, Name = "Kotor", CreatedByUserId = 99 },
                LocalityTypeId = 1,
                LocalityType = new LocalityType { Id = 1, Name = "Tip" }
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
        }

        [Fact]
        public void LocalityToDto_BezGeolokacije_LongLatJeNull()
        {
            var locality = new Locality
            {
                Id = 5,
                Name = "L2",
                Geolocation = null,
                DestinationId = 1,
                Destination = new Destination { Id = 1, Name = "Kotor", CreatedByUserId = 99 },
                LocalityTypeId = 1,
                LocalityType = new LocalityType { Id = 1, Name = "Tip" }
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.Longitude.Should().BeNull();
            dto.Latitude.Should().BeNull();
        }

        [Fact]
        public void LocalityToDto_NullDestinationNavigacija_DestinationNameJeNull()
        {
            var locality = new Locality
            {
                Id = 6,
                Name = "L3",
                DestinationId = 99,
                Destination = null,
                LocalityTypeId = 1,
                LocalityType = new LocalityType { Id = 1, Name = "Tip" }
            };

            var dto = _mapper.Map<LocalityDto>(locality);

            dto.DestinationName.Should().BeNullOrEmpty();
        }

        // ═══════════════════════════════════════════
        //  TouristObject -> TouristObjectDto
        // ═══════════════════════════════════════════

        [Fact]
        public void TouristObjectToDto_MapiraOsnovnaPolja()
        {
            var obj = new TouristObject
            {
                Id = 1,
                Name = "Hotel Vardar",
                Description = "Opis",
                Address = "Adresa",
                PhoneNumber = "+38232123456",
                Website = "https://hotel.com",
                WorkingHours = "00:00-24:00",
                IsActive = true,
                Status = ContentStatus.Pending,
                ObjectTypeId = 2,
                ObjectType = new ObjectType { Id = 2, Name = "Hotel" },
                LocalityId = 3,
                Locality = new Locality
                {
                    Id = 3,
                    Name = "Kotor",
                    DestinationId = 4,
                    Destination = new Destination { Id = 4, Name = "Stari grad Kotor", CreatedByUserId = 99 }
                },
                DestinationId = 4,
                CreatedByUserId = 10,
                CreatedAt = new DateTime(2024, 1, 1),
                UpdatedAt = new DateTime(2024, 1, 2)
            };

            var dto = _mapper.Map<TouristObjectDto>(obj);

            dto.Id.Should().Be(1);
            dto.Name.Should().Be("Hotel Vardar");
            dto.ObjectTypeId.Should().Be(2);
            dto.ObjectTypeName.Should().Be("Hotel");
            dto.LocalityId.Should().Be(3);
            dto.LocalityName.Should().Be("Kotor");
            dto.DestinationId.Should().Be(4);
            dto.DestinationName.Should().Be("Stari grad Kotor");
            dto.Status.Should().Be("Pending");
        }

        [Fact]
        public void TouristObjectToDto_GeolokacijaSeMapiraULongitudeLatitude()
        {
            var obj = new TouristObject
            {
                Id = 2,
                Name = "Objekat",
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                ObjectTypeId = 1,
                ObjectType = new ObjectType { Id = 1, Name = "Muzej" },
                LocalityId = 1,
                Locality = new Locality
                {
                    Id = 1,
                    Name = "Kotor",
                    DestinationId = 1,
                    Destination = new Destination { Id = 1, Name = "Kotor", CreatedByUserId = 99 }
                },
                CreatedByUserId = 10
            };

            var dto = _mapper.Map<TouristObjectDto>(obj);

            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
        }

        [Fact]
        public void TouristObjectToDto_BezGeolokacije_LongLatJeNull()
        {
            var obj = new TouristObject
            {
                Id = 3,
                Name = "Objekat",
                Geolocation = null,
                ObjectTypeId = 1,
                ObjectType = new ObjectType { Id = 1, Name = "Muzej" },
                LocalityId = 1,
                Locality = new Locality
                {
                    Id = 1,
                    Name = "Kotor",
                    DestinationId = 1,
                    Destination = new Destination { Id = 1, Name = "Kotor", CreatedByUserId = 99 }
                },
                CreatedByUserId = 10
            };

            var dto = _mapper.Map<TouristObjectDto>(obj);

            dto.Longitude.Should().BeNull();
            dto.Latitude.Should().BeNull();
        }

        // ═══════════════════════════════════════════
        //  Event -> EventDto
        // ═══════════════════════════════════════════

        [Fact]
        public void EventToDto_MapiraNazivePovezanihEntiteta()
        {
            var ev = new Event
            {
                Id = 1,
                Name = "Sea Dance",
                Description = "Opis",
                StartDate = new DateTime(2026, 6, 1, 20, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 6, 2, 1, 0, 0, DateTimeKind.Utc),
                Status = ContentStatus.Pending,
                EventTypeId = 1,
                EventType = new EventType { Id = 1, Name = "Koncert" },
                LocalityId = 2,
                Locality = new Locality { Id = 2, Name = "Stari grad" },
                DestinationId = 3,
                Destination = new Destination { Id = 3, Name = "Kotor", CreatedByUserId = 99 },
                ObjectId = 4,
                Object = new TouristObject { Id = 4, Name = "Tvrdjava" },
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<EventDto>(ev);

            dto.EventTypeName.Should().Be("Koncert");
            dto.LocalityName.Should().Be("Stari grad");
            dto.DestinationName.Should().Be("Kotor");
            dto.ObjectName.Should().Be("Tvrdjava");
        }

        [Fact]
        public void EventToDto_GeolokacijaSeMapiraULongitudeILatitude()
        {
            var ev = new Event
            {
                Id = 2,
                Name = "Festival",
                EventTypeId = 1,
                EventType = new EventType { Id = 1, Name = "Festival" },
                StartDate = new DateTime(2026, 6, 10, 20, 0, 0, DateTimeKind.Utc),
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<EventDto>(ev);

            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
        }

        [Fact]
        public void EventToDto_BezGeolokacije_LongitudeILatitudeSuNull()
        {
            var ev = new Event
            {
                Id = 3,
                Name = "Predavanje",
                EventTypeId = 1,
                EventType = new EventType { Id = 1, Name = "Predavanje" },
                StartDate = new DateTime(2026, 6, 11, 20, 0, 0, DateTimeKind.Utc),
                Geolocation = null,
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<EventDto>(ev);

            dto.Longitude.Should().BeNull();
            dto.Latitude.Should().BeNull();
        }

        [Fact]
        public void EventToDto_StatusSeMapiraKaoString()
        {
            var ev = new Event
            {
                Id = 4,
                Name = "Sajam",
                EventTypeId = 1,
                EventType = new EventType { Id = 1, Name = "Sajam" },
                StartDate = new DateTime(2026, 6, 12, 20, 0, 0, DateTimeKind.Utc),
                Status = ContentStatus.Approved,
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<EventDto>(ev);

            dto.Status.Should().Be("Approved");
        }

        // ═══════════════════════════════════════════
        //  Activity -> ActivityDto
        // ═══════════════════════════════════════════

        [Fact]
        public void ActivityToDto_MapiraNazivePovezanihEntiteta()
        {
            var activity = new Activity
            {
                Id = 1,
                Name = "Pesacka tura",
                Description = "Opis",
                Status = ContentStatus.Pending,
                ActivityTypeId = 1,
                ActivityType = new ActivityType { Id = 1, Name = "Setnja" },
                LocalityId = 2,
                Locality = new Locality { Id = 2, Name = "Stari grad" },
                DestinationId = 3,
                Destination = new Destination { Id = 3, Name = "Kotor", CreatedByUserId = 99 },
                ObjectId = 4,
                Object = new TouristObject { Id = 4, Name = "Tvrdjava" },
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<ActivityDto>(activity);

            dto.ActivityTypeName.Should().Be("Setnja");
            dto.LocalityName.Should().Be("Stari grad");
            dto.DestinationName.Should().Be("Kotor");
            dto.ObjectName.Should().Be("Tvrdjava");
        }

        [Fact]
        public void ActivityToDto_GeolokacijaSeMapiraULongitudeILatitude()
        {
            var activity = new Activity
            {
                Id = 2,
                Name = "Biciklisticka ruta",
                ActivityTypeId = 1,
                ActivityType = new ActivityType { Id = 1, Name = "Biciklizam" },
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<ActivityDto>(activity);

            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
        }

        [Fact]
        public void ActivityToDto_BezGeolokacije_LongitudeILatitudeSuNull()
        {
            var activity = new Activity
            {
                Id = 3,
                Name = "Obilazak",
                ActivityTypeId = 1,
                ActivityType = new ActivityType { Id = 1, Name = "Obilazak" },
                Geolocation = null,
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<ActivityDto>(activity);

            dto.Longitude.Should().BeNull();
            dto.Latitude.Should().BeNull();
        }

        [Fact]
        public void ActivityToDto_StatusSeMapiraKaoString()
        {
            var activity = new Activity
            {
                Id = 4,
                Name = "Kajak",
                ActivityTypeId = 1,
                ActivityType = new ActivityType { Id = 1, Name = "Voda" },
                Status = ContentStatus.Approved,
                CreatedByUserId = 20,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<ActivityDto>(activity);

            dto.Status.Should().Be("Approved");
        }

        // ═══════════════════════════════════════════
        //  Review -> ReviewDto
        // ═══════════════════════════════════════════

        [Fact]
        public void ReviewToDto_MapiraOsnovnaPoljaINazive()
        {
            var review = new Review
            {
                Id = 1,
                UserId = 10,
                User = new User { Id = 10, FirstName = "Ana", LastName = "Anić" },
                ObjectId = 20,
                Object = new TouristObject { Id = 20, Name = "Pomorski muzej" },
                Rating = 5,
                Text = "Odlicno",
                CreatorResponse = "Hvala",
                CreatorResponseAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
                Status = ContentStatus.Approved,
                ReviewedByUserId = 30,
                ReviewedBy = new User { Id = 30, FirstName = "Marko", LastName = "Marković" },
                CreatedAt = new DateTime(2026, 1, 1, 9, 0, 0, DateTimeKind.Utc)
            };

            var dto = _mapper.Map<ReviewDto>(review);

            dto.Id.Should().Be(1);
            dto.UserId.Should().Be(10);
            dto.UserFullName.Should().Be("Ana Anić");
            dto.ObjectId.Should().Be(20);
            dto.ObjectName.Should().Be("Pomorski muzej");
            dto.Rating.Should().Be(5);
            dto.Text.Should().Be("Odlicno");
            dto.CreatorResponse.Should().Be("Hvala");
            dto.Status.Should().Be("Approved");
            dto.ReviewedByUserId.Should().Be(30);
            dto.ReviewedByFullName.Should().Be("Marko Marković");
        }

        [Fact]
        public void ReviewToDto_BezReviewedBy_ReviewedByFullNameJeNull()
        {
            var review = new Review
            {
                Id = 2,
                UserId = 11,
                User = new User { Id = 11, FirstName = "Iva", LastName = "Ivić" },
                ObjectId = 21,
                Object = new TouristObject { Id = 21, Name = "Tvrdjava" },
                Rating = 4,
                Text = "Dobro",
                Status = ContentStatus.Pending,
                ReviewedByUserId = null,
                ReviewedBy = null,
                CreatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<ReviewDto>(review);

            dto.ReviewedByUserId.Should().BeNull();
            dto.ReviewedByFullName.Should().BeNull();
            dto.Status.Should().Be("Pending");
        }

        // ═══════════════════════════════════════════
        //  RoutePoint -> RoutePointDto
        // ═══════════════════════════════════════════

        [Fact]
        public void RoutePointToDto_GeolokacijaSeMapiraULongitudeLatitude()
        {
            var point = new RoutePoint
            {
                Id = 1,
                RouteId = 10,
                Order = 2,
                Geolocation = new Point(18.77, 42.42) { SRID = 4326 },
                PointName = "Tacka 2",
                CreatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<RoutePointDto>(point);

            dto.Id.Should().Be(1);
            dto.RouteId.Should().Be(10);
            dto.Order.Should().Be(2);
            dto.Longitude.Should().BeApproximately(18.77, 0.001);
            dto.Latitude.Should().BeApproximately(42.42, 0.001);
            dto.PointName.Should().Be("Tacka 2");
        }

        [Fact]
        public void RoutePointToDto_BezGeolokacije_LongitudeILatitudeSuNula()
        {
            var point = new RoutePoint
            {
                Id = 2,
                RouteId = 10,
                Order = 1,
                Geolocation = null!,
                PointName = "Bez geo",
                CreatedAt = DateTime.UtcNow
            };

            var dto = _mapper.Map<RoutePointDto>(point);

            dto.Longitude.Should().Be(0);
            dto.Latitude.Should().Be(0);
        }

        // ═══════════════════════════════════════════
        //  Route -> RouteDto
        // ═══════════════════════════════════════════

        [Fact]
        public void RouteToDto_MapiraCreatedByFullNameIRoutePoints()
        {
            var route = new Route
            {
                Id = 1,
                Name = "Ruta 1",
                Description = "Opis",
                Difficulty = "Easy",
                LengthKm = 5.5m,
                CreatedByUserId = 10,
                CreatedBy = new User { Id = 10, FirstName = "Ana", LastName = "Anić" },
                CreatedAt = new DateTime(2026, 1, 1),
                UpdatedAt = new DateTime(2026, 1, 2),
                RoutePoints = new List<RoutePoint>
                {
                    new RoutePoint
                    {
                        Id = 1,
                        RouteId = 1,
                        Order = 1,
                        Geolocation = new Point(18.70, 42.40) { SRID = 4326 },
                        PointName = "A"
                    },
                    new RoutePoint
                    {
                        Id = 2,
                        RouteId = 1,
                        Order = 2,
                        Geolocation = new Point(18.71, 42.41) { SRID = 4326 },
                        PointName = "B"
                    }
                }
            };

            var dto = _mapper.Map<RouteDto>(route);

            dto.Id.Should().Be(1);
            dto.Name.Should().Be("Ruta 1");
            dto.Description.Should().Be("Opis");
            dto.Difficulty.Should().Be("Easy");
            dto.LengthKm.Should().Be(5.5m);
            dto.CreatedByUserId.Should().Be(10);
            dto.CreatedByFullName.Should().Be("Ana Anić");
            dto.RoutePoints.Should().HaveCount(2);
        }

        [Fact]
        public void RouteToDto_BezCreatedBy_CreatedByFullNameJeNull()
        {
            var route = new Route
            {
                Id = 2,
                Name = "Ruta 2",
                CreatedByUserId = null,
                CreatedBy = null,
                RoutePoints = new List<RoutePoint>()
            };

            var dto = _mapper.Map<RouteDto>(route);

            dto.CreatedByUserId.Should().BeNull();
            dto.CreatedByFullName.Should().BeNull();
            dto.RoutePoints.Should().BeEmpty();
        }
    
        [Fact]
        public void ManagerReportToDto_MapiraImenaIStatus()
        {
            var report = new ManagerReport
            {
                Id = 7,
                ManagerId = 30,
                Manager = new User { FirstName = "Milan", LastName = "Manager" },
                ReportedUserId = 20,
                ReportedUser = new User { FirstName = "Ceca", LastName = "Creator" },
                Reason = "Spam sadrzaj",
                Status = ContentStatus.Pending,
                CreatedAt = new DateTime(2026, 1, 1)
            };

            var dto = _mapper.Map<ManagerReportDto>(report);

            dto.Id.Should().Be(7);
            dto.ManagerId.Should().Be(30);
            dto.ManagerName.Should().Be("Milan Manager");
            dto.ReportedUserId.Should().Be(20);
            dto.ReportedUserName.Should().Be("Ceca Creator");
            dto.Reason.Should().Be("Spam sadrzaj");
            dto.Status.Should().Be("Pending");
        }

        [Fact]
        public void ManagerReportToDto_MapiraResolvedByNameKadaPostoji()
        {
            var report = new ManagerReport
            {
                Id = 8,
                ManagerId = 30,
                ReportedUserId = 20,
                Reason = "Neprimeren sadrzaj",
                Status = ContentStatus.Approved,
                ResolvedByUserId = 40,
                ResolvedBy = new User { FirstName = "Ana", LastName = "Admin" },
                CreatedAt = new DateTime(2026, 1, 1),
                ResolvedAt = new DateTime(2026, 1, 2)
            };

            var dto = _mapper.Map<ManagerReportDto>(report);

            dto.ResolvedByUserId.Should().Be(40);
            dto.ResolvedByName.Should().Be("Ana Admin");
            dto.Status.Should().Be("Approved");
            dto.ResolvedAt.Should().Be(new DateTime(2026, 1, 2));
        }
}
}
