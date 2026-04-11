using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using Xunit;
using FluentAssertions;

namespace TuristickiVodic.Tests.Services
{
    /// <summary>
    /// Unit testovi za DestinationService pokrivaju sva poslovna pravila:
    /// - Destinacija ne može da se kreira bez menadžera
    /// - ManagedByUserId mora biti korisnik sa Manager ulogom
    /// - Jedan Manager ne može da rukovodi sa više destinacija
    /// - Samo Admin menja destinacije (servis ne provjerava rolu, to je controller)
    /// - AssignManager oslobađa starog i dodjeljuje novog menadžera
    /// - Brisanje blokirano ako destinacija ima lokalitete, objekte ili evente
    /// </summary>
    public class DestinationServiceTests
    {
        private static AppDbContext CreateInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new AppDbContext(options);
        }

        private static IMapper CreateMapper()
        {
            var config = new MapperConfiguration(cfg =>
                cfg.AddProfile<TuristickiVodic.Services.Mappings.MappingProfile>());
            return config.CreateMapper();
        }

        private static (Role tourist, Role manager, Role admin, DestinationType tip) SeedBase(AppDbContext ctx)
        {
            var tourist = new Role { Id = 1, Name = RoleType.Tourist };
            var manager = new Role { Id = 3, Name = RoleType.Manager };
            var admin   = new Role { Id = 4, Name = RoleType.Admin };
            var tip = new DestinationType { Id = 1, Name = "Stari Grad" };
            ctx.Roles.AddRange(tourist, manager, admin);
            ctx.DestinationTypes.Add(tip);
            ctx.SaveChanges();
            return (tourist, manager, admin, tip);
        }

        private static User CreateManager(int id, string email, Role managerRole, int? managedDestId = null) =>
            new User
            {
                Id = id, FirstName = "Mgr", LastName = "Mgr", Email = email,
                PasswordHash = "hash", RoleId = managerRole.Id, Role = managerRole,
                IsActive = true, IsBlacklisted = false,
                ManagedDestinationId = managedDestId,
                DateOfBirth = new DateTime(1985, 1, 1)
            };

        // ═══════════════════════════════════════════
        //  CreateAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateAsync_ValidanManager_KreiraDestinaciju()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ValidanManager_KreiraDestinaciju));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgr = CreateManager(10, "mgr@test.com", manager);
            ctx.Users.Add(mgr);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            var result = await svc.CreateAsync(new CreateDestinationDto
            {
                Name = "Kotor",
                DestinationTypeId = tip.Id,
                ManagedByUserId = mgr.Id
            }, userId: 99);

