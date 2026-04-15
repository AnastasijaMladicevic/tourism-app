using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
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
    public class EventPlannerControllerTests
    {
        private static EventPlannerController CreateController(Mock<IEventPlannerService> mockService, ClaimsPrincipal user)
        {
            var controller = new EventPlannerController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public void EventPlannerController_ImaAuthorizeSamoZaTourist()
        {
            var attr = typeof(EventPlannerController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Single();

            attr.Roles.Should().Be("Tourist");
        }

        [Fact]
        public async Task GetMyPlanner_VracaPagedRezultatZaTrenutnogKorisnika()
        {
            var mockService = new Mock<IEventPlannerService>();
            var paged = new PagedResultDto<EventPlannerDto>
            {
                Items =
                {
                    new EventPlannerDto
                    {
                        Id = 1,
                        UserId = 5,
                        EventId = 10,
                        EventName = "Koncert",
                        Status = "Approved"
                    },
                    new EventPlannerDto
                    {
                        Id = 2,
                        UserId = 5,
                        EventId = 11,
                        EventName = "Festival",
                        Status = "Approved"
                    }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService.Setup(s => s.GetMyPlannerAsync(5, It.IsAny<EventPlannerQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.GetMyPlanner(new EventPlannerQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);

            mockService.Verify(s => s.GetMyPlannerAsync(5, It.IsAny<EventPlannerQueryDto>()), Times.Once);
        }

        [Fact]
        public async Task Add_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IEventPlannerService>();
            mockService.Setup(s => s.AddAsync(It.IsAny<CreateEventPlannerDto>(), 5))
                .ThrowsAsync(new InvalidOperationException("This event is already in your planner."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Add(new CreateEventPlannerDto { EventId = 1 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Remove_KadaStavkaNePripadaKorisnikuIliNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IEventPlannerService>();
            mockService.Setup(s => s.RemoveAsync(10, 5)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Remove(10);

            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
