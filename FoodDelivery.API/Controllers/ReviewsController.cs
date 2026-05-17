using System.ComponentModel.DataAnnotations;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[Route("api/[controller]")]
public class ReviewsController : BaseController
{
    private readonly AppDbContext                _db;
    private readonly IOrderNotificationService   _notifier;
    private readonly ILogger<ReviewsController>  _logger;

    public ReviewsController(AppDbContext db, IOrderNotificationService notifier, ILogger<ReviewsController> logger)
    {
        _db       = db;
        _notifier = notifier;
        _logger   = logger;
    }

    /// <summary>GET /api/reviews/restaurant/{id} — public: all reviews for a restaurant</summary>
    [HttpGet("restaurant/{restaurantId:guid}")]
    public async Task<IActionResult> GetByRestaurant(Guid restaurantId)
    {
        var reviews = await _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Order)
                .ThenInclude(o => o!.OrderItems)
                    .ThenInclude(oi => oi.FoodItem)
            .Where(r => r.RestaurantId == restaurantId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = reviews.Select(r => new
        {
            r.Id,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            ReviewerName  = r.User!.FullName,
            r.OrderId,
            r.OwnerReply,
            r.OwnerReplyAt,
            Items = r.Order?.OrderItems.Select(oi => new
            {
                Name     = oi.FoodItem?.Name ?? string.Empty,
                oi.Quantity,
                oi.UnitPrice,
            }).ToList() ?? [],
        });

        return Ok(result);
    }

    /// <summary>POST /api/reviews/{id}/reply — Owner adds/updates their reply to a review</summary>
    [HttpPost("{id:guid}/reply")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> AddReply(Guid id, [FromBody] ReplyDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var review = await _db.Reviews.FindAsync(id);
        if (review == null) return NotFound(new { message = "Review not found." });

        // Ensure the review belongs to the owner's restaurant
        var restaurant = await _db.Restaurants
            .Where(r => r.OwnerId == CurrentUserId && r.Id == review.RestaurantId)
            .FirstOrDefaultAsync();

        if (restaurant == null) return Forbid();

        review.OwnerReply   = dto.Reply.Trim();
        review.OwnerReplyAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { review.OwnerReply, review.OwnerReplyAt });
    }

    /// <summary>GET /api/reviews/my-reviewed-orders — return all orderIds the user has already reviewed</summary>
    [HttpGet("my-reviewed-orders")]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> GetMyReviewedOrders()
    {
        var orderIds = await _db.Reviews
            .Where(r => r.UserId == CurrentUserId)
            .Select(r => r.OrderId)
            .ToListAsync();

        return Ok(orderIds);
    }

    /// <summary>GET /api/reviews/my-review/{orderId} — check if current user reviewed this order</summary>
    [HttpGet("my-review/{orderId:guid}")]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> GetMyReview(Guid orderId)
    {
        var review = await _db.Reviews
            .Where(r => r.OrderId == orderId && r.UserId == CurrentUserId)
            .Select(r => new { r.Id, r.Rating, r.Comment, r.CreatedAt })
            .FirstOrDefaultAsync();

        return Ok(review);
    }

    /// <summary>POST /api/reviews — User submits a review for a delivered order</summary>
    [HttpPost]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _db.Orders.FindAsync(dto.OrderId);
        if (order == null) return NotFound(new { message = "Order not found." });
        if (order.UserId != CurrentUserId) return Forbid();
        if (order.Status != OrderStatus.Delivered)
            return BadRequest(new { message = "You can only review delivered orders." });

        if (await _db.Reviews.AnyAsync(r => r.OrderId == dto.OrderId))
            return Conflict(new { message = "You have already reviewed this order." });

        var review = new Review
        {
            Rating       = dto.Rating,
            Comment      = dto.Comment.Trim(),
            OrderId      = dto.OrderId,
            UserId       = CurrentUserId,
            RestaurantId = order.RestaurantId,
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();
        await RecalcRatingAsync(order.RestaurantId);

        var reviewer = await _db.Users.FindAsync(CurrentUserId);

        _logger.LogInformation("Sending review notification for restaurant {RestaurantId} from {ReviewerName}", order.RestaurantId, reviewer?.FullName);
        try
        {
            await _notifier.NotifyNewReviewAsync(order.RestaurantId, reviewer?.FullName ?? "A customer", dto.Rating);
            _logger.LogInformation("Review notification sent successfully for restaurant {RestaurantId}", order.RestaurantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send review notification for restaurant {RestaurantId}", order.RestaurantId);
        }

        return StatusCode(201, new { review.Id, review.Rating, review.Comment, review.CreatedAt });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task RecalcRatingAsync(Guid restaurantId)
    {
        var avg = await _db.Reviews
            .Where(r => r.RestaurantId == restaurantId)
            .AverageAsync(r => (double?)r.Rating);

        var restaurant = await _db.Restaurants.FindAsync(restaurantId);
        if (restaurant != null)
        {
            restaurant.Rating = (decimal)Math.Round(avg ?? 0, 2);
            await _db.SaveChangesAsync();
        }
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public class CreateReviewDto
{
    [Required]
    public Guid OrderId { get; set; }

    [Required, Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string Comment { get; set; } = string.Empty;
}

public class ReplyDto
{
    [Required, MaxLength(1000)]
    public string Reply { get; set; } = string.Empty;
}
