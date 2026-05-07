using FoodDelivery.API.Core.DTOs.Search;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Services;

public class SearchService : ISearchService
{
    private readonly AppDbContext _db;

    public SearchService(AppDbContext db) => _db = db;

    public async Task<SearchResultDto> SearchAsync(string query)
    {
        // SQLite LIKE is case-insensitive for ASCII by default;
        // ToLower() makes it portable if the provider ever changes.
        var q = query.Trim().ToLower();

        var restaurants = await _db.Restaurants
            .Include(r => r.Category)
            .Where(r =>
                r.Name.ToLower().Contains(q)        ||
                r.Description.ToLower().Contains(q) ||
                (r.Category != null && r.Category.Name.ToLower().Contains(q)))
            .OrderByDescending(r => (double)r.Rating)
            .Take(5)
            .Select(r => new RestaurantSearchItemDto
            {
                Id           = r.Id,
                Name         = r.Name,
                ImageUrl     = r.ImageUrl,
                CategoryName = r.Category != null ? r.Category.Name : string.Empty,
                Rating       = r.Rating,
                DeliveryTime = r.DeliveryTime,
                DeliveryFee  = r.DeliveryFee
            })
            .ToListAsync();

        var foodItems = await _db.FoodItems
            .Include(fi => fi.Restaurant)
            .Where(fi =>
                fi.Name.ToLower().Contains(q)        ||
                fi.Description.ToLower().Contains(q) ||
                (fi.Restaurant != null && fi.Restaurant.Name.ToLower().Contains(q)))
            .OrderBy(fi => fi.Name)
            .Take(6)
            .Select(fi => new FoodItemSearchItemDto
            {
                Id             = fi.Id,
                Name           = fi.Name,
                Description    = fi.Description,
                Price          = fi.Price,
                ImageUrl       = fi.ImageUrl,
                RestaurantId   = fi.RestaurantId,
                RestaurantName = fi.Restaurant != null ? fi.Restaurant.Name : string.Empty
            })
            .ToListAsync();

        return new SearchResultDto { Restaurants = restaurants, FoodItems = foodItems };
    }
}
