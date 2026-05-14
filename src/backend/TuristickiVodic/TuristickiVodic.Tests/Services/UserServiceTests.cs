using AutoMapper;
using FluentAssertions;
using FluentAssertions.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using System.IO;
using System.Text.RegularExpressions;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using TuristickiVodic.Services.Services;
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

        private static IConfiguration CreateConfiguration(string? publicAppBaseUrl = null, string? adminAppBaseUrl = null)
        {
            return new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = "unit-test-jwt-key",
                    ["PublicApp:BaseUrl"] = publicAppBaseUrl ?? "https://spirego-tourist.test",
                    ["AdminApp:BaseUrl"] = adminAppBaseUrl ?? "https://spirego-admin.test",
                })
                .Build();
        }

        private static UserService CreateUserService(
            AppDbContext ctx,
            Mock<ITokenService> tokenSvc,
            Mock<IEmailService>? emailSvc = null,
            string? publicAppBaseUrl = null,
            string? adminAppBaseUrl = null)
        {
            emailSvc ??= new Mock<IEmailService>();
            return new UserService(
                ctx,
                CreateMapper(),
                tokenSvc.Object,
                emailSvc.Object,
                CreateEnvironmentMock().Object,
                CreateConfiguration(publicAppBaseUrl, adminAppBaseUrl));
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
        public async Task LoginAsync_KadaJeTwoFactorUkljucen_ZaTouristVracaChallengeBezTokena()
        {
            using var ctx = CreateInMemoryContext(nameof(LoginAsync_KadaJeTwoFactorUkljucen_ZaTouristVracaChallengeBezTokena));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 150,
                FirstName = "Ana",
                LastName = "Login",
                Email = "ana.2fa@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                IsTwoFactorEnabled = true,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-2fa", "refresh-2fa");
            var emailSvc = new Mock<IEmailService>();
            var svc = CreateUserService(ctx, tokenSvc, emailSvc);

            var result = await svc.LoginAsync(new LoginDto
            {
                Email = "ana.2fa@test.com",
                Password = "pass123",
                RememberMe = true
            });

            result.Should().NotBeNull();
            result!.RequiresTwoFactor.Should().BeTrue();
            result.Token.Should().BeNull();
            result.RefreshToken.Should().BeNull();
            result.User.Should().BeNull();
            result.TwoFactorChallengeToken.Should().NotBeNullOrWhiteSpace();
            result.TwoFactorDeliveryTarget.Should().EndWith("@test.com");
            result.TwoFactorDeliveryTarget.Should().Contain("*");
            ctx.RefreshTokens.Should().BeEmpty();

            var user = await ctx.Users.SingleAsync(u => u.Id == 150);
            user.TwoFactorChallengeTokenHash.Should().NotBeNullOrWhiteSpace();
            user.TwoFactorCodeHash.Should().NotBeNullOrWhiteSpace();
            user.TwoFactorRememberMe.Should().BeTrue();
            emailSvc.Verify(
                x => x.SendAsync(
                    "ana.2fa@test.com",
                    It.IsAny<string>(),
                    It.Is<string>(body => body.Contains("style=\"font-size: 24px"))),
                Times.Once);
        }

        [Fact]
        public async Task VerifyTwoFactorLoginAsync_SaValidnimKodom_IzdajeTokeneICistiChallenge()
        {
            using var ctx = CreateInMemoryContext(nameof(VerifyTwoFactorLoginAsync_SaValidnimKodom_IzdajeTokeneICistiChallenge));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 151,
                FirstName = "Mina",
                LastName = "Login",
                Email = "mina.2fa@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                IsTwoFactorEnabled = true,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var tokenSvc = CreateTokenServiceMock("jwt-verify", "refresh-verify");
            var emailSvc = new Mock<IEmailService>();
            string? sentBody = null;
            emailSvc.Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string, string>((_, _, body) => sentBody = body)
                .Returns(Task.CompletedTask);

            var svc = CreateUserService(ctx, tokenSvc, emailSvc);

            var challenge = await svc.LoginAsync(new LoginDto
            {
                Email = "mina.2fa@test.com",
                Password = "pass123",
                RememberMe = false
            });

            var code = Regex.Match(sentBody ?? string.Empty, "\\d{6}").Value;
            code.Should().NotBeNullOrWhiteSpace();

            var result = await svc.VerifyTwoFactorLoginAsync(new VerifyTwoFactorLoginDto
            {
                ChallengeToken = challenge!.TwoFactorChallengeToken!,
                Code = code
            });

            result.RequiresTwoFactor.Should().BeFalse();
            result.Token.Should().Be("jwt-verify");
            result.RefreshToken.Should().Be("refresh-verify");
            result.User.Should().NotBeNull();

            var user = await ctx.Users.SingleAsync(u => u.Id == 151);
            user.TwoFactorChallengeTokenHash.Should().BeNull();
            user.TwoFactorCodeHash.Should().BeNull();
            user.TwoFactorRememberMe.Should().BeNull();
            ctx.RefreshTokens.Should().ContainSingle(x => x.UserId == 151);
        }

        [Fact]
        public async Task UpdateTwoFactorSettingsAsync_MenjaStanjeZaKorisnika()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateTwoFactorSettingsAsync_MenjaStanjeZaKorisnika));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 152,
                FirstName = "Sara",
                LastName = "Security",
                Email = "sara@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var svc = CreateUserService(ctx, CreateTokenServiceMock());

            var enabled = await svc.UpdateTwoFactorSettingsAsync(152, new UpdateTwoFactorSettingsDto
            {
                IsEnabled = true
            });

            enabled.Should().NotBeNull();
            enabled!.IsEnabled.Should().BeTrue();

            var disabled = await svc.UpdateTwoFactorSettingsAsync(152, new UpdateTwoFactorSettingsDto
            {
                IsEnabled = false
            });

            disabled.Should().NotBeNull();
            disabled!.IsEnabled.Should().BeFalse();
            (await ctx.Users.SingleAsync(u => u.Id == 152)).IsTwoFactorEnabled.Should().BeFalse();
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
        public async Task RequestCreatorRoleAsync_CuvaPendingStatusIKreiraAdminObavestenje()
        {
            using var ctx = CreateInMemoryContext(nameof(RequestCreatorRoleAsync_CuvaPendingStatusIKreiraAdminObavestenje));
            var (tourist, _, _, admin) = SeedRoles(ctx);

            ctx.Users.AddRange(
                new User
                {
                    Id = 8,
                    FirstName = "Mila",
                    LastName = "Petrovic",
                    Email = "mila@test.com",
                    PasswordHash = "hash",
                    RoleId = tourist.Id,
                    Role = tourist,
                    IsActive = true,
                    IsBlacklisted = false,
                    DateOfBirth = new DateTime(1995, 1, 1)
                },
                new User
                {
                    Id = 9,
                    FirstName = "Admin",
                    LastName = "User",
                    Email = "admin@test.com",
                    PasswordHash = "hash",
                    RoleId = admin.Id,
                    Role = admin,
                    IsActive = true,
                    IsBlacklisted = false,
                    DateOfBirth = new DateTime(1990, 1, 1)
                });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.RequestCreatorRoleAsync(8, "Moderator");

            result.Should().BeTrue();
            var updated = ctx.Users.Find(8)!;
            updated.HasRequestedCreatorRole.Should().BeTrue();
            updated.CreatorRoleRequestStatus.Should().Be(CreatorRoleRequestStatus.Pending);
            ctx.Notifications.Should().ContainSingle(n =>
                n.UserId == 9 &&
                n.Type == NotificationType.AdminNewCreatorRoleRequest);
        }

        [Fact]
        public async Task GetByIdAsync_ContentCreatorVracaApprovedStatusIAdminLoginUrl()
        {
            using var ctx = CreateInMemoryContext(nameof(GetByIdAsync_ContentCreatorVracaApprovedStatusIAdminLoginUrl));
            var (_, cc, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 18,
                FirstName = "Approved",
                LastName = "Creator",
                Email = "approved@test.com",
                PasswordHash = "hash",
                RoleId = cc.Id,
                Role = cc,
                IsActive = true,
                IsBlacklisted = false,
                CreatorRoleRequestStatus = CreatorRoleRequestStatus.None,
                DateOfBirth = new DateTime(1991, 1, 1)
            });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>(), adminAppBaseUrl: "https://spirego-admin.test");

            var result = await svc.GetByIdAsync(18);

            result.Should().NotBeNull();
            result!.CreatorRoleRequestStatus.Should().Be("Approved");
            result.AdminAppLoginUrl.Should().Be("https://spirego-admin.test/login");
        }

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
                CreatorRoleRequestStatus = CreatorRoleRequestStatus.Pending,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var tokenSvc = new Mock<ITokenService>();
            var svc = CreateUserService(ctx, tokenSvc, adminAppBaseUrl: "https://spirego-admin.test");

            var result = await svc.ApproveCreatorRoleAsync(10);

            result.Should().BeTrue();
            var updated = ctx.Users.Include(u => u.Role).First(u => u.Id == 10);
            updated.Role.Name.Should().Be(RoleType.ContentCreator);
            updated.HasRequestedCreatorRole.Should().BeFalse();
            updated.CreatorRoleRequestStatus.Should().Be(CreatorRoleRequestStatus.Approved);
            ctx.Notifications.Should().ContainSingle(n =>
                n.UserId == 10 &&
                n.Type == NotificationType.CreatorRoleRequestApproved &&
                n.ActionUrl == "https://spirego-admin.test/login");
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
        public async Task RejectCreatorRoleAsync_TouristImaZahtev_SkidaPendingFlag()
        {
            using var ctx = CreateInMemoryContext(nameof(RejectCreatorRoleAsync_TouristImaZahtev_SkidaPendingFlag));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 15,
                FirstName = "R",
                LastName = "R",
                Email = "r@r.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                HasRequestedCreatorRole = true,
                CreatorRoleRequestStatus = CreatorRoleRequestStatus.Pending,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await svc.RejectCreatorRoleAsync(15);

            result.Should().BeTrue();
            var updated = ctx.Users.Include(u => u.Role).First(u => u.Id == 15);
            updated.HasRequestedCreatorRole.Should().BeFalse();
            updated.Role.Name.Should().Be(RoleType.Tourist);
            updated.CreatorRoleRequestStatus.Should().Be(CreatorRoleRequestStatus.Rejected);
            ctx.Notifications.Should().ContainSingle(n =>
                n.UserId == 15 &&
                n.Type == NotificationType.CreatorRoleRequestRejected &&
                n.ActionUrl == null);
        }

        [Fact]
        public async Task RejectCreatorRoleAsync_KadaKorisnikNemaZahtev_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(RejectCreatorRoleAsync_KadaKorisnikNemaZahtev_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 16,
                FirstName = "S",
                LastName = "S",
                Email = "s@s.com",
                PasswordHash = "hash",
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                HasRequestedCreatorRole = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            await svc.Invoking(s => s.RejectCreatorRoleAsync(16))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*has not requested creator role*");
        }

        [Fact]
        public async Task RejectCreatorRoleAsync_VecJeCC_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(RejectCreatorRoleAsync_VecJeCC_BacaException));
            var (_, cc, _, _) = SeedRoles(ctx);
            ctx.Users.Add(new User
            {
                Id = 17,
                FirstName = "T",
                LastName = "T",
                Email = "t@t.com",
                PasswordHash = "hash",
                RoleId = cc.Id,
                Role = cc,
                IsActive = true,
                IsBlacklisted = false,
                HasRequestedCreatorRole = false,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            await svc.Invoking(s => s.RejectCreatorRoleAsync(17))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*tourists*");
        }

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
        public async Task DeleteAsync_ManagerKojiUpravljaDestinacijom_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(DeleteAsync_ManagerKojiUpravljaDestinacijom_BacaException));
            var (_, _, manager, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 33,
                FirstName = "Milan",
                LastName = "Manager",
                Email = "milan.manager@test.com",
                PasswordHash = "hash",
                RoleId = manager.Id,
                Role = manager,
                ManagedDestinationId = 7,
                IsActive = true,
                DateOfBirth = new DateTime(1990, 1, 1)
            });
            ctx.SaveChanges();

            var svc = CreateUserService(ctx, new Mock<ITokenService>());

            await svc.Invoking(s => s.DeleteAsync(33))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*cannot be deleted until another manager is assigned*");
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
            result.Items[0].CreatorRoleRequestStatus.Should().Be("Pending");
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

        [Fact]
        public async Task UpdateCurrentLocationAsync_KadaKorisnikPostoji_CuvaLokacijuPreciznostIVreme()
        {
            using var ctx = CreateInMemoryContext(nameof(UpdateCurrentLocationAsync_KadaKorisnikPostoji_CuvaLokacijuPreciznostIVreme));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 149,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.location@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await service.UpdateCurrentLocationAsync(149, new UpdateUserLocationDto
            {
                Longitude = 18.77,
                Latitude = 42.42,
                AccuracyMeters = 32
            });

            result.Should().NotBeNull();
            result!.Longitude.Should().BeApproximately(18.77, 0.001);
            result.Latitude.Should().BeApproximately(42.42, 0.001);
            result.AccuracyMeters.Should().Be(32);

            var user = await ctx.Users.FindAsync(149);
            user.Should().NotBeNull();
            user!.LastKnownLocation.Should().NotBeNull();
            user.LastKnownLocation!.X.Should().BeApproximately(18.77, 0.001);
            user.LastKnownLocation.Y.Should().BeApproximately(42.42, 0.001);
            user.LastLocationAccuracyMeters.Should().Be(32);
            user.LastLocationUpdatedAt.Should().NotBeNull();

            ctx.UserLocationHistories.Should().ContainSingle();
            var historyPoint = await ctx.UserLocationHistories.SingleAsync();
            historyPoint.UserId.Should().Be(149);
            historyPoint.Location.X.Should().BeApproximately(18.77, 0.001);
            historyPoint.Location.Y.Should().BeApproximately(42.42, 0.001);
            historyPoint.AccuracyMeters.Should().Be(32);
        }

        [Fact]
        public async Task GetCurrentLocationAsync_KadaLokacijaPostoji_VracaLokacijuKorisnika()
        {
            using var ctx = CreateInMemoryContext(nameof(GetCurrentLocationAsync_KadaLokacijaPostoji_VracaLokacijuKorisnika));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 148,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.getlocation@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                LastKnownLocation = new NetTopologySuite.Geometries.Point(18.78, 42.43) { SRID = 4326 },
                LastLocationAccuracyMeters = 18,
                LastLocationUpdatedAt = DateTime.UtcNow,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());
            var result = await service.GetCurrentLocationAsync(148);

            result.Should().NotBeNull();
            result!.Longitude.Should().BeApproximately(18.78, 0.001);
            result.Latitude.Should().BeApproximately(42.43, 0.001);
            result.AccuracyMeters.Should().Be(18);
        }

        [Fact]
        public async Task ClearCurrentLocationAsync_KadaLokacijaPostoji_BriseLokaciju()
        {
            using var ctx = CreateInMemoryContext(nameof(ClearCurrentLocationAsync_KadaLokacijaPostoji_BriseLokaciju));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 147,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.clearlocation@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                LastKnownLocation = new NetTopologySuite.Geometries.Point(18.79, 42.44) { SRID = 4326 },
                LastLocationAccuracyMeters = 20,
                LastLocationUpdatedAt = DateTime.UtcNow,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());
            var cleared = await service.ClearCurrentLocationAsync(147);

            cleared.Should().BeTrue();

            var user = await ctx.Users.FindAsync(147);
            user.Should().NotBeNull();
            user!.LastKnownLocation.Should().BeNull();
            user.LastLocationAccuracyMeters.Should().BeNull();
            user.LastLocationUpdatedAt.Should().BeNull();
        }

        [Fact]
        public async Task GetLocationHistoryAsync_KadaPostojeTacke_VracaPaginiranRezultat()
        {
            using var ctx = CreateInMemoryContext(nameof(GetLocationHistoryAsync_KadaPostojeTacke_VracaPaginiranRezultat));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 146,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.history@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.UserLocationHistories.AddRange(
                new UserLocationHistory
                {
                    Id = 1,
                    UserId = 146,
                    Location = new NetTopologySuite.Geometries.Point(18.70, 42.40) { SRID = 4326 },
                    AccuracyMeters = 10,
                    RecordedAt = DateTime.UtcNow.AddMinutes(-3),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new UserLocationHistory
                {
                    Id = 2,
                    UserId = 146,
                    Location = new NetTopologySuite.Geometries.Point(18.71, 42.41) { SRID = 4326 },
                    AccuracyMeters = 12,
                    RecordedAt = DateTime.UtcNow.AddMinutes(-2),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new UserLocationHistory
                {
                    Id = 3,
                    UserId = 146,
                    Location = new NetTopologySuite.Geometries.Point(18.72, 42.42) { SRID = 4326 },
                    AccuracyMeters = 15,
                    RecordedAt = DateTime.UtcNow.AddMinutes(-1),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());
            var result = await service.GetLocationHistoryAsync(146, new UserLocationHistoryQueryDto
            {
                Page = 1,
                PageSize = 2,
                SortOrder = "desc"
            });

            result.TotalCount.Should().Be(3);
            result.Items.Should().HaveCount(2);
            result.Items.Select(x => x.Longitude).Should().Equal(18.72, 18.71);
        }

        [Fact]
        public async Task GetLocationPathAsync_KadaPostojeTacke_VracaPutanjuHronoloski()
        {
            using var ctx = CreateInMemoryContext(nameof(GetLocationPathAsync_KadaPostojeTacke_VracaPutanjuHronoloski));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 145,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.path@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.UserLocationHistories.AddRange(
                new UserLocationHistory
                {
                    Id = 10,
                    UserId = 145,
                    Location = new NetTopologySuite.Geometries.Point(18.70, 42.40) { SRID = 4326 },
                    RecordedAt = DateTime.UtcNow.AddMinutes(-3),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new UserLocationHistory
                {
                    Id = 11,
                    UserId = 145,
                    Location = new NetTopologySuite.Geometries.Point(18.71, 42.41) { SRID = 4326 },
                    RecordedAt = DateTime.UtcNow.AddMinutes(-2),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new UserLocationHistory
                {
                    Id = 12,
                    UserId = 145,
                    Location = new NetTopologySuite.Geometries.Point(18.72, 42.42) { SRID = 4326 },
                    RecordedAt = DateTime.UtcNow.AddMinutes(-1),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());
            var result = await service.GetLocationPathAsync(145, new UserLocationPathQueryDto
            {
                MaxPoints = 10
            });

            result.PointCount.Should().Be(3);
            result.Points.Select(x => x.Longitude).Should().Equal(18.70, 18.71, 18.72);
            result.ApproximateDistanceMeters.Should().BeGreaterThan(0);
            result.StartedAt.Should().NotBeNull();
            result.EndedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task ClearLocationHistoryAsync_KadaPostojiIstorija_BriseSveTacke()
        {
            using var ctx = CreateInMemoryContext(nameof(ClearLocationHistoryAsync_KadaPostojiIstorija_BriseSveTacke));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 144,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.clearhistory@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });

            ctx.UserLocationHistories.AddRange(
                new UserLocationHistory
                {
                    Id = 20,
                    UserId = 144,
                    Location = new NetTopologySuite.Geometries.Point(18.70, 42.40) { SRID = 4326 },
                    RecordedAt = DateTime.UtcNow.AddMinutes(-2),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new UserLocationHistory
                {
                    Id = 21,
                    UserId = 144,
                    Location = new NetTopologySuite.Geometries.Point(18.71, 42.41) { SRID = 4326 },
                    RecordedAt = DateTime.UtcNow.AddMinutes(-1),
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());
            var cleared = await service.ClearLocationHistoryAsync(144);

            cleared.Should().BeTrue();
            ctx.UserLocationHistories.Should().BeEmpty();
        }

        [Fact]
        public async Task ForgotPasswordAsync_KadaKorisnikPostoji_GeneriseKodICuvaExpiryISaljeMail()
        {
            using var ctx = CreateInMemoryContext(nameof(ForgotPasswordAsync_KadaKorisnikPostoji_GeneriseKodICuvaExpiryISaljeMail));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 150,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var emailSvc = new Mock<IEmailService>();
            var service = CreateUserService(ctx, new Mock<ITokenService>(), emailSvc);

            await service.ForgotPasswordAsync(new ForgotPasswordDto
            {
                Email = "ana@test.com"
            });

            var user = await ctx.Users.FindAsync(150);
            user.Should().NotBeNull();
            user!.ResetToken.Should().NotBeNullOrWhiteSpace();
            user.ResetTokenExpiry.Should().NotBeNull();
            user.ResetTokenExpiry.Should().BeAfter(DateTime.UtcNow.AddMinutes(3));

            emailSvc.Verify(s => s.SendAsync(
                "ana@test.com",
                "Kod za reset lozinke",
                It.Is<string>(body => body.Contains("Reset lozinke") && body.Contains("Ana"))), Times.Once);
        }

        [Fact]
        public async Task ForgotPasswordAsync_KadaKorisnikNePostoji_BacaExceptionINeSaljeMail()
        {
            using var ctx = CreateInMemoryContext(nameof(ForgotPasswordAsync_KadaKorisnikNePostoji_BacaExceptionINeSaljeMail));
            SeedRoles(ctx);

            var emailSvc = new Mock<IEmailService>();
            var service = CreateUserService(ctx, new Mock<ITokenService>(), emailSvc);

            await service.Invoking(s => s.ForgotPasswordAsync(new ForgotPasswordDto
            {
                Email = "nepostoji@test.com"
            }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*nije registrovan*");

            emailSvc.Verify(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task VerifyResetCodeAsync_KadaJeKodValidan_VracaResetSessionTokenICuvaNoviHash()
        {
            using var ctx = CreateInMemoryContext(nameof(VerifyResetCodeAsync_KadaJeKodValidan_VracaResetSessionTokenICuvaNoviHash));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var validCode = "123456";
            var hashedCode = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(validCode)));

            ctx.Users.Add(new User
            {
                Id = 151,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.reset@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                ResetToken = hashedCode,
                ResetTokenExpiry = DateTime.UtcNow.AddMinutes(5),
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            var result = await service.VerifyResetCodeAsync(new VerifyResetCodeDto
            {
                Email = "ana.reset@test.com",
                Code = validCode
            });

            result.Should().NotBeNull();
            result.ResetSessionToken.Should().NotBeNullOrWhiteSpace();
            result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);

            var user = await ctx.Users.FindAsync(151);
            user.Should().NotBeNull();
            user!.ResetToken.Should().NotBeNullOrWhiteSpace();
            user.ResetToken.Should().NotBe(hashedCode);
            user.ResetToken.Should().Be(Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(result.ResetSessionToken))));
        }

        [Fact]
        public async Task VerifyResetCodeAsync_KadaJeKodNevalidan_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(VerifyResetCodeAsync_KadaJeKodNevalidan_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 152,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.invalid@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                ResetToken = "pogresan-hash",
                ResetTokenExpiry = DateTime.UtcNow.AddMinutes(5),
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.Invoking(s => s.VerifyResetCodeAsync(new VerifyResetCodeDto
            {
                Email = "ana.invalid@test.com",
                Code = "123456"
            }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Invalid or expired reset code*");
        }

        [Fact]
        public async Task ResetPasswordAsync_KadaJeSessionTokenValidan_MenjaLozinkuICistiResetPolja()
        {
            using var ctx = CreateInMemoryContext(nameof(ResetPasswordAsync_KadaJeSessionTokenValidan_MenjaLozinkuICistiResetPolja));
            var (tourist, _, _, _) = SeedRoles(ctx);

            var validSessionToken = "SESSIONTOKEN123";
            var hashedSessionToken = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(validSessionToken)));

            ctx.Users.Add(new User
            {
                Id = 153,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.finishreset@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                ResetToken = hashedSessionToken,
                ResetTokenExpiry = DateTime.UtcNow.AddMinutes(5),
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.ResetPasswordAsync(new ResetPasswordDto
            {
                ResetSessionToken = validSessionToken,
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            });

            var user = await ctx.Users.FindAsync(153);
            user.Should().NotBeNull();
            BCrypt.Net.BCrypt.Verify("nova1234", user!.PasswordHash).Should().BeTrue();
            user.ResetToken.Should().BeNull();
            user.ResetTokenExpiry.Should().BeNull();
        }

        [Fact]
        public async Task ResetPasswordAsync_KadaJeSessionTokenNevalidan_BacaException()
        {
            using var ctx = CreateInMemoryContext(nameof(ResetPasswordAsync_KadaJeSessionTokenNevalidan_BacaException));
            var (tourist, _, _, _) = SeedRoles(ctx);

            ctx.Users.Add(new User
            {
                Id = 154,
                FirstName = "Ana",
                LastName = "Anic",
                Email = "ana.invalidsession@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("stara123"),
                RoleId = tourist.Id,
                Role = tourist,
                IsActive = true,
                IsBlacklisted = false,
                ResetToken = "pogresan-hash",
                ResetTokenExpiry = DateTime.UtcNow.AddMinutes(5),
                DateOfBirth = new DateTime(1995, 1, 1)
            });
            await ctx.SaveChangesAsync();

            var service = CreateUserService(ctx, new Mock<ITokenService>());

            await service.Invoking(s => s.ResetPasswordAsync(new ResetPasswordDto
            {
                ResetSessionToken = "SESSIONTOKEN123",
                NewPassword = "nova1234",
                ConfirmPassword = "nova1234"
            }))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Invalid or expired reset session*");
        }
    }
}
