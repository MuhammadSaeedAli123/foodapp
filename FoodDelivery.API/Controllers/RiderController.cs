using FoodDelivery.API.Core.DTOs.Order;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Authorize(Roles = "Rider")]
[Route("api/rider")]
public class RiderController : BaseController
{
    private readonly AppDbContext    _db;
    private readonly IOrderService   _orderService;

    public RiderController(AppDbContext db, IOrderService orderService)
    {
        _db           = db;
        _orderService = orderService;
    }

    /// <summary>
    /// GET /api/rider/status
    /// Returns: isOnline (stored), isAvailable (derived), activeOrder, today's stats.
    /// IsAvailable = IsOnline AND no active OutForDelivery order.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        // Active order = one this rider is currently delivering
        var activeOrder = await _db.Orders
            .Include(o => o.Restaurant)
            .Include(o => o.User)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
            .Where(o => o.RiderId == CurrentUserId && o.Status == OrderStatus.OutForDelivery)
            .OrderByDescending(o => o.UpdatedAt)
            .FirstOrDefaultAsync();

        // Today's stats — fetch amounts only and aggregate in C# because
        // SQLite cannot translate Sum(decimal) to SQL.
        var today = DateTime.UtcNow.Date;
        var todayOrders = await _db.Orders
            .Where(o => o.RiderId == CurrentUserId &&
                        o.Status  == OrderStatus.Delivered &&
                        o.UpdatedAt >= today)
            .ToListAsync();

        // Available orders (only fetched when online) — load entities first, map in C#
        // to avoid EF Core SQLite issues with custom methods inside Select().
        List<object> availableOrders = [];
        if (user.IsOnline)
        {
            var raw = await _db.Orders
                .Include(o => o.Restaurant)
                .Include(o => o.User)
                .Include(o => o.OrderItems).ThenInclude(oi => oi.FoodItem)
                .Where(o => o.Status == OrderStatus.Ready && o.RiderId == null)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            availableOrders = raw.Select(o => (object)MapOrderToDto(o)).ToList();
        }

        // IsAvailable is DERIVED — never stored directly
        var isAvailable = user.IsOnline && activeOrder == null;

        return Ok(new
        {
            isOnline        = user.IsOnline,
            isAvailable,
            activeOrder     = activeOrder != null ? MapOrderToDto(activeOrder) : null,
            availableOrders,
            todayDeliveries = todayOrders.Count,
            todayEarnings   = todayOrders.Sum(o => o.RiderEarnings ?? 0m),
        });
    }

    /// <summary>GET /api/rider/my-orders — full history for this rider</summary>
    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders([FromQuery] string? status = null)
    {
        var orders = await _orderService.GetByRiderAsync(CurrentUserId);

        if (!string.IsNullOrEmpty(status))
            orders = orders.Where(o => o.Status == status);

        return Ok(orders);
    }

    /// <summary>GET /api/rider/earnings — rider's commission-based earnings breakdown</summary>
    [HttpGet("earnings")]
    public async Task<IActionResult> GetEarnings()
    {
        var now        = DateTime.UtcNow;
        var todayStart = now.Date;
        var weekStart  = now.Date.AddDays(-(int)now.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var delivered = await _db.Orders
            .Where(o => o.RiderId == CurrentUserId && o.Status == OrderStatus.Delivered)
            .ToListAsync();

        // Use RiderEarnings when present (commission system); fall back to 0 for legacy orders
        decimal Earn(Order o) => o.RiderEarnings ?? 0m;

        var daily   = delivered.Where(o => o.UpdatedAt.Date >= todayStart).Sum(Earn);
        var weekly  = delivered.Where(o => o.UpdatedAt.Date >= weekStart).Sum(Earn);
        var monthly = delivered.Where(o => o.UpdatedAt.Date >= monthStart).Sum(Earn);
        var total   = delivered.Sum(Earn);
        var count   = delivered.Count;
        var avg     = count > 0 ? Math.Round(total / count, 2) : 0m;

        var last7 = Enumerable.Range(0, 7)
            .Select(i => now.Date.AddDays(-i))
            .Select(day => new
            {
                Date     = day.ToString("MMM d"),
                Earnings = delivered.Where(o => o.UpdatedAt.Date == day).Sum(Earn),
                Orders   = delivered.Count(o => o.UpdatedAt.Date == day)
            })
            .Reverse()
            .ToList();

        var last30 = Enumerable.Range(0, 30)
            .Select(i => now.Date.AddDays(-i))
            .Select(day => new
            {
                Date     = day.ToString("MMM d"),
                Earnings = delivered.Where(o => o.UpdatedAt.Date == day).Sum(Earn),
                Orders   = delivered.Count(o => o.UpdatedAt.Date == day)
            })
            .Reverse()
            .ToList();

        return Ok(new
        {
            Daily       = daily,
            Weekly      = weekly,
            Monthly     = monthly,
            Total       = total,
            TotalOrders = count,
            AvgPerOrder = avg,
            Last7Days   = last7,
            Last30Days  = last30,
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static object MapOrderToDto(Order o) => new
    {
        id              = o.Id,
        status          = o.Status,
        totalAmount     = o.TotalAmount,
        deliveryAddress = o.DeliveryAddress,
        notes           = o.Notes,
        createdAt       = o.CreatedAt,
        updatedAt       = o.UpdatedAt,
        restaurantName  = o.Restaurant?.Name  ?? string.Empty,
        restaurantId    = o.RestaurantId,
        customerName    = o.User?.FullName     ?? string.Empty,
        customerPhone   = o.User?.PhoneNumber  ?? string.Empty,
        items           = o.OrderItems.Select(oi => new
        {
            foodItemName = oi.FoodItem?.Name ?? string.Empty,
            quantity     = oi.Quantity,
            unitPrice    = oi.UnitPrice,
            subTotal     = oi.SubTotal,
        }).ToList()
    };
}
