using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Xunit;
using TuristickiVodic.API.Controllers;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services;
using TuristickiVodic.Tests.Helpers;

namespace TuristickiVodic.Tests.Controllers
{
    /// <summary>
    /// Unit testovi za UsersController pokrivaju sva poslovna pravila:
    /// - Registracija kreira nalog sa ulogom Tourist
    /// - Korisnik može da vidi/menja samo sebe; Admin može svakoga
    /// - Samo Admin vidi listu svih korisnika i pretražuje po emailu
    /// - Samo Admin aktivira/deaktivira i briše korisnike
    /// - Admin ne može da obriše sam sebe
    /// - Samo Tourist može da pošalje zahtev za CC ulogu, i to samo za sebe
    /// - Samo Admin može da odobri CC ulogu
    /// </summary>
    public class UsersControllerTests
    {
        private static UsersController CreateController(Mock<IUserService> mockService, ClaimsPrincipal user)
        {
            var controller = new UsersController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        // ═══════════════════════════════════════════
        //  GET /api/users  — Samo Admin može da vidi sve korisnike
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetAll_KadaAdminPozove_VracaOkSaRezultatom()
        {
            var mockService = new Mock<IUserService>();
            var rezultat = new PagedResultDto<UserDto>
            {
                TotalCount = 2
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<UserQueryDto>()))
                .ReturnsAsync(rezultat);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(99, "Admin"));

            var result = await controller.GetAll(new UserQueryDto());

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeSameAs(rezultat);
        }

        [Fact]
        public async Task GetAll_KadaServisVracaPrazanRezultat_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var rezultat = new PagedResultDto<UserDto>
            {
                TotalCount = 0
            };

