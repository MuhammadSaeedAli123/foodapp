using FoodDelivery.API.Core.DTOs.Restaurant;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Services;

public class RestaurantService : IRestaurantService
{
    private readonly AppDbContext _db;

    public RestaurantService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<RestaurantDto>> GetAllAsync(string? search, Guid? categoryId)
    {
        var query = _db.Restaurants
            .Include(r => r.Category)
            .Include(r => r.Owner)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.Name.Contains(search) || r.Description.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(r => r.CategoryId == categoryId.Value);

        return await query.Select(r => MapToDto(r)).ToListAsync();
    }

    public async Task<RestaurantDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.Restaurants.Include(r => r.Category).Include(r => r.Owner).FirstOrDefaultAsync(r => r.Id == id);
        return r == null ? null : MapToDto(r);
    }

    public async Task<RestaurantDto> CreateAsync(CreateRestaurantDto dto)
    {
        var restaurant = new Restaurant
        {
            Name = dto.Name,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            Address = dto.Address,
            PhoneNumber = dto.PhoneNumber,
            DeliveryTime = dto.DeliveryTime,
            DeliveryFee = dto.DeliveryFee,
            CategoryId = dto.CategoryId,
            OpenTime  = dto.OpenTime,
            CloseTime = dto.CloseTime,
            OwnerId   = dto.OwnerId
        };

        _db.Restaurants.Add(restaurant);
        await _db.SaveChangesAsync();

        await _db.Entry(restaurant).Reference(r => r.Category).LoadAsync();
        await _db.Entry(restaurant).Reference(r => r.Owner).LoadAsync();
        return MapToDto(restaurant);
    }

    public async Task<RestaurantDto?> UpdateAsync(Guid id, UpdateRestaurantDto dto)
    {
        var restaurant = await _db.Restaurants.FindAsync(id);
        if (restaurant == null) return null;

        restaurant.Name = dto.Name;
        restaurant.Description = dto.Description;
        restaurant.ImageUrl = dto.ImageUrl;
        restaurant.Address = dto.Address;
        restaurant.PhoneNumber = dto.PhoneNumber;
        restaurant.DeliveryTime = dto.DeliveryTime;
        restaurant.DeliveryFee = dto.DeliveryFee;
        restaurant.CategoryId = dto.CategoryId;
        restaurant.OpenTime  = dto.OpenTime;
        restaurant.CloseTime = dto.CloseTime;

        await _db.SaveChangesAsync();
        await _db.Entry(restaurant).Reference(r => r.Category).LoadAsync();
        await _db.Entry(restaurant).Reference(r => r.Owner).LoadAsync();
        return MapToDto(restaurant);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var restaurant = await _db.Restaurants.FindAsync(id);
        if (restaurant == null) return false;

        _db.Restaurants.Remove(restaurant);
        await _db.SaveChangesAsync();
        return true;
    }

    private static RestaurantDto MapToDto(Restaurant r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Description = r.Description,
        ImageUrl = r.ImageUrl,
        Address = r.Address,
        PhoneNumber = r.PhoneNumber,
        Rating = r.Rating,
        IsOpen = ComputeIsOpen(r),
        OpenTime  = r.OpenTime,
        CloseTime = r.CloseTime,
        DeliveryTime = r.DeliveryTime,
        DeliveryFee = r.DeliveryFee,
        CategoryName = r.Category?.Name ?? string.Empty,
        CategoryId   = r.CategoryId,
        OwnerId      = r.OwnerId,
        OwnerName    = r.Owner?.FullName,
        OwnerEmail   = r.Owner?.Email
    };

    private static bool ComputeIsOpen(Restaurant r)
    {
        // No schedule → honour the manual IsOpen toggle.
        if (string.IsNullOrEmpty(r.OpenTime) || string.IsNullOrEmpty(r.CloseTime))
            return r.IsOpen;

        // Schedule configured → time check is the sole source of truth.
        // This matches the OwnerDashboard frontend logic (isOpenNow wins when hours are set).
        var now   = TimeOnly.FromDateTime(DateTime.Now);
        var open  = TimeOnly.Parse(r.OpenTime);
        var close = TimeOnly.Parse(r.CloseTime);

        return open <= close
            ? now >= open && now < close          // same-day range e.g. 05:30–23:59
            : now >= open || now < close;         // crosses midnight e.g. 22:00–02:00
    }
}
