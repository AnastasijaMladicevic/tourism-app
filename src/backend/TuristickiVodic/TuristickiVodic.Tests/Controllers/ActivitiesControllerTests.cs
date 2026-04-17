using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Tests.Helpers;
using Xunit;

namespace TuristickiVodic.Tests.Controllers
{
    public class ActivitiesControllerTests
    {
        private static ActivitiesController CreateController(Mock<IActivityService> mockService, ClaimsPrincipal user)
        {
            var controller = new ActivitiesController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetAll_AnonimniKorisnik_VracaOkSaPaginiranimRezultatom()
        {
            var mockService = new Mock<IActivityService>();
            var paged = new PagedResultDto<ActivityDto>
            {
                Items = new List<ActivityDto>
                {
                    new ActivityDto { Id = 1, Name = "Setnja", Status = "Approved" },
                    new ActivityDto { Id = 2, Name = "Tura", Status = "Pending" }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 2,
                TotalPages = 1
            };

            mockService.Setup(s => s.GetAllAsync(It.IsAny<ActivityQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new ActivityQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);
        }

        [Fact]
        public async Task GetAll_KadaNemaAktivnosti_VracaOkSaPraznimPaginiranimRezultatom()
        {
            var mockService = new Mock<IActivityService>();
            var paged = new PagedResultDto<ActivityDto>
            {
                Items = new List<ActivityDto>(),
                Page = 1,
                PageSize = 10,
                TotalCount = 0,
                TotalPages = 0
            };

            mockService.Setup(s => s.GetAllAsync(It.IsAny<ActivityQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new ActivityQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);
        }

        [Fact]
        public async Task GetById_KadaAktivnostPostoji_VracaOk()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new ActivityDto { Id = 5, Name = "Setnja", Status = "Pending" };

            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaJeContentCreatorIVlasnik_VracaSopstvenuNeodobrenuAktivnost()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new ActivityDto { Id = 5, Name = "Moja aktivnost", Status = "Pending" };

            mockService.Setup(s => s.GetMineByIdAsync(5, 5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaAktivnostNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((ActivityDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetById(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_ContentCreator_VracaCreated()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new ActivityDto { Id = 10, Name = "Pesacka tura", Status = "Pending" };

            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateActivityDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateActivityDto
            {
                Name = "Pesacka tura",
                ActivityTypeId = 1,
                LocalityId = 1
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Create_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateActivityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality does not belong to the specified destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateActivityDto
            {
                Name = "Tura",
                ActivityTypeId = 1,
                LocalityId = 1,
                DestinationId = 2
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateActivityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("Only content creators can create activities."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Create(new CreateActivityDto
            {
                Name = "Tura",
                ActivityTypeId = 1,
                LocalityId = 1
            });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_ContentCreator_VracaOk()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new ActivityDto { Id = 5, Name = "Novo ime", Status = "Approved" };

            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateActivityDto>(), 5, "ContentCreator"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(5, new UpdateActivityDto { Name = "Novo ime" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Update_KadaAktivnostNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateActivityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ActivityDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(999, new UpdateActivityDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateActivityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Locality does not belong to the specified destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(1, new UpdateActivityDto { DestinationId = 2 });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateActivityDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only update your own activities."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Update(1, new UpdateActivityDto { Name = "Novo ime" });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Approve_Manager_VracaOk()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new ActivityDto { Id = 1, Name = "Aktivnost", Status = "Approved" };

            mockService.Setup(s => s.ApproveAsync(1, It.IsAny<ApproveContentDto>(), 10, "Manager"))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Approve_KadaAktivnostNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.ApproveAsync(999, It.IsAny<ApproveContentDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ActivityDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(999, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Approve_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.ApproveAsync(It.IsAny<int>(), It.IsAny<ApproveContentDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Only pending activities can be approved or rejected."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Approve_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.ApproveAsync(It.IsAny<int>(), It.IsAny<ApproveContentDto>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("You are not the responsible manager for this destination."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(10, "Manager"));

            var result = await controller.Approve(1, new ApproveContentDto { Approve = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Delete_ContentCreator_VracaNoContent()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.DeleteAsync(1, 5, "ContentCreator"))
                .ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaAktivnostNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.DeleteAsync(999, 5, "ContentCreator"))
                .ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_KadaServisBaciInvalidOperation_VracaBadRequest()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("Approved activities cannot be deleted directly. Submit a deletion request instead."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetAll_SaSearchParametrom_VracaPagedRezultat()
        {
            var mockService = new Mock<IActivityService>();
            var dto = new PagedResultDto<ActivityDto>
            {
                Items = new List<ActivityDto>
        {
            new ActivityDto { Id = 1, Name = "Planinarenje" }
        },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<ActivityQueryDto>()))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.GetAll(new ActivityQueryDto { Search = "plan" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task Delete_KadaServisBaciUnauthorized_VracaForbid()
        {
            var mockService = new Mock<IActivityService>();
            mockService.Setup(s => s.DeleteAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException("You can only delete your own activities."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task GetMy_ContentCreator_VracaPagedRezultat()
        {
            var mockService = new Mock<IActivityService>();
            var paged = new PagedResultDto<ActivityDto>
            {
                Items = new List<ActivityDto>
                {
                    new ActivityDto { Id = 1, Name = "Moja aktivnost", Status = "Pending" }
                },
                Page = 1,
                PageSize = 10,
                TotalCount = 1,
                TotalPages = 1
            };

            mockService.Setup(s => s.GetMyAsync(5, It.IsAny<ActivityQueryDto>())).ReturnsAsync(paged);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "ContentCreator"));
            var result = await controller.GetMy(new ActivityQueryDto());

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(paged);
        }
    }
}
