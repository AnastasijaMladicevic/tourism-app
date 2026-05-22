using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Xunit;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Tests.Helpers;

namespace TuristickiVodic.Tests.Controllers
{
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

        [Fact]
        public async Task GetAll_AnonimniKorisnik_VracaOkSaRezultatom()
        {
            var mockService = new Mock<IDestinationService>();
            var pagedResult = new PagedResultDto<DestinationDto>();

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<DestinationQueryDto>()))
                .Returns(Task.FromResult(pagedResult));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new DestinationQueryDto());

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeSameAs(pagedResult);
        }

        [Fact]
        public async Task GetAll_KadaNemaDestinacija_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var pagedResult = new PagedResultDto<DestinationDto>();

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<DestinationQueryDto>()))
                .Returns(Task.FromResult(pagedResult));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new DestinationQueryDto());

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeSameAs(pagedResult);
        }

        [Fact]
        public async Task GetById_KadaDestinacijaPostoji_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var dto = new DestinationDto { Id = 1, Name = "Kotor" };

            mockService
                .Setup(s => s.GetByIdAsync(1, It.IsAny<int?>(), It.IsAny<string?>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.GetByIdAsync(999, It.IsAny<int?>(), It.IsAny<string?>()))
                .ReturnsAsync((DestinationDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_KadaAdminKreiraDestinacijuSaMenadzerom_VracaCreated()
        {
            var mockService = new Mock<IDestinationService>();
            var novaDestinacija = new DestinationDto
            {
                Id = 10,
                Name = "Durmitor",
                ManagedByUserId = 5
            };

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), 1))
                .ReturnsAsync(novaDestinacija);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var dto = new CreateDestinationDto
            {
                Name = "Durmitor",
                DestinationTypeId = 1,
                ManagedByUserId = 5
            };

            var result = await controller.Create(dto);

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(novaDestinacija);
        }

        [Fact]
        public async Task Create_KadaMenadzerVecRukovodiDrugomDestinacijom_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("This manager already manages another destination."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest",
                DestinationTypeId = 1,
                ManagedByUserId = 5
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaDodeljenoLiceNijeManager_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("The assigned user does not have the Manager role."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest",
                DestinationTypeId = 1,
                ManagedByUserId = 99
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaMenadzerNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Manager user not found."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest",
                DestinationTypeId = 1,
                ManagedByUserId = 999
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaTipDestinacijeNijePronadjen_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateDestinationDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Destination type not found"));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Create(new CreateDestinationDto
            {
                Name = "Nova Dest",
                DestinationTypeId = 999,
                ManagedByUserId = 5
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_KadaAdminMenjaDestinaciju_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var updatedDto = new DestinationDto { Id = 1, Name = "Kotor Novo" };

            mockService
                .Setup(s => s.UpdateAsync(1, It.IsAny<UpdateDestinationDto>(), 1, "Admin"))
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

            mockService
                .Setup(s => s.UpdateAsync(999, It.IsAny<UpdateDestinationDto>(), It.IsAny<int>(), It.IsAny<string>()))
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

            mockService
                .Setup(s => s.UpdateAsync(1, It.IsAny<UpdateDestinationDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Destination type not found"));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(1, new UpdateDestinationDto { DestinationTypeId = 999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_KadaDestinacijuUredjujeDrugiAdmin_VracaConflict()
        {
            var mockService = new Mock<IDestinationService>();
            var lockState = new DestinationEditLockDto
            {
                DestinationId = 1,
                IsLocked = true,
                IsOwnedByCurrentUser = false,
                LockedByUserId = 2,
                LockedByDisplayName = "Ana Admin",
                Message = "Ana Admin is currently editing this destination."
            };

            mockService
                .Setup(s => s.UpdateAsync(1, It.IsAny<UpdateDestinationDto>(), 1, "Admin"))
                .ThrowsAsync(new DestinationEditLockException(lockState));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(1, new UpdateDestinationDto { Name = "Blocked" });

            result.Should().BeOfType<ConflictObjectResult>()
                .Which.Value.Should().BeEquivalentTo(lockState);
        }

        [Fact]
        public async Task AcquireEditLock_KadaDestinacijaPostoji_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var lockState = new DestinationEditLockDto
            {
                DestinationId = 1,
                IsLocked = true,
                IsOwnedByCurrentUser = true,
                LockedByUserId = 1,
                LockedByDisplayName = "Admin User",
                Message = "You are currently editing this destination."
            };

            mockService
                .Setup(s => s.AcquireEditLockAsync(1, 1))
                .ReturnsAsync(lockState);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AcquireEditLock(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(lockState);
        }

        [Fact]
        public async Task AssignManager_KadaJeValidanManager_VracaOk()
        {
            var mockService = new Mock<IDestinationService>();
            var updatedDto = new DestinationDto { Id = 1, ManagedByUserId = 5 };

            mockService
                .Setup(s => s.AssignManagerAsync(1, 5, 1))
                .ReturnsAsync(updatedDto);

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

            mockService
                .Setup(s => s.AssignManagerAsync(999, It.IsAny<int>(), It.IsAny<int>()))
                .ReturnsAsync((DestinationDto?)null);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(999, new AssignManagerDto { ManagerUserId = 5 });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task AssignManager_KadaManagerVecVodiDruguDestinaciju_VracaBadRequest()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.AssignManagerAsync(1, 5, 1))
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

            mockService
                .Setup(s => s.AssignManagerAsync(1, 99, 1))
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

            mockService
                .Setup(s => s.AssignManagerAsync(1, 999, 1))
                .ThrowsAsync(new InvalidOperationException("User not found."));

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.AssignManager(1, new AssignManagerDto { ManagerUserId = 999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetAll_SaSearchParametrom_VracaPagedRezultat()
        {
            var mockService = new Mock<IDestinationService>();
            var dto = new PagedResultDto<DestinationDto>
            {
                TotalCount = 1,
                Page = 1,
                PageSize = 10,
                TotalPages = 1,
                Items = new List<DestinationDto>
        {
            new DestinationDto { Id = 1, Name = "Kotor" }
        }
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<DestinationQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new DestinationQueryDto { Search = "kot" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Delete_KadaServisUspesnoObrise_VracaNoContent()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaNijePronadjena_VracaNotFound()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.DeleteAsync(999))
                .ReturnsAsync(false);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_KadaDestinacijaImaPovezanSadrzaj_IDaljeVracaNoContentAkoServisUspesnoObrise()
        {
            var mockService = new Mock<IDestinationService>();

            mockService
                .Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(1, "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }
    }
}
