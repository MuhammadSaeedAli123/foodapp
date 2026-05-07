namespace FoodDelivery.API.Core.Entities;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;

    public ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();
}
