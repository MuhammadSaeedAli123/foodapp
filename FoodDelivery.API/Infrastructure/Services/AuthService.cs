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
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
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

        var user = new User
        {
            FullName     = dto.FullName,
            Email        = dto.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber  = dto.PhoneNumber,
            Address      = role == "User" ? dto.Address : string.Empty,
            Cnic         = role == "Rider" ? dto.Cnic : string.Empty,
            Role         = role
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        if (role == "Rider" && !string.IsNullOrWhiteSpace(dto.VehicleNumber))
        {
            _db.Vehicles.Add(new Vehicle
            {
                RiderId            = user.Id,
                RegistrationNumber = dto.VehicleNumber,
                Color              = dto.VehicleColor,
                Model              = string.Empty,
                Year               = DateTime.UtcNow.Year,
                Type               = "Bike"
            });
            await _db.SaveChangesAsync();
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

        return BuildResponse(user);
    }

    private AuthResponseDto BuildResponse(User user) => new()
    {
        Token = GenerateToken(user),
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role,
        UserId = user.Id
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
