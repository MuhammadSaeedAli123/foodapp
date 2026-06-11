using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FoodDelivery.API.Core.DTOs.Auth;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace FoodDelivery.API.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext  _db;
    private readonly IConfiguration _config;
    private readonly IEmailService  _email;

    public AuthService(AppDbContext db, IConfiguration config, IEmailService email)
    {
        _db     = db;
        _config = config;
        _email  = email;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
            throw new ArgumentException("Email already registered.");

        // Prevent self-registering as Admin
        var role = dto.Role == "Rider" ? "Rider" : "User";

        if (role == "Rider" && !string.IsNullOrWhiteSpace(dto.Cnic))
        {
            if (await _db.Users.AnyAsync(u => u.Cnic == dto.Cnic))
                throw new ArgumentException("CNIC already registered.");
        }

        var isRider = role == "Rider";

        var user = new User
        {
            FullName        = dto.FullName,
            Email           = dto.Email.ToLower(),
            PasswordHash    = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber     = dto.PhoneNumber,
            Address         = isRider ? string.Empty : dto.Address,
            Cnic            = isRider ? dto.Cnic : string.Empty,
            City            = isRider ? dto.City : string.Empty,
            Role            = role,
            ApprovalStatus  = isRider ? "Pending" : "Approved",
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        string vehicleType = "Bike";
        if (isRider && !string.IsNullOrWhiteSpace(dto.VehicleNumber))
        {
            _db.Vehicles.Add(new Vehicle
            {
                RiderId            = user.Id,
                RegistrationNumber = dto.VehicleNumber,
                Color              = dto.VehicleColor,
                Model              = string.Empty,
                Year               = DateTime.UtcNow.Year,
                Type               = vehicleType
            });
            await _db.SaveChangesAsync();
        }

        // Notify admin about new rider (fire-and-forget — don't fail registration if email fails)
        if (isRider)
        {
            var adminEmail = _config["EmailSettings:AdminEmail"] ?? _config["EmailSettings:SenderEmail"]!;
            _ = _email.SendRiderRegistrationToAdminAsync(
                adminEmail,
                dto.FullName, dto.Email, dto.PhoneNumber,
                dto.Cnic, vehicleType, dto.VehicleNumber, dto.City);
        }

        return BuildResponse(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        if (user.Role == "Rider")
        {
            if (user.ApprovalStatus == "Pending")
                throw new UnauthorizedAccessException("Your account is pending admin approval. You will receive an email once reviewed.");
            if (user.ApprovalStatus == "Rejected")
            {
                var msg = string.IsNullOrWhiteSpace(user.RejectionReason)
                    ? "Your rider application was not approved."
                    : $"Your rider application was not approved. Reason: {user.RejectionReason}";
                throw new UnauthorizedAccessException(msg);
            }
        }

        return BuildResponse(user);
    }

    private AuthResponseDto BuildResponse(User user) => new()
    {
        Token          = GenerateToken(user),
        FullName       = user.FullName,
        Email          = user.Email,
        Role           = user.Role,
        UserId         = user.Id,
        ApprovalStatus = user.ApprovalStatus,
    };

    private string GenerateToken(User user)
    {
        var jwtSettings = _config.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(int.Parse(jwtSettings["ExpiryInDays"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
