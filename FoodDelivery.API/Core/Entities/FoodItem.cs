namespace FoodDelivery.API.Core.Entities;

public class FoodItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool HasVariants { get; set; } = false;

    public Guid RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    public ICollection<OrderItem>      OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<FoodItemVariant> Variants  { get; set; } = new List<FoodItemVariant>();
}
