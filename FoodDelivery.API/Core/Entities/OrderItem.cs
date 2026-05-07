namespace FoodDelivery.API.Core.Entities;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }

    public Guid OrderId { get; set; }
    public Order? Order { get; set; }

    public Guid FoodItemId { get; set; }
    public FoodItem? FoodItem { get; set; }
}
