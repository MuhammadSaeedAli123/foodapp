using FoodDelivery.API.Core.DTOs.Order;

namespace FoodDelivery.API.Core.Interfaces;

public interface IOrderNotificationService
{
    /// <summary>Pushes a new order to all connected admins.</summary>
    Task NotifyNewOrderAsync(OrderDto order);

    /// <summary>Pushes a status change to the order-group, admins, and riders.</summary>
    Task NotifyStatusChangedAsync(Guid orderId, string newStatus, OrderDto order);

    /// <summary>Broadcasts a new confirmed order to all connected riders.</summary>
    Task NotifyRidersNewAvailableOrderAsync(OrderDto order);

    /// <summary>Pushes a new order to all connected kitchen workers.</summary>
    Task NotifyKitchenNewOrderAsync(OrderDto order);

    /// <summary>Pushes a new order to the restaurant owner's real-time group.</summary>
    Task NotifyOwnerNewOrderAsync(OrderDto order);

    /// <summary>Broadcasts restaurant open/closed toggle to all watchers.</summary>
    Task NotifyRestaurantStatusChangedAsync(Guid restaurantId, bool isOpen);

    /// <summary>Broadcasts a food-item availability change to all watchers of that restaurant.</summary>
    Task NotifyMenuItemChangedAsync(Guid restaurantId, object itemPayload);

    /// <summary>Tells all riders the given order has been taken so they remove it from their UI.</summary>
    Task NotifyOrderAssignedAsync(Guid orderId, Guid assignedRiderId);

    /// <summary>Notifies the restaurant owner when a customer submits a new review.</summary>
    Task NotifyNewReviewAsync(Guid restaurantId, string reviewerName, int rating);
}
