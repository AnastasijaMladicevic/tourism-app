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

        private async Task AddActivityAsync(int id = 1)
        {
            _context.Activities.Add(new Activity
            {
                Id = id,
                Name = $"Aktivnost{id}"
            });

            await _context.SaveChangesAsync();
        }

        private async Task AddEventAsync(int id = 1)
        {
            _context.Events.Add(new Event
            {
                Id = id,
                Name = $"Dogadjaj{id}"
            });

            await _context.SaveChangesAsync();
        }

        private async Task AddDestinationAsync(int id = 1)
        {
            _context.Destinations.Add(new Destination
            {
                Id = id,
                Name = $"Destinacija{id}"
            });

            await _context.SaveChangesAsync();
        }

        private async Task AddLocalityAsync(int id = 1)
        {
            _context.Localities.Add(new Locality
            {
                Id = id,
                Name = $"Lokalitet{id}"
            });

            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetAllAsync_VracaSveSlikeSortiranePoId()
        {
            _context.Images.Add(new Image { Id = 2, Url = "2.jpg", ObjectId = 2 });
            _context.Images.Add(new Image { Id = 1, Url = "1.jpg", ObjectId = 1 });
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
        public async Task CreateAsync_ValidanObjectId_DodajeSliku()
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
            result.Url.Should().Be("test.jpg");
            result.AltText.Should().Be("opis");
            result.IsMain.Should().BeTrue();
            result.ObjectId.Should().Be(1);

            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_ValidanActivityId_DodajeSliku()
        {
            await AddActivityAsync(1);

            var dto = new CreateImageDto
            {
                Url = "activity.jpg",
                ActivityId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.ActivityId.Should().Be(1);
            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_ValidanEventId_DodajeSliku()
        {
            await AddEventAsync(1);

            var dto = new CreateImageDto
            {
                Url = "event.jpg",
                EventId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.EventId.Should().Be(1);
            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_ValidanDestinationId_DodajeSliku()
        {
            await AddDestinationAsync(1);

            var dto = new CreateImageDto
            {
                Url = "destination.jpg",
                DestinationId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.DestinationId.Should().Be(1);
            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_ValidanLocalityId_DodajeSliku()
        {
            await AddLocalityAsync(1);

            var dto = new CreateImageDto
            {
                Url = "locality.jpg",
                LocalityId = 1
            };

            var result = await _service.CreateAsync(dto);

            result.Should().NotBeNull();
            result.LocalityId.Should().Be(1);
            _context.Images.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateAsync_BezRelacije_BacaGresku()
        {
            var dto = new CreateImageDto
            {
                Url = "test.jpg"
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
                ObjectId = 999
            };

            var action = async () => await _service.CreateAsync(dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Object with id 999 not found*");
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
        public async Task CreateAsync_NonMainSlikaZaIstiEntitet_JeDozvoljena()
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
            _context.Images.Should().HaveCount(2);
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
        public async Task UpdateAsync_IsMainTrue_KadVecPostojiDrugaMainSlika_BacaGresku()
        {
            await AddObjectAsync(1);

            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "1.jpg",
                IsMain = false,
                ObjectId = 1
            });

            _context.Images.Add(new Image
            {
                Id = 2,
                Url = "2.jpg",
                IsMain = true,
                ObjectId = 1
            });

            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                IsMain = true
            };

            var action = async () => await _service.UpdateAsync(1, dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Only one main image allowed per entity*");
        }

        [Fact]
        public async Task UpdateAsync_IsMainFalse_MenjaPolje()
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

            var result = await _service.UpdateAsync(1, dto);

            result.Should().NotBeNull();
            result!.IsMain.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateAsync_ViseNovihRelacija_BacaGresku()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
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
        public async Task UpdateAsync_NovaRelacijaNaNepostojeciEntitet_BacaGresku()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                DestinationId = 999
            };

            var action = async () => await _service.UpdateAsync(1, dto);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Destination with id 999 not found*");
        }

        [Fact]
        public async Task UpdateAsync_MenjaRelacijuNaValidanEntitet()
        {
            await AddDestinationAsync(5);

            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var dto = new UpdateImageDto
            {
                DestinationId = 5
            };

            var result = await _service.UpdateAsync(1, dto);

            result.Should().NotBeNull();
            result!.DestinationId.Should().Be(5);

            var imageInDb = await _context.Images.FindAsync(1);
            imageInDb!.DestinationId.Should().Be(5);
        }

        [Fact]
        public async Task DeleteAsync_KadSlikaPostoji_VracaTrueIBriseSliku()
        {
            _context.Images.Add(new Image
            {
                Id = 1,
                Url = "test.jpg",
                ObjectId = 1
            });
            await _context.SaveChangesAsync();

            var result = await _service.DeleteAsync(1);

            result.Should().BeTrue();
            _context.Images.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteAsync_KadSlikaNePostoji_VracaFalse()
        {
            var result = await _service.DeleteAsync(999);

            result.Should().BeFalse();
        }
    }
}