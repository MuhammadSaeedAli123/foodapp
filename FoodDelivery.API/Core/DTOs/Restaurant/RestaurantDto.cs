using System.ComponentModel.DataAnnotations;

namespace FoodDelivery.API.Core.DTOs.Restaurant;

public class RestaurantDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public bool    IsOpen    { get; set; }
    public string? OpenTime  { get; set; }
    public string? CloseTime { get; set; }
    public int DeliveryTime { get; set; }
    public decimal DeliveryFee { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid   CategoryId   { get; set; }
    public Guid?  OwnerId      { get; set; }
    public string? OwnerName   { get; set; }
    public string? OwnerEmail  { get; set; }
}

public class CreateRestaurantDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public string ImageUrl { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;
    public int DeliveryTime { get; set; } = 30;
    public decimal DeliveryFee { get; set; } = 0;
    public string? OpenTime  { get; set; }
    public string? CloseTime { get; set; }

    [Required]
    public Guid CategoryId { get; set; }

    public Guid? OwnerId { get; set; }
}

public class UpdateRestaurantDto : CreateRestaurantDto { }
