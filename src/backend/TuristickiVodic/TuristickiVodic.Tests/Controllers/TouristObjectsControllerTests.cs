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
        private static ObjectsController CreateController(Mock<ITouristObjectService> mockService, ClaimsPrincipal user)
        {
            var controller = new ObjectsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetAll_VracaPagedRezultat()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new PagedResultDto<TouristObjectDto>
            {
                Items = new List<TouristObjectDto>
                {
                    new TouristObjectDto { Id = 1, Name = "Pomorski muzej", DestinationId = 1 },
                    new TouristObjectDto { Id = 2, Name = "Sat kula", DestinationId = 1 }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<TouristObjectQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));
            var result = await controller.GetAll(new TouristObjectQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetAll_SaSearchParametrom_VracaPagedRezultat()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new PagedResultDto<TouristObjectDto>
            {
                Items = new List<TouristObjectDto>
        {
            new TouristObjectDto { Id = 1, Name = "Pomorski muzej", DestinationId = 1 }
        },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<TouristObjectQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));
            var result = await controller.GetAll(new TouristObjectQueryDto { Search = "muzej" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaJeContentCreatorIVlasnik_VracaSopstveniNeodobrenObjekat()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 5, Name = "Moj objekat", Status = "Pending", DestinationId = 1 };
            mockService.Setup(s => s.GetMineByIdAsync(5, 5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaJeManagerNadlezan_VracaNeodobrenObjekatIzSvojeDestinacije()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 5, Name = "Objekat za odobravanje", Status = "Pending", DestinationId = 1 };
            mockService.Setup(s => s.GetForManagerByIdAsync(5, 10)).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));
            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_ContentCreator_VracaCreated()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 10, Name = "Pomorski muzej", Status = "Pending", DestinationId = 1 };
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateTouristObjectDto>(), 5, "ContentCreator")).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.Create(new CreateTouristObjectDto { Name = "Pomorski muzej", ObjectTypeId = 1, DestinationId = 1, LocalityId = 1 });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciGresku_VracaBadRequest()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateTouristObjectDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Selected locality does not belong to the selected destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.Create(new CreateTouristObjectDto { Name = "Objekat", ObjectTypeId = 1, DestinationId = 1, LocalityId = 999 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_ContentCreator_VracaOk()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 5, Name = "Novo ime", Status = "Pending", DestinationId = 2 };
            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateTouristObjectDto>(), 5, "ContentCreator")).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.Update(5, new UpdateTouristObjectDto { Name = "Novo ime", DestinationId = 2 });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_Manager_VracaOk()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new TouristObjectDto { Id = 1, Name = "Objekat", Status = "Approved", DestinationId = 1 };
            mockService.Setup(s => s.ApproveAsync(1, It.IsAny<ApproveContentDto>(), 10, "Manager")).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));
            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Delete_ContentCreator_VracaNoContent()
        {
            var mockService = new Mock<ITouristObjectService>();
            mockService.Setup(s => s.DeleteAsync(1, 5, "ContentCreator")).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task GetMy_ContentCreator_VracaPagedRezultat()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new PagedResultDto<TouristObjectDto>
            {
                Items = new List<TouristObjectDto>
                {
                    new TouristObjectDto { Id = 1, Name = "Moj objekat", Status = "Pending", DestinationId = 1 }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetMyAsync(5, It.IsAny<TouristObjectQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.GetMy(new TouristObjectQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetForManager_Manager_VracaPagedRezultat()
        {
            var mockService = new Mock<ITouristObjectService>();
            var dto = new PagedResultDto<TouristObjectDto>
            {
                Items = new List<TouristObjectDto>
                {
                    new TouristObjectDto { Id = 1, Name = "Pending objekat", Status = "Pending", DestinationId = 1 }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetForManagerAsync(10, It.IsAny<TouristObjectQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));
            var result = await controller.GetForManager(new TouristObjectQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }
    }
}
