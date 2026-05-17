using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using FoodDelivery.API.Core.DTOs.Auth;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService    _authService;
    private readonly AppDbContext    _db;
    private readonly IEmailService   _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService            authService,
        AppDbContext             db,
        IEmailService            emailService,
        ILogger<AuthController>  logger)
    {
        _authService  = authService;
        _db           = db;
        _emailService = emailService;
        _logger       = logger;
    }

    /// <summary>POST /api/auth/register</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _authService.RegisterAsync(dto);
        return Ok(result);
    }

    /// <summary>POST /api/auth/login</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    // ── Forgot Password ───────────────────────────────────────────────────────

    /// <summary>POST /api/auth/forgot-password — send OTP to email</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Always return the same message to prevent email enumeration
        const string safeMsg = "If that email is registered, a 6-digit OTP has been sent.";

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());
        if (user == null) return Ok(new { message = safeMsg });

        // Remove all previous OTPs for this user
        var old = _db.PasswordResetOtps.Where(o => o.UserId == user.Id);
        _db.PasswordResetOtps.RemoveRange(old);

        // Generate 6-digit OTP
        var otp    = Random.Shared.Next(100_000, 1_000_000).ToString();
        var record = new PasswordResetOtp
        {
            UserId    = user.Id,
            OtpHash   = HashOtp(otp),
            ExpiresAt = DateTime.UtcNow.AddMinutes(2),
        };
        _db.PasswordResetOtps.Add(record);
        await _db.SaveChangesAsync();

        try
        {
            await _emailService.SendOtpEmailAsync(user.Email, user.FullName, otp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP email to {Email}", user.Email);
            // Don't expose SMTP errors to the client
        }

        return Ok(new { message = safeMsg });
    }

    /// <summary>POST /api/auth/verify-otp — validate OTP, return reset token</summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());
        if (user == null)
            return BadRequest(new { message = "Invalid OTP." });

        var record = await _db.PasswordResetOtps
            .Where(o => o.UserId == user.Id && !o.IsUsed && !o.IsVerified)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (record == null)
            return BadRequest(new { message = "No active OTP found. Please request a new one." });

        if (record.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "OTP has expired. Please request a new one." });

        if (record.Attempts >= 3)
            return BadRequest(new { message = "Maximum attempts exceeded. Please request a new OTP." });

        record.Attempts++;

        if (record.OtpHash != HashOtp(dto.Otp))
        {
            await _db.SaveChangesAsync();
            var remaining = 3 - record.Attempts;
            return BadRequest(new
            {
                message = $"Incorrect OTP. {remaining} attempt{(remaining == 1 ? "" : "s")} remaining."
            });
        }

        // OTP is correct — issue a short-lived reset token
        record.IsVerified          = true;
        record.ResetToken          = Guid.NewGuid().ToString();
        record.ResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _db.SaveChangesAsync();

        return Ok(new { resetToken = record.ResetToken });
    }

    /// <summary>POST /api/auth/reset-password — set new password using reset token</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var record = await _db.PasswordResetOtps
            .Include(o => o.User)
            .FirstOrDefaultAsync(o =>
                o.ResetToken == dto.ResetToken &&
                o.IsVerified &&
                !o.IsUsed);

        if (record == null)
            return BadRequest(new { message = "Invalid or expired reset session. Please start over." });

        if (record.ResetTokenExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Reset session has expired. Please start over." });

        record.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        record.IsUsed            = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully. You can now log in." });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string HashOtp(string otp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(otp)));
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class ForgotPasswordDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class VerifyOtpDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(6, MinimumLength = 6)]
    public string Otp { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    public string ResetToken { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    public string ConfirmPassword { get; set; } = string.Empty;
}
