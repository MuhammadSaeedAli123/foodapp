namespace FoodDelivery.API.Core.Entities;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Rating { get; set; }              // 1–5 stars
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Owner reply (optional)
    public string? OwnerReply { get; set; }
    public DateTime? OwnerReplyAt { get; set; }

    public Guid OrderId { get; set; }
    public Order? Order { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }
}
