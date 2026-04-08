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

        private async Task AddObjectAsync(int id = 1)
        {
            _context.Objects.Add(new TouristObject
            {
                Id = id,
                Name = $"Objekat{id}"
            });

            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetAllAsync_VracaSveSlikeSortiranePoId()
        {
            _context.Images.Add(new Image { Id = 2, Url = "2.jpg", ObjectId = 2, IsMain = false });
            _context.Images.Add(new Image { Id = 1, Url = "1.jpg", ObjectId = 1, IsMain = true });
            await _context.SaveChangesAsync();

            var result = (await _service.GetAllAsync()).ToList();

            result.Should().HaveCount(2);
            result[0].Id.Should().Be(1);
            result[1].Id.Should().Be(2);
        }

        [Fact]
        public async Task GetByIdAsync_KadSlikaPostoji_VracaDto()
        {
            var image = new Image
            {
                Url = "test.jpg",
                AltText = "opis",
                IsMain = true,
                ObjectId = 1
            };

            _context.Images.Add(image);
            await _context.SaveChangesAsync();

            var result = await _service.GetByIdAsync(image.Id);

            result.Should().NotBeNull();
            result!.Url.Should().Be("test.jpg");
            result.AltText.Should().Be("opis");
            result.IsMain.Should().BeTrue();
        }

        [Fact]
        public async Task GetByIdAsync_KadSlikaNePostoji_VracaNull()
        {
            var result = await _service.GetByIdAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateAsync_PrvaSlikaKojaJeMain_DodajeSliku()
        {
            await AddObjectAsync(1);

            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                AltText = "opis",
                IsMain = true,
                ObjectId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.IsMain.Should().BeTrue();
            result.ObjectId.Should().Be(1);
            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_PrvaSlikaKojaNijeMain_BacaGresku()
        {
            await AddObjectAsync(1);

            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                IsMain = false,
                ObjectId = 1
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*First image for an entity must be main*");
        }

        [Fact]
        public async Task CreateAsync_DrugaMainSlikaZaIstiEntitet_BacaGresku()
        {
            await AddObjectAsync(1);

            _context.Images.Add(new Image
            {
                Url = "1.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new CreateImageDto
            {
                Url = "2.jpg",
                IsMain = true,
                ObjectId = 1
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only one main image allowed per entity*");
        }

        [Fact]
        public async Task CreateAsync_DrugaSlikaKojaNijeMain_JeDozvoljena()
        {
            await AddObjectAsync(1);

            _context.Images.Add(new Image
            {
                Url = "1.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new CreateImageDto
            {
                Url = "2.jpg",
                IsMain = false,
                ObjectId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.IsMain.Should().BeFalse();
            _context.Images.Should().HaveCount(2);
        }

        [Fact]
        public async Task CreateAsync_BezRelacije_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                IsMain = true
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*exactly one entity*");
        }

        [Fact]
        public async Task CreateAsync_ViseRelacija_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                IsMain = true,
                ObjectId = 1,
                ActivityId = 1
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*exactly one entity*");
        }

        [Fact]
        public async Task CreateAsync_KadReferenciraniObjectNePostoji_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg",
                IsMain = true,
                ObjectId = 999
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Object with id 999 not found*");
        }

        [Fact]
        public async Task UpdateAsync_KadSlikaNePostoji_VracaNull()
        {
            var dto = new UpdateImageDto
            {
                Url = "updated.jpg"
            };

            var result = await _service.UpdateAsync(999, dto);

            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateAsync_MenjaUrlIAltText()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "old.jpg",
                AltText = "staro",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                Url = "new.jpg",
                AltText = "novo"
            };

            var result = await _service.UpdateAsync(1, dto);

            result.Should().NotBeNull();
            result!.Url.Should().Be("new.jpg");
            result.AltText.Should().Be("novo");

            var imageInDb = await _context.Images.FindAsync(1);
            imageInDb!.Url.Should().Be("new.jpg");
            imageInDb.AltText.Should().Be("novo");
        }

        [Fact]
        public async Task UpdateAsync_PrazanUrl_NeMenjaPostojeciUrl()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "old.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                Url = "   "
            };

            var result = await _service.UpdateAsync(1, dto);

            result.Should().NotBeNull();
            result!.Url.Should().Be("old.jpg");
        }

        [Fact]
        public async Task UpdateAsync_JedinaMainNeMozePostatiFalse()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "1.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                IsMain = false
            };

            var action = async () => await _service.UpdateAsync(1, dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*exactly one main image*");
        }

        [Fact]
        public async Task UpdateAsync_NonMainMozePostatiMainAkoNemaDrugeMainZaNoviEntitet()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "1.jpg",
                IsMain = true,
                ObjectId = 1
            });

            _context.Images.Add(new Image
            {
                Id = 2,
                Url = "2.jpg",
                IsMain = false,
                ObjectId = 1
            });

            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                IsMain = true
            };

            var action = async () => await _service.UpdateAsync(2, dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only one main image allowed per entity*");
        }

        [Fact]
        public async Task UpdateAsync_PromenaRelacije_PostavljaTacnoJedanEntitet()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                IsMain = true,
                ObjectId = 1
            });

            _context.Destinations.Add(new Destination
            {
                Id = 5,
                Name = "Destinacija5"
            });

            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                DestinationId = 5,
                IsMain = true
            };

            var result = await _service.UpdateAsync(1, dto);

            result.Should().NotBeNull();
            result!.ObjectId.Should().BeNull();
            result.DestinationId.Should().Be(5);

            var imageInDb = await _context.Images.FindAsync(1);
            imageInDb!.ObjectId.Should().BeNull();
            imageInDb.DestinationId.Should().Be(5);
        }

        [Fact]
        public async Task UpdateAsync_ViseNovihRelacija_BacaGresku()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                ActivityId = 1,
                EventId = 1
            };

            var action = async () => await _service.UpdateAsync(1, dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*only be re-linked to one entity at a time*");
        }

        [Fact]
        public async Task DeleteAsync_KadSlikaPostojiIVanilaJeJedina_VracaTrue()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                IsMain = true,
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var result = await _service.DeleteAsync(1);

            result.Should().BeTrue();
            _context.Images.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_NeDozvoljavaBrisanjeJedinogMainAkoPostojeDrugeSlike()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "main.jpg",
                IsMain = true,
                ObjectId = 1
            });

            _context.Images.Add(new Image
            {
                Id = 2,
                Url = "other.jpg",
                IsMain = false,
                ObjectId = 1
            });

            await _context.SaveChangesAsync();

            var action = async () => await _service.DeleteAsync(1);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*exactly one main image*");
        }

        [Fact]
        public async Task DeleteAsync_KadSlikaNePostoji_VracaFalse()
        {
            var result = await _service.DeleteAsync(999);

            result.Should().BeFalse();
        }
    }
}