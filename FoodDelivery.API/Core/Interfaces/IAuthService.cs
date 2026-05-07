using FoodDelivery.API.Core.DTOs.Auth;

namespace FoodDelivery.API.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
}