            mockService
                .Setup(s => s.GetAllAsync(It.IsAny<UserQueryDto>()))
                .ReturnsAsync(rezultat);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(99, "Admin"));

            var result = await controller.GetAll(new UserQueryDto());

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeSameAs(rezultat);
        }

        // ═══════════════════════════════════════════
        //  GET /api/users/{id}
        //  Korisnik vidi samo sebe; Admin može svakoga
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetById_KadaKorisnikTražiSamogSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 5, FirstName = "Petar", Email = "petar@test.com" };
            mockService.Setup(s => s.GetByIdAsync(5)).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.GetById(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetById_KadaAdminTražiDrugogKorisnika_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByIdAsync(10))
                .ReturnsAsync(new UserDto { Id = 10, FirstName = "Jovana" });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.GetById(10);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetById_KadaObičanKorisnikTražiDrugogKorisnika_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(3, "Tourist"));

            var result = await controller.GetById(999);

            result.Should().BeOfType<ForbidResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/register-manager
        //  Samo Admin može da registruje menadžera
        // ═══════════════════════════════════════════

        [Fact]
        public async Task RegisterManager_KadaAdminKreira_VracaCreatedSaUlogomManager()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 30, FirstName = "Nikola", Email = "nikola@test.com", RoleName = "Manager" };
            mockService.Setup(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>())).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.RegisterManager(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "nikola@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1990, 3, 15)
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            ((UserDto)created.Value!).RoleName.Should().Be("Manager");
        }

        [Fact]
        public async Task RegisterManager_KadaEmailVecPostoji_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>()))
                .ThrowsAsync(new InvalidOperationException("Email already exists"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.RegisterManager(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "nikola@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1990, 3, 15)
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/register-admin
        //  Samo Admin može da registruje drugog admina
        // ═══════════════════════════════════════════

        [Fact]
        public async Task RegisterAdmin_KadaAdminKreira_VracaCreatedSaUlogomAdmin()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 31, FirstName = "Jelena", Email = "jelena@test.com", RoleName = "Admin" };
            mockService.Setup(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>())).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.RegisterAdmin(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "jelena@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1985, 7, 20)
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            ((UserDto)created.Value!).RoleName.Should().Be("Admin");
        }

        [Fact]
        public async Task RegisterAdmin_KadaEmailVecPostoji_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>()))
                .ThrowsAsync(new InvalidOperationException("Email already exists"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.RegisterAdmin(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "jelena@test.com",
                Password = "lozinka123",
                DateOfBirth = new DateTime(1985, 7, 20)
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetById_KadaManagerTražiDrugogKorisnika_VracaForbid()
        {
            // Manager nije Admin — ne sme da vidi tuđi profil
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(3, "Manager"));

            var result = await controller.GetById(999);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task GetById_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByIdAsync(99)).ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.GetById(99);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  GET /api/users/email/{email}
        //  Samo Admin može da pretražuje po emailu
        // ═══════════════════════════════════════════

        [Fact]
        public async Task GetByEmail_KadaEmailPostoji_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto { Id = 7, Email = "test@example.com" };
            mockService.Setup(s => s.GetByEmailAsync("test@example.com")).ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.GetByEmail("test@example.com");

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task GetByEmail_KadaEmailNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByEmailAsync("x@x.com")).ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.GetByEmail("x@x.com");

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/register
        //  Registracija je anonimna i kreira Tourist nalog
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Register_SaIspravnimPodacima_VracaCreated()
        {
            var mockService = new Mock<IUserService>();
            // Registracija uvek vraća Tourist ulogu
            var noviKorisnik = new UserDto { Id = 20, FirstName = "Stefan", Email = "stefan@test.com", RoleName = "Tourist" };
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateUserDto>())).ReturnsAsync(noviKorisnik);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Register(new CreateUserDto
            {
                FirstName = "Stefan", LastName = "Nikolić",
                Email = "stefan@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 5, 10)
            });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);
            // Provera da je uloga Tourist
            created.Value.Should().BeEquivalentTo(noviKorisnik);
            ((UserDto)created.Value!).RoleName.Should().Be("Tourist");
        }

        [Fact]
        public async Task Register_KadaEmailVecPostoji_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateUserDto>()))
                .ThrowsAsync(new InvalidOperationException("Email already exists"));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Register(new CreateUserDto
            {
                FirstName = "Stefan", LastName = "Nk",
                Email = "stefan@test.com", Password = "lozinka123",
                DateOfBirth = new DateTime(1995, 5, 10)
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/login
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Login_SaIspravnimKredencijalima_VracaOkSaTokenom()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>()))
                .ReturnsAsync(new AuthResponseDto { Token = "jwt-token", RefreshToken = "refresh" });

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pass" });

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Login_SaPogrešnimKredencijalima_VracaUnauthorized()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>()))
                .ReturnsAsync((AuthResponseDto?)null);

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pogresna" });

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task Login_KadaJeKorisnikBlacklisted_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>()))
                .ThrowsAsync(new InvalidOperationException("User is blacklisted"));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pass" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Login_KadaJeNalogDeaktiviran_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LoginAsync(It.IsAny<LoginDto>()))
                .ThrowsAsync(new InvalidOperationException("Account is deactivated"));

            var controller = CreateController(mockService, new ClaimsPrincipal(new ClaimsIdentity()));

            var result = await controller.Login(new LoginDto { Email = "a@b.com", Password = "pass" });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/logout
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Logout_KadaJeUspešan_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LogoutAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Logout();

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Logout_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.LogoutAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Logout();

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  PUT /api/users/{id}
        //  Korisnik menja samo sebe; Admin može svakoga
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Update_KadaKorisnikMenjaSamogSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var updatedDto = new UserDto { Id = 5, FirstName = "NovoIme", Email = "a@a.com" };
            mockService.Setup(s => s.UpdateAsync(5, It.IsAny<UpdateUserDto>())).ReturnsAsync(updatedDto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.Update(5, new UpdateUserDto { FirstName = "NovoIme" });

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(updatedDto);
        }

        [Fact]
        public async Task Update_KadaAdminMenjaDrugogKorisnika_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.UpdateAsync(10, It.IsAny<UpdateUserDto>()))
                .ReturnsAsync(new UserDto { Id = 10 });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Update(10, new UpdateUserDto());

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task Update_KadaObičanKorisnikMenjaDrugog_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(3, "Tourist"));

            var result = await controller.Update(99, new UpdateUserDto());

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task Update_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.UpdateAsync(100, It.IsAny<UpdateUserDto>())).ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Update(100, new UpdateUserDto());

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/change-password
        //  Korisnik menja lozinku samo sebi; Admin može svakome
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ChangePassword_KadaKorisnikMenjaSvojiLozinku_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ChangePasswordAsync(5, It.IsAny<ChangePasswordDto>(), 5, "Tourist"))
                .Returns(Task.CompletedTask);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.ChangePassword(5, new ChangePasswordDto
            {
                CurrentPassword = "stara", NewPassword = "nova123", ConfirmPassword = "nova123"
            });

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ChangePassword_KadaKorisnikMenjaTuđuLozinku_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(3, "Tourist"));

            var result = await controller.ChangePassword(99, new ChangePasswordDto
            {
                CurrentPassword = "stara", NewPassword = "nova123", ConfirmPassword = "nova123"
            });

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task ChangePassword_KadaAdminMenjaTuđuLozinku_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ChangePasswordAsync(10, It.IsAny<ChangePasswordDto>(), 1, "Admin"))
                .Returns(Task.CompletedTask);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ChangePassword(10, new ChangePasswordDto
            {
                CurrentPassword = "", NewPassword = "nova123", ConfirmPassword = "nova123"
            });

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ChangePassword_KadaJeTrenutnaLozinkaPogresna_VracaBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ChangePasswordAsync(5, It.IsAny<ChangePasswordDto>(), 5, "Tourist"))
                .ThrowsAsync(new InvalidOperationException("Current password is incorrect"));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.ChangePassword(5, new ChangePasswordDto
            {
                CurrentPassword = "pogresna", NewPassword = "nova123", ConfirmPassword = "nova123"
            });

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/toggle-active
        //  Samo Admin može da aktivira/deaktivira korisnike
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ToggleActive_KadaAdminAktivivaKorisnika_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ToggleUserActiveAsync(5, true)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ToggleActive(5, true);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ToggleActive_KadaAdminDeaktivivaKorisnika_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ToggleUserActiveAsync(5, false)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ToggleActive(5, false);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ToggleActive_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ToggleUserActiveAsync(999, true)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ToggleActive(999, true);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  DELETE /api/users/{id}
        //  Samo Admin briše korisnike, ali NE može sam sebe
        // ═══════════════════════════════════════════

        [Fact]
        public async Task Delete_KadaAdminBriseDrugogKorisnika_VracaNoContent()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteAsync(7)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Delete(7);

            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task Delete_KadaAdminPokušaBrisanjeSamogSebe_VracaBadRequest()
        {
            // Poslovno pravilo: Admin ne može da obriše sam sebe
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Delete(1);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Delete_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteAsync(500)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.Delete(500);

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/request-creator
        //  Samo Tourist može, i to samo za sebe
        // ═══════════════════════════════════════════

        [Fact]
        public async Task RequestCreatorRole_KadaTouristPošaljeZahtevZaSebe_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.RequestCreatorRoleAsync(5, "Blogger")).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RequestCreatorRole(5, "Blogger");

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task RequestCreatorRole_KadaTouristPošaljeZahtevZaDrugog_VracaForbid()
        {
            // Poslovno pravilo: Tourist može samo za sebe
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RequestCreatorRole(99, "Blogger");

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task RequestCreatorRole_KadaKorisnikJeBlacklisted_VracaBadRequest()
        {
            // Poslovno pravilo: blacklistovani ne može ponovo postati CC
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.RequestCreatorRoleAsync(5, "Blogger"))
                .ThrowsAsync(new InvalidOperationException("Blacklisted users cannot request creator role."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RequestCreatorRole(5, "Blogger");

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task RequestCreatorRole_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.RequestCreatorRoleAsync(5, "Blogger")).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RequestCreatorRole(5, "Blogger");

            result.Should().BeOfType<NotFoundResult>();
        }

        // ═══════════════════════════════════════════
        //  POST /api/users/{id}/approve-creator
        //  Samo Admin može da odobri CC ulogu
        //  Korisnik mora prethodno poslati zahtev
        // ═══════════════════════════════════════════

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikJeTražioUlogu_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(8)).ReturnsAsync(true);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ApproveCreatorRole(8);

            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikNijeTražioUlogu_VracaBadRequest()
        {
            // Poslovno pravilo: ne može se odobriti onaj ko nije tražio
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(8))
                .ThrowsAsync(new InvalidOperationException("User has not requested creator role."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ApproveCreatorRole(8);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikJeBlacklisted_VracaBadRequest()
        {
            // Poslovno pravilo: blacklistovani ne može postati CC
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(8))
                .ThrowsAsync(new InvalidOperationException("Blacklisted users cannot be approved for content creator role."));

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ApproveCreatorRole(8);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task RegisterAdmin_ProsledjujeIspravanDtoServisu()
        {
            var mockService = new Mock<IUserService>();
            CreateUserDto? prosledjeniDto = null;

            mockService.Setup(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>()))
                .Callback<CreateUserDto>(dto => prosledjeniDto = dto)
                .ReturnsAsync(new UserDto { Id = 31, Email = "admin@test.com", RoleName = "Admin" });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            await controller.RegisterAdmin(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "admin@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1985, 1, 1)
            });

            prosledjeniDto.Should().NotBeNull();
            prosledjeniDto!.Email.Should().Be("admin@test.com");
            prosledjeniDto.FirstName.Should().Be("Jelena");
        }

        [Fact]
        public async Task RegisterManager_ProsledjujeIspravanDtoServisu()
        {
            var mockService = new Mock<IUserService>();
            CreateUserDto? prosledjeniDto = null;

            mockService.Setup(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>()))
                .Callback<CreateUserDto>(dto => prosledjeniDto = dto)
                .ReturnsAsync(new UserDto { Id = 30, Email = "manager@test.com", RoleName = "Manager" });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            await controller.RegisterManager(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "manager@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1990, 1, 1)
            });

            prosledjeniDto.Should().NotBeNull();
            prosledjeniDto!.Email.Should().Be("manager@test.com");
            prosledjeniDto.FirstName.Should().Be("Nikola");
        }

        [Fact]
        public async Task RegisterAdmin_PozivaCreateAdminAsync()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>()))
                .ReturnsAsync(new UserDto { Id = 31, Email = "admin@test.com", RoleName = "Admin" });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            await controller.RegisterAdmin(new CreateUserDto
            {
                FirstName = "Jelena",
                LastName = "Marić",
                Email = "admin@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1985, 1, 1)
            });

            mockService.Verify(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>()), Times.Once);
            mockService.Verify(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>()), Times.Never);
            mockService.Verify(s => s.CreateAsync(It.IsAny<CreateUserDto>()), Times.Never);
        }

        [Fact]
        public async Task RegisterManager_PozivaCreateManagerAsync()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>()))
                .ReturnsAsync(new UserDto { Id = 30, Email = "manager@test.com", RoleName = "Manager" });

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            await controller.RegisterManager(new CreateUserDto
            {
                FirstName = "Nikola",
                LastName = "Jović",
                Email = "manager@test.com",
                Password = "pass123",
                DateOfBirth = new DateTime(1990, 1, 1)
            });

            mockService.Verify(s => s.CreateManagerAsync(It.IsAny<CreateUserDto>()), Times.Once);
            mockService.Verify(s => s.CreateAdminAsync(It.IsAny<CreateUserDto>()), Times.Never);
            mockService.Verify(s => s.CreateAsync(It.IsAny<CreateUserDto>()), Times.Never);
        }

        [Fact]
        public async Task ApproveCreatorRole_KadaKorisnikNijePronadjen_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ApproveCreatorRoleAsync(999)).ReturnsAsync(false);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(1, "Admin"));

            var result = await controller.ApproveCreatorRole(999);

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task RemoveProfileImage_KadaKorisnikBriseSvojuSliku_VracaOk()
        {
            var mockService = new Mock<IUserService>();
            var dto = new UserDto
            {
                Id = 5,
                Email = "user@test.com",
                ProfileImageUrl = "/images/profiles/default_icon.png"
            };

            mockService
                .Setup(s => s.RemoveProfileImageAsync(5))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RemoveProfileImage(5);

            result.Should().BeOfType<OkObjectResult>()
                .Which.Value.Should().BeEquivalentTo(dto);
        }

        [Fact]
        public async Task RemoveProfileImage_KadaKorisnikBriseTudjuSliku_VracaForbid()
        {
            var mockService = new Mock<IUserService>();
            var controller = CreateController(mockService, FakeUserHelper.CreateUser(3, "Tourist"));

            var result = await controller.RemoveProfileImage(5);

            result.Should().BeOfType<ForbidResult>();
        }

        [Fact]
        public async Task RemoveProfileImage_KadaKorisnikNePostoji_VracaNotFound()
        {
            var mockService = new Mock<IUserService>();

            mockService
                .Setup(s => s.RemoveProfileImageAsync(5))
                .ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService, FakeUserHelper.CreateUser(5, "Tourist"));

            var result = await controller.RemoveProfileImage(5);

            result.Should().BeOfType<NotFoundResult>();
        }
    }
}
