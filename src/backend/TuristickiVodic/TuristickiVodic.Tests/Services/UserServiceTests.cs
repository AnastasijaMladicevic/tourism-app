using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using Moq;
using Xunit;
using FluentAssertions;

namespace TuristickiVodic.Tests.Services
{
    /// <summary>
    /// Unit testovi za UserService pokrivaju sva poslovna pravila:
    /// - Registracija kreira nalog sa ulogom Tourist
    /// - Email mora biti jedinstven
    /// - Blacklistovani korisnici ne mogu da se loguju, niti da dobiju CC ulogu
    /// - Samo Tourist može da postane CC
    /// - Admin menja lozinku bez stare lozinke; ostali moraju da unesu tačnu staru
    /// - Korisnik može da menja lozinku samo sebi (osim Admin)
    /// - Aktivacija/deaktivacija invalidira refresh token
    /// </summary>
    public class UserServiceTests
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

        private static (Role tourist, Role cc, Role manager, Role admin) SeedRoles(AppDbContext ctx)
        {
            var tourist = new Role { Id = 1, Name = RoleType.Tourist };
            var cc      = new Role { Id = 2, Name = RoleType.ContentCreator };
            var manager = new Role { Id = 3, Name = RoleType.Manager };
            var admin   = new Role { Id = 4, Name = RoleType.Admin };
            ctx.Roles.AddRange(tourist, cc, manager, admin);
            ctx.SaveChanges();
            return (tourist, cc, manager, admin);
        }

