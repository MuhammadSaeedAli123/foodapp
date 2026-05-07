using FoodDelivery.API.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[Route("api/[controller]")]
public class SearchController : BaseController
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService) => _searchService = searchService;

    /// <summary>GET /api/search?query= — public, returns restaurants + food items</summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 1)
            return Ok(new { restaurants = Array.Empty<object>(), foodItems = Array.Empty<object>() });

        var result = await _searchService.SearchAsync(query);
        return Ok(result);
    }
}
