namespace FoodDelivery.API.Core.Entities;

public class RestaurantApplication
{
    public int Id { get; set; }
    public string RestaurantName      { get; set; } = string.Empty;
    public string OwnerName           { get; set; } = string.Empty;
    public string Email               { get; set; } = string.Empty;
    public string PasswordHash        { get; set; } = string.Empty;
    public string PhoneNumber         { get; set; } = string.Empty;
    public string Cnic                { get; set; } = string.Empty;
    public string Location            { get; set; } = string.Empty;
    public string Description         { get; set; } = string.Empty;
    public string? RestaurantImageUrl { get; set; }
    public string? BusinessLicenseUrl { get; set; }
    public string Status              { get; set; } = "Pending";
    public string? RejectionReason    { get; set; }
    public DateTime CreatedAt         { get; set; } = DateTime.UtcNow;
}
