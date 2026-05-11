using FoodDelivery.API.Core.DTOs.Order;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FoodDelivery.API.Infrastructure.Services;

public class OrderNotificationService : IOrderNotificationService
{
    private readonly IHubContext<OrderHub> _hub;

    public OrderNotificationService(IHubContext<OrderHub> hub) => _hub = hub;

    // ── New order placed ──────────────────────────────────────────────────────

    public async Task NotifyNewOrderAsync(OrderDto order)
    {
        // Admins see it in their live list
        await _hub.Clients.Group("admins")
            .SendAsync("NewOrderReceived", order);

        // Kitchen workers get it immediately so they can start
        await _hub.Clients.Group("kitchen")
            .SendAsync("KitchenNewOrder", order);

        // Restaurant owner gets real-time new-order alert
        await NotifyOwnerNewOrderAsync(order);
    }

    // ── Status changed ────────────────────────────────────────────────────────

    public async Task NotifyStatusChangedAsync(Guid orderId, string newStatus, OrderDto order)
    {
        var payload = new { orderId, status = newStatus, order };

        // 1. Always: customer's live tracking page
        await _hub.Clients.Group(orderId.ToString())
            .SendAsync("OrderStatusUpdated", payload);

        // 2. Always: admin live list
        await _hub.Clients.Group("admins")
            .SendAsync("OrderStatusUpdated", payload);

        // 3. Always: restaurant owner live orders panel
        await _hub.Clients.Group($"owner-{order.RestaurantId}")
            .SendAsync("OwnerOrderStatusUpdated", payload);

        // 3. Status-specific personal notifications
        switch (newStatus)
        {
            case OrderStatus.Preparing:
                // User toast — even if not on tracking page
                await _hub.Clients.User(order.UserId.ToString())
                    .SendAsync("OrderNotification", new
                    {
                        orderId = order.Id,
                        message = $"👨‍🍳 Kitchen is preparing your order from {order.RestaurantName}!",
                        type    = "info"
                    });

                // Admin targeted toast (distinct message from the list update)
                await _hub.Clients.Group("admins")
                    .SendAsync("AdminOrderAlert", new
                    {
                        orderId = order.Id,
                        message = $"🍳 Order #{order.Id.ToString()[..8].ToUpper()} — kitchen started preparing",
                        type    = "info"
                    });
                break;

            case OrderStatus.Ready:
                // User — personal toast
                await _hub.Clients.User(order.UserId.ToString())
                    .SendAsync("OrderNotification", new
                    {
                        orderId = order.Id,
                        message = $"✅ Your order from {order.RestaurantName} is ready — a rider is on the way!",
                        type    = "success"
                    });

                // Admin — targeted toast
                await _hub.Clients.Group("admins")
                    .SendAsync("AdminOrderAlert", new
                    {
                        orderId = order.Id,
                        message = $"📦 Order #{order.Id.ToString()[..8].ToUpper()} is ready for pickup",
                        type    = "success"
                    });

                // Assigned rider (if any) — personal toast
                if (order.RiderId.HasValue)
                {
                    await _hub.Clients.User(order.RiderId.Value.ToString())
                        .SendAsync("OrderNotification", new
                        {
                            orderId = order.Id,
                            message = $"🛵 Order #{order.Id.ToString()[..8].ToUpper()} from {order.RestaurantName} is ready for pickup!",
                            type    = "info"
                        });
                }
                break;
        }
    }

    // ── Rider availability ────────────────────────────────────────────────────

    public async Task NotifyRidersNewAvailableOrderAsync(OrderDto order)
    {
        await _hub.Clients.Group("riders")
            .SendAsync("AvailableOrderReady", order);
    }

    // ── Kitchen ───────────────────────────────────────────────────────────────

    public async Task NotifyKitchenNewOrderAsync(OrderDto order)
    {
        await _hub.Clients.Group("kitchen")
            .SendAsync("KitchenNewOrder", order);
    }

    // ── Public restaurant/menu broadcasts ─────────────────────────────────────

    public async Task NotifyRestaurantStatusChangedAsync(Guid restaurantId, bool isOpen)
    {
        var payload = new { restaurantId, isOpen };

        // All Home-page watchers (the all-restaurants group)
        await _hub.Clients.Group("watching-restaurants")
            .SendAsync("RestaurantStatusChanged", payload);

        // Anyone on the specific restaurant detail page
        await _hub.Clients.Group($"watch-{restaurantId}")
            .SendAsync("RestaurantStatusChanged", payload);
    }

    public async Task NotifyMenuItemChangedAsync(Guid restaurantId, object itemPayload)
    {
        await _hub.Clients.Group($"watch-{restaurantId}")
            .SendAsync("MenuItemChanged", itemPayload);
    }

    // ── Rider assignment ──────────────────────────────────────────────────────

    public async Task NotifyOrderAssignedAsync(Guid orderId, Guid assignedRiderId)
    {
        await _hub.Clients.Group("riders")
            .SendAsync("OrderAssigned", new { orderId, assignedRiderId });
    }

    // ── Review notification ───────────────────────────────────────────────────

    public async Task NotifyNewReviewAsync(Guid restaurantId, string reviewerName, int rating)
    {
        await _hub.Clients.Group($"owner-{restaurantId}")
            .SendAsync("NewReviewReceived", new
            {
                restaurantId,
                reviewerName,
                rating,
                time = DateTime.UtcNow,
            });
    }

    // ── Restaurant owner ──────────────────────────────────────────────────────

    public async Task NotifyOwnerNewOrderAsync(OrderDto order)
    {
        var groupName = $"owner-{order.RestaurantId}";

        await _hub.Clients.Group(groupName)
            .SendAsync("OwnerNewOrder", order);

        await _hub.Clients.Group(groupName)
            .SendAsync("OrderNotification", new
            {
                orderId = order.Id,
                message = $"New order from {order.CustomerName} — {order.Items.Count} item(s)",
                type    = "info"
            });
    }
}
