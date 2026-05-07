using FoodDelivery.API.Core.DTOs.FoodItem;

namespace FoodDelivery.API.Core.Interfaces;

public interface IFoodItemService
{
    Task<IEnumerable<FoodItemDto>> GetByRestaurantAsync(Guid restaurantId);
    Task<FoodItemDto?> GetByIdAsync(Guid id);
    Task<FoodItemDto> CreateAsync(CreateFoodItemDto dto);
    Task<FoodItemDto?> UpdateAsync(Guid id, UpdateFoodItemDto dto);
    Task<bool> DeleteAsync(Guid id);
}
