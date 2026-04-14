using AutoMapper;
using FluentAssertions;
using FluentAssertions.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.IO;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using TuristickiVodic.Tests.Helpers;
using Xunit;

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

        private static Mock<IWebHostEnvironment> CreateEnvironmentMock()
        {
            var environmentMock = new Mock<IWebHostEnvironment>();
            environmentMock.Setup(x => x.WebRootPath).Returns(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
            environmentMock.Setup(x => x.ContentRootPath).Returns(Directory.GetCurrentDirectory());
            return environmentMock;
        }

        private static UserService CreateUserService(AppDbContext ctx, Mock<ITokenService> tokenSvc)
        {
            return new UserService(ctx, CreateMapper(), tokenSvc.Object, CreateEnvironmentMock().Object);
        }

        private static (Role tourist, Role cc, Role manager, Role admin) SeedRoles(AppDbContext ctx)
        {
            var tourist = new Role { Id = 1, Name = RoleType.Tourist };
            var cc = new Role { Id = 2, Name = RoleType.ContentCreator };
            var manager = new Role { Id = 3, Name = RoleType.Manager };
            var admin = new Role { Id = 4, Name = RoleType.Admin };
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
            var svc = CreateUserService(ctx, tokenSvc);

            var dto = new CreateUserDto
            {
                FirstName = "Marko",
                LastName = "Marković",
                Email = "marko@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            var result = await svc.CreateAsync(dto);

            result.RoleName.Should().Be("Tourist");
            result.Email.Should().Be("marko@test.com");
            ctx.Users.Count().Should().Be(1);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeProslediRoleFilter_VracaSamoTrazeniRole()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeProslediRoleFilter_VracaSamoTrazeniRole));
            var (tourist, _, manager, admin) = SeedRoles(ctx);

            ctx.Users.AddRange(
                new User
                {
                    Id = 1,
                    FirstName = "Ana",
                    LastName = "Admin",
                    Email = "ana.admin@test.com",
                    PasswordHash = "hash",
                    RoleId = admin.Id,
                    Role = admin,
                    IsActive = true,
                    DateOfBirth = new DateTime(1990, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-3)
                },
                new User
                {
                    Id = 2,
                    FirstName = "Milan",
                    LastName = "Manager",
                    Email = "milan.manager@test.com",
                    PasswordHash = "hash",
                    RoleId = manager.Id,
                    Role = manager,
                    IsActive = true,
                    DateOfBirth = new DateTime(1991, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new User
                {
                    Id = 3,
                    FirstName = "Tara",
                    LastName = "Tourist",
                    Email = "tara.tourist@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    IsActive = true,
                    DateOfBirth = new DateTime(1992, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.GetAllAsync(new UserQueryDto
            {
                Role = "manager"
            });

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle();
            result.Items[0].Email.Should().Be("milan.manager@test.com");
            result.Items[0].RoleName.Should().Be("Manager");
        }

        [Fact]
        public async Task GetAllAsync_KadaJeRoleFilterNepostojeci_VracaPrazanRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaJeRoleFilterNepostojeci_VracaPrazanRezultat));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 10,
                FirstName = "Petar",
                LastName = "Petrovic",
                Email = "petar@test.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.GetAllAsync(new UserQueryDto
            {
                Role = "superadmin"
            });

            result.TotalCount.Should().Be(0);
            result.Items.Should().BeEmpty();
            result.TotalPages.Should().Be(0);
        }

        [Fact]
        public async Task GetAllAsync_KadaSeSortiraPoRoliOpadajuce_VracaIspravanRedosled()
        {
            using var ctx = CreateInMemoryContext(nameof(GetAllAsync_KadaSeSortiraPoRoliOpadajuce_VracaIspravanRedosled));
            var (tourist, _, manager, admin) = SeedRoles(ctx);

            ctx.Users.AddRange(
                new User
                {
                    Id = 21,
                    FirstName = "Tamara",
                    LastName = "Tourist",
                    Email = "tamara@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    IsActive = true,
                    DateOfBirth = new DateTime(1992, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new User
                {
                    Id = 22,
                    FirstName = "Marko",
                    LastName = "Manager",
                    Email = "marko@test.com",
                    PasswordHash = "hash",
                    RoleId = manager.Id,
                    Role = manager,
                    IsActive = true,
                    DateOfBirth = new DateTime(1991, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new User
                {
                    Id = 23,
                    FirstName = "Andjela",
                    LastName = "Admin",
                    Email = "andjela@test.com",
                    PasswordHash = "hash",
                    RoleId = admin.Id,
                    Role = admin,
                    IsActive = true,
                    DateOfBirth = new DateTime(1990, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-3)
                });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.GetAllAsync(new UserQueryDto
            {
                SortBy = "role",
                SortOrder = "desc"
            });

            result.Items.Select(x => x.RoleName).Should().Equal("Admin", "Manager", "Tourist");
        }

        private static Mock<ITokenService> CreateTokenServiceMock(
        string token = "jwt-token",
        string refreshToken = "refresh-token")
        {
            var tokenSvc = new Mock<ITokenService>();
            tokenSvc.Setup(t => t.GenerateToken(It.IsAny<User>())).Returns(token);
            tokenSvc.Setup(t => t.GenerateRefreshToken()).Returns(refreshToken);
            return tokenSvc;
        }

        [Fact]
        public async Task LoginAsync_SaIspravnimKredencijalimaRememberMeFalse_CuvaRefreshTokenNa7Dana()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_SaIspravnimKredencijalimaRememberMeFalse_CuvaRefreshTokenNa7Dana));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 100,
                FirstName = "Login",
                LastName = "User",
                Email = "login@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-1", "refresh-1");
            var svc = CreateUserService(ctx, tokenSvc);

            var before = DateTime.UtcNow;
            var result = await svc.LoginAsync(new LoginDto
            {
                Email = "login@test.com",
                Password = "pass123",
                RememberMe = false
            });
            var after = DateTime.UtcNow;

            result.Should().NotBeNull();
            result!.Token.Should().Be("jwt-1");
            result.RefreshToken.Should().Be("refresh-1");

            var stored = await ctx.RefreshTokens.SingleAsync(rt => rt.UserId == 100);
            stored.RememberMe.Should().BeFalse();
            stored.RefreshTokenExpiry.Should().BeAfter(before.AddDays(6));
            stored.RefreshTokenExpiry.Should().BeBefore(after.AddDays(8));
        }

        [Fact]
        public async Task LoginAsync_SaIspravnimKredencijalimaRememberMeTrue_CuvaRefreshTokenNa30Dana()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_SaIspravnimKredencijalimaRememberMeTrue_CuvaRefreshTokenNa30Dana));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 101,
                FirstName = "Login",
                LastName = "User",
                Email = "remember@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-2", "refresh-2");
            var svc = CreateUserService(ctx, tokenSvc);

            var before = DateTime.UtcNow;
            var result = await svc.LoginAsync(new LoginDto
            {
                Email = "remember@test.com",
                Password = "pass123",
                RememberMe = true
            });
            var after = DateTime.UtcNow;

            result.Should().NotBeNull();
            result!.Token.Should().Be("jwt-2");
            result.RefreshToken.Should().Be("refresh-2");

            var stored = await ctx.RefreshTokens.SingleAsync(rt => rt.UserId == 101);
            stored.RememberMe.Should().BeTrue();
            stored.RefreshTokenExpiry.Should().BeAfter(before.AddDays(29));
            stored.RefreshTokenExpiry.Should().BeBefore(after.AddDays(31));
        }

        [Fact]
        public async Task RefreshTokenAsync_NevalidanToken_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_NevalidanToken_VracaNull));
            SeedRoles(ctx);

            var tokenSvc = CreateTokenServiceMock("jwt-3", "refresh-3");
            var svc = CreateUserService(ctx, tokenSvc);

            var result = await svc.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "nepostojeci-token"
            });

            result.Should().BeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_IstekaoToken_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_IstekaoToken_VracaNull));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var user = new User
            {
                Id = 102,
                FirstName = "Expired",
                LastName = "User",
                Email = "expired@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            ctx.Users.Add(user);
            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 102,
                RefreshTokenHash = Convert.ToBase64String(
                    System.Security.Cryptography.SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes("expired-refresh"))),
                RefreshTokenExpiry = DateTime.UtcNow.AddMinutes(-1),
                RememberMe = false
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-4", "refresh-4");
            var svc = CreateUserService(ctx, tokenSvc);

            var result = await svc.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "expired-refresh"
            });

            result.Should().BeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_RememberMeFalse_Zadrzava7DanaIRotiraToken()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_RememberMeFalse_Zadrzava7DanaIRotiraToken));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var user = new User
            {
                Id = 103,
                FirstName = "Refresh",
                LastName = "User",
                Email = "refresh7@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            ctx.Users.Add(user);
            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 103,
                RefreshTokenHash = Convert.ToBase64String(
                    System.Security.Cryptography.SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes("old-refresh-7"))),
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(2),
                RememberMe = false
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-5", "new-refresh-7");
            var svc = CreateUserService(ctx, tokenSvc);

            var before = DateTime.UtcNow;
            var result = await svc.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "old-refresh-7"
            });
            var after = DateTime.UtcNow;

            result.Should().NotBeNull();
            result!.Token.Should().Be("jwt-5");
            result.RefreshToken.Should().Be("new-refresh-7");

            ctx.RefreshTokens.Should().ContainSingle(rt => rt.UserId == 103);

            var stored = await ctx.RefreshTokens.SingleAsync(rt => rt.UserId == 103);
            stored.RememberMe.Should().BeFalse();
            stored.RefreshTokenExpiry.Should().BeAfter(before.AddDays(6));
            stored.RefreshTokenExpiry.Should().BeBefore(after.AddDays(8));
            stored.RefreshTokenHash.Should().NotBe(Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes("old-refresh-7"))));
        }

        [Fact]
        public async Task RefreshTokenAsync_RememberMeTrue_Zadrzava30DanaIRotiraToken()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_RememberMeTrue_Zadrzava30DanaIRotiraToken));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var user = new User
            {
                Id = 104,
                FirstName = "Refresh",
                LastName = "User",
                Email = "refresh30@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            ctx.Users.Add(user);
            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 104,
                RefreshTokenHash = Convert.ToBase64String(
                    System.Security.Cryptography.SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes("old-refresh-30"))),
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(10),
                RememberMe = true
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-6", "new-refresh-30");
            var svc = CreateUserService(ctx, tokenSvc);

            var before = DateTime.UtcNow;
            var result = await svc.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "old-refresh-30"
            });
            var after = DateTime.UtcNow;

            result.Should().NotBeNull();
            result!.Token.Should().Be("jwt-6");
            result.RefreshToken.Should().Be("new-refresh-30");

            ctx.RefreshTokens.Should().ContainSingle(rt => rt.UserId == 104);

            var stored = await ctx.RefreshTokens.SingleAsync(rt => rt.UserId == 104);
            stored.RememberMe.Should().BeTrue();
            stored.RefreshTokenExpiry.Should().BeAfter(before.AddDays(29));
            stored.RefreshTokenExpiry.Should().BeBefore(after.AddDays(31));
        }

        [Fact]
        public async Task RefreshTokenAsync_BlacklistedKorisnik_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_BlacklistedKorisnik_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 105,
                FirstName = "Blacklisted",
                LastName = "User",
                Email = "black@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = true,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 105,
                RefreshTokenHash = Convert.ToBase64String(
                    System.Security.Cryptography.SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes("black-refresh"))),
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(2),
                RememberMe = false
            });

            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-7", "refresh-7");
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.Invoking(s => s.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "black-refresh"
            }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*blacklisted*");
        }

        [Fact]
        public async Task RefreshTokenAsync_DeaktiviranKorisnik_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_DeaktiviranKorisnik_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 106,
                FirstName = "Inactive",
                LastName = "User",
                Email = "inactive@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = false,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 106,
                RefreshTokenHash = Convert.ToBase64String(
                    System.Security.Cryptography.SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes("inactive-refresh"))),
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(2),
                RememberMe = false
            });

            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-8", "refresh-8");
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.Invoking(s => s.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = "inactive-refresh"
            }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*deactivated*");
        }

        [Fact]
        public async Task ToggleUserActiveAsync_Deaktivacija_BriseRefreshToken()
        {
            using var ctx = CreateInMemoryContext(nameof(ToggleUserActiveAsync_Deaktivacija_BriseRefreshToken));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 107,
                FirstName = "Toggle",
                LastName = "User",
                Email = "toggle@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 107,
                RefreshTokenHash = "hash-token",
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
                RememberMe = false
            });

            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, CreateTokenServiceMock());

            var result = await svc.ToggleUserActiveAsync(107, false);

            result.Should().BeTrue();
            ctx.RefreshTokens.Should().NotContain(rt => rt.UserId == 107);
            ctx.Users.Single(u => u.Id == 107).IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task RefreshTokenAsync_BriseStariRefreshTokenIzBaze()
        {
            using var ctx = CreateInMemoryContext(nameof(RefreshTokenAsync_BriseStariRefreshTokenIzBaze));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var oldRawToken = "stari-refresh";
            var oldHash = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(oldRawToken)));

            var user = new User
            {
                Id = 200,
                FirstName = "Rotate",
                LastName = "User",
                Email = "rotate@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            };

            ctx.Users.Add(user);
            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 200,
                RefreshTokenHash = oldHash,
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(2),
                RememberMe = false
            });

            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-rotate", "novi-refresh");
            var svc = CreateUserService(ctx, tokenSvc);

            var result = await svc.RefreshTokenAsync(new RefreshTokenDto
            {
                RefreshToken = oldRawToken
            });

            result.Should().NotBeNull();

            ctx.RefreshTokens.Should().ContainSingle(rt => rt.UserId == 200);
            ctx.RefreshTokens.Should().NotContain(rt => rt.RefreshTokenHash == oldHash);
        }

        [Fact]
        public async Task DeleteAsync_BriseIKorisnikaIRefreshToken()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_BriseIKorisnikaIRefreshToken));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 108,
                FirstName = "Delete",
                LastName = "User",
                Email = "delete@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.RefreshTokens.Add(new RefreshToken
            {
                UserId = 108,
                RefreshTokenHash = "hash-delete",
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
                RememberMe = false
            });

            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, CreateTokenServiceMock());

            var result = await svc.DeleteAsync(108);

            result.Should().BeTrue();
            ctx.Users.Should().NotContain(u => u.Id == 108);
            ctx.RefreshTokens.Should().NotContain(rt => rt.UserId == 108);
        }

        [Fact]
        public async Task CreateAsync_PostojeciEmail_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_PostojeciEmail_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                FirstName = "Ana",
                LastName = "A",
                Email = "ana@test.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            var dto = new CreateUserDto
            {
                FirstName = "Ana2",
                LastName = "A2",
                Email = "ana@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1990, 1, 1)
            };

            await svc.Invoking(s => s.CreateAsync(dto))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Email already exists*");
        }

        [Fact]
        public async Task CreateAsync_KorisnikJeNeaktivan_VrataFalse_IsActive()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAsync_KorisnikJeNeaktivan_VrataFalse_IsActive));
            var (tourist, _, _, _) = SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            var result = await svc.CreateAsync(new CreateUserDto
            {
                FirstName = "Test",
                LastName = "T",
                Email = "t@t.com",
                Password = "lozinka1",
                DateOfBirth = new DateTime(2000, 1, 1)
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
                FirstName = "B",
                LastName = "B",
                Email = "b@b.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
                RoleId = tourist.Id,
                Role = tourist,
                IsBlacklisted = true,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
                FirstName = "C",
                LastName = "C",
                Email = "c@c.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
                RoleId = tourist.Id,
                Role = tourist,
                IsBlacklisted = false,
                IsActive = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
                FirstName = "D",
                LastName = "D",
                Email = "d@d.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("tacnaLozinka"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
                Id = 5,
                FirstName = "E",
                LastName = "E",
                Email = "e@e.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("staraLozinka"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            };
            ctx.Users.Add(user);
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.ChangePasswordAsync(
                5,
                new ChangePasswordDto
                {
                    CurrentPassword = "staraLozinka",
                    NewPassword = "novaLozinka1",
                    ConfirmPassword = "novaLozinka1"
                },
                currentUserId: 5,
                roleName: "Tourist");

            var updated = ctx.Users.Find(5);
            BCrypt.Net.BCrypt.Verify("novaLozinka1", updated!.PasswordHash).Should().BeTrue();
        }

        // ═══════════════════════════════════════════
        //  CreateManagerAsync
        // ═══════════════════════════════════════════

        [Fact]
        public async Task CreateManagerAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomManager()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomManager));
            var (_, _, manager, _) = SeedRoles(ctx);
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

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
            using var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_KadaEmailVecPostoji_BacaInvalidOperationException));
            var (touristRole, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                FirstName = "Postojeci",
                LastName = "Korisnik",
                Email = "manager@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("staraLozinka123"),
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                IsVerified = false,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1990, 1, 1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

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
            using var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_SaIspravnimPodacima_KreiraKorisnikaSaUlogomAdmin));
            SeedRoles(ctx);
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

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
            using var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_KadaEmailVecPostoji_BacaInvalidOperationException));
            var (touristRole, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                FirstName = "Postojeci",
                LastName = "Korisnik",
                Email = "admin@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("staraLozinka123"),
                RoleId = touristRole.Id,
                Role = touristRole,
                IsActive = true,
                IsVerified = false,
                IsBlacklisted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateAdminAsync(new CreateUserDto
                {
                    FirstName = "Novi",
                    LastName = "Admin",
                    Email = "admin@test.com",
                    Password = "pass123",
                    DateOfBirth = new DateTime(1995, 1, 1)
                }));
        }

        [Fact]
        public async Task ChangePasswordAsync_KorisnikMenjaSaPogresnomStarom_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_KorisnikMenjaSaPogresnomStarom_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 6,
                FirstName = "F",
                LastName = "F",
                Email = "f@f.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("tacna"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.Invoking(s => s.ChangePasswordAsync(
                    6,
                    new ChangePasswordDto
                    {
                        CurrentPassword = "pogresna",
                        NewPassword = "nova1234",
                        ConfirmPassword = "nova1234"
                    },
                    currentUserId: 6,
                    roleName: "Tourist"))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*incorrect*");
        }

        [Fact]
        public async Task ChangePasswordAsync_AdminMenjaTuđuLozinkuBezStare_Uspeh()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_AdminMenjaTuđuLozinkuBezStare_Uspeh));
            var (tourist, _, _, admin) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 7,
                FirstName = "G",
                LastName = "G",
                Email = "g@g.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.ChangePasswordAsync(
                7,
                new ChangePasswordDto
                {
                    CurrentPassword = "",
                    NewPassword = "novaAdmin1",
                    ConfirmPassword = "novaAdmin1"
                },
                currentUserId: 99,
                roleName: "Admin");

            var updated = ctx.Users.Find(7);
            BCrypt.Net.BCrypt.Verify("novaAdmin1", updated!.PasswordHash).Should().BeTrue();
        }

        [Fact]
        public async Task ChangePasswordAsync_KorisnikNijePronadjen_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ChangePasswordAsync_KorisnikNijePronadjen_BacaException));
            SeedRoles(ctx);
            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.Invoking(s => s.ChangePasswordAsync(
                    9999,
                    new ChangePasswordDto
                    {
                        CurrentPassword = "x",
                        NewPassword = "y123456",
                        ConfirmPassword = "y123456"
                    },
                    9999,
                    "Tourist"))
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
            var svc = CreateUserService(ctx, tokenSvc);

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
                Id = 11,
                FirstName = "I",
                LastName = "I",
                Email = "i@i.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

            await svc.Invoking(s => s.ApproveCreatorRoleAsync(11))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*blacklisted*");
        }

        [Fact]
        public async Task ApproveCreatorRoleAsync_VecJeCC_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ApproveCreatorRoleAsync_VecJeCC_BacaException));
            var (_, cc, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 12,
                FirstName = "J",
                LastName = "J",
                Email = "j@j.com",
                PasswordHash = "hash",
                RoleId = cc.Id,
                Role = cc,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
                Id = 13,
                FirstName = "K",
                LastName = "K",
                Email = "k@k.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
            var svc = CreateUserService(ctx, tokenSvc);

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
                Id = 14,
                FirstName = "L",
                LastName = "L",
                Email = "l@l.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc);

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
            var svc = CreateUserService(ctx, tokenSvc);

            var result = await svc.DeleteAsync(9999);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task CreateAdminAsync_UpisujeAdminRoleIdIRole()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_UpisujeAdminRoleIdIRole));
            var (_, _, _, admin) = SeedRoles(ctx);

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.CreateAdminAsync(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "admin3@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1985, 1, 1)
            });

            var user = ctx.Users.Include(u => u.Role).Single(u => u.Email == "admin3@test.com");
            user.RoleId.Should().Be(admin.Id);
            user.Role.Should().NotBeNull();
            user.Role!.Name.Should().Be(RoleType.Admin);
        }

        [Fact]
        public async Task CreateManagerAsync_UpisujeManagerRoleIdIRole()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_UpisujeManagerRoleIdIRole));
            var (_, _, manager, _) = SeedRoles(ctx);

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.CreateManagerAsync(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "manager2@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1990, 1, 1)
            });

            var user = ctx.Users.Include(u => u.Role).Single(u => u.Email == "manager2@test.com");
            user.RoleId.Should().Be(manager.Id);
            user.Role.Should().NotBeNull();
            user.Role!.Name.Should().Be(RoleType.Manager);
        }

        [Fact]
        public async Task CreateAdminAsync_NovKorisnik_PostavljaPodrazumevaneVrednosti()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateAdminAsync_NovKorisnik_PostavljaPodrazumevaneVrednosti));
            SeedRoles(ctx);

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.CreateAdminAsync(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "admin@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1985, 1, 1)
            });

            var user = ctx.Users.Single(u => u.Email == "admin@test.com");
            user.IsActive.Should().BeTrue();
            user.IsBlacklisted.Should().BeFalse();
            user.IsVerified.Should().BeFalse();
        }

        [Fact]
        public async Task CreateManagerAsync_NovKorisnik_PostavljaPodrazumevaneVrednosti()
        {
            using var ctx = CreateInMemoryContext(nameof(CreateManagerAsync_NovKorisnik_PostavljaPodrazumevaneVrednosti));
            SeedRoles(ctx);

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.CreateManagerAsync(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "manager@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1990, 1, 1)
            });

            var user = ctx.Users.Single(u => u.Email == "manager@test.com");
            user.IsActive.Should().BeTrue();
            user.IsBlacklisted.Should().BeFalse();
            user.IsVerified.Should().BeFalse();
        }

        [Fact]
        public async Task RemoveProfileImageAsync_KadaKorisnikImaCustomSliku_PostavljaDefault()
        {
            using var ctx = CreateInMemoryContext(nameof(RemoveProfileImageAsync_KadaKorisnikImaCustomSliku_PostavljaDefault));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 201,
                FirstName = "Profile",
                LastName = "User",
                Email = "profile@test.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                DateOfBirth = new DateTime(1995, 1, 1),
                ProfileImageUrl = "/images/profiles/custom.png"
            });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.RemoveProfileImageAsync(201);

            result.Should().NotBeNull();
            result!.ProfileImageUrl.Should().Be("/images/profiles/default_icon.png");

            var updated = await ctx.Users.FindAsync(201);
            updated.Should().NotBeNull();
            updated!.ProfileImageUrl.Should().Be("/images/profiles/default_icon.png");
        }

        [Fact]
        public async Task RemoveProfileImageAsync_KadaKorisnikNePostoji_VracaNull()
        {
            using var ctx = CreateInMemoryContext(nameof(RemoveProfileImageAsync_KadaKorisnikNePostoji_VracaNull));
            SeedRoles(ctx);

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.RemoveProfileImageAsync(999);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetCreatorRequestsAsync_KadaPostojeZahtevi_VracaPagedFiltriranRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetCreatorRequestsAsync_KadaPostojeZahtevi_VracaPagedFiltriranRezultat));
            var (tourist, cc, _, _) = SeedRoles(ctx);

            ctx.Users.AddRange(
                new User
                {
                    Id = 301,
                    FirstName = "Ana",
                    LastName = "Request",
                    Email = "ana@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    HasRequestedCreatorRole = true,
                    IsActive = true,
                    IsVerified = true,
                    DateOfBirth = new DateTime(1995, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new User
                {
                    Id = 302,
                    FirstName = "Marko",
                    LastName = "Inactive",
                    Email = "marko@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    HasRequestedCreatorRole = true,
                    IsActive = false,
                    IsVerified = true,
                    DateOfBirth = new DateTime(1994, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new User
                {
                    Id = 303,
                    FirstName = "Ceca",
                    LastName = "Creator",
                    Email = "ceca@test.com",
                    PasswordHash = "hash",
                    RoleId = cc.Id,
                    Role = cc,
                    HasRequestedCreatorRole = true,
                    IsActive = true,
                    IsVerified = true,
                    DateOfBirth = new DateTime(1993, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-3)
                });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.GetCreatorRequestsAsync(new CreatorRoleRequestQueryDto
            {
                Search = "ana",
                IsActive = true,
                IsVerified = true
            });

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle();
            result.Items[0].Email.Should().Be("ana@test.com");
            result.Items[0].HasRequestedCreatorRole.Should().BeTrue();
        }

        [Fact]
        public async Task GetCreatorRequestsAsync_KadaSeKoristiPaginacijaISortPoEmailu_VracaTrazeniSegment()
        {
            using var ctx = CreateInMemoryContext(nameof(GetCreatorRequestsAsync_KadaSeKoristiPaginacijaISortPoEmailu_VracaTrazeniSegment));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.AddRange(
                new User
                {
                    Id = 311,
                    FirstName = "Jelena",
                    LastName = "A",
                    Email = "jelena@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    HasRequestedCreatorRole = true,
                    IsActive = true,
                    IsVerified = false,
                    DateOfBirth = new DateTime(1994, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new User
                {
                    Id = 312,
                    FirstName = "Ana",
                    LastName = "B",
                    Email = "ana@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    HasRequestedCreatorRole = true,
                    IsActive = true,
                    IsVerified = true,
                    DateOfBirth = new DateTime(1995, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new User
                {
                    Id = 313,
                    FirstName = "Marko",
                    LastName = "C",
                    Email = "marko@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    HasRequestedCreatorRole = true,
                    IsActive = true,
                    IsVerified = true,
                    DateOfBirth = new DateTime(1996, 1, 1),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-3)
                });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.GetCreatorRequestsAsync(new CreatorRoleRequestQueryDto
            {
                Page = 2,
                PageSize = 1,
                SortBy = "email",
                SortOrder = "asc"
            });

            result.TotalCount.Should().Be(3);
            result.Page.Should().Be(2);
            result.PageSize.Should().Be(1);
            result.TotalPages.Should().Be(3);
            result.Items.Should().ContainSingle();
            result.Items[0].Email.Should().Be("jelena@test.com");
        }
    }
}
