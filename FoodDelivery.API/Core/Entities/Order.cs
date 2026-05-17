namespace FoodDelivery.API.Core.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Status { get; set; } = OrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public decimal? CommissionPercentage { get; set; }  // snapshot at delivery time
    public decimal? RiderEarnings { get; set; }         // TotalAmount * Commission / 100
    public decimal? RestaurantEarnings { get; set; }    // TotalAmount - RiderEarnings
    public string DeliveryAddress { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid? RiderId { get; set; }
    public User? Rider { get; set; }

    public Guid RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Preparing      = "Preparing";
    public const string Ready          = "Ready";          // kitchen done, awaiting rider
    public const string OutForDelivery = "OutForDelivery";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";
}
