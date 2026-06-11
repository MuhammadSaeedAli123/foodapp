using FoodDelivery.API.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User>             Users            => Set<User>();
    public DbSet<Category>         Categories       => Set<Category>();
    public DbSet<Restaurant>       Restaurants      => Set<Restaurant>();
    public DbSet<FoodItem>         FoodItems        => Set<FoodItem>();
    public DbSet<FoodItemVariant>  FoodItemVariants => Set<FoodItemVariant>();
    public DbSet<Order>            Orders           => Set<Order>();
    public DbSet<OrderItem>        OrderItems       => Set<OrderItem>();
    public DbSet<Vehicle>          Vehicles         => Set<Vehicle>();
    public DbSet<Review>           Reviews          => Set<Review>();
    public DbSet<PasswordResetOtp>       PasswordResetOtps       => Set<PasswordResetOtp>();
    public DbSet<RestaurantApplication>  RestaurantApplications  => Set<RestaurantApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User - unique email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Order → User (customer)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.User)
            .WithMany(u => u.OrdersAsCustomer)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Order → User (rider) - nullable FK
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Rider)
            .WithMany(u => u.OrdersAsRider)
            .HasForeignKey(o => o.RiderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Order → Restaurant
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Restaurant)
            .WithMany(r => r.Orders)
            .HasForeignKey(o => o.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Restaurant → Owner (optional FK, no cascade — delete manually)
        modelBuilder.Entity<Restaurant>()
            .HasOne(r => r.Owner)
            .WithMany()
            .HasForeignKey(r => r.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        // KitchenStaff → Restaurant (optional FK — staff always linked to one restaurant)
        modelBuilder.Entity<User>()
            .HasOne(u => u.StaffRestaurant)
            .WithMany()
            .HasForeignKey(u => u.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        // Vehicle → Rider (one-to-one)
        modelBuilder.Entity<Vehicle>()
            .HasOne(v => v.Rider)
            .WithOne(u => u.Vehicle)
            .HasForeignKey<Vehicle>(v => v.RiderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Decimal precision
        modelBuilder.Entity<Restaurant>()
            .Property(r => r.Rating).HasPrecision(3, 2);

        modelBuilder.Entity<Restaurant>()
            .Property(r => r.DeliveryFee).HasPrecision(10, 2);

        modelBuilder.Entity<Restaurant>()
            .Property(r => r.CommissionPercentage).HasPrecision(5, 2);

        modelBuilder.Entity<FoodItem>()
            .Property(f => f.Price).HasPrecision(10, 2);

        modelBuilder.Entity<FoodItemVariant>()
            .HasOne(v => v.FoodItem)
            .WithMany(f => f.Variants)
            .HasForeignKey(v => v.FoodItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FoodItemVariant>()
            .Property(v => v.Price).HasPrecision(10, 2);

        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount).HasPrecision(10, 2);

        modelBuilder.Entity<Order>()
            .Property(o => o.CommissionPercentage).HasPrecision(5, 2);

        modelBuilder.Entity<Order>()
            .Property(o => o.RiderEarnings).HasPrecision(10, 2);

        modelBuilder.Entity<Order>()
            .Property(o => o.RestaurantEarnings).HasPrecision(10, 2);

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.UnitPrice).HasPrecision(10, 2);

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.SubTotal).HasPrecision(10, 2);

        // Review → Order (one review per order)
        modelBuilder.Entity<Review>()
            .HasIndex(r => r.OrderId)
            .IsUnique();

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Order)
            .WithMany()
            .HasForeignKey(r => r.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Review>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Restaurant)
            .WithMany()
            .HasForeignKey(r => r.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed categories
        var categories = new List<Category>
        {
            new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), Name = "Fast Food", ImageUrl = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100" },
            new() { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), Name = "Pizza", ImageUrl = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100" },
            new() { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Name = "Sushi", ImageUrl = "https://images.unsplash.com/photo-1553621042-f6e147245754?w=100" },
            new() { Id = Guid.Parse("44444444-4444-4444-4444-444444444444"), Name = "Desi", ImageUrl = "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=100" },
            new() { Id = Guid.Parse("55555555-5555-5555-5555-555555555555"), Name = "Chinese", ImageUrl = "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=100" },
        };
        modelBuilder.Entity<Category>().HasData(categories);

        // PasswordResetOtp → User
        modelBuilder.Entity<PasswordResetOtp>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // One active OTP per user at a time — index for fast lookup
        modelBuilder.Entity<PasswordResetOtp>()
            .HasIndex(p => p.UserId);

        modelBuilder.Entity<PasswordResetOtp>()
            .HasIndex(p => p.ResetToken)
            .IsUnique()
            .HasFilter("\"ResetToken\" IS NOT NULL");

        // Seed admin user (password: Admin@123)
        // NOTE: hash must be a compile-time constant — calling BCrypt.HashPassword() here
        // generates a new random salt on every OnModelCreating call, which causes EF Core
        // to detect a spurious "pending migration" on every app start.
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            FullName = "Super Admin",
            Email = "admin@fooddelivery.com",
            PasswordHash = "$2a$11$Or7oSQrACkQGayZ3L0jv7OelQz6gsFGICV9BuMRqR/uyb/8LO0/nK",
            PhoneNumber = "+1234567890",
            Role = "Admin",
            Address = "HQ",
            Cnic = "",
            IsActive = true,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
