using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.AspNetCore.Mvc;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Tests.Controllers
{
    public class ImagesControllerTests
    {
        private readonly Mock<IImageService> _serviceMock;
        private readonly ImageController _controller;

        public ImagesControllerTests()
        {
            _serviceMock = new Mock<IImageService>();
            _controller = new ImageController(_serviceMock.Object);
        }

        [Fact]
        public async Task GetAll_ReturnsOk()
        {
            var images = new List<ImageDto>
            {
                new ImageDto { Id = 1, Url = "1.jpg" },
                new ImageDto { Id = 2, Url = "2.jpg" }
            };

            _serviceMock.Setup(s => s.GetAllAsync()).ReturnsAsync(images);

            var result = await _controller.GetAll();

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().BeEquivalentTo(images);
        }

        [Fact]
        public async Task GetById_WhenExists_ReturnsOk()
        {
            var image = new ImageDto { Id = 1, Url = "test.jpg" };

            _serviceMock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(image);

            var result = await _controller.GetById(1);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().BeEquivalentTo(image);
        }

        [Fact]
        public async Task GetById_WhenNotFound_ReturnsNotFound()
        {
            _serviceMock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync((ImageDto?)null);

            var result = await _controller.GetById(1);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_Valid_ReturnsCreatedAtAction()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1,
                IsMain = true
            };

            var created = new ImageDto
            {
                Id = 1,
                Url = "test.jpg",
                ObjectId = 1,
                IsMain = true
            };

            _serviceMock.Setup(s => s.CreateAsync(dto)).ReturnsAsync(created);

            var result = await _controller.Create(dto);

            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            createdResult.ActionName.Should().Be("GetById");
            createdResult.RouteValues.Should().ContainKey("id");
            createdResult.RouteValues!["id"].Should().Be(1);
            createdResult.Value.Should().BeEquivalentTo(created);
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
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1,
                IsMain = true
            };

            _serviceMock.Setup(s => s.CreateAsync(dto))
                .ThrowsAsync(new InvalidOperationException("error"));

            var result = await _controller.Create(dto);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_WhenExists_ReturnsOk()
        {
            var dto = new UpdateImageDto
            {
                Url = "updated.jpg",
                AltText = "novi opis"
            };

            var updated = new ImageDto
            {
                Id = 1,
                Url = "updated.jpg",
                AltText = "novi opis"
            };

            _serviceMock.Setup(s => s.UpdateAsync(1, dto)).ReturnsAsync(updated);

            var result = await _controller.Update(1, dto);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().BeEquivalentTo(updated);
        }

        [Fact]
        public async Task Update_WhenNotFound_ReturnsNotFound()
        {
            var dto = new UpdateImageDto
            {
                Url = "updated.jpg"
            };

            _serviceMock.Setup(s => s.UpdateAsync(1, dto)).ReturnsAsync((ImageDto?)null);

            var result = await _controller.Update(1, dto);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Update_InvalidModel_ReturnsBadRequest()
        {
            _controller.ModelState.AddModelError("Url", "Required");

            var result = await _controller.Update(1, new UpdateImageDto());

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Update_ServiceThrows_ReturnsBadRequest()
        {
            var dto = new UpdateImageDto
            {
                Url = "updated.jpg"
            };

            _serviceMock.Setup(s => s.UpdateAsync(1, dto))
                .ThrowsAsync(new InvalidOperationException("error"));

            var result = await _controller.Update(1, dto);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_WhenExists_ReturnsNoContent()
        {
            _serviceMock.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);

            var result = await _controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_WhenNotFound_ReturnsNotFound()
        {
            _serviceMock.Setup(s => s.DeleteAsync(1)).ReturnsAsync(false);

            var result = await _controller.Delete(1);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Delete_ServiceThrows_ReturnsBadRequest()
        {
            _serviceMock.Setup(s => s.DeleteAsync(1))
                .ThrowsAsync(new InvalidOperationException("error"));

            var result = await _controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}