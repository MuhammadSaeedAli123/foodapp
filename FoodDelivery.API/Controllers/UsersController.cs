using System.ComponentModel.DataAnnotations;
using FoodDelivery.API.Core.Entities;
using FoodDelivery.API.Core.DTOs.Restaurant;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;

namespace FoodDelivery.API.Controllers;

[Authorize]
[Route("api/[controller]")]
public class UsersController : BaseController
{
    private readonly AppDbContext        _db;
    private readonly IWebHostEnvironment _env;
    private readonly IRestaurantService  _restaurantService;

    public UsersController(AppDbContext db, IWebHostEnvironment env, IRestaurantService restaurantService)
    {
        _db                = db;
        _env               = env;
        _restaurantService = restaurantService;
    }

    // ── Own profile ──────────────────────────────────────────────────────────

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = CurrentUserId;
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // Enrich with restaurant info for owner and kitchen staff
        Guid?   restaurantId   = null;
        string? restaurantName = null;

        if (user.Role == "KitchenStaff" && user.RestaurantId != null)
        {
            var r = await _db.Restaurants.FindAsync(user.RestaurantId);
            restaurantId   = r?.Id;
            restaurantName = r?.Name;
        }
        else if (user.Role == "RestaurantOwner")
        {
            var r = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == userId);
            restaurantId   = r?.Id;
            restaurantName = r?.Name;
        }

        return Ok(new
        {
            user.Id, user.FullName, user.Email, user.PhoneNumber,
            user.Address, user.Role, user.Cnic, user.CreatedAt,
            user.ProfilePhotoUrl, user.ApprovalStatus,
            RestaurantId   = restaurantId,
            RestaurantName = restaurantName
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileDto dto)
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        user.FullName    = dto.FullName;
        user.PhoneNumber = dto.PhoneNumber;
        user.Address     = dto.Address;

        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Email, user.PhoneNumber, user.Address, user.Role });
    }

    [HttpPatch("me/photo")]
    [Authorize(Roles = "User,Rider,RestaurantOwner")]
    public async Task<IActionResult> UploadMyPhoto(IFormFile? file)
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        var url = await SaveImageAsync(file, "profiles", CurrentUserId.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(new { message = url[4..] });

        if (!string.IsNullOrEmpty(user.ProfilePhotoUrl)) DeleteFile(user.ProfilePhotoUrl);

        user.ProfilePhotoUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.ProfilePhotoUrl });
    }

    [HttpPut("me/password")]
    [Authorize(Roles = "User,Rider,RestaurantOwner")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password updated successfully." });
    }

    /// <summary>DELETE /api/users/me — permanently delete own account and all associated data</summary>
    [HttpDelete("me")]
    [Authorize(Roles = "User,Rider,RestaurantOwner")]
    public async Task<IActionResult> DeleteAccount()
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        // ── Step 1: role-specific cleanup ────────────────────────────────────

        if (user.Role == "User")
        {
            // Reviews written by this customer
            _db.Reviews.RemoveRange(_db.Reviews.Where(r => r.UserId == CurrentUserId));

            // Orders (+ items) placed by this customer
            var orders = await _db.Orders
                .Include(o => o.OrderItems)
                .Where(o => o.UserId == CurrentUserId)
                .ToListAsync();
            foreach (var o in orders) _db.OrderItems.RemoveRange(o.OrderItems);
            _db.Orders.RemoveRange(orders);
        }
        else if (user.Role == "Rider")
        {
            // Nullify rider reference on delivered/active orders (nullable FK)
            var riderOrders = await _db.Orders
                .Where(o => o.RiderId == CurrentUserId)
                .ToListAsync();
            foreach (var o in riderOrders) o.RiderId = null;

            // Explicitly delete vehicle — do NOT rely on EF/SQLite cascade
            var vehicle = await _db.Vehicles
                .FirstOrDefaultAsync(v => v.RiderId == CurrentUserId);
            if (vehicle != null) _db.Vehicles.Remove(vehicle);
        }
        else if (user.Role == "RestaurantOwner")
        {
            var restaurants = await _db.Restaurants
                .Where(r => r.OwnerId == CurrentUserId)
                .ToListAsync();

            foreach (var restaurant in restaurants)
            {
                // Detach kitchen staff
                var staff = await _db.Users
                    .Where(u => u.RestaurantId == restaurant.Id)
                    .ToListAsync();
                foreach (var s in staff) s.RestaurantId = null;

                // Orders + items for this restaurant
                var orders = await _db.Orders
                    .Include(o => o.OrderItems)
                    .Where(o => o.RestaurantId == restaurant.Id)
                    .ToListAsync();
                foreach (var o in orders) _db.OrderItems.RemoveRange(o.OrderItems);
                _db.Orders.RemoveRange(orders);

                // Reviews for this restaurant
                _db.Reviews.RemoveRange(
                    _db.Reviews.Where(r => r.RestaurantId == restaurant.Id));

                // Food items (FoodItemVariants cascade at DB level — safe here)
                var foodItems = await _db.FoodItems
                    .Include(f => f.Variants)
                    .Where(f => f.RestaurantId == restaurant.Id)
                    .ToListAsync();
                foreach (var f in foodItems) _db.FoodItemVariants.RemoveRange(f.Variants);
                _db.FoodItems.RemoveRange(foodItems);

                _db.Restaurants.Remove(restaurant);
            }

            // Reviews written by the owner
            _db.Reviews.RemoveRange(_db.Reviews.Where(r => r.UserId == CurrentUserId));
        }

        // ── Step 2: common cleanup for every role ─────────────────────────────

        // Explicitly delete password-reset OTPs — do NOT rely on EF/SQLite cascade
        _db.PasswordResetOtps.RemoveRange(
            _db.PasswordResetOtps.Where(o => o.UserId == CurrentUserId));

        // ── Step 3: delete the user ───────────────────────────────────────────
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── Admin: all users ─────────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Select(u => new
            {
                u.Id, u.FullName, u.Email, u.PhoneNumber,
                u.Role, u.IsActive, u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPatch("{id:guid}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();

        return Ok(new { user.Id, user.IsActive });
    }

    // ── Admin: workers ───────────────────────────────────────────────────────

    /// <summary>GET /api/users/workers — Admin: list all workers</summary>
    [HttpGet("workers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetWorkers()
    {
        var workers = await _db.Users
            .Where(u => u.Role == "Worker")
            .Include(u => u.StaffRestaurant)
                .ThenInclude(r => r!.Category)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return Ok(workers.Select(u => new
        {
            u.Id, u.FullName, u.Email, u.PhoneNumber,
            u.Address, u.Cnic, u.IsActive, u.CreatedAt,
            u.ProfilePhotoUrl, u.RestaurantId,
            Restaurant = u.StaffRestaurant == null ? null : (object)new
            {
                u.StaffRestaurant.Id,
                u.StaffRestaurant.Name,
                u.StaffRestaurant.ImageUrl,
                u.StaffRestaurant.OpenTime,
                u.StaffRestaurant.CloseTime,
                CategoryName = u.StaffRestaurant.Category?.Name
            }
        }));
    }

    /// <summary>POST /api/users/workers — Admin: create a worker with auto-generated password</summary>
    [HttpPost("workers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateWorker([FromBody] CreateWorkerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict(new { message = "Email is already registered." });

        var plainPassword = GeneratePassword();

        var restaurant = await _db.Restaurants.FindAsync(dto.RestaurantId);
        if (restaurant == null)
            return BadRequest(new { message = "Selected restaurant does not exist." });

        var worker = new User
        {
            FullName     = dto.FullName.Trim(),
            Email        = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            PhoneNumber  = dto.PhoneNumber.Trim(),
            Address      = dto.Address.Trim(),
            Cnic         = dto.Cnic.Trim(),
            RestaurantId = dto.RestaurantId,
            Role         = "Worker",
            IsActive     = true
        };

        _db.Users.Add(worker);
        await _db.SaveChangesAsync();

        var restaurantCategory = await _db.Categories.FindAsync(restaurant.CategoryId);
        return Ok(new
        {
            worker.Id, worker.FullName, worker.Email,
            worker.PhoneNumber, worker.Address, worker.Cnic,
            worker.RestaurantId, worker.IsActive, worker.CreatedAt, worker.ProfilePhotoUrl,
            Restaurant = new {
                restaurant.Id, restaurant.Name, restaurant.ImageUrl,
                restaurant.OpenTime, restaurant.CloseTime,
                CategoryName = restaurantCategory?.Name
            },
            GeneratedPassword = plainPassword
        });
    }

    /// <summary>PUT /api/users/workers/{id} — Admin: update worker details</summary>
    [HttpPut("workers/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateWorker(Guid id, [FromBody] UpdateWorkerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var worker = await _db.Users.FindAsync(id);
        if (worker == null || worker.Role != "Worker") return NotFound();

        // Ensure new email isn't taken by a different user
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower() && u.Id != id))
            return Conflict(new { message = "Email is already registered to another account." });

        var restaurant = await _db.Restaurants.FindAsync(dto.RestaurantId);
        if (restaurant == null)
            return BadRequest(new { message = "Selected restaurant does not exist." });

        worker.FullName     = dto.FullName.Trim();
        worker.Email        = dto.Email.Trim().ToLower();
        worker.PhoneNumber  = dto.PhoneNumber.Trim();
        worker.Address      = dto.Address.Trim();
        worker.Cnic         = dto.Cnic.Trim();
        worker.RestaurantId = dto.RestaurantId;

        await _db.SaveChangesAsync();

        var restaurantCategory = await _db.Categories.FindAsync(restaurant.CategoryId);
        return Ok(new
        {
            worker.Id, worker.FullName, worker.Email,
            worker.PhoneNumber, worker.Address, worker.Cnic,
            worker.RestaurantId, worker.IsActive, worker.CreatedAt, worker.ProfilePhotoUrl,
            Restaurant = new {
                restaurant.Id, restaurant.Name, restaurant.ImageUrl,
                restaurant.OpenTime, restaurant.CloseTime,
                CategoryName = restaurantCategory?.Name
            }
        });
    }

    /// <summary>DELETE /api/users/workers/{id} — Admin: remove a worker</summary>
    [HttpDelete("workers/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteWorker(Guid id)
    {
        var worker = await _db.Users.FindAsync(id);
        if (worker == null || worker.Role != "Worker") return NotFound();

        _db.Users.Remove(worker);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>PATCH /api/users/workers/{id}/photo — Admin: upload / replace worker profile photo</summary>
    [HttpPatch("workers/{id:guid}/photo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadWorkerPhoto(Guid id, IFormFile? file)
    {
        var worker = await _db.Users.FindAsync(id);
        if (worker == null || worker.Role != "Worker") return NotFound();

        var url = await SaveImageAsync(file, "workers", id.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(new { message = url[4..] });

        if (!string.IsNullOrEmpty(worker.ProfilePhotoUrl)) DeleteFile(worker.ProfilePhotoUrl);

        worker.ProfilePhotoUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { worker.Id, worker.ProfilePhotoUrl });
    }

    // ── Admin: restaurant owners ──────────────────────────────────────────────

    /// <summary>GET /api/users/owners — list all restaurant owners with their restaurant</summary>
    [HttpGet("owners")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetOwners()
    {
        var owners = await _db.Users
            .Where(u => u.Role == "RestaurantOwner")
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id, u.FullName, u.Email, u.PhoneNumber,
                u.Address, u.Cnic, u.IsActive, u.CreatedAt, u.ProfilePhotoUrl,
                Restaurant = _db.Restaurants
                    .Where(r => r.OwnerId == u.Id)
                    .Select(r => new
                    {
                        r.Id, r.Name, r.Description, r.ImageUrl,
                        r.Address, r.PhoneNumber, r.Rating, r.IsOpen,
                        r.OpenTime, r.CloseTime, r.DeliveryTime, r.DeliveryFee,
                        r.CategoryId, CategoryName = r.Category!.Name
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(owners);
    }

    /// <summary>POST /api/users/owners — create owner + link or create restaurant</summary>
    [HttpPost("owners")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateOwner([FromBody] CreateOwnerDto dto)
    {
        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(dto.FullName))
            errors["fullName"] = "Full name is required.";
        if (string.IsNullOrWhiteSpace(dto.Email) || !System.Text.RegularExpressions.Regex.IsMatch(dto.Email, @"^[^@\s]+@gmail\.com$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            errors["email"] = "Must be a valid Gmail address.";
        if (string.IsNullOrWhiteSpace(dto.PhoneNumber) || !System.Text.RegularExpressions.Regex.IsMatch(dto.PhoneNumber, @"^\+92[0-9]{10}$"))
            errors["phoneNumber"] = "Must start with +92 followed by 10 digits.";
        if (string.IsNullOrWhiteSpace(dto.Address))
            errors["address"] = "Address is required.";
        if (string.IsNullOrWhiteSpace(dto.Cnic) || !System.Text.RegularExpressions.Regex.IsMatch(dto.Cnic.Trim(), @"^\d{13}$"))
            errors["cnic"] = "CNIC must be exactly 13 digits.";

        if (errors.Any()) return BadRequest(new { errors });

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower()))
            return Conflict(new { message = "Email is already registered." });

        var plainPassword = GeneratePassword();
        var owner = new User
        {
            FullName     = dto.FullName.Trim(),
            Email        = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            PhoneNumber  = dto.PhoneNumber.Trim(),
            Address      = dto.Address.Trim(),
            Cnic         = dto.Cnic.Trim(),
            Role         = "RestaurantOwner",
            IsActive     = true
        };
        _db.Users.Add(owner);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            owner.Id, owner.FullName, owner.Email, owner.PhoneNumber,
            owner.Address, owner.Cnic, owner.IsActive, owner.CreatedAt, owner.ProfilePhotoUrl,
            GeneratedPassword = plainPassword,
            Restaurant = (object?)null
        });
    }

    /// <summary>PUT /api/users/owners/{id} — update owner personal info + restaurant details</summary>
    [HttpPut("owners/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateOwner(Guid id, [FromBody] UpdateOwnerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var owner = await _db.Users.FindAsync(id);
        if (owner == null || owner.Role != "RestaurantOwner") return NotFound();

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower() && u.Id != id))
            return Conflict(new { message = "Email is already registered to another account." });

        owner.FullName    = dto.FullName.Trim();
        owner.Email       = dto.Email.Trim().ToLower();
        owner.PhoneNumber = dto.PhoneNumber.Trim();
        owner.Address     = dto.Address.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Cnic)) owner.Cnic = dto.Cnic.Trim();

        // Update their restaurant if provided
        var restaurant = await _db.Restaurants.Include(r => r.Category)
                                              .FirstOrDefaultAsync(r => r.OwnerId == id);

        if (restaurant != null && dto.Restaurant != null &&
            !string.IsNullOrWhiteSpace(dto.Restaurant.Name))
        {
            var newName = dto.Restaurant.Name.Trim();
            if (!string.Equals(newName, restaurant.Name, StringComparison.OrdinalIgnoreCase) &&
                await _db.Restaurants.AnyAsync(r => r.Name.ToLower() == newName.ToLower() && r.Id != restaurant.Id))
                return Conflict(new { message = $"A restaurant named \"{newName}\" already exists." });
        }
        if (restaurant != null && dto.Restaurant != null)
        {
            restaurant.Name         = dto.Restaurant.Name?.Trim() ?? restaurant.Name;
            restaurant.Description  = dto.Restaurant.Description?.Trim() ?? restaurant.Description;
            restaurant.ImageUrl     = dto.Restaurant.ImageUrl?.Trim() ?? restaurant.ImageUrl;
            restaurant.Address      = dto.Restaurant.Address?.Trim() ?? restaurant.Address;
            restaurant.PhoneNumber  = dto.Restaurant.PhoneNumber?.Trim() ?? restaurant.PhoneNumber;
            restaurant.OpenTime     = dto.Restaurant.OpenTime;
            restaurant.CloseTime    = dto.Restaurant.CloseTime;
            restaurant.DeliveryFee  = dto.Restaurant.DeliveryFee;
            restaurant.DeliveryTime = dto.Restaurant.DeliveryTime > 0 ? dto.Restaurant.DeliveryTime : 30;
            if (dto.Restaurant.CategoryId.HasValue) restaurant.CategoryId = dto.Restaurant.CategoryId.Value;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            owner.Id, owner.FullName, owner.Email, owner.PhoneNumber,
            owner.Address, owner.Cnic, owner.IsActive, owner.CreatedAt, owner.ProfilePhotoUrl,
            Restaurant = restaurant == null ? null : new
            {
                restaurant.Id, restaurant.Name, restaurant.Description,
                restaurant.ImageUrl, restaurant.Address, restaurant.PhoneNumber,
                restaurant.OpenTime, restaurant.CloseTime,
                restaurant.DeliveryFee, restaurant.DeliveryTime,
                restaurant.CategoryId,
                CategoryName = restaurant.Category?.Name
            }
        });
    }

    /// <summary>DELETE /api/users/owners/{id} — remove owner, unlink restaurant</summary>
    [HttpDelete("owners/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteOwner(Guid id)
    {
        var owner = await _db.Users.FindAsync(id);
        if (owner == null || owner.Role != "RestaurantOwner") return NotFound();

        // Block deletion while a restaurant is linked — restaurants must always have an owner
        var hasRestaurant = await _db.Restaurants.AnyAsync(r => r.OwnerId == id);
        if (hasRestaurant)
            return Conflict(new { message = "Cannot delete this owner while a restaurant is linked. Delete the restaurant first, then remove the owner." });

        _db.Users.Remove(owner);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/users/owners/{id}/photo — upload owner profile photo</summary>
    [HttpPatch("owners/{id:guid}/photo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadOwnerPhoto(Guid id, IFormFile? file)
    {
        var owner = await _db.Users.FindAsync(id);
        if (owner == null || owner.Role != "RestaurantOwner") return NotFound();

        var url = await SaveImageAsync(file, "owners", id.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(new { message = url[4..] });

        if (!string.IsNullOrEmpty(owner.ProfilePhotoUrl)) DeleteFile(owner.ProfilePhotoUrl);
        owner.ProfilePhotoUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { owner.Id, owner.ProfilePhotoUrl });
    }

    // ── Owner: kitchen staff ─────────────────────────────────────────────────

    /// <summary>GET /api/users/staff — Owner: list all KitchenStaff for their restaurant</summary>
    [HttpGet("staff")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> GetStaff()
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (restaurant == null)
            return BadRequest(new { message = "You don't have a linked restaurant yet." });

        var staff = await _db.Users
            .Where(u => u.Role == "KitchenStaff" && u.RestaurantId == restaurant.Id)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id, u.FullName, u.Email, u.PhoneNumber,
                u.Address, u.IsActive, u.CreatedAt, u.ProfilePhotoUrl,
                RestaurantId   = restaurant.Id,
                RestaurantName = restaurant.Name
            })
            .ToListAsync();

        return Ok(staff);
    }

    /// <summary>POST /api/users/staff — Owner: create a kitchen staff member for their restaurant</summary>
    [HttpPost("staff")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateKitchenStaffDto dto)
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (restaurant == null)
            return BadRequest(new { message = "You don't have a linked restaurant yet." });

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(dto.FullName))
            errors["fullName"] = "Full name is required.";
        if (string.IsNullOrWhiteSpace(dto.Email) || !System.Text.RegularExpressions.Regex.IsMatch(dto.Email, @"^[^@\s]+@gmail\.com$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            errors["email"] = "Must be a valid Gmail address.";
        if (string.IsNullOrWhiteSpace(dto.PhoneNumber) || !System.Text.RegularExpressions.Regex.IsMatch(dto.PhoneNumber, @"^\+92[0-9]{10}$"))
            errors["phoneNumber"] = "Must start with +92 followed by 10 digits.";
        if (string.IsNullOrWhiteSpace(dto.Address))
            errors["address"] = "Address is required.";
        if (errors.Any()) return BadRequest(new { errors });

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower()))
            return Conflict(new { message = "Email is already registered." });

        var plainPassword = GeneratePassword();
        var staff = new User
        {
            FullName     = dto.FullName.Trim(),
            Email        = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            PhoneNumber  = dto.PhoneNumber.Trim(),
            Address      = dto.Address.Trim(),
            Role         = "KitchenStaff",
            RestaurantId = restaurant.Id,
            IsActive     = true
        };
        _db.Users.Add(staff);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            staff.Id, staff.FullName, staff.Email, staff.PhoneNumber,
            staff.Address, staff.IsActive, staff.CreatedAt, staff.ProfilePhotoUrl,
            RestaurantId      = restaurant.Id,
            RestaurantName    = restaurant.Name,
            GeneratedPassword = plainPassword
        });
    }

    /// <summary>PUT /api/users/staff/{id} — Owner: update a kitchen staff member</summary>
    [HttpPut("staff/{id:guid}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> UpdateStaff(Guid id, [FromBody] UpdateKitchenStaffDto dto)
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (restaurant == null) return BadRequest(new { message = "No linked restaurant." });

        var staff = await _db.Users.FindAsync(id);
        if (staff == null || staff.Role != "KitchenStaff" || staff.RestaurantId != restaurant.Id)
            return NotFound();

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower() && u.Id != id))
            return Conflict(new { message = "Email is already registered to another account." });

        staff.FullName    = dto.FullName.Trim();
        staff.Email       = dto.Email.Trim().ToLower();
        staff.PhoneNumber = dto.PhoneNumber.Trim();
        staff.Address     = dto.Address.Trim();
        await _db.SaveChangesAsync();

        return Ok(new
        {
            staff.Id, staff.FullName, staff.Email, staff.PhoneNumber,
            staff.Address, staff.IsActive, staff.CreatedAt, staff.ProfilePhotoUrl,
            RestaurantId   = restaurant.Id,
            RestaurantName = restaurant.Name
        });
    }

    /// <summary>DELETE /api/users/staff/{id} — Owner: remove a kitchen staff member</summary>
    [HttpDelete("staff/{id:guid}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> DeleteStaff(Guid id)
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (restaurant == null) return BadRequest(new { message = "No linked restaurant." });

        var staff = await _db.Users.FindAsync(id);
        if (staff == null || staff.Role != "KitchenStaff" || staff.RestaurantId != restaurant.Id)
            return NotFound();

        _db.Users.Remove(staff);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/users/staff/{id}/photo — Owner: upload staff profile photo</summary>
    [HttpPatch("staff/{id:guid}/photo")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> UploadStaffPhoto(Guid id, IFormFile? file)
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == CurrentUserId);
        if (restaurant == null) return BadRequest(new { message = "No linked restaurant." });

        var staff = await _db.Users.FindAsync(id);
        if (staff == null || staff.Role != "KitchenStaff" || staff.RestaurantId != restaurant.Id)
            return NotFound();

        var url = await SaveImageAsync(file, "staff", id.ToString());
        if (url.StartsWith("ERR:")) return BadRequest(new { message = url[4..] });

        if (!string.IsNullOrEmpty(staff.ProfilePhotoUrl)) DeleteFile(staff.ProfilePhotoUrl);
        staff.ProfilePhotoUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { staff.Id, staff.ProfilePhotoUrl });
    }

    // ── Admin: riders ────────────────────────────────────────────────────────

    /// <summary>GET /api/users/riders — Admin: list all riders with vehicle info</summary>
    [HttpGet("riders")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetRiders()
    {
        var riders = await _db.Users
            .Where(u => u.Role == "Rider")
            .Include(u => u.Vehicle)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id, u.FullName, u.Email, u.PhoneNumber,
                u.Address, u.Cnic, u.IsActive, u.CreatedAt, u.ProfilePhotoUrl,
                Vehicle = u.Vehicle == null ? null : new
                {
                    u.Vehicle.Id,
                    u.Vehicle.RegistrationNumber,
                    u.Vehicle.Model,
                    u.Vehicle.Year,
                    u.Vehicle.Type,
                    u.Vehicle.PictureUrl
                }
            })
            .ToListAsync();

        return Ok(riders);
    }

    /// <summary>POST /api/users/riders — Admin: create a rider + vehicle with auto-generated password</summary>
    [HttpPost("riders")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateRider([FromBody] CreateRiderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict(new { message = "Email is already registered." });

        var plainPassword = GeneratePassword();

        var rider = new User
        {
            FullName     = dto.FullName.Trim(),
            Email        = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            PhoneNumber  = dto.PhoneNumber.Trim(),
            Address      = dto.Address.Trim(),
            Cnic         = dto.Cnic.Trim(),
            Role         = "Rider",
            IsActive     = true
        };

        var vehicle = new Vehicle
        {
            RegistrationNumber = dto.VehicleRegistration.Trim().ToUpper(),
            Model              = dto.VehicleModel.Trim(),
            Year               = dto.VehicleYear,
            Type               = dto.VehicleType.Trim(),
            Rider              = rider
        };

        _db.Users.Add(rider);
        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            rider.Id, rider.FullName, rider.Email, rider.PhoneNumber,
            rider.Address, rider.Cnic, rider.IsActive, rider.CreatedAt, rider.ProfilePhotoUrl,
            Vehicle = new
            {
                vehicle.Id, vehicle.RegistrationNumber,
                vehicle.Model, vehicle.Year, vehicle.Type, vehicle.PictureUrl
            },
            GeneratedPassword = plainPassword
        });
    }

    /// <summary>PUT /api/users/riders/{id} — Admin: update rider + vehicle details</summary>
    [HttpPut("riders/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRider(Guid id, [FromBody] UpdateRiderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var rider = await _db.Users.Include(u => u.Vehicle).FirstOrDefaultAsync(u => u.Id == id);
        if (rider == null || rider.Role != "Rider") return NotFound();

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.Trim().ToLower() && u.Id != id))
            return Conflict(new { message = "Email is already registered to another account." });

        rider.FullName    = dto.FullName.Trim();
        rider.Email       = dto.Email.Trim().ToLower();
        rider.PhoneNumber = dto.PhoneNumber.Trim();
        rider.Address     = dto.Address.Trim();
        rider.Cnic        = dto.Cnic.Trim();

        if (rider.Vehicle != null)
        {
            rider.Vehicle.RegistrationNumber = dto.VehicleRegistration.Trim().ToUpper();
            rider.Vehicle.Model              = dto.VehicleModel.Trim();
            rider.Vehicle.Year               = dto.VehicleYear;
            rider.Vehicle.Type               = dto.VehicleType.Trim();
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            rider.Id, rider.FullName, rider.Email, rider.PhoneNumber,
            rider.Address, rider.Cnic, rider.IsActive, rider.CreatedAt, rider.ProfilePhotoUrl,
            Vehicle = rider.Vehicle == null ? null : new
            {
                rider.Vehicle.Id, rider.Vehicle.RegistrationNumber,
                rider.Vehicle.Model, rider.Vehicle.Year, rider.Vehicle.Type, rider.Vehicle.PictureUrl
            }
        });
    }

    /// <summary>DELETE /api/users/riders/{id} — Admin: remove a rider</summary>
    [HttpDelete("riders/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteRider(Guid id)
    {
        var rider = await _db.Users.FindAsync(id);
        if (rider == null || rider.Role != "Rider") return NotFound();

        _db.Users.Remove(rider);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/users/riders/{id}/photo — Admin: upload rider profile photo</summary>
    [HttpPatch("riders/{id:guid}/photo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadRiderPhoto(Guid id, IFormFile? file)
    {
        var rider = await _db.Users.FindAsync(id);
        if (rider == null || rider.Role != "Rider") return NotFound();

        var url = await SaveImageAsync(file, "riders", id.ToString());
        if (url is string error && error.StartsWith("ERR:"))
            return BadRequest(new { message = error[4..] });

        if (!string.IsNullOrEmpty(rider.ProfilePhotoUrl))
            DeleteFile(rider.ProfilePhotoUrl);

        rider.ProfilePhotoUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { rider.Id, rider.ProfilePhotoUrl });
    }

    /// <summary>PATCH /api/users/riders/{id}/vehicle-photo — Admin: upload vehicle picture</summary>
    [HttpPatch("riders/{id:guid}/vehicle-photo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadVehiclePhoto(Guid id, IFormFile? file)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.RiderId == id);
        if (vehicle == null) return NotFound();

        var url = await SaveImageAsync(file, "vehicles", vehicle.Id.ToString());
        if (url is string error && error.StartsWith("ERR:"))
            return BadRequest(new { message = error[4..] });

        if (!string.IsNullOrEmpty(vehicle.PictureUrl))
            DeleteFile(vehicle.PictureUrl);

        vehicle.PictureUrl = url;
        await _db.SaveChangesAsync();
        return Ok(new { vehicle.Id, vehicle.PictureUrl });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> SaveImageAsync(IFormFile? file, string folder, string baseName)
    {
        if (file == null || file.Length == 0) return "ERR:No file provided.";
        if (file.Length > 2 * 1024 * 1024)   return "ERR:File size must not exceed 2 MB.";

        var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowed.Contains(file.ContentType.ToLower()))
            return "ERR:Only JPEG, PNG, and WebP images are allowed.";

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrEmpty(ext))
            ext = file.ContentType == "image/png" ? ".png"
                : file.ContentType == "image/webp" ? ".webp" : ".jpg";

        var dir  = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(dir);

        var path = Path.Combine(dir, $"{baseName}{ext}");
        using var stream = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{baseName}{ext}";
    }

    private void DeleteFile(string relativeUrl)
    {
        var full = Path.Combine(_env.WebRootPath, relativeUrl.TrimStart('/'));
        if (System.IO.File.Exists(full)) System.IO.File.Delete(full);
    }

    private static string GeneratePassword()
    {
        const string upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower  = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";

        // Format: 2 upper + @ + 2 lower + 3 digits  →  e.g. KM@hp782
        return string.Concat(
            upper[Random.Shared.Next(upper.Length)],
            upper[Random.Shared.Next(upper.Length)],
            "@",
            lower[Random.Shared.Next(lower.Length)],
            lower[Random.Shared.Next(lower.Length)],
            digits[Random.Shared.Next(digits.Length)],
            digits[Random.Shared.Next(digits.Length)],
            digits[Random.Shared.Next(digits.Length)]
        );
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

public class UpdateProfileDto
{
    public string FullName    { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address     { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required, MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;
}

public class CreateWorkerDto
{
    [Required(ErrorMessage = "Full name is required.")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [RegularExpression(@"^[^@\s]+@gmail\.com$",
        ErrorMessage = "Email must be a valid Gmail address (e.g. name@gmail.com).")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^\+92[0-9]{10}$",
        ErrorMessage = "Phone must start with +92 followed by exactly 10 digits, no spaces.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Address is required.")]
    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    [Required(ErrorMessage = "CNIC is required.")]
    [RegularExpression(@"^\d{13}$",
        ErrorMessage = "CNIC must be exactly 13 digits (numbers only).")]
    public string Cnic { get; set; } = string.Empty;

    [Required(ErrorMessage = "Restaurant is required.")]
    public Guid RestaurantId { get; set; }
}

public class UpdateWorkerDto : CreateWorkerDto { }

public class CreateRiderDto
{
    [Required(ErrorMessage = "Full name is required.")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [RegularExpression(@"^[^@\s]+@gmail\.com$",
        ErrorMessage = "Email must be a valid Gmail address (e.g. name@gmail.com).")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^\+92[0-9]{10}$",
        ErrorMessage = "Phone must start with +92 followed by exactly 10 digits, no spaces.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Address is required.")]
    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    [Required(ErrorMessage = "CNIC is required.")]
    [RegularExpression(@"^\d{13}$",
        ErrorMessage = "CNIC must be exactly 13 digits (numbers only).")]
    public string Cnic { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vehicle registration number is required.")]
    [MaxLength(20)]
    public string VehicleRegistration { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vehicle model is required.")]
    [MaxLength(80)]
    public string VehicleModel { get; set; } = string.Empty;

    [Required(ErrorMessage = "Model year is required.")]
    [Range(1990, 2030, ErrorMessage = "Year must be between 1990 and 2030.")]
    public int VehicleYear { get; set; }

    [Required(ErrorMessage = "Vehicle type is required.")]
    [RegularExpression(@"^(Bike|Car|Scooter)$",
        ErrorMessage = "Vehicle type must be Bike, Car, or Scooter.")]
    public string VehicleType { get; set; } = string.Empty;
}

public class UpdateRiderDto : CreateRiderDto { }

public class CreateOwnerDto
{
    public string FullName    { get; set; } = string.Empty;
    public string Email       { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address     { get; set; } = string.Empty;
    public string Cnic        { get; set; } = string.Empty;

    // kept for any future use / ignored by CreateOwner
    public string? OpenTime               { get; set; }
    public string? CloseTime              { get; set; }
    public decimal DeliveryFee            { get; set; }
    public int     DeliveryTime           { get; set; } = 30;
}

public class CreateKitchenStaffDto
{
    public string FullName    { get; set; } = string.Empty;
    public string Email       { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address     { get; set; } = string.Empty;
}

public class UpdateKitchenStaffDto
{
    public string FullName    { get; set; } = string.Empty;
    public string Email       { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address     { get; set; } = string.Empty;
}

public class UpdateOwnerDto
{
    [Required] public string FullName    { get; set; } = string.Empty;
    [Required] [RegularExpression(@"^[^@\s]+@gmail\.com$", ErrorMessage = "Must be a Gmail address.")]
               public string Email       { get; set; } = string.Empty;
    [Required] [RegularExpression(@"^\+92[0-9]{10}$", ErrorMessage = "Must start with +92 and 10 digits.")]
               public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string Address     { get; set; } = string.Empty;
    public string? Cnic       { get; set; }
    public UpdateOwnerRestaurantDto? Restaurant { get; set; }
}

public class UpdateOwnerRestaurantDto
{
    public string? Name        { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl    { get; set; }
    public string? Address     { get; set; }
    public string? PhoneNumber { get; set; }
    public Guid?   CategoryId  { get; set; }
    public string? OpenTime    { get; set; }
    public string? CloseTime   { get; set; }
    public decimal DeliveryFee  { get; set; }
    public int     DeliveryTime { get; set; } = 30;
}
