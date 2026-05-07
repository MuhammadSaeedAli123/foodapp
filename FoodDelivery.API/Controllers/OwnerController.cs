using System.ComponentModel.DataAnnotations;
using FoodDelivery.API.Core.DTOs.Order;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Authorize(Roles = "RestaurantOwner")]
[Route("api/[controller]")]
public class OwnerController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IOrderNotificationService _notifier;
    private readonly IWebHostEnvironment _env;

    public OwnerController(AppDbContext db, IOrderNotificationService notifier, IWebHostEnvironment env)
    {
        _db = db;
        _notifier = notifier;
        _env = env;
    }

    private Task<Restaurant?> GetMyRestaurantAsync() =>
        _db.Restaurants
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);

    // ── Profile ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/owner/profile</summary>
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var r = await GetMyRestaurantAsync();
        if (r == null) return NotFound();
        return Ok(ProfilePayload(r));
    }

    /// <summary>PUT /api/owner/profile — update name, description, address, etc.</summary>
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] OwnerUpdateProfileDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var r = await GetMyRestaurantAsync();
        if (r == null) return NotFound();

        r.Name         = dto.Name;
        r.Description  = dto.Description;
        r.Address      = dto.Address;
        r.PhoneNumber  = dto.PhoneNumber;
        r.ImageUrl     = dto.ImageUrl;
        r.OpenTime     = dto.OpenTime;
        r.CloseTime    = dto.CloseTime;
        r.DeliveryTime = dto.DeliveryTime;
        r.DeliveryFee  = dto.DeliveryFee;

        await _db.SaveChangesAsync();
        return Ok(ProfilePayload(r));
    }

    /// <summary>PATCH /api/owner/toggle-open — flip IsOpen flag</summary>
    [HttpPatch("toggle-open")]
    public async Task<IActionResult> ToggleOpen()
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        r.IsOpen = !r.IsOpen;
        await _db.SaveChangesAsync();

        // Compute effective open status — schedule (if set) gates the manual flag.
        // This must match RestaurantService.ComputeIsOpen so customers see the same value.
        var effectiveIsOpen = EffectiveIsOpen(r);
        await _notifier.NotifyRestaurantStatusChangedAsync(r.Id, effectiveIsOpen);

        return Ok(new { r.Id, isOpen = effectiveIsOpen });
    }

    private static bool EffectiveIsOpen(Core.Entities.Restaurant r)
    {
        if (string.IsNullOrEmpty(r.OpenTime) || string.IsNullOrEmpty(r.CloseTime))
            return r.IsOpen;

        var now   = TimeOnly.FromDateTime(DateTime.Now);
        var open  = TimeOnly.Parse(r.OpenTime);
        var close = TimeOnly.Parse(r.CloseTime);

        return open <= close
            ? now >= open && now < close
            : now >= open || now < close;
    }

    // ── Menu ──────────────────────────────────────────────────────────────────

    /// <summary>GET /api/owner/menu — all food items for this owner's restaurant</summary>
    [HttpGet("menu")]
    public async Task<IActionResult> GetMenu()
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return Ok(Array.Empty<object>());

        var items = await _db.FoodItems
            .Where(f => f.RestaurantId == r.Id)
            .OrderBy(f => f.Name)
            .Select(f => new
            {
                f.Id, f.Name, f.Description, f.Price,
                f.ImageUrl, f.IsAvailable, f.RestaurantId, f.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>POST /api/owner/menu — create a food item</summary>
    [HttpPost("menu")]
    public async Task<IActionResult> CreateMenuItem([FromBody] OwnerMenuItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        var item = new FoodItem
        {
            Name         = dto.Name,
            Description  = dto.Description,
            Price        = dto.Price,
            ImageUrl     = dto.ImageUrl,
            IsAvailable  = dto.IsAvailable,
            RestaurantId = r.Id
        };

        _db.FoodItems.Add(item);
        await _db.SaveChangesAsync();

        return StatusCode(201, MenuItemPayload(item));
    }

    /// <summary>PUT /api/owner/menu/{id} — update a food item</summary>
    [HttpPut("menu/{id:guid}")]
    public async Task<IActionResult> UpdateMenuItem(Guid id, [FromBody] OwnerMenuItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        var item = await _db.FoodItems.FindAsync(id);
        if (item == null || item.RestaurantId != r.Id) return NotFound();

        item.Name        = dto.Name;
        item.Description = dto.Description;
        item.Price       = dto.Price;
        item.ImageUrl    = dto.ImageUrl;
        item.IsAvailable = dto.IsAvailable;

        await _db.SaveChangesAsync();

        // Broadcast availability change to all users on this restaurant's page
        await _notifier.NotifyMenuItemChangedAsync(r.Id, MenuItemPayload(item));

        return Ok(MenuItemPayload(item));
    }

    /// <summary>DELETE /api/owner/menu/{id}</summary>
    [HttpDelete("menu/{id:guid}")]
    public async Task<IActionResult> DeleteMenuItem(Guid id)
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        var item = await _db.FoodItems.FindAsync(id);
        if (item == null || item.RestaurantId != r.Id) return NotFound();

        _db.FoodItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/owner/menu/{id}/image — upload food item image</summary>
    [HttpPatch("menu/{id:guid}/image")]
    public async Task<IActionResult> UploadMenuItemImage(Guid id, IFormFile? file)
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        var item = await _db.FoodItems.FindAsync(id);
        if (item == null || item.RestaurantId != r.Id) return NotFound();

        var url = await SaveImageAsync(file, "menu", id.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(new { message = url[4..] });

        item.ImageUrl = url;
        await _db.SaveChangesAsync();

        await _notifier.NotifyMenuItemChangedAsync(r.Id, MenuItemPayload(item));
        return Ok(new { imageUrl = url });
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    /// <summary>GET /api/owner/orders?status= — orders for this restaurant (optional status filter)</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] string? status)
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return Ok(Array.Empty<object>());

        var query = _db.Orders
            .Include(o => o.User)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.RestaurantId == r.Id);

        if (!string.IsNullOrEmpty(status) && status != "All")
            query = query.Where(o => o.Status == status);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id, o.Status, o.TotalAmount, o.CreatedAt, o.UpdatedAt,
                o.DeliveryAddress, o.Notes,
                CustomerName  = o.User!.FullName,
                CustomerPhone = o.User.PhoneNumber,
                Items = o.OrderItems.Select(oi => new
                {
                    Name     = oi.FoodItem!.Name,
                    oi.Quantity,
                    oi.UnitPrice,
                    SubTotal = oi.SubTotal
                })
            })
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>PATCH /api/owner/orders/{id}/status — full lifecycle (Confirmed/Preparing/Ready/Cancelled)</summary>
    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] OwnerOrderStatusDto dto)
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return Forbid();

        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();
        if (order.RestaurantId != r.Id) return Forbid();

        var allowed = new HashSet<string>
        {
            OrderStatus.Confirmed,
            OrderStatus.Preparing,
            OrderStatus.Ready,
            OrderStatus.Cancelled
        };
        if (!allowed.Contains(dto.Status))
            return BadRequest(new { message = $"Owner cannot set status to '{dto.Status}'." });

        order.Status    = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var orderDto = await BuildOrderDtoAsync(order);
        await _notifier.NotifyStatusChangedAsync(id, dto.Status, orderDto);
        if (dto.Status == OrderStatus.Ready)
            await _notifier.NotifyRidersNewAvailableOrderAsync(orderDto);

        return Ok(new { order.Id, order.Status, order.UpdatedAt });
    }

    // ── Earnings ──────────────────────────────────────────────────────────────

    /// <summary>GET /api/owner/earnings — daily/weekly/monthly revenue breakdown</summary>
    [HttpGet("earnings")]
    public async Task<IActionResult> GetEarnings()
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (r == null) return NotFound();

        var now        = DateTime.UtcNow;
        var todayStart = now.Date;
        var weekStart  = now.Date.AddDays(-(int)now.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var delivered = await _db.Orders
            .Where(o => o.RestaurantId == r.Id && o.Status == OrderStatus.Delivered)
            .ToListAsync();

        var daily   = delivered.Where(o => o.CreatedAt.Date >= todayStart).Sum(o => o.TotalAmount);
        var weekly  = delivered.Where(o => o.CreatedAt.Date >= weekStart).Sum(o => o.TotalAmount);
        var monthly = delivered.Where(o => o.CreatedAt.Date >= monthStart).Sum(o => o.TotalAmount);
        var total   = delivered.Sum(o => o.TotalAmount);
        var count   = delivered.Count;
        var avg     = count > 0 ? Math.Round(total / count, 2) : 0m;

        var last7 = Enumerable.Range(0, 7)
            .Select(i => now.Date.AddDays(-i))
            .Select(day => new
            {
                Date    = day.ToString("MMM d"),
                Revenue = delivered.Where(o => o.CreatedAt.Date == day).Sum(o => o.TotalAmount),
                Orders  = delivered.Count(o => o.CreatedAt.Date == day)
            })
            .Reverse()
            .ToList();

        var last30 = Enumerable.Range(0, 30)
            .Select(i => now.Date.AddDays(-i))
            .Select(day => new
            {
                Date    = day.ToString("MMM d"),
                Revenue = delivered.Where(o => o.CreatedAt.Date == day).Sum(o => o.TotalAmount),
                Orders  = delivered.Count(o => o.CreatedAt.Date == day)
            })
            .Reverse()
            .ToList();

        return Ok(new
        {
            Daily         = daily,
            Weekly        = weekly,
            Monthly       = monthly,
            Total         = total,
            TotalOrders   = count,
            AvgOrderValue = avg,
            Last7Days     = last7,
            Last30Days    = last30
        });
    }

    // ── Image upload ─────────────────────────────────────────────────────────

    /// <summary>PATCH /api/owner/restaurant-image — upload restaurant cover image</summary>
    [HttpPatch("restaurant-image")]
    public async Task<IActionResult> UploadRestaurantImage(IFormFile? file)
    {
        var r = await GetMyRestaurantAsync();
        if (r == null) return NotFound();

        var url = await SaveImageAsync(file, "restaurants", r.Id.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(url[4..]);

        r.ImageUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { imageUrl = url });
    }

    private async Task<string> SaveImageAsync(IFormFile? file, string folder, string baseName)
    {
        if (file == null || file.Length == 0) return "ERR:No file provided.";
        if (file.Length > 3 * 1024 * 1024)   return "ERR:File size must not exceed 3 MB.";

        var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowed.Contains(file.ContentType.ToLower()))
            return "ERR:Only JPEG, PNG and WebP images are allowed.";

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrEmpty(ext))
            ext = file.ContentType == "image/png" ? ".png"
                : file.ContentType == "image/webp" ? ".webp" : ".jpg";

        var dir  = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(dir);

        var path = Path.Combine(dir, $"{baseName}{ext}");
        await using var stream = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{baseName}{ext}";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object ProfilePayload(Restaurant r) => new
    {
        r.Id, r.Name, r.Description, r.ImageUrl,
        r.Address, r.PhoneNumber, r.Rating, r.IsOpen,
        r.OpenTime, r.CloseTime, r.DeliveryTime, r.DeliveryFee,
        CategoryName = r.Category!.Name, r.CategoryId
    };

    private static object MenuItemPayload(FoodItem f) => new
    {
        f.Id, f.Name, f.Description, f.Price,
        f.ImageUrl, f.IsAvailable, f.RestaurantId, f.CreatedAt
    };

    private async Task<OrderDto> BuildOrderDtoAsync(Order order)
    {
        var full = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Restaurant)
            .Include(o => o.Rider)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .FirstAsync(o => o.Id == order.Id);

        return new OrderDto
        {
            Id              = full.Id,
            UserId          = full.UserId,
            Status          = full.Status,
            TotalAmount     = full.TotalAmount,
            DeliveryAddress = full.DeliveryAddress,
            Notes           = full.Notes,
            CreatedAt       = full.CreatedAt,
            RestaurantName  = full.Restaurant?.Name ?? string.Empty,
            RestaurantId    = full.RestaurantId,
            CustomerName    = full.User?.FullName  ?? string.Empty,
            RiderName       = full.Rider?.FullName,
            RiderId         = full.RiderId,
            Items           = full.OrderItems.Select(oi => new OrderItemDto
            {
                FoodItemId   = oi.FoodItemId,
                FoodItemName = oi.FoodItem?.Name ?? string.Empty,
                Quantity     = oi.Quantity,
                UnitPrice    = oi.UnitPrice,
                SubTotal     = oi.SubTotal
            }).ToList()
        };
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class OwnerUpdateProfileDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string ImageUrl { get; set; } = string.Empty;

    public string? OpenTime  { get; set; }
    public string? CloseTime { get; set; }

    [Range(1, 300)]
    public int DeliveryTime { get; set; } = 30;

    [Range(0, 9999)]
    public decimal DeliveryFee { get; set; }
}

public class OwnerMenuItemDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required, Range(0.01, 10000)]
    public decimal Price { get; set; }

    public string ImageUrl { get; set; } = string.Empty;

    public bool IsAvailable { get; set; } = true;
}

public class OwnerOrderStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
