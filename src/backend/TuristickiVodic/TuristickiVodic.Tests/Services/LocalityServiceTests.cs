using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using Xunit;
using FluentAssertions;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Tests.Services
{
    /// <summary>
    /// Unit testovi za LocalityService pokrivaju sva poslovna pravila:
    /// - Samo Manager može da kreira lokalitet, i to samo za svoju destinaciju
    /// - Admin ne može direktno — dobija InvalidOperationException
    /// - Manager menja samo lokalitete u svojoj destinaciji
    /// - Manager briše samo lokalitete u svojoj destinaciji
    /// - Pri premeštanju proveravaju se i trenutna i ciljna destinacija
    /// - Nepostojeća destinacija ili tip lokaliteta baca grešku
    /// - GetAll/GetById rade ispravno sa mapiranjem
    ///
    /// Pored poslovnih pravila, pokrivene su i dve dodatne provere
    /// koje nisu eksplicitno u specifikaciji ali logički moraju da važe:
    /// - Kreiranje lokaliteta čuva CreatedByUserId (traceability)
    /// - Update sa samo nekim poljima ne dira ostale (partial update)
    /// </summary>
    public class LocalityServiceTests
    {
        private static AppDbContext CreateInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"{dbName}_{Guid.NewGuid()}")
                .Options;

            var ctx = new AppDbContext(options);
            ctx.Database.EnsureDeleted();
            ctx.Database.EnsureCreated();
            return ctx;
        }

        private static IMapper CreateMapper()
        {
            var config = new MapperConfiguration(cfg =>
                cfg.AddProfile<TuristickiVodic.Services.Mappings.MappingProfile>());
            return config.CreateMapper();
        }

        private static LocalityService CreateService(AppDbContext ctx)
        {
            return new LocalityService(ctx, CreateMapper());
        }


        private static (
            Role managerRole,
            Role adminRole,
            LocalityType localityType,
            User manager,
            Destination dest1,
            Destination? dest2
        ) SeedBase(AppDbContext ctx, bool addDest2 = false)
        {
            var managerRole = new Role { Id = 3, Name = RoleType.Manager };
            var adminRole   = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(managerRole, adminRole);

            var destType     = new DestinationType { Id = 1, Name = "Stari Grad" };
            var localityType = new LocalityType    { Id = 1, Name = "Centar" };
            ctx.DestinationTypes.Add(destType);
            ctx.LocalityTypes.Add(localityType);
            ctx.SaveChanges();

            var dest1 = new Destination
            {
                Id = 1, Name = "Kotor",
                DestinationTypeId = destType.Id, DestinationType = destType,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest1);

            Destination? dest2 = null;
            if (addDest2)
            {
                dest2 = new Destination
                {
                    Id = 2, Name = "Budva",
                    DestinationTypeId = destType.Id, DestinationType = destType,
                    CreatedByUserId = 99, Status = ContentStatus.Approved
                };
                ctx.Destinations.Add(dest2);
            }

            ctx.SaveChanges();

            // Manager mora biti dodan nakon što je destinacija sačuvana
            var manager = new User
            {
                Id = 10, FirstName = "Mgr", LastName = "M", Email = "mgr@test.com",
                PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole,
                IsActive = true, ManagedDestinationId = dest1.Id,
                DateOfBirth = new DateTime(1985, 1, 1)
            };
            ctx.Users.Add(manager);
            dest1.ManagedByUserId = manager.Id;
            ctx.SaveChanges();

            return (managerRole, adminRole, localityType, manager, dest1, dest2);
        }

        private static Locality MakeLocality(int id, string name, Destination dest, LocalityType lt, int createdBy) =>
            new Locality
            {
                Id = id, Name = name,
                DestinationId = dest.Id, Destination = dest,
                LocalityTypeId = lt.Id, LocalityType = lt,
                CreatedByUserId = createdBy,
                CreatedAt = DateTime.UtcNow
            };

        // ═══════════════════════════════════════════
        //  GetAllAsync / GetByIdAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetAllAsync_VracaSveLokalitete()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_VracaSveLokalitete));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);

            var l1 = MakeLocality(1, "Prčanj", dest, lt, mgr.Id);
            var l2 = MakeLocality(2, "Dobrota", dest, lt, mgr.Id);

            ctx.Localities.AddRange(l1, l2);
            ctx.SaveChanges();

            ctx.Images.AddRange(
                new Image
                {
                    Id = 1,
                    LocalityId = l1.Id,
                    Url = "l1-main.jpg",
                    IsMain = true
                },
                new Image
                {
                    Id = 2,
                    LocalityId = l2.Id,
                    Url = "l2-main.jpg",
                    IsMain = true
                }
            );
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.GetAllAsync(new LocalityQueryDto());

            result.TotalCount.Should().Be(2);
            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAllAsync_BezLokaliteta_VracaPrazanRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_BezLokaliteta_VracaPrazanRezultat));
            SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.GetAllAsync(new LocalityQueryDto());

            result.TotalCount.Should().Be(0);
            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAllAsync_SaSearchParametrom_VracaFiltriraneLokalitete()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_SaSearchParametrom_VracaFiltriraneLokalitete));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);

            var l1 = MakeLocality(1, "Stara Varos", dest, lt, mgr.Id);
            var l2 = MakeLocality(2, "Dobrota", dest, lt, mgr.Id);

            ctx.Localities.AddRange(l1, l2);
            ctx.SaveChanges();

            ctx.Images.AddRange(
                new Image
                {
                    Id = 1,
                    LocalityId = l1.Id,
                    Url = "l1-main.jpg",
                    IsMain = true
                },
                new Image
                {
                    Id = 2,
                    LocalityId = l2.Id,
                    Url = "l2-main.jpg",
                    IsMain = true
                }
            );
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.GetAllAsync(new LocalityQueryDto { Search = "stara" });

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle();
            result.Items.Single().Name.Should().Be("Stara Varos");
        }

        [Fact]
        public async Task GetByIdAsync_PostojeciLokalitet_VracaDto()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_PostojeciLokalitet_VracaDto));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);

            var locality = MakeLocality(1, "Prčanj", dest, lt, mgr.Id);
            ctx.Localities.Add(locality);
            ctx.SaveChanges();

            ctx.Images.Add(new Image
            {
                Url = "main.jpg",
                IsMain = true,
                LocalityId = locality.Id,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.GetByIdAsync(1);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Prčanj");
            result.DestinationName.Should().Be("Kotor");
        }

        [Fact]
        public async Task GetByIdAsync_LokalitetBezMainSlike_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_LokalitetBezMainSlike_VracaNull));
            var mapper = CreateMapper();

            var adminRole = new Role { Id = 1, Name = RoleType.Admin };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };
            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var localityType = new LocalityType { Id = 1, Name = "Centar" };

            var admin = new User
            {
                Id = 1,
                FirstName = "Admin",
                LastName = "A",
                Email = "admin@test.com",
                PasswordHash = "hash",
                RoleId = adminRole.Id,
                Role = adminRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            var manager = new User
            {
                Id = 2,
                FirstName = "Manager",
                LastName = "M",
                Email = "manager@test.com",
                PasswordHash = "hash",
                RoleId = managerRole.Id,
                Role = managerRole,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            ctx.Roles.AddRange(adminRole, managerRole);
            ctx.DestinationTypes.Add(destinationType);
            ctx.LocalityTypes.Add(localityType);
            ctx.Users.AddRange(admin, manager);
            ctx.SaveChanges();

            var destination = new Destination
            {
                Id = 1,
                Name = "Kotor",
                DestinationTypeId = destinationType.Id,
                ManagedByUserId = manager.Id,
                CreatedByUserId = admin.Id,
                Status = ContentStatus.Approved
            };

            ctx.Destinations.Add(destination);
            ctx.SaveChanges();

            var locality = new Locality
            {
                Id = 1,
                Name = "Stari grad",
                DestinationId = destination.Id,
                LocalityTypeId = localityType.Id,
                CreatedByUserId = admin.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Localities.Add(locality);
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, mapper);

            var result = await svc.GetByIdAsync(locality.Id);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetByIdAsync_NepostojeciLokalitet_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_NepostojeciLokalitet_VracaNull));
            SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.GetByIdAsync(9999);

            result.Should().BeNull();
        }

        // ═══════════════════════════════════════════
        //  CreateAsync — poslovna pravila
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateAsync_OdgovorniManager_KreiraLokalitetUspešno()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_OdgovorniManager_KreiraLokalitetUspešno));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.CreateAsync(new CreateLocalityDto
            {
                Name = "Dobrota", DestinationId = dest.Id, LocalityTypeId = lt.Id
            }, mgr.Id, "Manager");

            result.Name.Should().Be("Dobrota");
            result.DestinationName.Should().Be("Kotor");
            ctx.Localities.Count().Should().Be(1);
        }

        [Fact]
        public async Task CreateAsync_OdgovorniManager_CuvaCreatedByUserId()
        {
            // Dodatna provera: traceability — ko je kreirao lokalitet mora biti sačuvano
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_OdgovorniManager_CuvaCreatedByUserId));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.CreateAsync(new CreateLocalityDto
            {
                Name = "Test", DestinationId = dest.Id, LocalityTypeId = lt.Id
            }, mgr.Id, "Manager");

            var saved = ctx.Localities.First();
            saved.CreatedByUserId.Should().Be(mgr.Id);
        }

        [Fact]
        public async Task CreateAsync_NeodgovorniManager_BacaException()
        {
            // Manager koji ne vodi tu destinaciju ne sme da kreira
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NeodgovorniManager_BacaException));
            var (managerRole, _, lt, _, dest, _) = SeedBase(ctx);

            // Drugi manager — ne vodi dest1
            var drugiMgr = new User
            {
                Id = 20, FirstName = "D", LastName = "D", Email = "d@d.com",
                PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole,
                IsActive = true, ManagedDestinationId = null,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(drugiMgr);
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateLocalityDto
            {
                Name = "Test", DestinationId = dest.Id, LocalityTypeId = lt.Id
            }, drugiMgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task CreateAsync_Admin_BacaException()
        {
            // Poslovno pravilo: samo menadžer može da upravlja lokalitetima
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_Admin_BacaException));
            var (_, _, lt, _, dest, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateLocalityDto
            {
                Name = "Test", DestinationId = dest.Id, LocalityTypeId = lt.Id
            }, userId: 1, "Admin"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Admins cannot*");
        }

        [Fact]
        public async Task CreateAsync_DestinacijaNijePronadjena_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_DestinacijaNijePronadjena_BacaException));
            var (_, _, lt, mgr, _, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateLocalityDto
            {
                Name = "Test", DestinationId = 9999, LocalityTypeId = lt.Id
            }, mgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Destination not found*");
        }

        [Fact]
        public async Task CreateAsync_TipLokalitetaNijePronadjen_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_TipLokalitetaNijePronadjen_BacaException));
            var (_, _, _, mgr, dest, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateLocalityDto
            {
                Name = "Test", DestinationId = dest.Id, LocalityTypeId = 9999
            }, mgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Locality type not found*");
        }

        [Fact]
        public async Task CreateAsync_Manager_PostavljaIsActiveNaTrue()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_Manager_PostavljaIsActiveNaTrue));
            var (_, _, localityType, manager, destination, _) = SeedBase(ctx);

            manager.ManagedDestinationId = destination.Id;
            ctx.SaveChanges();

            var svc = CreateService(ctx);

            var dto = new CreateLocalityDto
            {
                Name = "Dobrota",
                DestinationId = destination.Id,
                LocalityTypeId = localityType.Id,
                Longitude = 18.77,
                Latitude = 42.42
            };

            var result = await svc.CreateAsync(dto, manager.Id, "Manager");

            result.Should().NotBeNull();

            var saved = ctx.Localities.First(l => l.Name == "Dobrota");
            saved.IsActive.Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  UpdateAsync — poslovna pravila
        // ═══════════════════════════════════════════

        [Fact]
        public async Task UpdateAsync_OdgovorniManager_MenjaLokalitetUspešno()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_OdgovorniManager_MenjaLokalitetUspešno));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "Staro Ime", dest, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.UpdateAsync(1, new UpdateLocalityDto { Name = "Novo Ime" }, mgr.Id, "Manager");

            result.Should().NotBeNull();
            result!.Name.Should().Be("Novo Ime");
        }

        [Fact]
        public async Task UpdateAsync_PartialUpdate_NeTacaNepopunjenaPolja()
        {
            // Dodatna provera: partial update — null polja ne smeju da prepišu postojeće vrednosti
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_PartialUpdate_NeTacaNepopunjenaPolja));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            var loc = MakeLocality(1, "Originalnie", dest, lt, mgr.Id);
            loc.Description = "Originalan opis";
            ctx.Localities.Add(loc);
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            // Menjamo samo Name, Description ne šaljemo
            var result = await svc.UpdateAsync(1, new UpdateLocalityDto { Name = "Novo" }, mgr.Id, "Manager");

            var saved = ctx.Localities.Find(1)!;
            saved.Description.Should().Be("Originalan opis"); // ostaje nepromenjeno
            result!.Name.Should().Be("Novo");
        }

        [Fact]
        public async Task UpdateAsync_NepostojeciLokalitet_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_NepostojeciLokalitet_VracaNull));
            var (_, _, _, mgr, _, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.UpdateAsync(9999, new UpdateLocalityDto { Name = "X" }, mgr.Id, "Manager");

            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateAsync_NeodgovorniManager_BacaException()
        {
            // Manager ne može da menja lokalitete u tuđoj destinaciji
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_NeodgovorniManager_BacaException));
            var (managerRole, _, lt, _, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, 10));
            var drugiMgr = new User
            {
                Id = 20, FirstName = "D", LastName = "D", Email = "d@d.com",
                PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole,
                IsActive = true, ManagedDestinationId = null,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(drugiMgr);
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateLocalityDto { Name = "X" }, drugiMgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task UpdateAsync_Admin_BacaException()
        {
            // Poslovno pravilo: samo menadžer može da upravlja lokalitetima
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_Admin_BacaException));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1, new UpdateLocalityDto { Name = "X" }, userId: 1, "Admin"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Admins cannot*");
        }

        [Fact]
        public async Task UpdateAsync_PromenaDestinacije_ProveravaISvoju_INovaDestinacija()
        {
            // Poslovno pravilo: pri premeštanju proveravaju se i trenutna i ciljna destinacija.
            // Ovaj test: manager pokušava da premesti u dest2 kojom ne upravlja → greška.
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_PromenaDestinacije_ProveravaISvoju_INovaDestinacija));
            var (managerRole, _, lt, mgr, dest1, dest2) = SeedBase(ctx, addDest2: true);
            // dest2 nema menadžera — DestinationManagerHelper traži odgovornog,
            // ali mgr vodi dest1, pa nije odgovoran za dest2
            ctx.Localities.Add(MakeLocality(1, "L1", dest1, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1,
                new UpdateLocalityDto { DestinationId = dest2!.Id },
                mgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*responsible manager for the target destination*");
        }

        [Fact]
        public async Task UpdateAsync_TipLokalitetaNijePronadjen_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateAsync_TipLokalitetaNijePronadjen_BacaException));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.UpdateAsync(1,
                new UpdateLocalityDto { LocalityTypeId = 9999 },
                mgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Locality type not found*");
        }

        // ═══════════════════════════════════════════
        //  DeleteAsync — poslovna pravila
        // ═══════════════════════════════════════════

        [Fact]
        public async Task DeleteAsync_OdgovorniManager_BriseLokalitetUspešno()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_OdgovorniManager_BriseLokalitetUspešno));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.DeleteAsync(1, mgr.Id, "Manager");

            result.Should().BeTrue();
            ctx.Localities.Find(1).Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_NepostojeciLokalitet_VracaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NepostojeciLokalitet_VracaFalse));
            var (_, _, _, mgr, _, _) = SeedBase(ctx);

            var svc = new LocalityService(ctx, CreateMapper());
            var result = await svc.DeleteAsync(9999, mgr.Id, "Manager");

            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAsync_NeodgovorniManager_BacaException()
        {
            // Manager ne može da briše lokalitete u tuđoj destinaciji
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NeodgovorniManager_BacaException));
            var (managerRole, _, lt, _, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, 10));
            var drugiMgr = new User
            {
                Id = 20, FirstName = "D", LastName = "D", Email = "d@d.com",
                PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole,
                IsActive = true, ManagedDestinationId = null,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(drugiMgr);
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(1, drugiMgr.Id, "Manager"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*responsible manager*");
        }

        [Fact]
        public async Task DeleteAsync_Admin_BacaException()
        {
            // Poslovno pravilo: samo menadžer može da upravlja lokalitetima
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_Admin_BacaException));
            var (_, _, lt, mgr, dest, _) = SeedBase(ctx);
            ctx.Localities.Add(MakeLocality(1, "L1", dest, lt, mgr.Id));
            ctx.SaveChanges();

            var svc = new LocalityService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(1, userId: 1, "Admin"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Admins cannot*");
        }
    }
}
