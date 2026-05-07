using FoodDelivery.API.Core.DTOs.Order;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Authorize]
[Route("api/[controller]")]
public class OrdersController : BaseController
{
    private readonly IOrderService _orderService;
    private readonly IOrderNotificationService _notifier;
    private readonly AppDbContext _db;
    private readonly IServiceScopeFactory _scopeFactory;

    public OrdersController(
        IOrderService orderService,
        IOrderNotificationService notifier,
        AppDbContext db,
        IServiceScopeFactory scopeFactory)
    {
        _orderService = orderService;
        _notifier     = notifier;
        _db           = db;
        _scopeFactory = scopeFactory;
    }

    /// <summary>POST /api/orders — User places a new order</summary>
    [HttpPost]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _orderService.CreateAsync(CurrentUserId, dto);
        await _notifier.NotifyNewOrderAsync(order);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    /// <summary>GET /api/orders/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null) return NotFound();

        if (CurrentUserRole == "User" && order.UserId != CurrentUserId)
            return Forbid();

        return Ok(order);
    }

    /// <summary>GET /api/orders/my — current user's order history</summary>
    [HttpGet("my")]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> GetMyOrders()
    {
        var orders = await _orderService.GetByUserAsync(CurrentUserId);
        return Ok(orders);
    }

    /// <summary>GET /api/orders — Admin: all orders</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var orders = await _orderService.GetAllAsync();
        return Ok(orders);
    }

    /// <summary>GET /api/orders/available — Rider: Ready orders with no rider assigned</summary>
    [HttpGet("available")]
    [Authorize(Roles = "Rider")]
    public async Task<IActionResult> GetAvailableForRider()
    {
        var orders = await _orderService.GetPendingForRiderAsync();
        return Ok(orders);
    }

    /// <summary>GET /api/orders/kitchen</summary>
    [HttpGet("kitchen")]
    [Authorize(Roles = "Worker,KitchenStaff,RestaurantOwner")]
    public async Task<IActionResult> GetKitchenOrders()
    {
        if (CurrentUserRole == "Worker")
        {
            var all = await _orderService.GetKitchenOrdersAsync();
            return Ok(all);
        }

        var restaurantId = await GetCurrentRestaurantIdAsync();
        if (restaurantId == null) return Ok(Array.Empty<object>());

        var filtered = await _orderService.GetKitchenOrdersByRestaurantAsync(restaurantId.Value);
        return Ok(filtered);
    }

    /// <summary>
    /// POST /api/orders/{id}/accept — Rider atomically accepts a Ready order.
    /// Uses a single conditional UPDATE to prevent two riders from claiming the same order.
    /// Returns 409 Conflict if already assigned.
    /// </summary>
    [HttpPost("{id:guid}/accept")]
    [Authorize(Roles = "Rider")]
    public async Task<IActionResult> AcceptOrder(Guid id)
    {
        // One SQL UPDATE with a WHERE guard — atomic, no race condition possible
        var affected = await _db.Orders
            .Where(o => o.Id == id && o.RiderId == null && o.Status == OrderStatus.Ready)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.RiderId,    CurrentUserId)
                .SetProperty(o => o.Status,     OrderStatus.OutForDelivery)
                .SetProperty(o => o.UpdatedAt,  DateTime.UtcNow));

        if (affected == 0)
        {
            var exists = await _db.Orders.AnyAsync(o => o.Id == id);
            return exists
                ? Conflict(new { message = "This order has already been taken by another rider." })
                : NotFound(new { message = "Order not found." });
        }

        var order = await _orderService.GetByIdAsync(id);
        if (order == null) return NotFound();

        // Notify customer's tracking page + admin
        await _notifier.NotifyStatusChangedAsync(id, OrderStatus.OutForDelivery, order);

        // Tell all riders in the group to remove this order card from their UI
        await _notifier.NotifyOrderAssignedAsync(id, CurrentUserId);

        return Ok(order);
    }

    /// <summary>PATCH /api/orders/{id}/status — Admin, Rider, Worker, KitchenStaff, or Owner</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin,Rider,Worker,KitchenStaff,RestaurantOwner")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusDto dto)
    {
        if (!IsValidStatus(dto.Status))
            return BadRequest(new { message = $"Invalid status: {dto.Status}" });

        // Kitchen roles can only move orders to Preparing or Ready
        if ((CurrentUserRole == "Worker" || CurrentUserRole == "KitchenStaff" || CurrentUserRole == "RestaurantOwner") &&
            dto.Status != OrderStatus.Preparing && dto.Status != OrderStatus.Ready)
            return Forbid();

        // KitchenStaff and Owner may only update orders belonging to their restaurant
        if (CurrentUserRole == "KitchenStaff" || CurrentUserRole == "RestaurantOwner")
        {
            var restaurantId = await GetCurrentRestaurantIdAsync();
            var targetOrder  = await _db.Orders.FindAsync(id);
            if (targetOrder == null) return NotFound();
            if (restaurantId == null || targetOrder.RestaurantId != restaurantId) return Forbid();
        }

        // Rider auto-assigns themselves when updating to OutForDelivery via the legacy endpoint
        Guid? riderId = null;
        if (CurrentUserRole == "Rider" && dto.Status == OrderStatus.OutForDelivery)
            riderId = CurrentUserId;

        var order = await _orderService.UpdateStatusAsync(id, dto.Status, riderId);
        if (order == null) return NotFound();

        await _notifier.NotifyStatusChangedAsync(id, dto.Status, order);

        // When kitchen marks order Ready: broadcast to all online riders + schedule re-broadcast
        if (dto.Status == OrderStatus.Ready)
        {
            await _notifier.NotifyRidersNewAvailableOrderAsync(order);
            _ = RebroadcastIfUnacceptedAsync(id, _scopeFactory);
        }

        return Ok(order);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid?> GetCurrentRestaurantIdAsync()
    {
        if (CurrentUserRole == "KitchenStaff")
        {
            var u = await _db.Users.FindAsync(CurrentUserId);
            return u?.RestaurantId;
        }
        if (CurrentUserRole == "RestaurantOwner")
        {
            var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
            return r?.Id;
        }
        return null;
    }

    /// <summary>
    /// Fire-and-forget: if the order has no rider after 15 s, re-broadcast it
    /// so riders who dismissed the toast still see it.
    /// </summary>
    private static async Task RebroadcastIfUnacceptedAsync(Guid orderId, IServiceScopeFactory scopeFactory)
    {
        await Task.Delay(TimeSpan.FromSeconds(15));

        using var scope   = scopeFactory.CreateScope();
        var db            = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var orderCheck    = await db.Orders.FindAsync(orderId);

        if (orderCheck?.RiderId == null && orderCheck?.Status == OrderStatus.Ready)
        {
            var orderSvc = scope.ServiceProvider.GetRequiredService<IOrderService>();
            var notifier = scope.ServiceProvider.GetRequiredService<IOrderNotificationService>();
            var dto      = await orderSvc.GetByIdAsync(orderId);
            if (dto != null)
                await notifier.NotifyRidersNewAvailableOrderAsync(dto);
        }
    }

    private static bool IsValidStatus(string status) =>
        status is OrderStatus.Pending
            or OrderStatus.Confirmed
            or OrderStatus.Preparing
            or OrderStatus.Ready
            or OrderStatus.OutForDelivery
            or OrderStatus.Delivered
            or OrderStatus.Cancelled;
}