            result.Name.Should().Be("Kotor");
            result.ManagedByUserId.Should().Be(mgr.Id);
        }

        [Fact]
        public async Task CreateAsync_ManagerNijePronadjen_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ManagerNijePronadjen_BacaException));
            var (_, _, _, tip) = SeedBase(ctx);
            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = tip.Id, ManagedByUserId = 9999
            }, 1))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*not found*");
        }

        [Fact]
        public async Task CreateAsync_DodeljenoLiceNijeManager_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_DodeljenoLiceNijeManager_BacaException));
            var (tourist, _, _, tip) = SeedBase(ctx);
            var tourist_user = new User
            {
                Id = 20, FirstName = "T", LastName = "T", Email = "t@t.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                IsActive = true, DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(tourist_user);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = tip.Id, ManagedByUserId = tourist_user.Id
            }, 1))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Manager role*");
        }

        [Fact]
        public async Task CreateAsync_ManagerVecRukovodiDrugom_BacaException()
        {
            // Jedan Manager ne može da rukovodi sa više destinacija
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_ManagerVecRukovodiDrugom_BacaException));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgr = CreateManager(30, "mgr2@test.com", manager, managedDestId: 1);
            ctx.Users.Add(mgr);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateDestinationDto
            {
                Name = "Nova", DestinationTypeId = tip.Id, ManagedByUserId = mgr.Id
            }, 1))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already manages*");
        }

        [Fact]
        public async Task CreateAsync_TipDestinacijeNePostoji_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_TipDestinacijeNePostoji_BacaException));
            var (_, manager, _, _) = SeedBase(ctx);
            var mgr = CreateManager(40, "mgr3@test.com", manager);
            ctx.Users.Add(mgr);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.CreateAsync(new CreateDestinationDto
            {
                Name = "Test", DestinationTypeId = 9999, ManagedByUserId = mgr.Id
            }, 1))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*type not found*");
        }

        // ═══════════════════════════════════════════
        //  GetByIdAsync / GetAllAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetByIdAsync_PostojecaDestinacija_VracaDto()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_PostojecaDestinacija_VracaDto));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgr = CreateManager(50, "mgr4@test.com", manager);
            ctx.Users.Add(mgr);
            var dest = new Destination
            {
                Id = 1, Name = "Budva", DestinationTypeId = tip.Id, DestinationType = tip,
                ManagedByUserId = mgr.Id, CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            ctx.SaveChanges();

            ctx.Images.Add(new Image
            {
                Url = "main.jpg",
                IsMain = true,
                DestinationId = dest.Id,
                CreatedAt = DateTime.UtcNow
            });
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());
            var result = await svc.GetByIdAsync(1, null, null);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Budva");
        }

        [Fact]
        public async Task GetByIdAsync_DestinacijaBezMainSlike_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_DestinacijaBezMainSlike_VracaNull));
            var mapper = CreateMapper();

            var destinationType = new DestinationType { Id = 1, Name = "Grad" };
            var adminRole = new Role { Id = 1, Name = RoleType.Admin };
            var managerRole = new Role { Id = 2, Name = RoleType.Manager };

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

            var svc = new DestinationService(ctx, mapper);

            var result = await svc.GetByIdAsync(destination.Id, null, null);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetByIdAsync_NepostojećaDestinacija_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_NepostojećaDestinacija_VracaNull));
            SeedBase(ctx);
            var svc = new DestinationService(ctx, CreateMapper());

            var result = await svc.GetByIdAsync(9999, null, null);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAllAsync_VracaSveDestinacije()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_VracaSveDestinacije));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgr = CreateManager(60, "mgr5@test.com", manager);
            ctx.Users.Add(mgr);

            var d1 = new Destination
            {
                Id = 1,
                Name = "D1",
                DestinationTypeId = tip.Id,
                DestinationType = tip,
                ManagedByUserId = mgr.Id,
                CreatedByUserId = 99,
                Status = ContentStatus.Approved
            };

            var d2 = new Destination
            {
                Id = 2,
                Name = "D2",
                DestinationTypeId = tip.Id,
                DestinationType = tip,
                ManagedByUserId = mgr.Id,
                CreatedByUserId = 99,
                Status = ContentStatus.Approved
            };

            ctx.Destinations.AddRange(d1, d2);
            ctx.SaveChanges();

            ctx.Images.AddRange(
                new Image
                {
                    Id = 1,
                    DestinationId = 1,
                    Url = "d1-main.jpg",
                    IsMain = true
                },
                new Image
                {
                    Id = 2,
                    DestinationId = 2,
                    Url = "d2-main.jpg",
                    IsMain = true
                }
            );
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());
            var result = await svc.GetAllAsync(null, null);

            result.Should().HaveCount(2);
        }

        // ═══════════════════════════════════════════
        //  AssignManagerAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task AssignManagerAsync_ValidanNovManager_AzuriraDestinaciju()
        {
            using var ctx = CreateInMemoryContext(nameof(AssignManagerAsync_ValidanNovManager_AzuriraDestinaciju));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgr1 = CreateManager(70, "mgr6@test.com", manager);
            var mgr2 = CreateManager(71, "mgr7@test.com", manager);
            ctx.Users.AddRange(mgr1, mgr2);
            var dest = new Destination
            {
                Id = 2, Name = "Cetinje", DestinationTypeId = tip.Id, DestinationType = tip,
                ManagedByUserId = mgr1.Id, CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            mgr1.ManagedDestinationId = dest.Id;
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());
            var result = await svc.AssignManagerAsync(2, mgr2.Id);

            result.Should().NotBeNull();
            result!.ManagedByUserId.Should().Be(mgr2.Id);
            // Stari menadžer je oslobođen
            ctx.Users.Find(mgr1.Id)!.ManagedDestinationId.Should().BeNull();
        }

        [Fact]
        public async Task AssignManagerAsync_ManagerVecVodiDruguDestinaciju_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(AssignManagerAsync_ManagerVecVodiDruguDestinaciju_BacaException));
            var (_, manager, _, tip) = SeedBase(ctx);
            var mgrZauzet = CreateManager(80, "zauzet@test.com", manager, managedDestId: 99);
            ctx.Users.Add(mgrZauzet);
            var dest = new Destination
            {
                Id = 3, Name = "Niksic", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.AssignManagerAsync(3, mgrZauzet.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already manages*");
        }

        [Fact]
        public async Task AssignManagerAsync_KorisnikNijeManager_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(AssignManagerAsync_KorisnikNijeManager_BacaException));
            var (tourist, _, _, tip) = SeedBase(ctx);
            var tourist_user = new User
            {
                Id = 90, FirstName = "T2", LastName = "T2", Email = "t2@t.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                IsActive = true, DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(tourist_user);
            var dest = new Destination
            {
                Id = 4, Name = "Bar", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.AssignManagerAsync(4, tourist_user.Id))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Manager role*");
        }

        // ═══════════════════════════════════════════
        //  DeleteAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task DeleteAsync_PraznaDestinacija_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_PraznaDestinacija_Uspeh));
            var (_, _, _, tip) = SeedBase(ctx);
            var dest = new Destination
            {
                Id = 5, Name = "Ulcinj", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());
            var result = await svc.DeleteAsync(5);

            result.Should().BeTrue();
            ctx.Destinations.Find(5).Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_NepostojecaDestinacija_VracaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NepostojecaDestinacija_VracaFalse));
            SeedBase(ctx);
            var svc = new DestinationService(ctx, CreateMapper());

            var result = await svc.DeleteAsync(9999);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAsync_DestinacijaImaLokalitete_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_DestinacijaImaLokalitete_BacaException));
            var (_, _, _, tip) = SeedBase(ctx);
            var dest = new Destination
            {
                Id = 6, Name = "Podgorica", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            var localityType = new LocalityType { Id = 1, Name = "Centar" };
            ctx.LocalityTypes.Add(localityType);
            ctx.Localities.Add(new Locality
            {
                Id = 1, Name = "Stara Varos", DestinationId = dest.Id,
                LocalityTypeId = 1, CreatedByUserId = 99
            });
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(6))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*localities*");
        }

        [Fact]
        public async Task DeleteAsync_DestinacijaImaObjekte_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_DestinacijaImaObjekte_BacaException));
            var (tourist, _, _, tip) = SeedBase(ctx);
            var dest = new Destination
            {
                Id = 7, Name = "Herceg Novi", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            var objType = new ObjectType { Id = 1, Name = "Muzej" };
            ctx.ObjectTypes.Add(objType);
            ctx.Objects.Add(new TouristObject
            {
                Id = 1, Name = "Kanli Kula", ObjectTypeId = 1,
                DestinationId = dest.Id, CreatedByUserId = 99
            });
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(7))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*objects*");
        }

        [Fact]
        public async Task DeleteAsync_DestinacijaImaEvente_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_DestinacijaImaEvente_BacaException));
            var (_, _, _, tip) = SeedBase(ctx);
            var dest = new Destination
            {
                Id = 8, Name = "Tivat", DestinationTypeId = tip.Id, DestinationType = tip,
                CreatedByUserId = 99, Status = ContentStatus.Approved
            };
            ctx.Destinations.Add(dest);
            var evType = new EventType { Id = 1, Name = "Festival" };
            ctx.EventTypes.Add(evType);
            ctx.Events.Add(new Event
            {
                Id = 1, Name = "Sea Dance", EventTypeId = 1,
                DestinationId = dest.Id, CreatedByUserId = 99,
                StartDate = DateTime.UtcNow.AddDays(10)
            });
            ctx.SaveChanges();

            var svc = new DestinationService(ctx, CreateMapper());

            await svc.Invoking(s => s.DeleteAsync(8))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*events*");
        }
    }
}
