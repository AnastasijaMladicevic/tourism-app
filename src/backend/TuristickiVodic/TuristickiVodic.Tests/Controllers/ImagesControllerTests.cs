using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Tests.Controllers
{
    public class ImageControllerTests
    {
        private readonly Mock<IImageService> _serviceMock;
        private readonly ImageController _controller;

        public ImageControllerTests()
        {
            _serviceMock = new Mock<IImageService>();
            _controller = new ImageController(_serviceMock.Object);
        }

        [Fact]
        public async Task GetAll_ReturnsOk()
        {
            _serviceMock.Setup(s => s.GetAllAsync())
                .ReturnsAsync(new List<ImageDto>());

            var result = await _controller.GetAll();

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetById_WhenExists_ReturnsOk()
        {
            _serviceMock.Setup(s => s.GetByIdAsync(1))
                .ReturnsAsync(new ImageDto { Id = 1 });

            var result = await _controller.GetById(1);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetById_WhenNotFound_ReturnsNotFound()
        {
            _serviceMock.Setup(s => s.GetByIdAsync(1))
                .ReturnsAsync((ImageDto?)null);

            var result = await _controller.GetById(1);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_Valid_ReturnsCreated()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1
            };

            _serviceMock.Setup(s => s.CreateAsync(dto))
                .ReturnsAsync(new ImageDto { Id = 1 });

            var result = await _controller.Create(dto);

            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Create_InvalidModel_ReturnsBadRequest()
        {
            _controller.ModelState.AddModelError("Url", "Required");

            var result = await _controller.Create(new CreateImageDto());

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Create_ServiceThrows_ReturnsBadRequest()
        {
            var dto = new CreateImageDto { Url = "test.jpg" };

            _serviceMock.Setup(s => s.CreateAsync(dto))
                .ThrowsAsync(new InvalidOperationException("error"));

            var result = await _controller.Create(dto);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_WhenExists_ReturnsNoContent()
        {
            _serviceMock.Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(true);

            var result = await _controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_WhenNotFound_ReturnsNotFound()
        {
            _serviceMock.Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(false);

            var result = await _controller.Delete(1);

            result.Should().BeOfType<NotFoundResult>();
        }
    }
}