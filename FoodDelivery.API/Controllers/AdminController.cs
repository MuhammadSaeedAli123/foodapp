using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : BaseController
{
    private readonly AppDbContext  _db;
    private readonly IEmailService _email;

    public AdminController(AppDbContext db, IEmailService email)
    {
        _db    = db;
        _email = email;
    }

    /// <summary>GET /api/admin/notifications — counts for the notification bell</summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        var pendingRiders = await _db.Users
            .CountAsync(u => u.Role == "Rider" && u.ApprovalStatus == "Pending");

        var pendingRestaurants = await _db.RestaurantApplications
            .CountAsync(a => a.Status == "Pending");

        return Ok(new { pendingRiders, pendingRestaurants });
    }

    /// <summary>GET /api/admin/riders/pending — list of riders awaiting approval</summary>
    [HttpGet("riders/pending")]
    public async Task<IActionResult> GetPendingRiders()
    {
        var riders = await _db.Users
            .Where(u => u.Role == "Rider" && u.ApprovalStatus == "Pending")
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Cnic,
                u.City,
                u.CreatedAt,
                vehicle = _db.Vehicles
                    .Where(v => v.RiderId == u.Id)
                    .Select(v => new { v.RegistrationNumber, v.Type, v.Color, v.PictureUrl })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(riders);
    }

    /// <summary>POST /api/admin/riders/{id}/approve — approve a pending rider</summary>
    [HttpPost("riders/{id:guid}/approve")]
    public async Task<IActionResult> ApproveRider(Guid id)
    {
        var rider = await _db.Users.FindAsync(id);
        if (rider == null || rider.Role != "Rider")
            return NotFound(new { message = "Rider not found." });

        rider.ApprovalStatus  = "Approved";
        rider.RejectionReason = null;
        await _db.SaveChangesAsync();

        _ = _email.SendRiderApprovalAsync(rider.Email, rider.FullName);

        return Ok(new { message = "Rider approved." });
    }

    /// <summary>POST /api/admin/riders/{id}/reject — reject a pending rider with optional reason</summary>
    [HttpPost("riders/{id:guid}/reject")]
    public async Task<IActionResult> RejectRider(Guid id, [FromBody] RejectRiderDto dto)
    {
        var rider = await _db.Users.FindAsync(id);
        if (rider == null || rider.Role != "Rider")
            return NotFound(new { message = "Rider not found." });

        rider.ApprovalStatus  = "Rejected";
        rider.RejectionReason = dto.Reason?.Trim();
        await _db.SaveChangesAsync();

        _ = _email.SendRiderRejectionAsync(rider.Email, rider.FullName, rider.RejectionReason);

        return Ok(new { message = "Rider rejected." });
    }

    /// <summary>GET /api/admin/restaurant-applications — list all (default: Pending)</summary>
    [HttpGet("restaurant-applications")]
    public async Task<IActionResult> GetRestaurantApplications([FromQuery] string status = "Pending")
    {
        var apps = await _db.RestaurantApplications
            .Where(a => a.Status == status)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.RestaurantName,
                a.OwnerName,
                a.Email,
                a.PhoneNumber,
                a.Cnic,
                a.Location,
                a.Description,
                a.RestaurantImageUrl,
                a.BusinessLicenseUrl,
                a.Status,
                a.RejectionReason,
                a.CreatedAt,
            })
            .ToListAsync();

        return Ok(apps);
    }

    /// <summary>POST /api/admin/restaurant-applications/{id}/approve</summary>
    [HttpPost("restaurant-applications/{id:int}/approve")]
    public async Task<IActionResult> ApproveRestaurantApplication(int id)
    {
        var app = await _db.RestaurantApplications.FindAsync(id);
        if (app == null) return NotFound(new { message = "Application not found." });

        if (await _db.Users.AnyAsync(u => u.Email == app.Email))
            return Conflict(new { message = "An account with this email already exists." });

        // Create RestaurantOwner account
        var owner = new Core.Entities.User
        {
            FullName    = app.OwnerName,
            Email       = app.Email,
            PasswordHash = app.PasswordHash,
            PhoneNumber = app.PhoneNumber,
            Role        = "RestaurantOwner",
            Cnic        = app.Cnic,
            Address     = app.Location,
            IsActive    = true,
            ApprovalStatus = "Approved",
        };
        _db.Users.Add(owner);
        await _db.SaveChangesAsync();

        // Create the Restaurant
        var defaultCategoryId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var restaurant = new Core.Entities.Restaurant
        {
            Name        = app.RestaurantName,
            Description = app.Description,
            ImageUrl    = app.RestaurantImageUrl ?? string.Empty,
            Address     = app.Location,
            PhoneNumber = app.PhoneNumber,
            OwnerId     = owner.Id,
            CategoryId  = defaultCategoryId,
        };
        _db.Restaurants.Add(restaurant);

        app.Status          = "Approved";
        app.RejectionReason = null;
        await _db.SaveChangesAsync();

        _ = _email.SendRestaurantApprovalAsync(app.Email, app.OwnerName, app.RestaurantName);

        return Ok(new { message = "Restaurant application approved." });
    }

    /// <summary>POST /api/admin/restaurant-applications/{id}/reject</summary>
    [HttpPost("restaurant-applications/{id:int}/reject")]
    public async Task<IActionResult> RejectRestaurantApplication(int id, [FromBody] RejectRiderDto dto)
    {
        var app = await _db.RestaurantApplications.FindAsync(id);
        if (app == null) return NotFound(new { message = "Application not found." });

        app.Status          = "Rejected";
        app.RejectionReason = dto.Reason?.Trim();
        await _db.SaveChangesAsync();

        _ = _email.SendRestaurantRejectionAsync(app.Email, app.OwnerName, app.RestaurantName, app.RejectionReason);

        return Ok(new { message = "Restaurant application rejected." });
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

    public record RejectRiderDto(string? Reason);

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
