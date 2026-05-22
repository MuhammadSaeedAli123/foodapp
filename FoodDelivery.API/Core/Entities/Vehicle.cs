namespace FoodDelivery.API.Core.Entities;

public class Vehicle
{
    public Guid   Id                 { get; set; } = Guid.NewGuid();
    public Guid   RiderId            { get; set; }
    public User   Rider              { get; set; } = null!;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Model              { get; set; } = string.Empty;
    public int    Year               { get; set; }
    public string Type               { get; set; } = string.Empty; // Bike | Car | Scooter
    public string Color              { get; set; } = string.Empty;
    public string? PictureUrl        { get; set; }
}
