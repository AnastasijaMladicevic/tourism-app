using FluentAssertions;
using Xunit;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Tests.Helpers;

namespace TuristickiVodic.Tests.Controllers
{
    /// <summary>
    /// Unit testovi za UsersController.
    /// Svaki test koristi Moq da "lažira" IUserService — baza podataka se NE koristi.
    /// </summary>
    public class UsersControllerTests
    {
        // ─────────────────────────────────────────
        //  Pomoćne metode
        // ─────────────────────────────────────────

        /// <summary>
        /// Kreira controller sa lažnim (mock) user servisom i postavi
        /// HttpContext sa prosleđenim korisnikom.
        /// </summary>
        private static UsersController CreateController(
            Mock<IUserService> mockService,
            ClaimsPrincipal user)
        {
            var controller = new UsersController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        // ═══════════════════════════════════════════
        //  GET /api/users  (samo Admin)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetAll_KadaAdminPozove_VracaOkSaListomKorisnika()
        {
            // Arrange – pripremamo lažni servis koji vraća listu korisnika
            var mockService = new Mock<IUserService>();
            mockService
                .Setup(s => s.GetAllAsync())
                .ReturnsAsync(new List<UserDto>
                {
                    new UserDto { Id = 1, FirstName = "Marko", Email = "marko@test.com", RoleName = "Tourist" },
                    new UserDto { Id = 2, FirstName = "Ana",   Email = "ana@test.com",   RoleName = "Admin" }
                });

            var adminUser = FakeUserHelper.CreateUser(userId: 99, role: "Admin");
            var controller = CreateController(mockService, adminUser);

            // Act – pozivamo endpoint
            var result = await controller.GetAll();

            // Assert – proveravamo odgovor
            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            var users = ok.Value.Should().BeAssignableTo<IEnumerable<UserDto>>().Subject;
            users.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAll_KadaServisVracaPrazanSeznam_VracaOkSaPrazномListom()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<UserDto>());

            var adminUser = FakeUserHelper.CreateUser(userId: 99, role: "Admin");
            var controller = CreateController(mockService, adminUser);

            var result = await controller.GetAll();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            var users = ok.Value.Should().BeAssignableTo<IEnumerable<UserDto>>().Subject;
            users.Should().BeEmpty();
        }

