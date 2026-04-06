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

        // ═══════════════════════════════════════════
        //  CreateTouristObjectDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateTouristObjectDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateTouristObjectDto_BezName_NijeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                ObjectTypeId = 1,
                LocalityId = 1
            };

            dto.Name = null!;

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateTouristObjectDto_PrazanName_NijeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "",
                ObjectTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateTouristObjectDto_NameDuzi200Karaktera_NijeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = new string('A', 201),
                ObjectTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Name"));
        }

        [Fact]
        public void CreateTouristObjectDto_SaOpcionalnimPoljima_JeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Hotel Vardar",
                Description = "Hotel u starom gradu",
                Address = "Kotor bb",
                PhoneNumber = "+38232123456",
                Website = "https://hotel.com",
                WorkingHours = "00:00-24:00",
                Longitude = 18.77,
                Latitude = 42.42,
                IsActive = true,
                ObjectTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  UpdateTouristObjectDto  — partial update
        // ═══════════════════════════════════════════

        [Fact]
        public void UpdateTouristObjectDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateTouristObjectDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateTouristObjectDto_SamoName_JeValidno()
        {
            var dto = new UpdateTouristObjectDto
            {
                Name = "Novo ime"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateTouristObjectDto_ObjectTypeIdPostavljen_JeValidno()
        {
            var dto = new UpdateTouristObjectDto
            {
                ObjectTypeId = 2
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  ApproveContentDto
        // ═══════════════════════════════════════════

        [Fact]
        public void ApproveContentDto_OdobravanjeBezRazloga_JeValidno()
        {
            var dto = new ApproveContentDto
            {
                Approve = true,
                RejectionReason = null
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ApproveContentDto_OdbijanjeSaRazlogom_JeValidno()
        {
            var dto = new ApproveContentDto
            {
                Approve = false,
                RejectionReason = "Ne ispunjava kriterijume"
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  CreateEventDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateEventDto_KadaImaLocalityId_JeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = 1,
                LocalityId = 1,
                StartDate = new DateTime(2026, 5, 1, 20, 0, 0)
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateEventDto_KadaImaDestinationId_JeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = "Festival",
                EventTypeId = 1,
                DestinationId = 2,
                StartDate = new DateTime(2026, 5, 2, 20, 0, 0)
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateEventDto_BezLocalityIBezDestination_NijeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = "Event",
                EventTypeId = 1,
                StartDate = new DateTime(2026, 5, 3, 20, 0, 0)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.ErrorMessage != null &&
                                               r.ErrorMessage.Contains("either a LocalityId or a DestinationId"));
        }

        [Fact]
        public void CreateEventDto_BezName_NijeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = string.Empty,
                EventTypeId = 1,
                LocalityId = 1,
                StartDate = new DateTime(2026, 5, 4, 20, 0, 0)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventDto.Name)));
        }

        [Fact]
        public void CreateEventDto_NameDuzeOd200Karaktera_NijeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = new string('X', 201),
                EventTypeId = 1,
                LocalityId = 1,
                StartDate = new DateTime(2026, 5, 5, 20, 0, 0)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventDto.Name)));
        }

        // ═══════════════════════════════════════════
        //  CreateActivityDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateActivityDto_KadaImaLocalityId_JeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = "Setnja",
                ActivityTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateActivityDto_KadaImaDestinationId_JeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = "Tura",
                ActivityTypeId = 1,
                DestinationId = 2
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateActivityDto_BezLocalityIBezDestination_NijeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = "Aktivnost",
                ActivityTypeId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.ErrorMessage != null &&
                                               r.ErrorMessage.Contains("either a LocalityId or a DestinationId"));
        }

        [Fact]
        public void CreateActivityDto_BezName_NijeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = string.Empty,
                ActivityTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateActivityDto.Name)));
        }

        [Fact]
        public void CreateActivityDto_NameDuzeOd150Karaktera_NijeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = new string('X', 151),
                ActivityTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateActivityDto.Name)));
        }

        [Fact]
        public void CreateActivityDto_NameTacno150Karaktera_JeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = new string('X', 150),
                ActivityTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateActivityDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateActivityDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateActivityDto_SamoName_JeValidno()
        {
            var dto = new UpdateActivityDto
            {
                Name = "Novo ime aktivnosti"
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  CreateReviewDto / UpdateReviewDto / RespondToReviewDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateReviewDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = "Odlican objekat"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateReviewDto_ObjectIdJeNula_NijeValidno()
        {
            var dto = new CreateReviewDto
            {
                ObjectId = 0,
                Rating = 5,
                Text = "Komentar"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateReviewDto.ObjectId)));
        }

        [Fact]
        public void CreateReviewDto_RatingVanOpsega_NijeValidno()
        {
            var dto = new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 6,
                Text = "Komentar"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateReviewDto.Rating)));
        }

        [Fact]
        public void CreateReviewDto_BezText_NijeValidno()
        {
            var dto = new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = ""
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateReviewDto.Text)));
        }

        [Fact]
        public void CreateReviewDto_TextDuziOd1000Karaktera_NijeValidno()
        {
            var dto = new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = new string('A', 1001)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateReviewDto.Text)));
        }

        [Fact]
        public void UpdateReviewDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateReviewDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateReviewDto_RatingVanOpsega_NijeValidno()
        {
            var dto = new UpdateReviewDto
            {
                Rating = 0
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateReviewDto.Rating)));
        }

        [Fact]
        public void RespondToReviewDto_ValidnoPopunjeno_JeValidno()
        {
            var dto = new RespondToReviewDto
            {
                CreatorResponse = "Hvala na recenziji."
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void RespondToReviewDto_BezCreatorResponse_NijeValidno()
        {
            var dto = new RespondToReviewDto
            {
                CreatorResponse = ""
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(RespondToReviewDto.CreatorResponse)));
        }

        [Fact]
        public void ApproveReviewDto_ApproveJeObavezan_JeValidnoKadaJePostavljen()
        {
            var dto = new ApproveReviewDto
            {
                Approve = true
            };

            IsValid(dto).Should().BeTrue();
        }


    }
}