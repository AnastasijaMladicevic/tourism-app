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
    public class ReviewsControllerTests
    {
        private static ReviewsController CreateController(Mock<IReviewService> mockService, ClaimsPrincipal user)
        {
            var controller = new ReviewsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetAll_VracaOkSaListom()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<ReviewDto>
            {
                new ReviewDto { Id = 1, Text = "Odlicno", Status = "Approved" },
                new ReviewDto { Id = 2, Text = "Dobro", Status = "Pending" }
            });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll();

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeAssignableTo<IEnumerable<ReviewDto>>();
        }

        [Fact]
        public async Task GetById_KadaPostoji_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 5, Text = "Komentar", Status = "Pending" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((ReviewDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_Tourist_VracaCreated()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 10, Text = "Super", Status = "Pending" };

            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateReviewDto>(), 5, "Tourist"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Create(new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = "Super"
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateReviewDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("You can only review approved objects."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Create(new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = "Test"
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateReviewDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("Only tourists can write reviews."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Create(new CreateReviewDto
            {
                ObjectId = 1,
                Rating = 5,
                Text = "Test"
            });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_Tourist_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, Text = "Novi tekst", Status = "Pending" };

            mockService.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateReviewDto>(), 5, "Tourist"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, new UpdateReviewDto { Text = "Novi tekst" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateReviewDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ReviewDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(999, new UpdateReviewDto { Text = "X" });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Respond_ContentCreator_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, CreatorResponse = "Hvala" };

            mockService.Setup(s => s.RespondAsync(1, It.IsAny<RespondToReviewDto>(), 20, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.Respond(1, new RespondToReviewDto { CreatorResponse = "Hvala" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Respond_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.RespondAsync(It.IsAny<int>(), It.IsAny<RespondToReviewDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Cannot respond to a review that has no comment."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.Respond(1, new RespondToReviewDto { CreatorResponse = "Hvala" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdateResponse_ContentCreator_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, CreatorResponse = "Novi odgovor" };

            mockService.Setup(s => s.UpdateResponseAsync(1, It.IsAny<RespondToReviewDto>(), 20, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.UpdateResponse(1, new RespondToReviewDto { CreatorResponse = "Novi odgovor" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task DeleteResponse_ContentCreator_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, CreatorResponse = null };

            mockService.Setup(s => s.DeleteResponseAsync(1, 20, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(20, "ContentCreator"));

            var result = await controller.DeleteResponse(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task DeleteResponse_Manager_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, CreatorResponse = null };

            mockService.Setup(s => s.DeleteResponseAsync(1, 30, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.DeleteResponse(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_Manager_VracaOk()
        {
            var mockService = new Mock<IReviewService>();
            var dto = new ReviewDto { Id = 1, Status = "Approved" };

            mockService.Setup(s => s.ApproveAsync(1, It.IsAny<ApproveReviewDto>(), 30, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.Approve(1, new ApproveReviewDto { Approve = true });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_KadaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.ApproveAsync(999, It.IsAny<ApproveReviewDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ReviewDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.Approve(999, new ApproveReviewDto { Approve = true });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_Tourist_VracaNoContent()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.DeleteAsync(1, 5, "Tourist")).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_Manager_VracaNoContent()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.DeleteAsync(1, 30, "Manager")).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IReviewService>();
            mockService.Setup(s => s.DeleteAsync(999, 5, "Tourist")).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }
    }
}