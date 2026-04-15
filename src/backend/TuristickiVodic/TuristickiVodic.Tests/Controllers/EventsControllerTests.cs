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
    public class EventsControllerTests
    {
        private static EventsController CreateController(Mock<IEventService> mockService, ClaimsPrincipal user)
        {
            var controller = new EventsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetById_KadaEventPostoji_VracaOk()
        {
            var mockService = new Mock<IEventService>();
            var dto = new EventDto { Id = 5, Name = "Event", Status = "Pending" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetAll_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IEventService>();

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<EventQueryDto>()))
                .ThrowsAsync(new InvalidOperationException("Use only one type of date filter at a time."));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new EventQueryDto
            {
                Date = DateTime.UtcNow.Date,
                NextDays = 7
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetById_KadaEventNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((EventDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_ContentCreator_VracaCreated()
        {
            var mockService = new Mock<IEventService>();
            var dto = new EventDto { Id = 10, Name = "Koncert", Status = "Pending" };

            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateEventDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = 1,
                LocalityId = 1,
                StartDate = new DateTime(2026, 6, 1, 20, 0, 0, DateTimeKind.Utc)
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciGresku_VracaBadRequest()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateEventDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality does not belong to the specified destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateEventDto
            {
                Name = "Koncert",
                EventTypeId = 1,
                LocalityId = 1,
                DestinationId = 2,
                StartDate = new DateTime(2026, 6, 1, 20, 0, 0, DateTimeKind.Utc)
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_ContentCreator_VracaOk()
        {
            var mockService = new Mock<IEventService>();
            var dto = new EventDto { Id = 5, Name = "Novo ime", Status = "Approved" };

            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateEventDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(5, new UpdateEventDto { Name = "Novo ime" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaEventNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateEventDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((EventDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(999, new UpdateEventDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Approve_Manager_VracaOk()
        {
            var mockService = new Mock<IEventService>();
            var dto = new EventDto { Id = 1, Name = "Event", Status = "Approved" };

            mockService.Setup(s => s.ApproveAsync(1, It.IsAny<ApproveContentDto>(), 10, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_KadaServisBaciGresku_VracaBadRequest()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.ApproveAsync(It.IsAny<int>(), It.IsAny<ApproveContentDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Only pending events can be approved or rejected."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_ContentCreator_VracaNoContent()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.DeleteAsync(1, 5, "ContentCreator"))
                .ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaEventNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IEventService>();
            mockService.Setup(s => s.DeleteAsync(999, 5, "ContentCreator"))
                .ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetAll_BezFiltera_VracaPagedRezultat()
        {
            var mockService = new Mock<IEventService>();
            var dto = new PagedResultDto<EventDto>
            {
                Items = new List<EventDto>
        {
            new EventDto { Id = 1, Name = "Sea Dance" },
            new EventDto { Id = 2, Name = "Karneval" }
        },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<EventQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new EventQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetAll_SaSearchParametrom_VracaPagedRezultat()
        {
            var mockService = new Mock<IEventService>();
            var dto = new PagedResultDto<EventDto>
            {
                Items = new List<EventDto>
        {
            new EventDto { Id = 1, Name = "Sea Dance" }
        },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<EventQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new EventQueryDto { Search = "sea" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }
    }
}
