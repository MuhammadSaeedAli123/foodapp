using System.Security.Claims;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Hubs;

// No [Authorize] on the class — anonymous users can connect to receive
// public restaurant/menu broadcasts. Auth is enforced per-method where needed.
public class OrderHub : Hub
{
    private readonly AppDbContext _db;

    public OrderHub(AppDbContext db) => _db = db;

    // ── Connection lifecycle ────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var role   = Context.User?.FindFirstValue(ClaimTypes.Role);
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (role == "Admin")
            await Groups.AddToGroupAsync(Context.ConnectionId, "admins");

        // Riders do NOT auto-join "riders" group — they must explicitly call GoOnline.
        // However, if they were already online (e.g. page refresh), restore their group.
        if (role == "Rider" && userId != null)
        {
            var user = await _db.Users.FindAsync(Guid.Parse(userId));
            if (user?.IsOnline == true)
                await Groups.AddToGroupAsync(Context.ConnectionId, "riders");

            // Send current status so the frontend initialises correctly
            await Clients.Caller.SendAsync("RiderStatusSync", new { isOnline = user?.IsOnline ?? false });
        }

        if (role == "Worker")
            await Groups.AddToGroupAsync(Context.ConnectionId, "kitchen");

        // RestaurantOwner joins a group keyed by their restaurant ID
        if (role == "RestaurantOwner" && userId != null)
        {
            var restaurantId = await _db.Restaurants
                .Where(r => r.OwnerId == Guid.Parse(userId))
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (restaurantId != Guid.Empty)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"owner-{restaurantId}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var role   = Context.User?.FindFirstValue(ClaimTypes.Role);
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (role == "Admin")
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "admins");

        // Do NOT mark the rider offline on disconnect — a page refresh would temporarily
        // disconnect before reconnecting, which would flip IsOnline to false and break
        // the UI. Riders go offline only via an explicit GoOffline() call.
        if (role == "Rider")
        {
            // Group removal is automatic on disconnect; no DB change needed here.
        }

        if (role == "Worker")
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "kitchen");

        if (role == "RestaurantOwner" && userId != null)
        {
            var restaurantId = await _db.Restaurants
                .Where(r => r.OwnerId == Guid.Parse(userId))
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (restaurantId != Guid.Empty)
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"owner-{restaurantId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ── Rider: explicit online / offline toggle ───────────────────────────────

    [Authorize(Roles = "Rider")]
    public async Task GoOnline()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return;

        var user = await _db.Users.FindAsync(Guid.Parse(userId));
        if (user == null) return;

        user.IsOnline = true;
        await _db.SaveChangesAsync();

        await Groups.AddToGroupAsync(Context.ConnectionId, "riders");
        await Clients.Caller.SendAsync("RiderStatusSync", new { isOnline = true });
    }

    [Authorize(Roles = "Rider")]
    public async Task GoOffline()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return;

        var user = await _db.Users.FindAsync(Guid.Parse(userId));
        if (user == null) return;

        user.IsOnline = false;
        await _db.SaveChangesAsync();

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "riders");
        await Clients.Caller.SendAsync("RiderStatusSync", new { isOnline = false });
    }

    // ── Public: restaurant / menu watching ────────────────────────────────

    /// <summary>
    /// Any visitor (authenticated or not) can subscribe to live updates for a specific restaurant.
    /// </summary>
    public async Task WatchRestaurant(string restaurantId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"watch-{restaurantId}");
    }

    public async Task UnwatchRestaurant(string restaurantId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"watch-{restaurantId}");
    }

    /// <summary>Subscribe to all-restaurant broadcasts (used by Home page listing).</summary>
    public async Task WatchAllRestaurants()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "watching-restaurants");
    }

    public async Task UnwatchAllRestaurants()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "watching-restaurants");
    }

    // ── Order tracking (requires auth) ────────────────────────────────────

    /// <summary>Customer subscribes to live updates for their order.</summary>
    [Authorize]
    public async Task TrackOrder(string orderId)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = Context.User?.FindFirstValue(ClaimTypes.Role);

        if (role == "User")
        {
            var owns = await _db.Orders
                .AnyAsync(o => o.Id == Guid.Parse(orderId) && o.UserId == Guid.Parse(userId!));

            if (!owns)
            {
                await Clients.Caller.SendAsync("Error", "Unauthorized to track this order.");
                return;
            }
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, orderId);
        await Clients.Caller.SendAsync("TrackingStarted", new { orderId });
    }

    [Authorize]
    public async Task StopTracking(string orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, orderId);
    }
}
