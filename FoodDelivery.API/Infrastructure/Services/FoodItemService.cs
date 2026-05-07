using FoodDelivery.API.Core.DTOs.FoodItem;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Services;

public class FoodItemService : IFoodItemService
{
    private readonly AppDbContext _db;

    public FoodItemService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<FoodItemDto>> GetByRestaurantAsync(Guid restaurantId)
    {
        return await _db.FoodItems
            .Where(f => f.RestaurantId == restaurantId)
            .Select(f => MapToDto(f))
            .ToListAsync();
    }

    public async Task<FoodItemDto?> GetByIdAsync(Guid id)
    {
        var item = await _db.FoodItems.FindAsync(id);
        return item == null ? null : MapToDto(item);
    }

    public async Task<FoodItemDto> CreateAsync(CreateFoodItemDto dto)
    {
        var item = new FoodItem
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            ImageUrl = dto.ImageUrl,
            RestaurantId = dto.RestaurantId
        };

        _db.FoodItems.Add(item);
        await _db.SaveChangesAsync();
        return MapToDto(item);
    }

    public async Task<FoodItemDto?> UpdateAsync(Guid id, UpdateFoodItemDto dto)
    {
        var item = await _db.FoodItems.FindAsync(id);
        if (item == null) return null;

        item.Name = dto.Name;
        item.Description = dto.Description;
        item.Price = dto.Price;
        item.ImageUrl = dto.ImageUrl;
        item.IsAvailable = dto.IsAvailable;
        item.RestaurantId = dto.RestaurantId;

        await _db.SaveChangesAsync();
        return MapToDto(item);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await _db.FoodItems.FindAsync(id);
        if (item == null) return false;

        _db.FoodItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    private static FoodItemDto MapToDto(FoodItem f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        Description = f.Description,
        Price = f.Price,
        ImageUrl = f.ImageUrl,
        IsAvailable = f.IsAvailable,
        RestaurantId = f.RestaurantId
    };
}
