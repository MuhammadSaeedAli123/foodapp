namespace FoodDelivery.API.Core.DTOs.Search;

public class SearchResultDto
{
    public List<RestaurantSearchItemDto> Restaurants { get; set; } = [];
    public List<FoodItemSearchItemDto>   FoodItems   { get; set; } = [];
}

public class RestaurantSearchItemDto
{
    public Guid    Id           { get; set; }
    public string  Name         { get; set; } = string.Empty;
    public string  ImageUrl     { get; set; } = string.Empty;
    public string  CategoryName { get; set; } = string.Empty;
    public decimal Rating       { get; set; }
    public int     DeliveryTime { get; set; }
    public decimal DeliveryFee  { get; set; }
}

public class FoodItemSearchItemDto
{
    public Guid    Id             { get; set; }
    public string  Name           { get; set; } = string.Empty;
    public string  Description    { get; set; } = string.Empty;
    public decimal Price          { get; set; }
    public string  ImageUrl       { get; set; } = string.Empty;
    public Guid    RestaurantId   { get; set; }
    public string  RestaurantName { get; set; } = string.Empty;
}
