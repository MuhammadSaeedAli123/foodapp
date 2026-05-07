using System.Text;
using FoodDelivery.API.Hubs;
using FoodDelivery.API.Infrastructure.Data;
using FoodDelivery.API.Infrastructure.Services;
using FoodDelivery.API.Core.Interfaces;
using FoodDelivery.API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers ──────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Swagger with JWT Authorize button ────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "FoodRush API",
        Version     = "v1",
        Description = "Food Delivery Platform — REST API"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token. Example: eyJhbGci..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Database (SQLite) ────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=fooddelivery.db"));

// ── JWT Authentication ───────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey   = jwtSettings["SecretKey"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSettings["Issuer"],
            ValidAudience            = jwtSettings["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };

        // Allow SignalR to read token from query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path        = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            // Don't challenge anonymous hub connections — methods needing auth use [Authorize]
            OnChallenge = context =>
            {
                if (context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.HandleResponse();
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,              AuthService>();
builder.Services.AddScoped<IRestaurantService,        RestaurantService>();
builder.Services.AddScoped<IFoodItemService,          FoodItemService>();
builder.Services.AddScoped<IOrderService,             OrderService>();
builder.Services.AddScoped<IOrderNotificationService, OrderNotificationService>();
builder.Services.AddScoped<ISearchService,            SearchService>();

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ════════════════════════════════════════════════════════════════════════════
var app = builder.Build();
// ════════════════════════════════════════════════════════════════════════════

// ── Migrate DB + seed dummy data on startup ───────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DataSeeder.SeedAsync(db);
}

// ── Swagger (always enabled — move inside IsDevelopment() for production) ────
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "FoodRush API v1");
    options.RoutePrefix = "swagger";          // → http://localhost:PORT/swagger
    options.DisplayRequestDuration();
    options.DocumentTitle = "FoodRush API";
});

// ── Middleware pipeline (order is critical) ───────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();  // 1. catch all unhandled exceptions
app.UseCors("FrontendPolicy");            // 2. CORS headers (before auth)
app.UseStaticFiles();                     // 3. serve wwwroot/uploads/*
app.UseAuthentication();                  // 3. parse + validate JWT token
app.UseAuthorization();                   // 4. enforce [Authorize] attributes

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapControllers();
app.MapHub<OrderHub>("/hubs/orders");

app.Run();