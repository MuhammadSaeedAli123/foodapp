using FoodDelivery.API.Core.DTOs.Order;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db) => _db = db;

    public async Task<OrderDto> CreateAsync(Guid userId, CreateOrderDto dto)
    {
        var foodItems = await _db.FoodItems
            .Where(f => dto.Items.Select(i => i.FoodItemId).Contains(f.Id))
            .ToListAsync();

        var order = new Order
        {
            UserId = userId,
            RestaurantId = dto.RestaurantId,
            DeliveryAddress = dto.DeliveryAddress,
            Notes = dto.Notes,
            Status = OrderStatus.Pending
        };

        foreach (var item in dto.Items)
        {
            var foodItem = foodItems.FirstOrDefault(f => f.Id == item.FoodItemId)
                ?? throw new Exception($"Food item {item.FoodItemId} not found");

            var subTotal = foodItem.Price * item.Quantity;
            order.OrderItems.Add(new OrderItem
            {
                FoodItemId = item.FoodItemId,
                Quantity = item.Quantity,
                UnitPrice = foodItem.Price,
                SubTotal = subTotal
            });

            order.TotalAmount += subTotal;
        }

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(order.Id) ?? throw new Exception("Failed to retrieve created order");
    }

    public async Task<OrderDto?> GetByIdAsync(Guid id)
    {
        var order = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        return order == null ? null : MapToDto(order);
    }

    public async Task<IEnumerable<OrderDto>> GetByUserAsync(Guid userId)
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<IEnumerable<OrderDto>> GetAllAsync()
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<IEnumerable<OrderDto>> GetPendingForRiderAsync()
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.Status == OrderStatus.Ready && o.RiderId == null)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<IEnumerable<OrderDto>> GetKitchenOrdersAsync()
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.Status == OrderStatus.Pending ||
                        o.Status == OrderStatus.Preparing)
            .OrderBy(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<IEnumerable<OrderDto>> GetKitchenOrdersByRestaurantAsync(Guid restaurantId)
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.RestaurantId == restaurantId &&
                       (o.Status == OrderStatus.Pending ||
                        o.Status == OrderStatus.Preparing))
            .OrderBy(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<IEnumerable<OrderDto>> GetByRiderAsync(Guid riderId)
    {
        return await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.RiderId == riderId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    public async Task<OrderDto?> UpdateStatusAsync(Guid orderId, string status, Guid? riderId = null)
    {
        var order = await _db.Orders.FindAsync(orderId);
        if (order == null) return null;

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;

        if (riderId.HasValue)
            order.RiderId = riderId;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(order.Id);
    }

    private static OrderDto MapToDto(Order o) => new()
    {
        Id = o.Id,
        UserId = o.UserId,
        Status = o.Status,
        TotalAmount = o.TotalAmount,
        DeliveryAddress = o.DeliveryAddress,
        Notes = o.Notes,
        CreatedAt = o.CreatedAt,
        RestaurantName = o.Restaurant?.Name ?? string.Empty,
        RestaurantId = o.RestaurantId,
        CustomerName = o.User?.FullName ?? string.Empty,
        RiderName = o.Rider?.FullName,
        RiderId = o.RiderId,
        Items = o.OrderItems.Select(oi => new OrderItemDto
        {
            FoodItemId = oi.FoodItemId,
            FoodItemName = oi.FoodItem?.Name ?? string.Empty,
            Quantity = oi.Quantity,
            UnitPrice = oi.UnitPrice,
            SubTotal = oi.SubTotal
        }).ToList()
    };
}
