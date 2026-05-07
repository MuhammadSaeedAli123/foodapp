using System.ComponentModel.DataAnnotations;

namespace FoodDelivery.API.Core.DTOs.Order;

public class OrderDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string DeliveryAddress { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string RestaurantName { get; set; } = string.Empty;
    public Guid RestaurantId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? RiderName { get; set; }
    public Guid? RiderId { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}

public class OrderItemDto
{
    public Guid FoodItemId { get; set; }
    public string FoodItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
}

public class CreateOrderDto
{
    [Required]
    public Guid RestaurantId { get; set; }

    [Required]
    public string DeliveryAddress { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    [Required]
    public Guid FoodItemId { get; set; }

    [Required, Range(1, 100)]
    public int Quantity { get; set; }
}

public class UpdateOrderStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
