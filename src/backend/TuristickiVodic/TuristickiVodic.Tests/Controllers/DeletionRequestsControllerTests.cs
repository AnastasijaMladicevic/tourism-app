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
    public class DeletionRequestsControllerTests
    {
        private static DeletionRequestsController CreateController(Mock<IDeletionRequestService> mockService, ClaimsPrincipal user)
        {
            var controller = new DeletionRequestsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task CreateForObject_ContentCreator_VracaCreated()
        {
            var mockService = new Mock<IDeletionRequestService>();
            var dto = new DeletionRequestDto
            {
                Id = 1,
                ObjectId = 5,
                RequestedByUserId = 20,
                RequestedByName = "Creator One",
                Status = "Pending"
            };

            mockService.Setup(s => s.CreateForObjectAsync(5, It.IsAny<CreateDeletionRequestDto>(), 20))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.CreateForObject(5, new CreateDeletionRequestDto { Reason = "Zastareo sadrzaj" });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task CreateForObject_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.CreateForObjectAsync(It.IsAny<int>(), It.IsAny<CreateDeletionRequestDto>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only request deletion of your own objects."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.CreateForObject(5, new CreateDeletionRequestDto { Reason = "Razlog" });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task CreateForEvent_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.CreateForEventAsync(It.IsAny<int>(), It.IsAny<CreateDeletionRequestDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Only approved events require a deletion request."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.CreateForEvent(3, new CreateDeletionRequestDto { Reason = "Razlog" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMyRequests_ContentCreator_VracaOkSaSamoNjegovimZahtevima()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.GetByUserIdAsync(20)).ReturnsAsync(new List<DeletionRequestDto>
            {
                new DeletionRequestDto { Id = 1, ObjectId = 10, RequestedByUserId = 20, RequestedByName = "Creator One", Status = "Pending" },
                new DeletionRequestDto { Id = 2, EventId = 11, RequestedByUserId = 20, RequestedByName = "Creator One", Status = "Rejected" }
            });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.GetMyRequests();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeAssignableTo<IEnumerable<DeletionRequestDto>>()
                .Which.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetById_KadaKorisnikovZahtevPostoji_VracaOk()
        {
            var mockService = new Mock<IDeletionRequestService>();
            var dto = new DeletionRequestDto
            {
                Id = 7,
                ObjectId = 12,
                RequestedByUserId = 20,
                RequestedByName = "Creator One",
                Status = "Pending"
            };

            mockService.Setup(s => s.GetByIdForUserAsync(7, 20)).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.GetById(7);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaKorisnikovZahtevNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.GetByIdForUserAsync(7, 20)).ReturnsAsync((DeletionRequestDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.GetById(7);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetAll_Manager_VracaOkSaZahtevimaZaNjegovuDestinaciju()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.GetAllAsync(10, "Manager")).ReturnsAsync(new List<DeletionRequestDto>
            {
                new DeletionRequestDto { Id = 1, ObjectId = 1, RequestedByUserId = 20, RequestedByName = "Creator One", Status = "Pending" }
            });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.GetAll();

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeAssignableTo<IEnumerable<DeletionRequestDto>>()
                .Which.Should().HaveCount(1);
        }

        [Fact]
        public async Task Review_ManagerOdobri_VracaOk()
        {
            var mockService = new Mock<IDeletionRequestService>();
            var dto = new DeletionRequestDto
            {
                Id = 3,
                ObjectId = 15,
                RequestedByUserId = 20,
                RequestedByName = "Creator One",
                Status = "Approved",
                ReviewedByUserId = 10,
                ReviewedByName = "Manager One"
            };

            mockService.Setup(s => s.ReviewAsync(3, It.IsAny<ApproveDeletionRequestDto>(), 10, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Review(3, new ApproveDeletionRequestDto { Approve = true });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Review_KadaZahtevNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.ReviewAsync(99, It.IsAny<ApproveDeletionRequestDto>(), 10, "Manager"))
                .ReturnsAsync((DeletionRequestDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Review(99, new ApproveDeletionRequestDto { Approve = true });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Review_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IDeletionRequestService>();
            mockService.Setup(s => s.ReviewAsync(It.IsAny<int>(), It.IsAny<ApproveDeletionRequestDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("You are not the responsible manager for this destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Review(3, new ApproveDeletionRequestDto { Approve = true });

            result.Should().BeOfType<ForbidResult>();
        }
    }
}
