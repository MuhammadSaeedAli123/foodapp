using FoodDelivery.API.Core.DTOs.Restaurant;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Route("api/[controller]")]
public class RestaurantsController : BaseController
{
    private readonly IRestaurantService _restaurantService;
    private readonly AppDbContext _db;

    public RestaurantsController(IRestaurantService restaurantService, AppDbContext db)
    {
        _restaurantService = restaurantService;
        _db = db;
    }

    /// <summary>GET /api/restaurants?search=&categoryId= — public</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] Guid? categoryId)
    {
        var result = await _restaurantService.GetAllAsync(search, categoryId);
        return Ok(result);
    }

    /// <summary>GET /api/restaurants/{id} — public</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _restaurantService.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>GET /api/restaurants/unlinked — Admin: restaurants with no owner (for owner-linking dropdown)</summary>
    [HttpGet("unlinked")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUnlinked()
    {
        var list = await _db.Restaurants
            .Include(r => r.Category)
            .Where(r => r.OwnerId == null)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, CategoryName = r.Category!.Name })
            .ToListAsync();
        return Ok(list);
    }

    /// <summary>GET /api/restaurants/categories — public</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _db.Categories.ToListAsync();
        return Ok(categories);
    }

    /// <summary>GET /api/restaurants/owner/dashboard — Owner: full stats for their restaurant</summary>
    [HttpGet("owner/dashboard")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> GetOwnerDashboard()
    {
        var restaurant = await _db.Restaurants
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);

        if (restaurant == null)
            return Ok(new { restaurant = (object?)null, stats = (object?)null, recentOrders = Array.Empty<object>() });

        var today = DateTime.UtcNow.Date;

        var allOrders = await _db.Orders
            .Where(o => o.RestaurantId == restaurant.Id)
            .ToListAsync();

        var deliveredOrders = allOrders.Where(o => o.Status == "Delivered").ToList();
        var todayOrders     = allOrders.Where(o => o.CreatedAt.Date == today).ToList();
        var activeOrders    = allOrders.Where(o => o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Confirmed").ToList();

        var totalRevenue   = deliveredOrders.Sum(o => o.TotalAmount);
        var todayRevenue   = todayOrders.Where(o => o.Status == "Delivered").Sum(o => o.TotalAmount);
        var avgOrderValue  = deliveredOrders.Any() ? deliveredOrders.Average(o => o.TotalAmount) : 0m;

        var staffCount    = await _db.Users.CountAsync(u => u.Role == "KitchenStaff" && u.RestaurantId == restaurant.Id);
        var menuItemCount = await _db.FoodItems.CountAsync(f => f.RestaurantId == restaurant.Id);

        var recentOrders = await _db.Orders
            .Include(o => o.User)
            .Where(o => o.RestaurantId == restaurant.Id)
            .OrderByDescending(o => o.CreatedAt)
            .Take(6)
            .Select(o => new
            {
                o.Id, o.Status, o.TotalAmount, o.CreatedAt,
                CustomerName = o.User!.FullName,
                ItemCount    = _db.OrderItems.Count(oi => oi.OrderId == o.Id)
            })
            .ToListAsync();

        return Ok(new
        {
            Restaurant = new
            {
                restaurant.Id, restaurant.Name, restaurant.Description,
                restaurant.ImageUrl, restaurant.Address, restaurant.PhoneNumber,
                restaurant.Rating, restaurant.IsOpen,
                restaurant.OpenTime, restaurant.CloseTime,
                restaurant.DeliveryTime, restaurant.DeliveryFee,
                CategoryName = restaurant.Category!.Name
            },
            Stats = new
            {
                TotalOrders    = allOrders.Count,
                TotalRevenue   = totalRevenue,
                TodayOrders    = todayOrders.Count,
                TodayRevenue   = todayRevenue,
                ActiveOrders   = activeOrders.Count,
                StaffCount     = staffCount,
                MenuItemCount  = menuItemCount,
                AvgOrderValue  = Math.Round(avgOrderValue, 2)
            },
            RecentOrders = recentOrders
        });
    }

    /// <summary>POST /api/restaurants — Admin only; OwnerId is required</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateRestaurantDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (dto.OwnerId == null)
            return BadRequest(new { message = "Owner is required. Select an existing Restaurant Owner." });

        var owner = await _db.Users.FindAsync(dto.OwnerId.Value);
        if (owner == null || owner.Role != "RestaurantOwner")
            return BadRequest(new { message = "Owner does not exist." });

        var result = await _restaurantService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>PUT /api/restaurants/{id} — Admin only</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRestaurantDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _restaurantService.UpdateAsync(id, dto);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>DELETE /api/restaurants/{id} — Admin only</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _restaurantService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
