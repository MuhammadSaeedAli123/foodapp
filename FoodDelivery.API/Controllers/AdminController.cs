using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : BaseController
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>GET /api/admin/dashboard — full stats for admin dashboard</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var today     = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        var allOrders = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .ToListAsync();

        var todayOrders     = allOrders.Where(o => o.CreatedAt.Date == today).ToList();
        var yesterdayOrders = allOrders.Where(o => o.CreatedAt.Date == yesterday).ToList();

        var todayRevenue     = todayOrders.Where(o => o.Status == "Delivered").Sum(o => o.TotalAmount);
        var yesterdayRevenue = yesterdayOrders.Where(o => o.Status == "Delivered").Sum(o => o.TotalAmount);

        var activeOrders    = allOrders.Where(o => o.Status != "Delivered" && o.Status != "Cancelled").ToList();
        var pendingCount    = allOrders.Count(o => o.Status == "Pending");
        var preparingCount  = allOrders.Count(o => o.Status == "Preparing");
        var deliveringCount = allOrders.Count(o => o.Status == "OutForDelivery");

        var onlineRiders = allOrders
            .Where(o => o.Status == "OutForDelivery" && o.RiderId != null)
            .Select(o => o.RiderId)
            .Distinct()
            .Count();

        var allRestaurants = await _db.Restaurants.ToListAsync();
        var totalRestaurants  = allRestaurants.Count;

        var nowUtc     = DateTime.UtcNow;
        var nowMinutes = nowUtc.Hour * 60 + nowUtc.Minute;
        var activeRestaurants = allRestaurants.Count(r => IsOpenNow(r.OpenTime, r.CloseTime, nowMinutes));

        // Last 7 days chart data
        var chartData = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var d         = today.AddDays(-6 + i);
                var dayOrders = allOrders.Where(o => o.CreatedAt.Date == d).ToList();
                return new
                {
                    Date    = d.ToString("MMM dd"),
                    Orders  = dayOrders.Count,
                    Revenue = Math.Round(dayOrders.Where(o => o.Status == "Delivered").Sum(o => o.TotalAmount), 2)
                };
            })
            .ToList();

        // Top 5 restaurants by revenue
        var topRestaurants = allOrders
            .Where(o => o.Status == "Delivered" && o.Restaurant != null)
            .GroupBy(o => o.Restaurant!.Name)
            .Select(g => new { Name = g.Key, Revenue = Math.Round(g.Sum(o => o.TotalAmount), 2), Orders = g.Count() })
            .OrderByDescending(x => x.Revenue)
            .Take(5)
            .ToList();

        // Active orders table (last 20)
        var activeOrdersList = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Rider)
            .Include(o => o.Restaurant)
            .Where(o => o.Status != "Delivered" && o.Status != "Cancelled")
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .Select(o => new
            {
                o.Id,
                o.Status,
                o.TotalAmount,
                o.CreatedAt,
                CustomerName   = o.User != null ? o.User.FullName : "—",
                RestaurantName = o.Restaurant != null ? o.Restaurant.Name : "—",
                RiderName      = o.Rider != null ? o.Rider.FullName : null,
                ItemCount      = _db.OrderItems.Count(oi => oi.OrderId == o.Id)
            })
            .ToListAsync();

        return Ok(new
        {
            LiveStatus = new
            {
                ActiveOrders    = activeOrders.Count,
                DeliveringCount = deliveringCount,
                PreparingCount  = preparingCount,
                OnlineRiders    = onlineRiders,
            },
            Kpi = new
            {
                TodayRevenue      = todayRevenue,
                YesterdayRevenue  = yesterdayRevenue,
                TodayOrders       = todayOrders.Count,
                YesterdayOrders   = yesterdayOrders.Count,
                PendingOrders     = pendingCount,
                OngoingDeliveries = deliveringCount,
                ActiveRestaurants = activeRestaurants,
                TotalRestaurants  = totalRestaurants,
            },
            ChartData      = chartData,
            TopRestaurants = topRestaurants,
            ActiveOrders   = activeOrdersList,
        });
    }

    private static bool IsOpenNow(string? openTime, string? closeTime, int nowMinutes)
    {
        if (string.IsNullOrEmpty(openTime) || string.IsNullOrEmpty(closeTime))
            return true; // 24/7

        var op = openTime.Split(':');
        var cl = closeTime.Split(':');
        if (op.Length < 2 || cl.Length < 2) return true;

        int openM  = int.Parse(op[0]) * 60 + int.Parse(op[1]);
        int closeM = int.Parse(cl[0]) * 60 + int.Parse(cl[1]);

        // same-day window vs midnight-crossing
        return openM < closeM
            ? nowMinutes >= openM && nowMinutes < closeM
            : nowMinutes >= openM || nowMinutes < closeM;
    }
}
