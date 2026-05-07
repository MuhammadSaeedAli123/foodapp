namespace FoodDelivery.API.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // User | Admin | Rider | Worker
    public string Address { get; set; } = string.Empty;
    public string Cnic { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsOnline { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // KitchenStaff: FK to the restaurant they work at (null for all other roles)
    public Guid?        RestaurantId     { get; set; }
    public Restaurant?  StaffRestaurant  { get; set; }

    public ICollection<Order> OrdersAsCustomer { get; set; } = new List<Order>();
    public ICollection<Order> OrdersAsRider    { get; set; } = new List<Order>();
    public Vehicle?            Vehicle          { get; set; }
}
