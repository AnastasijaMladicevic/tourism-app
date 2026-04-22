using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Services.Services;
using Xunit;

namespace TuristickiVodic.Tests.Controllers
{
    public class QrLinksControllerTests
    {
        private static QrLinksController CreateController(
            Mock<IDestinationService> destinationService,
            Mock<ILocalityService> localityService,
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

            return new QrLinksController(
                destinationService.Object,
                localityService.Object,
                eventService.Object,
                objectService.Object,
                configuration);
        }

        [Fact]
        public void GetPlatformQr_VracaLinkZaPocetnuStranicuTuristickeAplikacije()
        {
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            var controller = CreateController(destinationService, localityService, eventService, objectService, "https://spirego-tourist.test");

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
        public async Task GetDestinationQr_KadaDestinacijaPostoji_VracaQrLink()
        {
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();

            destinationService.Setup(s => s.GetByIdAsync(3, null, "Tourist"))
                .ReturnsAsync(new DestinationDto { Id = 3, Name = "Budva" });

            var controller = CreateController(destinationService, localityService, eventService, objectService, "https://spirego-tourist.test");

            var result = await controller.GetDestinationQr(3);

            result.Result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(new QrLinkDto
                {
                    Label = "Destinacija: Budva",
                    TargetUrl = "https://spirego-tourist.test/map?focusType=destination&focusId=3",
                    QrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fspirego-tourist.test%2Fmap%3FfocusType%3Ddestination%26focusId%3D3"
                });
        }

        [Fact]
        public async Task GetLocalityQr_KadaLokalitetPostoji_VracaQrLink()
        {
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();

            localityService.Setup(s => s.GetByIdAsync(7))
                .ReturnsAsync(new LocalityDto { Id = 7, Name = "Stari grad Budva" });

            var controller = CreateController(destinationService, localityService, eventService, objectService, "https://spirego-tourist.test");

            var result = await controller.GetLocalityQr(7);

            result.Result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(new QrLinkDto
                {
                    Label = "Lokalitet: Stari grad Budva",
                    TargetUrl = "https://spirego-tourist.test/map?focusType=locality&focusId=7",
                    QrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fspirego-tourist.test%2Fmap%3FfocusType%3Dlocality%26focusId%3D7"
                });
        }

        [Fact]
        public async Task GetEventQr_KadaEventPostoji_VracaQrLink()
        {
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            eventService.Setup(s => s.GetByIdAsync(15))
                .ReturnsAsync(new EventDto { Id = 15, Name = "Sea Dance" });

            var controller = CreateController(destinationService, localityService, eventService, objectService, "https://spirego-tourist.test");

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
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            eventService.Setup(s => s.GetByIdAsync(404)).ReturnsAsync((EventDto?)null);

            var controller = CreateController(destinationService, localityService, eventService, objectService);

            var result = await controller.GetEventQr(404);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetObjectQr_KadaObjekatPostoji_VracaQrLink()
        {
            var destinationService = new Mock<IDestinationService>();
            var localityService = new Mock<ILocalityService>();
            var eventService = new Mock<IEventService>();
            var objectService = new Mock<ITouristObjectService>();
            objectService.Setup(s => s.GetByIdAsync(8))
                .ReturnsAsync(new TouristObjectDto { Id = 8, Name = "Hotel Avala" });

            var controller = CreateController(destinationService, localityService, eventService, objectService, "https://spirego-tourist.test");

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
