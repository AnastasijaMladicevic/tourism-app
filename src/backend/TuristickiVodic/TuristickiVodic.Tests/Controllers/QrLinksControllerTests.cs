using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Controllers
{
    public class QrLinksControllerTests
    {
        private static QrLinksController CreateController(
            Mock<IEventService> eventService,
            Mock<ITouristObjectService> objectService,
            string? baseUrl = null)
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["PublicApp:BaseUrl"] = baseUrl
                })
                .Build();

            return new QrLinksController(eventService.Object, objectService.Object, configuration);
        }

        [Fact]
        public void GetPlatformQr_VracaLinkZaPocetnuStranicuTuristickeAplikacije()
        {
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            var controller = CreateController(eventService, objectService, "https://spirego-tourist.test");

            var result = controller.GetPlatformQr();

            result.Result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(new QrLinkDto
                {
                    Label = "Turisticka aplikacija",
                    TargetUrl = "https://spirego-tourist.test/home",
                    QrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fspirego-tourist.test%2Fhome"
                });
        }

        [Fact]
        public async Task GetEventQr_KadaEventPostoji_VracaQrLink()
        {
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            eventService.Setup(s => s.GetByIdAsync(15))
                .ReturnsAsync(new EventDto { Id = 15, Name = "Sea Dance" });

            var controller = CreateController(eventService, objectService, "https://spirego-tourist.test");

            var result = await controller.GetEventQr(15);

            result.Result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(new QrLinkDto
                {
                    Label = "Event: Sea Dance",
                    TargetUrl = "https://spirego-tourist.test/event/15",
                    QrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fspirego-tourist.test%2Fevent%2F15"
                });
        }

        [Fact]
        public async Task GetEventQr_KadaEventNePostoji_VracaNotFound()
        {
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            eventService.Setup(s => s.GetByIdAsync(404)).ReturnsAsync((EventDto?)null);

            var controller = CreateController(eventService, objectService);

            var result = await controller.GetEventQr(404);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetObjectQr_KadaObjekatPostoji_VracaQrLink()
        {
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            objectService.Setup(s => s.GetByIdAsync(8))
                .ReturnsAsync(new TouristObjectDto { Id = 8, Name = "Hotel Avala" });

            var controller = CreateController(eventService, objectService, "https://spirego-tourist.test");

            var result = await controller.GetObjectQr(8);

            result.Result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(new QrLinkDto
                {
                    Label = "Objekat: Hotel Avala",
                    TargetUrl = "https://spirego-tourist.test/object/8",
                    QrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fspirego-tourist.test%2Fobject%2F8"
                });
        }
    }
}
