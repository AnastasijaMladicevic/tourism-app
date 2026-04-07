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
    public class RoutePointsControllerTests
    {
        private static RoutePointsController CreateController(Mock<IRoutePointService> mockService, ClaimsPrincipal user)
        {
            var controller = new RoutePointsController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetByRoute_AnonimniKorisnik_VracaOkSaListom()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.GetByRouteAsync(1)).ReturnsAsync(new List<RoutePointDto>
            {
                new RoutePointDto { Id = 1, RouteId = 1, Order = 1 },
                new RoutePointDto { Id = 2, RouteId = 1, Order = 2 }
            });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetByRoute(1);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeAssignableTo<IEnumerable<RoutePointDto>>();
        }

        [Fact]
        public async Task GetByRoute_KadaRutaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.GetByRouteAsync(999))
                .ThrowsAsync(new InvalidOperationException("Route not found."));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetByRoute(999);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task GetById_KadaTackaPostojiZaTuRutu_VracaOk()
        {
            var mockService = new Mock<IRoutePointService>();
            var dto = new RoutePointDto { Id = 5, RouteId = 1, Order = 2 };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(1, 5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaTackaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((RoutePointDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(1, 999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetById_KadaRouteIdNeOdgovara_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(new RoutePointDto
            {
                Id = 5,
                RouteId = 2,
                Order = 1
            });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(1, 5);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Add_VlasnikRute_VracaCreated()
        {
            var mockService = new Mock<IRoutePointService>();
            var dto = new RoutePointDto { Id = 10, RouteId = 1, Order = 3 };

            mockService.Setup(s => s.AddAsync(1, It.IsAny<CreateRoutePointDto>(), 5))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Add(1, new CreateRoutePointDto
            {
                Order = 3,
                Longitude = 18.80,
                Latitude = 42.80,
                PointName = "Nova"
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Add_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.AddAsync(It.IsAny<int>(), It.IsAny<CreateRoutePointDto>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only add points to your own routes."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Add(1, new CreateRoutePointDto
            {
                Order = 3,
                Longitude = 18.80,
                Latitude = 42.80
            });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Add_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.AddAsync(It.IsAny<int>(), It.IsAny<CreateRoutePointDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("A point with order 2 already exists on this route."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Add(1, new CreateRoutePointDto
            {
                Order = 2,
                Longitude = 18.80,
                Latitude = 42.80
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_VlasnikRute_VracaOk()
        {
            var mockService = new Mock<IRoutePointService>();
            var dto = new RoutePointDto { Id = 5, RouteId = 1, Order = 10, PointName = "Novo ime" };

            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateRoutePointDto>(), 5))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, 5, new UpdateRoutePointDto
            {
                Order = 10,
                PointName = "Novo ime"
            });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaTackaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateRoutePointDto>(), It.IsAny<int>()))
                .ReturnsAsync((RoutePointDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, 999, new UpdateRoutePointDto { PointName = "X" });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadaRouteIdNeOdgovara_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateRoutePointDto>(), It.IsAny<int>()))
                .ReturnsAsync(new RoutePointDto { Id = 5, RouteId = 2, Order = 1 });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, 5, new UpdateRoutePointDto { PointName = "X" });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateRoutePointDto>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only update points on your own routes."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, 5, new UpdateRoutePointDto { PointName = "X" });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateRoutePointDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("A point with order 2 already exists on this route."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, 5, new UpdateRoutePointDto { Order = 2 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_VlasnikRute_VracaNoContent()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.DeleteAsync(5, 5)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1, 5);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaTackaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.DeleteAsync(999, 5)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1, 999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only delete points from your own routes."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1, 5);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Delete_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRoutePointService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Cannot delete this point. A route must have at least 2 points."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1, 5);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}