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
    }
}
