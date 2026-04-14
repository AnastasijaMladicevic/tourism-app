using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/manager-reports")]
    [Authorize]
    public class ManagerReportsController : ControllerBase
    {
        private readonly IManagerReportService _managerReportService;

        public ManagerReportsController(IManagerReportService managerReportService)
        {
            _managerReportService = managerReportService;
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Create([FromBody] CreateManagerReportDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var created = await _managerReportService.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("my")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> GetMyReports([FromQuery] ManagerReportQueryDto query)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var reports = await _managerReportService.GetForManagerAsync(userId, query);
            return Ok(reports);
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] ManagerReportQueryDto query)
        {
            var reports = await _managerReportService.GetAllAsync(query);
            return Ok(reports);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var roleName = User.FindFirstValue(ClaimTypes.Role)!;
                var report = await _managerReportService.GetByIdAsync(id, userId, roleName);
                if (report == null) return NotFound();
                return Ok(report);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost("{id}/review")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Review(int id, [FromBody] ReviewManagerReportDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var report = await _managerReportService.ReviewAsync(id, dto, userId);
                if (report == null) return NotFound();
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Withdraw(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var deleted = await _managerReportService.WithdrawAsync(id, userId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
