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

    [MaxLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    // Only "User" or "Rider" allowed on self-register; Admin is seeded
    public string Role { get; set; } = "User";
}
