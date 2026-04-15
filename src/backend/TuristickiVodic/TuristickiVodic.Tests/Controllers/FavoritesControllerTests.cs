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
    public class FavoritesControllerTests
    {
        private static FavoritesController CreateController(Mock<IFavoriteService> mockService, ClaimsPrincipal user)
        {
            var controller = new FavoritesController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public void FavoritesController_ImaAuthorizeSamoZaTourist()
        {
            var attr = typeof(FavoritesController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Single();

            attr.Roles.Should().Be("Tourist");
        }

        [Fact]
        public async Task GetMyFavorites_VracaPagedRezultatZaTrenutnogKorisnika()
        {
            var mockService = new Mock<IFavoriteService>();
            var paged = new PagedResultDto<FavoriteDto>
            {
                Items =
                {
                    new FavoriteDto { Id = 1, UserId = 5, DestinationId = 10, DestinationName = "Kotor" },
                    new FavoriteDto { Id = 2, UserId = 5, LocalityId = 3, LocalityName = "Stari grad" }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService.Setup(s => s.GetMyFavoritesAsync(5, It.IsAny<FavoriteQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.GetMyFavorites(new FavoriteQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);

            mockService.Verify(s => s.GetMyFavoritesAsync(5, It.IsAny<FavoriteQueryDto>()), Times.Once);
        }

        [Fact]
        public async Task Add_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IFavoriteService>();
            mockService.Setup(s => s.AddAsync(It.IsAny<CreateFavoriteDto>(), 5))
                .ThrowsAsync(new InvalidOperationException("This item is already in your favorites."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Add(new CreateFavoriteDto { DestinationId = 1 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Remove_KadaFavoritNePripadaKorisnikuIliNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IFavoriteService>();
            mockService.Setup(s => s.RemoveAsync(10, 5)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Remove(10);

            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
