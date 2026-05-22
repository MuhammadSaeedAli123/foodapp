using System.ComponentModel.DataAnnotations;

namespace FoodDelivery.API.Core.DTOs.Auth;

public class RegisterDto
{
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    // Only "User" or "Rider" allowed on self-register; Admin is seeded
    public string Role { get; set; } = "User";

    // Rider-specific
    [MaxLength(15)]
    public string Cnic { get; set; } = string.Empty;

    [MaxLength(20)]
    public string VehicleNumber { get; set; } = string.Empty;

    [MaxLength(30)]
    public string VehicleColor { get; set; } = string.Empty;
}
