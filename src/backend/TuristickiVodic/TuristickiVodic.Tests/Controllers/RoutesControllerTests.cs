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
    public class RoutesControllerTests
    {
        private static RoutesController CreateController(Mock<IRouteService> mockService, ClaimsPrincipal user)
        {
            var controller = new RoutesController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetAll_AnonimniKorisnik_VracaOkSaPagedRezultatom()
        {
            var mockService = new Mock<IRouteService>();
            var paged = new PagedResultDto<RouteDto>
            {
                Items =
                {
                    new RouteDto { Id = 1, Name = "Ruta 1" },
                    new RouteDto { Id = 2, Name = "Ruta 2" }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService.Setup(s => s.GetAllAsync(It.IsAny<RouteQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new RouteQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);
        }

        [Fact]
        public async Task GetById_KadaRutaPostoji_VracaOk()
        {
            var mockService = new Mock<IRouteService>();
            var dto = new RouteDto { Id = 5, Name = "Ruta" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaRutaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((RouteDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_UlogovaniKorisnik_VracaCreated()
        {
            var mockService = new Mock<IRouteService>();
            var dto = new RouteDto { Id = 10, Name = "Nova ruta" };

            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateRouteDto>(), 5))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Create(new CreateRouteDto
            {
                Name = "Nova ruta",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 },
                    new CreateRoutePointDto { Order = 2, Longitude = 18.71, Latitude = 42.41 }
                }
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateRouteDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("A route must have at least 2 points."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Create(new CreateRouteDto
            {
                Name = "Nevalidna",
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 }
                }
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_Vlasnik_VracaOk()
        {
            var mockService = new Mock<IRouteService>();
            var dto = new RouteDto { Id = 1, Name = "Izmenjena ruta" };

            mockService.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateRouteDto>(), 5))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, new UpdateRouteDto
            {
                Name = "Izmenjena ruta"
            });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaRutaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateRouteDto>(), It.IsAny<int>()))
                .ReturnsAsync((RouteDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(999, new UpdateRouteDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateRouteDto>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only update your own routes."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, new UpdateRouteDto { Name = "X" });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateRouteDto>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Route points must have unique order values."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(1, new UpdateRouteDto
            {
                RoutePoints = new List<CreateRoutePointDto>
                {
                    new CreateRoutePointDto { Order = 1, Longitude = 18.70, Latitude = 42.40 },
                    new CreateRoutePointDto { Order = 1, Longitude = 18.71, Latitude = 42.41 }
                }
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_Vlasnik_VracaNoContent()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.DeleteAsync(1, 5)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaRutaNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.DeleteAsync(999, 5)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only delete your own routes."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Delete_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IRouteService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>()))
                .ThrowsAsync(new InvalidOperationException("Cannot delete a route that is in someone's favorites."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
