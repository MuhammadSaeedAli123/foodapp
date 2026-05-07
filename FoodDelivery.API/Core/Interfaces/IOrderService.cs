using FoodDelivery.API.Core.DTOs.Order;

namespace FoodDelivery.API.Core.Interfaces;

public interface IOrderService
{
    Task<OrderDto> CreateAsync(Guid userId, CreateOrderDto dto);
    Task<OrderDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<OrderDto>> GetByUserAsync(Guid userId);
    Task<IEnumerable<OrderDto>> GetAllAsync();
    Task<IEnumerable<OrderDto>> GetPendingForRiderAsync();
    Task<IEnumerable<OrderDto>> GetKitchenOrdersAsync();
    Task<IEnumerable<OrderDto>> GetKitchenOrdersByRestaurantAsync(Guid restaurantId);
    Task<OrderDto?> UpdateStatusAsync(Guid orderId, string status, Guid? riderId = null);
    Task<IEnumerable<OrderDto>> GetByRiderAsync(Guid riderId);
}
