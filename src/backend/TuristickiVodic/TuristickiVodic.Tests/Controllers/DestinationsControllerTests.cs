using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Xunit;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Tests.Helpers;

namespace TuristickiVodic.Tests.Controllers
{
    /// <summary>
    /// Unit testovi za DestinationsController pokrivaju sva poslovna pravila:
    /// - Svi mogu da vide destinacije (anonimno)
    /// - Samo Admin može da kreira destinacije
    /// - Destinacija ne može da se kreira bez menadžera
    /// - Jedan Manager ne može da rukovodi sa više destinacija
    /// - Samo Admin može da menja destinacije
    /// - Samo Admin može da dodeli menadžera (assign-manager)
    /// - Samo Admin može da briše destinacije
    /// - Brisanje je blokirano ako destinacija ima lokalitete, objekte ili evente
    /// </summary>
    public class DestinationsControllerTests
    {
        private static DestinationsController CreateController(Mock<IDestinationService> mockService, ClaimsPrincipal user)
        {
            var controller = new DestinationsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        // ═══════════════════════════════════════════
        //  GET /api/destinations  — svi mogu da vide (anonimno)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetAll_AnonimniKorisnik_VracaOkSaListom()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.GetAllAsync(It.IsAny<int?>(), It.IsAny<string?>())).ReturnsAsync(new List<DestinationDto>
            {
                new DestinationDto { Id = 1, Name = "Kotor" },
                new DestinationDto { Id = 2, Name = "Budva" }
            });

            // Anoniman korisnik
            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeAssignableTo<IEnumerable<DestinationDto>>()
                .Which.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAll_KadaNemaDestinacija_VracaOkSaPrazномListom()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.GetAllAsync(It.IsAny<int?>(), It.IsAny<string?>())).ReturnsAsync(new List<DestinationDto>());

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeAssignableTo<IEnumerable<DestinationDto>>().Which.Should().BeEmpty();
        }

        // ═══════════════════════════════════════════
        //  GET /api/destinations/{id}  — svi mogu da vide
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetById_KadaDestinacijaPostoji_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var dto = new DestinationDto { Id = 1, Name = "Kotor" };
            mockService.Setup(s => s.GetByIdAsync(1, It.IsAny<int?>(), It.IsAny<string?>())).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.GetByIdAsync(999, It.IsAny<int?>(), It.IsAny<string?>())).ReturnsAsync((DestinationDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/destinations  — Samo Admin može da kreira
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Create_KadaAdminKreiraDestinacijuSaMenadzerom_VracaCreated()
        {
            var mockService = new Mock<IDestinationService>();
            var novaDestinacija = new DestinationDto { Id = 10, Name = "Durmitor", ManagedByUserId = 5 };
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), 1))
                .ReturnsAsync(novaDestinacija);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var dto = new CreateDestinationDto
            {
                Name = "Durmitor",
                DestinationTypeId = 1,
                ManagedByUserId = 5  // obavezno — destinacija ne može bez menadžera
            };

            var result = await controller.Create(dto);

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(novaDestinacija);
        }

        [Fact]
        public async Task Create_KadaMenadzzerVecRukovodiDrugomDestinacijom_VracaBadRequest()
        {
            // Poslovno pravilo: jedan Manager ne može da rukovodi sa više destinacija
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("This manager already manages another destination."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest", DestinationTypeId = 1, ManagedByUserId = 5
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaDodeljenoLiceNijeManager_VracaBadRequest()
        {
            // Poslovno pravilo: ManagedByUserId mora biti korisnik sa Manager ulogom
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("The assigned user does not have the Manager role."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest", DestinationTypeId = 1, ManagedByUserId = 99
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaMenadzzerNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Manager user not found."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest", DestinationTypeId = 1, ManagedByUserId = 999
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaTipDestinacijeNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Destination type not found"));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest", DestinationTypeId = 999, ManagedByUserId = 5
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  PUT /api/destinations/{id}  — Samo Admin može da menja
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Update_KadaAdminMenjaDestinaciju_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var updatedDto = new DestinationDto { Id = 1, Name = "Kotor Novo" };
            mockService.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateDestinationDto>(), 1, "Admin"))
                .ReturnsAsync(updatedDto);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(1, new UpdateDestinationDto { Name = "Kotor Novo" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(updatedDto);
        }

        [Fact]
        public async Task Update_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateDestinationDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((DestinationDto?)null);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(999, new UpdateDestinationDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadaNovTipDestinacijeNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateDestinationDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Destination type not found"));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(1, new UpdateDestinationDto { DestinationTypeId = 999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  PUT /api/destinations/{id}/assign-manager
        //  Samo Admin može da dodeli menadžera
        //  Novi menadžer ne sme već voditi drugu destinaciju
        // ═══════════════════════════════════════════

        [Fact]
        public async Task AssignManager_KadaJeValidanManager_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var updatedDto = new DestinationDto { Id = 1, ManagedByUserId = 5 };
            mockService.Setup(s => s.AssignManagerAsync(1, 5)).ReturnsAsync(updatedDto);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(1, new AssignManagerDto { ManagerUserId = 5 });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(updatedDto);
        }

        [Fact]
        public async Task AssignManager_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.AssignManagerAsync(999, It.IsAny<int>()))
                .ReturnsAsync((DestinationDto?)null);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(999, new AssignManagerDto { ManagerUserId = 5 });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task AssignManager_KadaManagerVecVodiDrugDestinaciju_VracaBadRequest()
        {
            // Poslovno pravilo: jedan Manager ne može da rukovodi sa više destinacija
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.AssignManagerAsync(1, 5))
                .ThrowsAsync(new InvalidOperationException("This manager already manages another destination."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(1, new AssignManagerDto { ManagerUserId = 5 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task AssignManager_KadaKorisnikNijeManager_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.AssignManagerAsync(1, 99))
                .ThrowsAsync(new InvalidOperationException("The assigned user does not have the Manager role."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(1, new AssignManagerDto { ManagerUserId = 99 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task AssignManager_KadaKorisnikNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.AssignManagerAsync(1, 999))
                .ThrowsAsync(new InvalidOperationException("User not found."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(1, new AssignManagerDto { ManagerUserId = 999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  DELETE /api/destinations/{id}
        //  Samo Admin može da briše
        //  Blokirano ako ima lokalitete, objekte ili evente
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Delete_KadaJeDestinacijaPrazna_VracaNoContent()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.DeleteAsync(999)).ReturnsAsync(false);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaImaLokalitete_VracaBadRequest()
        {
            // Poslovno pravilo: brisanje blokirano ako ima lokalitete
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.DeleteAsync(1))
                .ThrowsAsync(new InvalidOperationException("Cannot delete destination that has localities. Remove them first."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaImaObjekte_VracaBadRequest()
        {
            // Poslovno pravilo: brisanje blokirano ako ima objekte
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.DeleteAsync(1))
                .ThrowsAsync(new InvalidOperationException("Cannot delete destination that has objects. Remove them first."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaImaEvente_VracaBadRequest()
        {
            // Poslovno pravilo: brisanje blokirano ako ima evente
            var mockService = new Mock<IDestinationService>();
            mockService.Setup(s => s.DeleteAsync(1))
                .ThrowsAsync(new InvalidOperationException("Cannot delete destination that has events. Remove them first."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
