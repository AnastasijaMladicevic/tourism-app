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
    public class ManagerReportsControllerTests
    {
        private static ManagerReportsController CreateController(Mock<IManagerReportService> mockService, ClaimsPrincipal user)
        {
            var controller = new ManagerReportsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task Create_Manager_VracaCreated()
        {
            var mockService = new Mock<IManagerReportService>();
            var createdDto = new ManagerReportDto
            {
                Id = 1,
                ManagerId = 30,
                ReportedUserId = 20,
                Reason = "Neprimeren sadrzaj",
                Status = "Pending"
            };

            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateManagerReportDto>(), 30))
                .ReturnsAsync(createdDto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.Create(new CreateManagerReportDto
            {
                ReportedUserId = 20,
                Reason = "Neprimeren sadrzaj"
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.ActionName.Should().Be(nameof(ManagerReportsController.GetById));
            created.Value.Should().BeEquivalentTo(createdDto);
        }

        [Fact]
        public async Task GetAll_Admin_VracaOkSaSvimPrijavama()
        {
            var mockService = new Mock<IManagerReportService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<ManagerReportDto>
            {
                new ManagerReportDto { Id = 1, Status = "Pending" },
                new ManagerReportDto { Id = 2, Status = "Approved" }
            });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(40, "Admin"));

            var result = await controller.GetAll();

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeAssignableTo<IEnumerable<ManagerReportDto>>();
        }

        [Fact]
        public async Task Withdraw_KadServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IManagerReportService>();
            mockService.Setup(s => s.WithdrawAsync(5, 30))
                .ThrowsAsync(new UnauthorizedAccessException("Manager can withdraw only their own reports."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(30, "Manager"));

            var result = await controller.Withdraw(5);

            result.Should().BeOfType<ForbidResult>();
        }
    }
}
