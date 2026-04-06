using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Xunit;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Tests.Helpers;

namespace TuristickiVodic.Tests.Controllers
{
    /// <summary>
    /// Unit testovi za LocalitiesController pokrivaju sva poslovna pravila:
    /// - GET je anoniman — svi mogu da vide lokalitete
    /// - POST, PUT, DELETE zahtevaju Manager ulogu
    /// - Manager kreira samo u svojoj destinaciji
    /// - Manager menja samo lokalitete u svojoj destinaciji
    /// - Manager briše samo lokalitete u svojoj destinaciji
    /// - Admin ne može da upravlja lokalitetima direktno
    /// - Pri premeštanju greška se javlja i za ciljnu destinaciju
    /// </summary>
    public class LocalitiesControllerTests
    {
        private static LocalitiesController CreateController(
            Mock<ILocalityService> mockService, ClaimsPrincipal user)
        {
            var controller = new LocalitiesController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        // ═══════════════════════════════════════════
        //  GET /api/localities  — anonimno
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetAll_AnonimniKorisnik_VracaOkSaListom()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<LocalityDto>
            {
                new LocalityDto { Id = 1, Name = "Stara Varos", DestinationName = "Kotor" },
                new LocalityDto { Id = 2, Name = "Dobrota",     DestinationName = "Kotor" }
            });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeAssignableTo<IEnumerable<LocalityDto>>()
                .Which.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAll_BezLokaliteta_VracaOkSaPrazномListom()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<LocalityDto>());

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeAssignableTo<IEnumerable<LocalityDto>>().Which.Should().BeEmpty();
        }

        // ═══════════════════════════════════════════
        //  GET /api/localities/{id}  — anonimno
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetById_KadaLokalitetPostoji_VracaOk()
        {
            var mockService = new Mock<ILocalityService>();
            var dto = new LocalityDto { Id = 5, Name = "Prcanj", DestinationName = "Kotor" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaLokalitetNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((LocalityDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/localities  — samo Manager
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Create_OdgovorniManager_VracaCreated()
        {
            var mockService = new Mock<ILocalityService>();
            var noviDto = new LocalityDto { Id = 10, Name = "Dobrota", DestinationName = "Kotor" };
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateLocalityDto>(), 5, "Manager"))
                .ReturnsAsync(noviDto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Manager"));

            var result = await controller.Create(new CreateLocalityDto
            {
                Name = "Dobrota", DestinationId = 1, LocalityTypeId = 1
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(noviDto);
        }

        [Fact]
        public async Task Create_NeodgovorniManager_VracaBadRequest()
        {
            // Poslovno pravilo: Manager kreira samo za svoju destinaciju
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("You are not the responsible manager for this destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Manager"));

            var result = await controller.Create(new CreateLocalityDto
            {
                Name = "Test", DestinationId = 99, LocalityTypeId = 1
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_DestinacijaNijePronadjena_VracaBadRequest()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Destination not found"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Manager"));

            var result = await controller.Create(new CreateLocalityDto
            {
                Name = "Test", DestinationId = 9999, LocalityTypeId = 1
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_TipLokalitetaNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality type not found"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Manager"));

            var result = await controller.Create(new CreateLocalityDto
            {
                Name = "Test", DestinationId = 1, LocalityTypeId = 9999
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  PUT /api/localities/{id}  — samo Manager
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Update_OdgovorniManager_VracaOk()
        {
            var mockService = new Mock<ILocalityService>();
            var updatedDto = new LocalityDto { Id = 5, Name = "Novo Ime", DestinationName = "Kotor" };
            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateLocalityDto>(), 10, "Manager"))
                .ReturnsAsync(updatedDto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Update(5, new UpdateLocalityDto { Name = "Novo Ime" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(updatedDto);
        }

        [Fact]
        public async Task Update_LokalitetNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((LocalityDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Update(999, new UpdateLocalityDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_NeodgovorniManager_ZaTrenutnu_VracaBadRequest()
        {
            // Poslovno pravilo: Manager menja samo lokalitete u svojoj destinaciji
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("You are not the responsible manager for the current destination of this locality."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Update(5, new UpdateLocalityDto { Name = "Test" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_NeodgovorniManager_ZaCiljnu_VracaBadRequest()
        {
            // Poslovno pravilo: pri premestanju proverava se i ciljna destinacija
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("You are not the responsible manager for the target destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Update(5, new UpdateLocalityDto { DestinationId = 99 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_TipLokalitetaNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateLocalityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality type not found"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Update(5, new UpdateLocalityDto { LocalityTypeId = 9999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  DELETE /api/localities/{id}  — samo Manager
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Delete_OdgovorniManager_VracaNoContent()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.DeleteAsync(5, 10, "Manager")).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Delete(5);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_LokalitetNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.DeleteAsync(999, It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_NeodgovorniManager_VracaBadRequest()
        {
            // Poslovno pravilo: Manager brise samo lokalitete u svojoj destinaciji
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("You are not the responsible manager for this destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Delete(5);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_Admin_VracaBadRequest()
        {
            // Poslovno pravilo: samo menadzer moze da upravlja lokalitetima
            var mockService = new Mock<ILocalityService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>(), "Admin"))
                .ThrowsAsync(new InvalidOperationException("Admins cannot delete localities directly."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Delete(5);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
