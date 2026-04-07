using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using TuristickiVodic.Services.Services;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Mappings;
using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Tests.Services
{
    public class ImageServiceTests
    {
        private readonly AppDbContext _context;
        private readonly ImageService _service;

        public ImageServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);

            var mapperConfig = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
            var mapper = mapperConfig.CreateMapper();

            _service = new ImageService(_context, mapper);
        }

        [Fact]
        public async Task Create_Valid_AddsImage()
        {
            _context.Objects.Add(new Core.Models.TouristObject { Id = 1, Name = "Obj" });
            await _context.SaveChangesAsync();

            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            _context.Images.Count().Should().Be(1);
        }

        [Fact]
        public async Task Create_MultipleRelations_ThrowsException()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1,
                ActivityId = 2
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task Create_NoRelation_ThrowsException()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg"
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task Delete_Existing_ReturnsTrue()
        {
            _context.Images.Add(new Core.Models.Image { Url = "a.jpg" });
            await _context.SaveChangesAsync();

            var result = await _service.DeleteAsync(1);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task Delete_NotExisting_ReturnsFalse()
        {
            var result = await _service.DeleteAsync(99);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task CreateAsync_DrugaMainSlika_BacaGresku()
        {
            // Arrange: već postoji main slika
            var existing = new Image
            {
                Url = "1.jpg",
                IsMain = true,
                ObjectId = 1
            };

            _context.Images.Add(existing);
            await _context.SaveChangesAsync();

            var dto = new CreateImageDto
            {
                Url = "2.jpg",
                IsMain = true,
                ObjectId = 1
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_ViseEntiteta_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 1,
                ActivityId = 1
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_EntitetNePostoji_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                ObjectId = 999 // ne postoji
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));
        }

        [Fact]
        public async Task UpdateAsync_ViseEntiteta_BacaGresku()
        {
            var image = new Image
            {
                Url = "test.jpg",
                ObjectId = 1
            };

            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                ActivityId = 1,
                EventId = 1 // ❌ više entiteta
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateAsync(image.Id, dto));
        }

        [Fact]
        public async Task DeleteAsync_SlikaSeBrise()
        {
            var image = new Image
            {
                Url = "test.jpg",
                ObjectId = 1
            };

            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            var result = await _service.DeleteAsync(image.Id);

            result.Should().BeTrue();
        }
    }
}