        // ═══════════════════════════════════════════
        //  CreateAsync — registracija
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateAsync_NovRegistracija_KreiraKorisnikaKaoTourist()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_NovRegistracija_KreiraKorisnikaKaoTourist));
            var (tourist, _, _, _) = SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var dto = new CreateUserDto
            {
                FirstName = "Marko", LastName = "Marković",
                Email = "marko@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            var result = await svc.CreateAsync(dto);

            result.RoleName.Should().Be("Tourist");
            result.Email.Should().Be("marko@test.com");
            ctx.Users.Count().Should().Be(1);
        }

        [Fact]
        public async Task CreateAsync_PostojeciEmail_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_PostojeciEmail_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                FirstName = "Ana", LastName = "A", Email = "ana@test.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var dto = new CreateUserDto
            {
                FirstName = "Ana2", LastName = "A2", Email = "ana@test.com",
                Password = "lozinka123", DateOfBirth = new DateTime(1990, 1, 1)
            };

            await svc.Invoking(s => s.CreateAsync(dto))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Email already exists*");
        }

        [Fact]
        public async Task CreateAsync_KorisnikJeNeaktivan_VrataFalse_IsActive()
        {
            // Novi korisnik mora biti aktivan po defaultu
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_KorisnikJeNeaktivan_VrataFalse_IsActive));
            var (tourist, _, _, _) = SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.CreateAsync(new CreateUserDto
            {
                FirstName = "Test", LastName = "T", Email = "t@t.com",
                Password = "lozinka1", DateOfBirth = new DateTime(2000, 1, 1)
            });

            var korisnik = ctx.Users.First();
            korisnik.IsActive.Should().BeTrue();
            korisnik.IsBlacklisted.Should().BeFalse();
            korisnik.IsVerified.Should().BeFalse();
        }

        // ═══════════════════════════════════════════
        //  LoginAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task LoginAsync_BlacklistedKorisnik_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_BlacklistedKorisnik_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                FirstName = "B", LastName = "B", Email = "b@b.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
                RoleId = tourist.Id, Role = tourist,
                IsBlacklisted = true, IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.LoginAsync(new LoginDto { Email = "b@b.com", Password = "pass" }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*blacklisted*");
        }

        [Fact]
        public async Task LoginAsync_DeaktiviranKorisnik_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_DeaktiviranKorisnik_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                FirstName = "C", LastName = "C", Email = "c@c.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
                RoleId = tourist.Id, Role = tourist,
                IsBlacklisted = false, IsActive = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.LoginAsync(new LoginDto { Email = "c@c.com", Password = "pass" }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*deactivated*");
        }

        [Fact]
        public async Task LoginAsync_PogresnaLozinka_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_PogresnaLozinka_VracaNull));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                FirstName = "D", LastName = "D", Email = "d@d.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("tacnaLozinka"),
                RoleId = tourist.Id, Role = tourist, IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.LoginAsync(new LoginDto { Email = "d@d.com", Password = "pogresna" });

            result.Should().BeNull();
        }

        // ═══════════════════════════════════════════
        //  ChangePasswordAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ChangePasswordAsync_KorisnikMenjaSvojiLozinkuSaTacnomStarom_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_KorisnikMenjaSvojiLozinkuSaTacnomStarom_Uspeh));
            var (tourist, _, _, _) = SeedRoles(ctx);
            var user = new User
            {
                Id = 5, FirstName = "E", LastName = "E", Email = "e@e.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("staraLozinka"),
                RoleId = tourist.Id, Role = tourist, IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(user);
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.ChangePasswordAsync(5,
                new ChangePasswordDto { CurrentPassword = "staraLozinka", NewPassword = "novaLozinka1", ConfirmPassword = "novaLozinka1" },
                currentUserId: 5, roleName: "Tourist");

            var updated = ctx.Users.Find(5);
            BCrypt.Net.BCrypt.Verify("novaLozinka1", updated!.PasswordHash).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  CreateManagerAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateManagerAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomManager()
        {
            var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomManager));
            var (_, _, manager, _) = SeedRoles(ctx);
            await ctx.SaveChangesAsync();

            var service = new UserService(ctx, CreateMapper(), new Mock<ITokenService>().Object);

            var result = await service.CreateManagerAsync(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "manager@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1990, 1, 1)
            });

            result.RoleName.Should().Be("Manager");
            ctx.Users.Should().ContainSingle(u => u.Email == "manager@test.com");
        }

        [Fact]
        public async Task CreateManagerAsync_KadaEmailVecPostoji_BacaInvalidOperationException()
        {
            var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_KadaEmailVecPostoji_BacaInvalidOperationException));
            SeedRoles(ctx);
            ctx.Users.Add(new User { Email = "manager@test.com", PasswordHash = "x", RoleId = 3, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await ctx.SaveChangesAsync();

            var service = new UserService(ctx, CreateMapper(), new Mock<ITokenService>().Object);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateManagerAsync(new CreateUserDto
                {
                    FirstName = "N",
                    LastName = "J",
                    Email = "manager@test.com",
                    Password = "pass123",
                    DateOfBirth = new DateTime(1990, 1, 1)
                }));
        }

        // ═══════════════════════════════════════════
        //  CreateAdminAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateAdminAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomAdmin()
        {
            var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomAdmin));
            SeedRoles(ctx);
            await ctx.SaveChangesAsync();

            var service = new UserService(ctx, CreateMapper(), new Mock<ITokenService>().Object);

            var result = await service.CreateAdminAsync(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "admin2@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1985, 1, 1)
            });

            result.RoleName.Should().Be("Admin");
            ctx.Users.Should().ContainSingle(u => u.Email == "admin2@test.com");
        }

        [Fact]
        public async Task CreateAdminAsync_KadaEmailVecPostoji_BacaInvalidOperationException()
        {
            var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_KadaEmailVecPostoji_BacaInvalidOperationException));
            SeedRoles(ctx);
            ctx.Users.Add(new User { Email = "admin2@test.com", PasswordHash = "x", RoleId = 4, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await ctx.SaveChangesAsync();

            var service = new UserService(ctx, CreateMapper(), new Mock<ITokenService>().Object);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateAdminAsync(new CreateUserDto
                {
                    FirstName = "J",
                    LastName = "M",
                    Email = "admin2@test.com",
                    Password = "pass123",
                    DateOfBirth = new DateTime(1985, 1, 1)
                }));
        }

        [Fact]
        public async Task ChangePasswordAsync_KorisnikMenjaSaPogresnomStarom_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_KorisnikMenjaSaPogresnomStarom_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 6, FirstName = "F", LastName = "F", Email = "f@f.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("tacna"),
                RoleId = tourist.Id, Role = tourist, IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.ChangePasswordAsync(6,
                new ChangePasswordDto { CurrentPassword = "pogresna", NewPassword = "nova1234", ConfirmPassword = "nova1234" },
                currentUserId: 6, roleName: "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*incorrect*");
        }

        [Fact]
        public async Task ChangePasswordAsync_AdminMenjaTuđuLozinkuBezStare_Uspeh()
        {
            // Admin ne mora da unosi staru lozinku
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_AdminMenjaTuđuLozinkuBezStare_Uspeh));
            var (tourist, _, _, admin) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 7, FirstName = "G", LastName = "G", Email = "g@g.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara"),
                RoleId = tourist.Id, Role = tourist, IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            // CurrentPassword je ignorisana za Admin — ne baca grešku
            await svc.ChangePasswordAsync(7,
                new ChangePasswordDto { CurrentPassword = "", NewPassword = "novaAdmin1", ConfirmPassword = "novaAdmin1" },
                currentUserId: 99, roleName: "Admin");

            var updated = ctx.Users.Find(7);
            BCrypt.Net.BCrypt.Verify("novaAdmin1", updated!.PasswordHash).Should().BeTrue();
        }

        [Fact]
        public async Task ChangePasswordAsync_KorisnikNijePronadjen_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_KorisnikNijePronadjen_BacaException));
            SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.ChangePasswordAsync(9999,
                new ChangePasswordDto { CurrentPassword = "x", NewPassword = "y123456", ConfirmPassword = "y123456" },
                9999, "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*not found*");
        }

        // ═══════════════════════════════════════════
        //  ApproveCreatorRoleAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ApproveCreatorRoleAsync_TouristPostajeCc_PromenaUloge()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveCreatorRoleAsync_TouristPostajeCc_PromenaUloge));
            var (tourist, cc, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 10,
                FirstName = "H",
                LastName = "H",
                Email = "h@h.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                HasRequestedCreatorRole = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.ApproveCreatorRoleAsync(10);

            result.Should().BeTrue();
            var updated = ctx.Users.Include(u => u.Role).First(u => u.Id == 10);
            updated.Role.Name.Should().Be(RoleType.ContentCreator);
        }

        [Fact]
        public async Task ApproveCreatorRoleAsync_BlacklistedKorisnik_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveCreatorRoleAsync_BlacklistedKorisnik_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 11, FirstName = "I", LastName = "I", Email = "i@i.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                IsActive = true, IsBlacklisted = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.ApproveCreatorRoleAsync(11))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*blacklisted*");
        }

        [Fact]
        public async Task ApproveCreatorRoleAsync_VecJeCC_BacaException()
        {
            // Samo Tourist može da postane CC
            using var ctx = CreateInMemoryContext(nameof(ApproveCreatorRoleAsync_VecJeCC_BacaException));
            var (_, cc, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 12, FirstName = "J", LastName = "J", Email = "j@j.com",
                PasswordHash = "hash", RoleId = cc.Id, Role = cc,
                IsActive = true, IsBlacklisted = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            await svc.Invoking(s => s.ApproveCreatorRoleAsync(12))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*tourists*");
        }

        // ═══════════════════════════════════════════
        //  ToggleUserActiveAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ToggleUserActiveAsync_Deaktivacija_SmestaKorisnika()
        {
            using var ctx = CreateInMemoryContext(nameof(ToggleUserActiveAsync_Deaktivacija_SmestaKorisnika));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 13, FirstName = "K", LastName = "K", Email = "k@k.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                IsActive = true, DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.ToggleUserActiveAsync(13, false);

            result.Should().BeTrue();
            ctx.Users.Find(13)!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task ToggleUserActiveAsync_NepostojeciKorisnik_VracaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(ToggleUserActiveAsync_NepostojeciKorisnik_VracaFalse));
            SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.ToggleUserActiveAsync(9999, false);

            result.Should().BeFalse();
        }

        // ═══════════════════════════════════════════
        //  DeleteAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task DeleteAsync_PostojeciKorisnik_BriseGa()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_PostojeciKorisnik_BriseGa));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 14, FirstName = "L", LastName = "L", Email = "l@l.com",
                PasswordHash = "hash", RoleId = tourist.Id, Role = tourist,
                IsActive = true, DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.DeleteAsync(14);

            result.Should().BeTrue();
            ctx.Users.Find(14).Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_NepostojeciKorisnik_VracaFalse()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_NepostojeciKorisnik_VracaFalse));
            SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = new UserService(ctx, CreateMapper(), tokenSvc.Object);

            var result = await svc.DeleteAsync(9999);

            result.Should().BeFalse();
        }
    }
}
