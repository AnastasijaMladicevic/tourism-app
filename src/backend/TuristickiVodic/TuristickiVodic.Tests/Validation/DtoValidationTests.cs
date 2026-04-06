using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.DTO;
using Xunit;
using FluentAssertions;

namespace TuristickiVodic.Tests.Validation
{
    /// <summary>
    /// Testovi za DataAnnotations i IValidatableObject validaciju na DTO-ovima.
    /// Pokrivaju:
    /// - CreateUserDto: Required, EmailAddress, MinLength, MaxLength
    /// - CreateDestinationDto: Required, Range (ManagedByUserId >= 1)
    /// - ChangePasswordDto: Required, MinLength, Compare
    /// </summary>
    public class DtoValidationTests
    {
        private static IList<ValidationResult> Validate(object dto)
        {
            var ctx = new ValidationContext(dto);
            var results = new List<ValidationResult>();
            Validator.TryValidateObject(dto, ctx, results, validateAllProperties: true);
            return results;
        }

        private static bool IsValid(object dto) => !Validate(dto).Any();

        // ═══════════════════════════════════════════
        //  CreateUserDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateUserDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateUserDto
            {
                FirstName = "Marko", LastName = "Marković",
                Email = "marko@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateUserDto_BezFirstName_NijeValidno()
        {
            var dto = new CreateUserDto
            {
                LastName = "M", Email = "m@m.com",
                Password = "lozinka1", DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("FirstName"));
        }

        [Fact]
        public void CreateUserDto_BezEmail_NijeValidno()
        {
            var dto = new CreateUserDto
            {
                FirstName = "A", LastName = "B",
                Password = "lozinka1", DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Email"));
        }

        [Fact]
        public void CreateUserDto_NeispravniEmailFormat_NijeValidno()
        {
            var dto = new CreateUserDto
            {
                FirstName = "A", LastName = "B", Email = "nijemail",
                Password = "lozinka1", DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Email"));
        }

        [Fact]
        public void CreateUserDto_LozinkaKraca6Karaktera_NijeValidno()
        {
            var dto = new CreateUserDto
            {
                FirstName = "A", LastName = "B", Email = "a@b.com",
                Password = "krat",  // < 6
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Password"));
        }

        [Fact]
        public void CreateUserDto_FirstNameDuzi100Karaktera_NijeValidno()
        {
            var dto = new CreateUserDto
            {
                FirstName = new string('A', 101),
                LastName = "B", Email = "a@b.com",
                Password = "lozinka1", DateOfBirth = new DateTime(1990, 1, 1)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("FirstName"));
        }

        // ═══════════════════════════════════════════
        //  CreateDestinationDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateDestinationDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateDestinationDto
            {
                Name = "Kotor", DestinationTypeId = 1, ManagedByUserId = 5
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateDestinationDto_BezName_NijeValidno()
        {
            var dto = new CreateDestinationDto
            {
                DestinationTypeId = 1, ManagedByUserId = 5
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateDestinationDto_BezManagedByUserId_NijeValidno()
        {
            // Destinacija ne može da se instancira bez menadžera
            var dto = new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = 1
                // ManagedByUserId = null — nije postavljeno
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("ManagedByUserId"));
        }

        [Fact]
        public void CreateDestinationDto_ManagedByUserIdJeNula_NijeValidno()
        {
            // Range(1, int.MaxValue) — vrednost 0 mora biti odbijena
            var dto = new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = 1, ManagedByUserId = 0
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("ManagedByUserId"));
        }

        [Fact]
        public void CreateDestinationDto_ManagedByUserIdJeNegativanBroj_NijeValidno()
        {
            var dto = new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = 1, ManagedByUserId = -1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("ManagedByUserId"));
        }

        [Fact]
        public void CreateDestinationDto_ManagedByUserIdJeJedan_JeValidno()
        {
            // Minimalna validna vrednost je 1
            var dto = new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = 1, ManagedByUserId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateDestinationDto_NameDuzi150Karaktera_NijeValidno()
        {
            var dto = new CreateDestinationDto
            {
                Name = new string('X', 151), DestinationTypeId = 1, ManagedByUserId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        // ═══════════════════════════════════════════
        //  ChangePasswordDto
        // ═══════════════════════════════════════════

        [Fact]
        public void ChangePasswordDto_ValidnoPopunjeno_JeValidno()
        {
            var dto = new ChangePasswordDto
            {
                CurrentPassword = "stara123",
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ChangePasswordDto_NovaLozinkaKraca6Znakova_NijeValidno()
        {
            var dto = new ChangePasswordDto
            {
                CurrentPassword = "stara123",
                NewPassword = "krat",
                ConfirmPassword = "krat"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("NewPassword"));
        }

        [Fact]
        public void ChangePasswordDto_ConfirmPasswordSeNePoklapa_NijeValidno()
        {
            var dto = new ChangePasswordDto
            {
                CurrentPassword = "stara123",
                NewPassword = "nova1234",
                ConfirmPassword = "druganovi"  // ne poklapaju se
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("ConfirmPassword"));
        }

        [Fact]
        public void ChangePasswordDto_BezCurrentPassword_NijeValidno()
        {
            var dto = new ChangePasswordDto
            {
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("CurrentPassword"));
        }

        // ═══════════════════════════════════════════
        //  CreateLocalityDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateLocalityDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = "Stara Varos",
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateLocalityDto_SaOpcionalimPoljimaPopunjenim_JeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = "Dobrota",
                Description = "Primorsko naselje",
                Longitude = 18.77,
                Latitude = 42.42,
                DestinationId = 1,
                LocalityTypeId = 2,
                IsActive = false
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateLocalityDto_BezName_NijeValidno()
        {
            var dto = new CreateLocalityDto
            {
                DestinationId = 1,
                LocalityTypeId = 1
            };

            dto.Name = null!;

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateLocalityDto_PrazanName_NijeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = "",
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateLocalityDto_NameDuzi150Karaktera_NijeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = new string('A', 151),
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateLocalityDto_NameTacno150Karaktera_JeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = new string('A', 150),
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateLocalityDto_OpcionalnaPoljaNull_JeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = "Test",
                Description = null,
                Longitude = null,
                Latitude = null,
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  UpdateLocalityDto  — partial update
        // ═══════════════════════════════════════════

        [Fact]
        public void UpdateLocalityDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateLocalityDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateLocalityDto_SamoName_JeValidno()
        {
            var dto = new UpdateLocalityDto { Name = "Novo Ime" };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateLocalityDto_SamoDestinationId_JeValidno()
        {
            var dto = new UpdateLocalityDto { DestinationId = 2 };

            IsValid(dto).Should().BeTrue();
        }
    }
}