using FoodDelivery.API.Core.DTOs.FoodItem;
using FoodDelivery.API.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[Route("api/[controller]")]
public class FoodItemsController : BaseController
{
    private readonly IFoodItemService _foodItemService;

    public FoodItemsController(IFoodItemService foodItemService) => _foodItemService = foodItemService;

    /// <summary>GET /api/fooditems?restaurantId= — public</summary>
    [HttpGet]
    public async Task<IActionResult> GetByRestaurant([FromQuery] Guid restaurantId)
    {
        var result = await _foodItemService.GetByRestaurantAsync(restaurantId);
        return Ok(result);
    }

    /// <summary>GET /api/fooditems/{id} — public</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _foodItemService.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>POST /api/fooditems — Admin only</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateFoodItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _foodItemService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>PUT /api/fooditems/{id} — Admin only</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFoodItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _foodItemService.UpdateAsync(id, dto);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>DELETE /api/fooditems/{id} — Admin only</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _foodItemService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
