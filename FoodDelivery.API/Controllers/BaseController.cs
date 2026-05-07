using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User not authenticated."));

    protected string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}
