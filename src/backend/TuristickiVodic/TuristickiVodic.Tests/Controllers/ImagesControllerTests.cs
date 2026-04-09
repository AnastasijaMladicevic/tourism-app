using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Tests.Helpers;
using Xunit;

namespace TuristickiVodic.Tests.Controllers
{
    public class ImagesControllerTests
    {
        private static Mock<IImageService> MockSvc() => new Mock<IImageService>();

        private static T AttachUser<T>(T controller, int userId, string role) where T : ControllerBase
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = FakeUserHelper.CreateUser(userId, role)
                }
            };
            return controller;
        }

        private static ImagesController ImageCtrl(IImageService svc, int userId = 1, string role = "Admin") =>
            AttachUser(new ImagesController(svc), userId, role);

        private static DestinationImagesController DestCtrl(IImageService svc, int userId = 1, string role = "Admin") =>
            AttachUser(new DestinationImagesController(svc), userId, role);

        private static LocalityImagesController LocCtrl(IImageService svc, int userId = 10, string role = "Manager") =>
            AttachUser(new LocalityImagesController(svc), userId, role);

        private static ObjectImagesController ObjCtrl(IImageService svc, int userId = 5, string role = "ContentCreator") =>
            AttachUser(new ObjectImagesController(svc), userId, role);

        private static ActivityImagesController ActCtrl(IImageService svc, int userId = 5, string role = "ContentCreator") =>
            AttachUser(new ActivityImagesController(svc), userId, role);

        private static EventImagesController EvCtrl(IImageService svc, int userId = 5, string role = "ContentCreator") =>
            AttachUser(new EventImagesController(svc), userId, role);

        [Fact]
        public async Task GetById_KadSlikaPostoji_VracaOk()
        {
            var mock = MockSvc();
            var img = new ImageDto { Id = 1, Url = "test.jpg" };
            mock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(img);

            var result = await ImageCtrl(mock.Object).GetById(1);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(img);
        }

        [Fact]
        public async Task GetById_KadSlikaNePostoji_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync((ImageDto?)null);

            var result = await ImageCtrl(mock.Object).GetById(1);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_KadSlikaPostoji_VracaOk()
        {
            var mock = MockSvc();
            var dto = new UpdateImageDto { Url = "new.jpg" };
            var updated = new ImageDto { Id = 1, Url = "new.jpg" };
            mock.Setup(s => s.UpdateAsync(1, dto, 1, "Admin")).ReturnsAsync(updated);

            var result = await ImageCtrl(mock.Object, 1, "Admin").Update(1, dto);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(updated);
        }

        [Fact]
        public async Task Update_KadSlikaNePostoji_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateImageDto>(), 1, "Admin")).ReturnsAsync((ImageDto?)null);

            var result = await ImageCtrl(mock.Object, 1, "Admin").Update(1, new UpdateImageDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_InvalidModel_VracaBadRequest()
        {
            var ctrl = ImageCtrl(MockSvc().Object);
            ctrl.ModelState.AddModelError("Url", "Required");

            var result = await ctrl.Update(1, new UpdateImageDto());

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateImageDto>(), 5, "ContentCreator"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await ImageCtrl(mock.Object, 5, "ContentCreator").Update(1, new UpdateImageDto { Url = "x.jpg" });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_ServisBacaGresku_VracaBadRequest()
        {
            var mock = MockSvc();
            mock.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateImageDto>(), 1, "Admin"))
                .ThrowsAsync(new InvalidOperationException("error"));

            var result = await ImageCtrl(mock.Object, 1, "Admin").Update(1, new UpdateImageDto { Url = "x.jpg" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_KadSlikaPostoji_VracaNoContent()
        {
            var mock = MockSvc();
            mock.Setup(s => s.DeleteAsync(1, 1, "Admin")).ReturnsAsync(true);

            var result = await ImageCtrl(mock.Object, 1, "Admin").Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadSlikaNePostoji_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.DeleteAsync(1, 1, "Admin")).ReturnsAsync(false);

            var result = await ImageCtrl(mock.Object, 1, "Admin").Delete(1);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.DeleteAsync(1, 10, "Manager"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await ImageCtrl(mock.Object, 10, "Manager").Delete(1);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Delete_ServisBacaGresku_VracaBadRequest()
        {
            var mock = MockSvc();
            mock.Setup(s => s.DeleteAsync(1, 1, "Admin"))
                .ThrowsAsync(new InvalidOperationException("main image"));

            var result = await ImageCtrl(mock.Object, 1, "Admin").Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Destination_GetAll_VracaOkSaListom()
        {
            var mock = MockSvc();
            var imgs = new List<ImageDto> { new ImageDto { Id = 1, Url = "a.jpg", IsMain = true } };
            mock.Setup(s => s.GetForDestinationAsync(5)).ReturnsAsync(imgs);

            var result = await DestCtrl(mock.Object).GetAll(5);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(imgs);
        }

        [Fact]
        public async Task Destination_GetAll_DestinacijaNePostoji_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.GetForDestinationAsync(999)).ThrowsAsync(new KeyNotFoundException("Destination not found"));

            var result = await DestCtrl(mock.Object).GetAll(999);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task Destination_GetMain_KadNePostojiMain_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.GetMainForDestinationAsync(5)).ReturnsAsync((ImageDto?)null);

            var result = await DestCtrl(mock.Object).GetMain(5);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task Destination_Add_Validan_VracaCreated()
        {
            var mock = MockSvc();
            var dto = new AddImageDto { Url = "a.jpg", IsMain = true };
            var created = new ImageDto { Id = 10, Url = "a.jpg", IsMain = true, DestinationId = 5 };
            mock.Setup(s => s.AddToDestinationAsync(5, dto, 1, "Admin")).ReturnsAsync(created);

            var result = await DestCtrl(mock.Object, 1, "Admin").Add(5, dto);

            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            createdResult.RouteValues!["id"].Should().Be(10);
            createdResult.Value.Should().BeEquivalentTo(created);
        }

        [Fact]
        public async Task Destination_Add_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.AddToDestinationAsync(5, It.IsAny<AddImageDto>(), 2, "Manager"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await DestCtrl(mock.Object, 2, "Manager").Add(5, new AddImageDto { Url = "a.jpg", IsMain = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Locality_GetAll_VracaOkSaListom()
        {
            var mock = MockSvc();
            var imgs = new List<ImageDto> { new ImageDto { Id = 2, Url = "b.jpg", LocalityId = 3 } };
            mock.Setup(s => s.GetForLocalityAsync(3)).ReturnsAsync(imgs);

            var result = await LocCtrl(mock.Object).GetAll(3);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Locality_Add_ValidnaSlika_VracaCreated()
        {
            var mock = MockSvc();
            var dto = new AddImageDto { Url = "loc.jpg", IsMain = true };
            var created = new ImageDto { Id = 20, Url = "loc.jpg", LocalityId = 3 };
            mock.Setup(s => s.AddToLocalityAsync(3, dto, 10, "Manager")).ReturnsAsync(created);

            var result = await LocCtrl(mock.Object, 10, "Manager").Add(3, dto);

            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Locality_Add_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.AddToLocalityAsync(3, It.IsAny<AddImageDto>(), 11, "Manager"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await LocCtrl(mock.Object, 11, "Manager").Add(3, new AddImageDto { Url = "a.jpg", IsMain = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Object_Add_ValidnaSlika_VracaCreated()
        {
            var mock = MockSvc();
            var dto = new AddImageDto { Url = "obj.jpg", IsMain = true };
            var created = new ImageDto { Id = 30, Url = "obj.jpg", ObjectId = 7 };
            mock.Setup(s => s.AddToObjectAsync(7, dto, 5, "ContentCreator")).ReturnsAsync(created);

            var result = await ObjCtrl(mock.Object, 5, "ContentCreator").Add(7, dto);

            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Object_Add_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.AddToObjectAsync(7, It.IsAny<AddImageDto>(), 6, "ContentCreator"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await ObjCtrl(mock.Object, 6, "ContentCreator").Add(7, new AddImageDto { Url = "a.jpg", IsMain = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Activity_Add_ValidnaSlika_VracaCreated()
        {
            var mock = MockSvc();
            var dto = new AddImageDto { Url = "act.jpg", IsMain = true };
            var created = new ImageDto { Id = 40, Url = "act.jpg", ActivityId = 4 };
            mock.Setup(s => s.AddToActivityAsync(4, dto, 5, "ContentCreator")).ReturnsAsync(created);

            var result = await ActCtrl(mock.Object, 5, "ContentCreator").Add(4, dto);

            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Activity_Add_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.AddToActivityAsync(4, It.IsAny<AddImageDto>(), 6, "ContentCreator"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await ActCtrl(mock.Object, 6, "ContentCreator").Add(4, new AddImageDto { Url = "a.jpg", IsMain = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Event_Add_ValidnaSlika_VracaCreated()
        {
            var mock = MockSvc();
            var dto = new AddImageDto { Url = "ev.jpg", IsMain = true };
            var created = new ImageDto { Id = 50, Url = "ev.jpg", EventId = 6 };
            mock.Setup(s => s.AddToEventAsync(6, dto, 5, "ContentCreator")).ReturnsAsync(created);

            var result = await EvCtrl(mock.Object, 5, "ContentCreator").Add(6, dto);

            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Event_Add_ServisBaciUnauthorized_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.AddToEventAsync(6, It.IsAny<AddImageDto>(), 6, "ContentCreator"))
                .ThrowsAsync(new UnauthorizedAccessException());

            var result = await EvCtrl(mock.Object, 6, "ContentCreator").Add(6, new AddImageDto { Url = "a.jpg", IsMain = true });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task SetMain_KadSlikaPostoji_VracaOk()
        {
            var mock = MockSvc();
            var updated = new ImageDto { Id = 1, Url = "main.jpg", IsMain = true };
            mock.Setup(s => s.SetMainImageAsync(1, It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(updated);

            var controller = ImageCtrl(mock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = FakeUserHelper.CreateHttpContextWithUser(5, "ContentCreator")
            };

            var result = await controller.SetMain(1);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(updated);
        }

        [Fact]
        public async Task SetMain_KadSlikaNePostoji_VracaNotFound()
        {
            var mock = MockSvc();
            mock.Setup(s => s.SetMainImageAsync(1, It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new KeyNotFoundException("Image not found"));

            var controller = ImageCtrl(mock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = FakeUserHelper.CreateHttpContextWithUser(5, "ContentCreator")
            };

            var result = await controller.SetMain(1);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task SetMain_KadNemaDozvolu_VracaForbid()
        {
            var mock = MockSvc();
            mock.Setup(s => s.SetMainImageAsync(1, It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new UnauthorizedAccessException());

            var controller = ImageCtrl(mock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = FakeUserHelper.CreateHttpContextWithUser(5, "ContentCreator")
            };

            var result = await controller.SetMain(1);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task SetMain_KadServisVratiInvalidOperation_VracaBadRequest()
        {
            var mock = MockSvc();
            mock.Setup(s => s.SetMainImageAsync(1, It.IsAny<int>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("error"));

            var controller = ImageCtrl(mock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = FakeUserHelper.CreateHttpContextWithUser(5, "ContentCreator")
            };

            var result = await controller.SetMain(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
