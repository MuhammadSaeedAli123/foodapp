using System.ComponentModel.DataAnnotations;

namespace FoodDelivery.API.Core.DTOs.FoodItem;

public class FoodItemDto
{
    public Guid   Id           { get; set; }
    public string Name         { get; set; } = string.Empty;
    public string Description  { get; set; } = string.Empty;
    public decimal Price       { get; set; }
    public string ImageUrl     { get; set; } = string.Empty;
    public bool   IsAvailable  { get; set; }
    public Guid   RestaurantId { get; set; }
    public bool   HasVariants  { get; set; }
    public List<FoodItemVariantDto> Variants { get; set; } = new();
}

public class FoodItemVariantDto
{
    public string  Size        { get; set; } = string.Empty;
    public decimal Price       { get; set; }
    public bool    IsAvailable { get; set; }
}

public class CreateFoodItemDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required, Range(0.01, 10000)]
    public decimal Price { get; set; }

    public string ImageUrl { get; set; } = string.Empty;

    [Required]
    public Guid RestaurantId { get; set; }
}

public class UpdateFoodItemDto : CreateFoodItemDto
{
    public bool IsAvailable { get; set; } = true;
}
