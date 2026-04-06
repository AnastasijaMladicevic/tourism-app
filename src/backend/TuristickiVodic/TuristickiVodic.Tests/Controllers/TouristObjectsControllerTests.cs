using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Tests.Helpers;
using Xunit;

namespace TuristickiVodic.Tests.Controllers
{
    public class TouristObjectsControllerTests
    {
        private static ObjectsController CreateController(
            Mock<ITouristObjectService> mockService,
            ClaimsPrincipal user)
        {
            var controller = new ObjectsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetAll_VracaOkSaListom()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<TouristObjectDto>
            {
                new TouristObjectDto { Id = 1, Name = "Hotel Vardar", Status = "Approved" },
                new TouristObjectDto { Id = 2, Name = "Restoran Galion", Status = "Pending" }
            });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeAssignableTo<IEnumerable<TouristObjectDto>>();
        }

        [Fact]
        public async Task GetById_KadaObjekatPostoji_VracaOk()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 5, Name = "Objekat", Status = "Pending" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaObjekatNePostoji_VracaNotFound()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((TouristObjectDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_ContentCreator_VracaCreated()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 10, Name = "Pomorski muzej", Status = "Pending" };

            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateTouristObjectDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateTouristObjectDto
            {
                Name = "Pomorski muzej",
                ObjectTypeId = 1,
                LocalityId = 1
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciGresku_VracaBadRequest()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateTouristObjectDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality not found."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateTouristObjectDto
            {
                Name = "Objekat",
                ObjectTypeId = 1,
                LocalityId = 999
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_ContentCreator_VracaOk()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 5, Name = "Novo ime", Status = "Pending" };

            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateTouristObjectDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(5, new UpdateTouristObjectDto
            {
                Name = "Novo ime"
            });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaObjekatNePostoji_VracaNotFound()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateTouristObjectDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((TouristObjectDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(999, new UpdateTouristObjectDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Approve_Manager_VracaOk()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 1, Name = "Objekat", Status = "Approved" };

            mockService.Setup(s => s.ApproveAsync(1, It.IsAny<ApproveContentDto>(), 10, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto
            {
                Approve = true
            });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_KadaServisBaciGresku_VracaBadRequest()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.ApproveAsync(It.IsAny<int>(), It.IsAny<ApproveContentDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Only pending objects can be approved or rejected."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto
            {
                Approve = true
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_ContentCreator_VracaNoContent()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.DeleteAsync(1, 5, "ContentCreator"))
                .ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaObjekatNePostoji_VracaNotFound()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.DeleteAsync(999, 5, "ContentCreator"))
                .ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }
    }
}