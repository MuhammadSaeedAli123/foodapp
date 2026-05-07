using FoodDelivery.API.Core.DTOs.Restaurant;

namespace FoodDelivery.API.Core.Interfaces;

public interface IRestaurantService
{
    Task<IEnumerable<RestaurantDto>> GetAllAsync(string? search, Guid? categoryId);
    Task<RestaurantDto?> GetByIdAsync(Guid id);
    Task<RestaurantDto> CreateAsync(CreateRestaurantDto dto);
    Task<RestaurantDto?> UpdateAsync(Guid id, UpdateRestaurantDto dto);
    Task<bool> DeleteAsync(Guid id);
}
