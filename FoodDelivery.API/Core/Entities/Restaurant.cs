namespace FoodDelivery.API.Core.Entities;

public class Restaurant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public decimal Rating { get; set; } = 0;
    public bool IsOpen { get; set; } = true;
    public string? OpenTime  { get; set; }  // "HH:mm" 24-h, e.g. "09:00"
    public string? CloseTime { get; set; }  // "HH:mm" 24-h, e.g. "22:00"
    public int DeliveryTime { get; set; } = 30; // minutes
    public decimal DeliveryFee { get; set; } = 0;
    public decimal CommissionPercentage { get; set; } = 10m; // % of order total paid to rider
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid  CategoryId { get; set; }
    public Category? Category { get; set; }

    public Guid? OwnerId { get; set; }
    public User? Owner   { get; set; }

    public ICollection<FoodItem> FoodItems { get; set; } = new List<FoodItem>();
    public ICollection<Order>    Orders    { get; set; } = new List<Order>();
}
