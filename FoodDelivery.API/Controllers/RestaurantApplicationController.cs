using BCrypt.Net;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Route("api/restaurant-applications")]
[ApiController]
public class RestaurantApplicationController : ControllerBase
{
    private readonly AppDbContext       _db;
    private readonly IEmailService      _email;
    private readonly IConfiguration     _config;
    private readonly IWebHostEnvironment _env;

    public RestaurantApplicationController(
        AppDbContext db, IEmailService email,
        IConfiguration config, IWebHostEnvironment env)
    {
        _db     = db;
        _email  = email;
        _config = config;
        _env    = env;
    }

    /// <summary>POST /api/restaurant-applications — public, no auth</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Submit([FromForm] RestaurantApplicationRequest dto)
    {
        var email = dto.Email.Trim().ToLower();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with this email already exists." });

        if (await _db.RestaurantApplications.AnyAsync(a => a.Email == email && a.Status == "Pending"))
            return Conflict(new { message = "A pending application with this email already exists." });

        string? restaurantImageUrl = null;
        if (dto.RestaurantImage != null)
        {
            var result = await SaveFileAsync(dto.RestaurantImage, "restaurants", Guid.NewGuid().ToString(), allowPdf: false);
            if (result.StartsWith("ERR:")) return BadRequest(new { message = result[4..] });
            restaurantImageUrl = result;
        }
        else if (!string.IsNullOrWhiteSpace(dto.RestaurantImageUrl))
        {
            restaurantImageUrl = dto.RestaurantImageUrl.Trim();
        }

        string? businessLicenseUrl = null;
        if (dto.BusinessLicense != null)
        {
            var result = await SaveFileAsync(dto.BusinessLicense, "licenses", Guid.NewGuid().ToString(), allowPdf: true);
            if (result.StartsWith("ERR:")) return BadRequest(new { message = result[4..] });
            businessLicenseUrl = result;
        }

        var app = new RestaurantApplication
        {
            RestaurantName      = dto.RestaurantName.Trim(),
            OwnerName           = dto.OwnerName.Trim(),
            Email               = email,
            PasswordHash        = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber         = dto.PhoneNumber.Trim(),
            Cnic                = dto.Cnic.Trim(),
            Location            = dto.Location.Trim(),
            Description         = dto.Description?.Trim() ?? string.Empty,
            RestaurantImageUrl  = restaurantImageUrl,
            BusinessLicenseUrl  = businessLicenseUrl,
        };

        _db.RestaurantApplications.Add(app);
        await _db.SaveChangesAsync();

        var adminEmail = _config["EmailSettings:AdminEmail"] ?? string.Empty;
        if (!string.IsNullOrEmpty(adminEmail))
            _ = _email.SendRestaurantApplicationToAdminAsync(
                adminEmail,
                app.RestaurantName, app.OwnerName, app.Email,
                app.PhoneNumber, app.Location, app.Description);

        return Ok(new { message = "Application submitted. You will receive an email once reviewed." });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> SaveFileAsync(IFormFile file, string folder, string baseName, bool allowPdf)
    {
        if (file.Length == 0)          return "ERR:No file provided.";
        if (file.Length > 5 * 1024 * 1024) return "ERR:File size must not exceed 5 MB.";

        var allowed = allowPdf
            ? new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" }
            : new[] { "image/jpeg", "image/png", "image/webp" };

        if (!allowed.Contains(file.ContentType.ToLower()))
            return allowPdf
                ? "ERR:Only JPEG, PNG, WebP, or PDF files are allowed."
                : "ERR:Only JPEG, PNG, or WebP images are allowed.";

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrEmpty(ext))
            ext = file.ContentType switch
            {
                "application/pdf" => ".pdf",
                "image/png"       => ".png",
                "image/webp"      => ".webp",
                _                 => ".jpg",
            };

        var dir  = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(dir);

        var path = Path.Combine(dir, $"{baseName}{ext}");
        using var stream = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{baseName}{ext}";
    }
}

public class RestaurantApplicationRequest
{
    public string      RestaurantName    { get; set; } = string.Empty;
    public IFormFile?  RestaurantImage   { get; set; }
    public string?     RestaurantImageUrl { get; set; }
    public string      OwnerName        { get; set; } = string.Empty;
    public string      Email            { get; set; } = string.Empty;
    public string      Password         { get; set; } = string.Empty;
    public string      PhoneNumber      { get; set; } = string.Empty;
    public string      Cnic             { get; set; } = string.Empty;
    public string      Location         { get; set; } = string.Empty;
    public string?     Description      { get; set; }
    public IFormFile?  BusinessLicense  { get; set; }
}
