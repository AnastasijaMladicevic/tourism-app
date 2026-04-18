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

        [Fact]
        public void CreateDestinationDto_SamoLongitude_NijeValidno()
        {
            var dto = new CreateDestinationDto
            {
                Name = "Test",
                DestinationTypeId = 1,
                ManagedByUserId = 1,
                Longitude = 18.77
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateDestinationDto.Longitude)));
        }

        // ═══════════════════════════════════════════
        //  ChangePasswordDto
        // ═══════════════════════════════════════════

        [Fact]
        public void UpdateUserLocationDto_HeadingVeceOd360_NijeValidno()
        {
            var dto = new UpdateUserLocationDto
            {
                Longitude = 18.77,
                Latitude = 42.42,
                HeadingDegrees = 361
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateUserLocationDto.HeadingDegrees)));
        }

        [Fact]
        public void UserLocationPathQueryDto_MaxPointsJeNula_NijeValidno()
        {
            var dto = new UserLocationPathQueryDto
            {
                MaxPoints = 0
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UserLocationPathQueryDto.MaxPoints)));
        }

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

        [Fact]
        public void CreateLocalityDto_SamoLongitude_NijeValidno()
        {
            var dto = new CreateLocalityDto
            {
                Name = "Test",
                Longitude = 18.75,
                DestinationId = 1,
                LocalityTypeId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateLocalityDto.Longitude)));
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
                DestinationId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateTouristObjectDto_BezDestinationIdILocalityId_NijeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r =>
                r.MemberNames.Contains(nameof(CreateTouristObjectDto.DestinationId)) &&
                r.MemberNames.Contains(nameof(CreateTouristObjectDto.LocalityId)));
        }

        [Fact]
        public void CreateTouristObjectDto_LokalitetNijeObavezan_JeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Objekat bez lokaliteta",
                ObjectTypeId = 1,
                DestinationId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateTouristObjectDto_SamoLocalityId_JeValidno()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Objekat sa lokalitetom",
                ObjectTypeId = 1,
                LocalityId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateTouristObjectDto_KoordinateMorajuBitiUParu_NijeValidnoKadaNedostajeLatitude()
        {
            var dto = new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = 1,
                DestinationId = 1,
                Longitude = 18.77
            };

            IsValid(dto).Should().BeFalse();
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
                Price = 135.50m,
                Amenities = new[] { "wifi", "parking", "bazen" },
                Longitude = 18.77,
                Latitude = 42.42,
                ObjectTypeId = 1,
                DestinationId = 1,
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
        public void UpdateTouristObjectDto_DestinationIdPostavljen_JeValidno()
        {
            var dto = new UpdateTouristObjectDto
            {
                DestinationId = 2
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

        [Fact]
        public void CreateEventDto_EventTypeIdJeNula_NijeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = 0,
                LocalityId = 1,
                StartDate = new DateTime(2026, 5, 5, 20, 0, 0)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventDto.EventTypeId)));
        }

        [Fact]
        public void CreateEventDto_SamoJednaKoordinata_NijeValidan()
        {
            var dto = new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = 1,
                LocalityId = 1,
                StartDate = new DateTime(2026, 5, 5, 20, 0, 0),
                Longitude = 18.77
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventDto.Longitude)));
        }

        [Fact]
        public void UpdateEventDto_SamoJednaKoordinata_NijeValidan()
        {
            var dto = new UpdateEventDto
            {
                Longitude = 18.77
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateEventDto.Longitude)));
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

        [Fact]
        public void CreateActivityDto_SamoJednaKoordinata_NijeValidno()
        {
            var dto = new CreateActivityDto
            {
                Name = "Setnja",
                ActivityTypeId = 1,
                LocalityId = 1,
                Longitude = 18.77
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateActivityDto.Longitude)));
        }

        [Fact]
        public void UpdateActivityDto_NegativnaCena_NijeValidno()
        {
            var dto = new UpdateActivityDto
            {
                Price = -5m
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateActivityDto.Price)));
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

        // ═══════════════════════════════════════════
        //  CreateRouteDto / UpdateRouteDto / CreateRoutePointDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateRouteDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateRouteDto
            {
                Name = "Ruta 1",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40, PointName = "A" },
                    new CreateRoutePointDto { Order = 2, Longitude = 18.71, Latitude = 42.41, PointName = "B" }
                }
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateRouteDto_BezName_NijeValidno()
        {
            var dto = new CreateRouteDto
            {
                Name = "",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 },
                    new CreateRoutePointDto { Order = 2, Longitude = 18.71, Latitude = 42.41 }
                }
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRouteDto.Name)));
        }

        [Fact]
        public void CreateRouteDto_NameDuzeOd200Karaktera_NijeValidno()
        {
            var dto = new CreateRouteDto
            {
                Name = new string('X', 201),
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 },
                    new CreateRoutePointDto { Order = 2, Longitude = 18.71, Latitude = 42.41 }
                }
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRouteDto.Name)));
        }

        [Fact]
        public void CreateRouteDto_SaJednomTackom_NijeValidno()
        {
            var dto = new CreateRouteDto
            {
                Name = "Ruta",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 }
                }
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRouteDto.RoutePoints)));
        }

        [Fact]
        public void UpdateRouteDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateRouteDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateRouteDto_NameDuzeOd200Karaktera_NijeValidno()
        {
            var dto = new UpdateRouteDto
            {
                Name = new string('X', 201)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateRouteDto.Name)));
        }

        // ═══════════════════════════════════════════
        //  CreateRoutePointDto / UpdateRoutePointDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateRoutePointDto_SvaObaveznaPolja_JeValidno()
        {
            var dto = new CreateRoutePointDto
            {
                Order = 1,
                Longitude = 18.70,
                Latitude = 42.40,
                PointName = "A"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateRoutePointDto_LongitudeVanOpsega_NijeValidno()
        {
            var dto = new CreateRoutePointDto
            {
                Order = 1,
                Longitude = 200,
                Latitude = 42.40
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRoutePointDto.Longitude)));
        }

        [Fact]
        public void CreateRoutePointDto_LatitudeVanOpsega_NijeValidno()
        {
            var dto = new CreateRoutePointDto
            {
                Order = 1,
                Longitude = 18.70,
                Latitude = 100
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRoutePointDto.Latitude)));
        }

        [Fact]
        public void CreateRoutePointDto_PointNameDuzeOd150Karaktera_NijeValidno()
        {
            var dto = new CreateRoutePointDto
            {
                Order = 1,
                Longitude = 18.70,
                Latitude = 42.40,
                PointName = new string('A', 151)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateRoutePointDto.PointName)));
        }

        [Fact]
        public void UpdateRoutePointDto_SvaPoljaNull_JeValidno()
        {
            var dto = new UpdateRoutePointDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateRoutePointDto_LongitudeVanOpsega_NijeValidno()
        {
            var dto = new UpdateRoutePointDto
            {
                Longitude = 181
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateRoutePointDto.Longitude)));
        }

        [Fact]
        public void UpdateRoutePointDto_LatitudeVanOpsega_NijeValidno()
        {
            var dto = new UpdateRoutePointDto
            {
                Latitude = 91
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateRoutePointDto.Latitude)));
        }

        [Fact]
        public void UpdateRoutePointDto_PointNameDuzeOd150Karaktera_NijeValidno()
        {
            var dto = new UpdateRoutePointDto
            {
                PointName = new string('A', 151)
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(UpdateRoutePointDto.PointName)));
        }
    
        // ═══════════════════════════════════════════
        //  ManagerReport DTO
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateManagerReportDto_ValidnoPopunjeno_JeValidno()
        {
            var dto = new CreateManagerReportDto
            {
                ReportedUserId = 5,
                Reason = "Neprimeren sadrzaj"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateManagerReportDto_BezReason_NijeValidno()
        {
            var dto = new CreateManagerReportDto
            {
                ReportedUserId = 5,
                Reason = ""
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("Reason"));
        }

        [Fact]
        public void ReviewManagerReportDto_OdbijanjeBezRazloga_NijeValidno()
        {
            var dto = new ReviewManagerReportDto
            {
                Approve = false,
                RejectionReason = "   "
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains("RejectionReason"));
        }

        [Fact]
        public void ReviewManagerReportDto_OdobravanjeBezRazloga_JeValidno()
        {
            var dto = new ReviewManagerReportDto
            {
                Approve = true,
                RejectionReason = null
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  DeletionRequest DTO
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateDeletionRequestDto_BezReason_JeValidno()
        {
            var dto = new CreateDeletionRequestDto
            {
                Reason = null
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateDeletionRequestDto_SaReason_JeValidno()
        {
            var dto = new CreateDeletionRequestDto
            {
                Reason = "Zastareo sadrzaj"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ApproveDeletionRequestDto_OdobravanjeBezRazloga_JeValidno()
        {
            var dto = new ApproveDeletionRequestDto
            {
                Approve = true,
                RejectionReason = null
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ApproveDeletionRequestDto_OdbijanjeBezRazloga_JeValidnoPoTrenutnomDto()
        {
            var dto = new ApproveDeletionRequestDto
            {
                Approve = false,
                RejectionReason = null
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ApproveDeletionRequestDto_OdbijanjeSaRazlogom_JeValidno()
        {
            var dto = new ApproveDeletionRequestDto
            {
                Approve = false,
                RejectionReason = "Ne prihvata se"
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  CreateEventPlannerDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateEventPlannerDto_EventIdJedan_JeValidno()
        {
            var dto = new CreateEventPlannerDto
            {
                EventId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateEventPlannerDto_EventIdJeNula_NijeValidno()
        {
            var dto = new CreateEventPlannerDto
            {
                EventId = 0
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventPlannerDto.EventId)));
        }

        [Fact]
        public void CreateEventPlannerDto_EventIdJeNegativan_NijeValidno()
        {
            var dto = new CreateEventPlannerDto
            {
                EventId = -5
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateEventPlannerDto.EventId)));
        }

        // ═══════════════════════════════════════════
        //  CreateImageDto
        // ═══════════════════════════════════════════

        [Fact]
        public void CreateImageDto_UrlMax500_JeValidan()
        {
            var dto = new CreateImageDto
            {
                Url = new string('A', 500),
                ObjectId = 1
            };

            IsValid(dto).Should().BeTrue();
        }
        [Fact]
        public void CreateImageDto_Validno_JeValidno()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void CreateImageDto_BezUrl_NijeValidno()
        {
            var dto = new CreateImageDto
            {
                ObjectId = 1
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(CreateImageDto.Url)));
        }

        [Fact]
        public void CreateImageDto_UrlDuzinaPreko500_NijeValidno()
        {
            var dto = new CreateImageDto
            {
                Url = new string('A', 501),
                ObjectId = 1
            };

            IsValid(dto).Should().BeFalse();
        }
        [Fact]
        public void CreateImageDto_PrazanUrl_NijeValidno()
        {
            var dto = new CreateImageDto
            {
                Url = "",
                ObjectId = 1
            };

            IsValid(dto).Should().BeFalse();
        }
        [Fact]
        public void CreateImageDto_NullUrl_NijeValidno()
        {
            var dto = new CreateImageDto
            {
                Url = null,
                ObjectId = 1
            };

            IsValid(dto).Should().BeFalse();
        }
        [Fact]
        public void CreateImageDto_AltTextMax200_JeValidan()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                AltText = new string('A', 200),
                ObjectId = 1
            };

            IsValid(dto).Should().BeTrue();
        }
        [Fact]
        public void CreateImageDto_IsMain_JeValidno()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1,
                IsMain = true
            };

            IsValid(dto).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  UpdateImageDto
        // ═══════════════════════════════════════════

        [Fact]
        public void UpdateImageDto_ValidanUrl_JeValidan()
        {
            var dto = new UpdateImageDto
            {
                Url = "test.jpg"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateImageDto_UrlMax500_JeValidan()
        {
            var dto = new UpdateImageDto
            {
                Url = new string('A', 500)
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateImageDto_UrlPreko500_NijeValidan()
        {
            var dto = new UpdateImageDto
            {
                Url = new string('A', 501)
            };

            IsValid(dto).Should().BeFalse();
        }

        [Fact]
        public void UpdateImageDto_AltTextMax200_JeValidan()
        {
            var dto = new UpdateImageDto
            {
                AltText = new string('A', 200)
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateImageDto_AltTextPreko200_NijeValidan()
        {
            var dto = new UpdateImageDto
            {
                AltText = new string('A', 201)
            };

            IsValid(dto).Should().BeFalse();
        }

        [Fact]
        public void UpdateImageDto_IsMain_JeValidno()
        {
            var dto = new UpdateImageDto
            {
                IsMain = true
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void UpdateImageDto_PrazanDto_JeValidan()
        {
            var dto = new UpdateImageDto();

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ForgotPasswordDto_ValidanEmail_JeValidno()
        {
            var dto = new ForgotPasswordDto
            {
                Email = "ana@test.com"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ForgotPasswordDto_NevalidanEmail_NijeValidno()
        {
            var dto = new ForgotPasswordDto
            {
                Email = "nije-email"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(ForgotPasswordDto.Email)));
        }

        [Fact]
        public void ResetPasswordDto_ValidnoPopunjeno_JeValidno()
        {
            var dto = new ResetPasswordDto
            {
                Email = "ana@test.com",
                Code = "123456",
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            };

            IsValid(dto).Should().BeTrue();
        }

        [Fact]
        public void ResetPasswordDto_KodNijeSestCifara_NijeValidno()
        {
            var dto = new ResetPasswordDto
            {
                Email = "ana@test.com",
                Code = "12345",
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(ResetPasswordDto.Code)));
        }

        [Fact]
        public void ResetPasswordDto_ConfirmPasswordSeNePoklapa_NijeValidno()
        {
            var dto = new ResetPasswordDto
            {
                Email = "ana@test.com",
                Code = "123456",
                NewPassword = "nova1234",
                ConfirmPassword = "druga123"
            };

            IsValid(dto).Should().BeFalse();
            Validate(dto).Should().Contain(r => r.MemberNames.Contains(nameof(ResetPasswordDto.ConfirmPassword)));
        }

    }
}