        // ═══════════════════════════════════════════
        //  GET /api/users/{id}
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetById_KadaKorisnikTražiSamogSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 5, FirstName = "Petar", Email = "petar@test.com" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var user = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.GetById(5);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaAdminTražiDrugogKorisnika_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 10, FirstName = "Jovana", Email = "jovana@test.com" };
            mockService.Setup(s => s.GetByIdAsync(10)).ReturnsAsync(dto);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.GetById(10);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetById_KadaObičanKorisnikTražiDrugogKorisnika_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var user = FakeUserHelper.CreateUser(userId: 3, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.GetById(999);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task GetById_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByIdAsync(99)).ReturnsAsync((UserDto?)null);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.GetById(99);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  GET /api/users/email/{email}  (samo Admin)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetByEmail_KadaEmailPostoji_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 7, Email = "test@example.com" };
            mockService.Setup(s => s.GetByEmailAsync("test@example.com")).ReturnsAsync(dto);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.GetByEmail("test@example.com");

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetByEmail_KadaEmailNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByEmailAsync("nepostoji@x.com")).ReturnsAsync((UserDto?)null);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.GetByEmail("nepostoji@x.com");

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/register
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Register_SaIspravnimPodacima_VracaCreated()
        {
            var mockService = new Mock<IUserService>();
            var noviKorisnik = new UserDto { Id = 20, FirstName = "Stefan", Email = "stefan@test.com" };
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateUserDto>())).ReturnsAsync(noviKorisnik);

            // Register je [AllowAnonymous] — šaljemo anonimnog korisnika
            var anonUser = new ClaimsPrincipal(new ClaimsIdentity());
            var controller = CreateController(mockService, anonUser);

            var dto = new CreateUserDto
            {
                FirstName = "Stefan",
                LastName = "Nikolić",
                Email = "stefan@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 5, 10)
            };

            var result = await controller.Register(dto);

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            created.Value.Should().BeEquivalentTo(noviKorisnik);
        }

        [Fact]
        public async Task Register_KadaEmailVecPostoji_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService
                .Setup(s => s.CreateAsync(It.IsAny<CreateUserDto>()))
                .ThrowsAsync(new InvalidOperationException("Email already in use."));

            var anonUser = new ClaimsPrincipal(new ClaimsIdentity());
            var controller = CreateController(mockService, anonUser);

            var dto = new CreateUserDto
            {
                FirstName = "Stefan", LastName = "Nk",
                Email = "stefan@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 5, 10)
            };

            var result = await controller.Register(dto);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/login
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Login_SaIspravnimKredencijalima_VracaOkSaTokenom()
        {
            var mockService = new Mock<IUserService>();
            var authResponse = new AuthResponseDto { Token = "jwt-token-ovde", RefreshToken = "refresh-token" };
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>())).ReturnsAsync(authResponse);

            var anonUser = new ClaimsPrincipal(new ClaimsIdentity());
            var controller = CreateController(mockService, anonUser);

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pass" });

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(authResponse);
        }

        [Fact]
        public async Task Login_SaPogrešnimKredencijalima_VracaUnauthorized()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>())).ReturnsAsync((AuthResponseDto?)null);

            var anonUser = new ClaimsPrincipal(new ClaimsIdentity());
            var controller = CreateController(mockService, anonUser);

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pogrešna" });

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/logout
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Logout_KadaJeUspešan_VracaOkSaPorukom()
        {
            var mockService = new Mock<IUserService>();
            mockService
                .Setup(s => s.LogoutAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(true);

            var user = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.Logout();

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Logout_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService
                .Setup(s => s.LogoutAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(false);

            var user = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.Logout();

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  PUT /api/users/{id}
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Update_KadaKorisnikMenjaSamogSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var updatedDto = new UserDto { Id = 5, FirstName = "NovoIme", Email = "a@a.com" };
            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateUserDto>())).ReturnsAsync(updatedDto);

            var user = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.Update(5, new UpdateUserDto { FirstName = "NovoIme" });

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeEquivalentTo(updatedDto);
        }

        [Fact]
        public async Task Update_KadaObičanKorisnikMenjaDrugog_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var user = FakeUserHelper.CreateUser(userId: 3, role: "Tourist");
            var controller = CreateController(mockService, user);

            var result = await controller.Update(99, new UpdateUserDto());

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.UpdateAsync(100, It.IsAny<UpdateUserDto>())).ReturnsAsync((UserDto?)null);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Update(100, new UpdateUserDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/toggle-active  (samo Admin)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ToggleActive_KadaKorisnikPostoji_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ToggleUserActiveAsync(5, true)).ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.ToggleActive(5, true);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ToggleActive_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ToggleUserActiveAsync(999, false)).ReturnsAsync(false);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.ToggleActive(999, false);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  DELETE /api/users/{id}  (samo Admin)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Delete_KadaAdminBriseDrugogKorisnika_VracaNoContent()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteAsync(7)).ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(7);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaAdminPokušaBrisanjeSamogSebe_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(1); // isti ID kao admin

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteAsync(500)).ReturnsAsync(false);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.Delete(500);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/request-creator  (samo Tourist)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task RequestCreatorRole_KadaTouristPošaljeZahtevZaSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.RequestCreatorRoleAsync(5, "Blogger")).ReturnsAsync(true);

            var tourist = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, tourist);

            var result = await controller.RequestCreatorRole(5, "Blogger");

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task RequestCreatorRole_KadaTouristPošaljeZahtevZaDrugog_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var tourist = FakeUserHelper.CreateUser(userId: 5, role: "Tourist");
            var controller = CreateController(mockService, tourist);

            var result = await controller.RequestCreatorRole(99, "Blogger");

            result.Should().BeOfType<ForbidResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/approve-creator  (samo Admin)
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikPostoji_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(8)).ReturnsAsync(true);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.ApproveCreatorRole(8);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(999)).ReturnsAsync(false);

            var admin = FakeUserHelper.CreateUser(userId: 1, role: "Admin");
            var controller = CreateController(mockService, admin);

            var result = await controller.ApproveCreatorRole(999);

            result.Should().BeOfType<NotFoundResult>();
        }
    }
}
