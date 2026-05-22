namespace FoodDelivery.API.Core.Entities;

public class FoodItemVariant
{
    public Guid    Id          { get; set; } = Guid.NewGuid();
    public string  Size        { get; set; } = string.Empty;
    public decimal Price       { get; set; }
    public bool    IsAvailable { get; set; } = true;

    public Guid      FoodItemId { get; set; }
    public FoodItem? FoodItem   { get; set; }
}
