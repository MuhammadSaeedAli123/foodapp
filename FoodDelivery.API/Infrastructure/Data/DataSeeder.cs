using FoodDelivery.API.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedRestaurantsAsync(db);
        await SeedOwnersAsync(db);
        await SeedFurqanAsync(db);
        await SeedKitchenStaffAsync(db);
        await SeedBurgerHutStaffAsync(db);
        await SeedWorkersAsync(db);
        await SeedReviewsAsync(db);
    }

    private static async Task SeedRestaurantsAsync(AppDbContext db)
    {
        var seedId = Guid.Parse("a1000000-0000-0000-0000-000000000001");
        if (await db.Restaurants.AnyAsync(r => r.Id == seedId)) return;

        // ── Category IDs (already seeded via migration) ───────────────────────
        var fastFood = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var pizza    = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var sushi    = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var desi     = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var chinese  = Guid.Parse("55555555-5555-5555-5555-555555555555");

        // ── Restaurants ───────────────────────────────────────────────────────
        var r1 = new Restaurant
        {
            Id           = Guid.Parse("a1000000-0000-0000-0000-000000000001"),
            Name         = "Burger Palace",
            Description  = "Home of the juiciest burgers and crispy fries in town.",
            ImageUrl     = "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600",
            Address      = "12 Main Street, Downtown",
            PhoneNumber  = "+1 555-0101",
            Rating       = 4.7m,
            IsOpen       = true,
            DeliveryTime = 25,
            DeliveryFee  = 1.99m,
            CategoryId   = fastFood
        };

        var r2 = new Restaurant
        {
            Id           = Guid.Parse("a2000000-0000-0000-0000-000000000002"),
            Name         = "KFC Express",
            Description  = "Finger lickin' good fried chicken, sandwiches & combos.",
            ImageUrl     = "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600",
            Address      = "88 West Ave, Midtown",
            PhoneNumber  = "+1 555-0102",
            Rating       = 4.4m,
            IsOpen       = true,
            DeliveryTime = 20,
            DeliveryFee  = 0.99m,
            CategoryId   = fastFood
        };

        var r3 = new Restaurant
        {
            Id           = Guid.Parse("a3000000-0000-0000-0000-000000000003"),
            Name         = "Pizza Heaven",
            Description  = "Wood-fired pizzas with authentic Italian ingredients.",
            ImageUrl     = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
            Address      = "45 Napoli Lane, East Side",
            PhoneNumber  = "+1 555-0103",
            Rating       = 4.8m,
            IsOpen       = true,
            DeliveryTime = 35,
            DeliveryFee  = 2.49m,
            CategoryId   = pizza
        };

        var r4 = new Restaurant
        {
            Id           = Guid.Parse("a4000000-0000-0000-0000-000000000004"),
            Name         = "Domino's Corner",
            Description  = "Hot, fresh pizzas delivered fast with your favourite toppings.",
            ImageUrl     = "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
            Address      = "7 Pizza Plaza, Uptown",
            PhoneNumber  = "+1 555-0104",
            Rating       = 4.3m,
            IsOpen       = true,
            DeliveryTime = 30,
            DeliveryFee  = 1.49m,
            CategoryId   = pizza
        };

        var r5 = new Restaurant
        {
            Id           = Guid.Parse("a5000000-0000-0000-0000-000000000005"),
            Name         = "Tokyo Garden",
            Description  = "Authentic Japanese sushi and sashimi crafted by master chefs.",
            ImageUrl     = "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600",
            Address      = "33 Sakura Blvd, Japantown",
            PhoneNumber  = "+1 555-0105",
            Rating       = 4.9m,
            IsOpen       = true,
            DeliveryTime = 40,
            DeliveryFee  = 3.99m,
            CategoryId   = sushi
        };

        var r6 = new Restaurant
        {
            Id           = Guid.Parse("a6000000-0000-0000-0000-000000000006"),
            Name         = "Spice Route",
            Description  = "Traditional South Asian flavours — biryanis, curries & breads.",
            ImageUrl     = "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600",
            Address      = "22 Curry Mile, Southside",
            PhoneNumber  = "+1 555-0106",
            Rating       = 4.6m,
            IsOpen       = true,
            DeliveryTime = 35,
            DeliveryFee  = 1.99m,
            CategoryId   = desi
        };

        var r7 = new Restaurant
        {
            Id           = Guid.Parse("a7000000-0000-0000-0000-000000000007"),
            Name         = "Karachi Kitchen",
            Description  = "Authentic Pakistani street food and homestyle cooking.",
            ImageUrl     = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600",
            Address      = "5 Biryani Street, North Quarter",
            PhoneNumber  = "+1 555-0107",
            Rating       = 4.5m,
            IsOpen       = true,
            DeliveryTime = 30,
            DeliveryFee  = 1.49m,
            CategoryId   = desi
        };

        var r8 = new Restaurant
        {
            Id           = Guid.Parse("a8000000-0000-0000-0000-000000000008"),
            Name         = "Dragon Wok",
            Description  = "Bold Chinese flavours — dim sum, noodles and wok-fired classics.",
            ImageUrl     = "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600",
            Address      = "18 Dragon Street, Chinatown",
            PhoneNumber  = "+1 555-0108",
            Rating       = 4.5m,
            IsOpen       = true,
            DeliveryTime = 30,
            DeliveryFee  = 2.49m,
            CategoryId   = chinese
        };

        var restaurants = new List<Restaurant> { r1, r2, r3, r4, r5, r6, r7, r8 };
        db.Restaurants.AddRange(restaurants);
        await db.SaveChangesAsync();

        // ── Food Items ────────────────────────────────────────────────────────
        var foodItems = new List<FoodItem>
        {
            // Burger Palace (r1)
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "Classic Smash Burger",     Price = 9.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300", Description = "Double smash patty, cheddar, lettuce, tomato, house sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "BBQ Bacon Burger",         Price = 12.49m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300", Description = "Beef patty, crispy bacon, BBQ sauce, onion rings, pickles." },
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "Crispy Chicken Burger",    Price = 10.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=300", Description = "Buttermilk fried chicken, coleslaw, sriracha mayo." },
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "Loaded Cheese Fries",      Price = 5.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300", Description = "Crispy fries smothered in nacho cheese and jalapeños." },
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "Onion Rings",              Price = 3.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1639024471283-03518883512d?w=300", Description = "Golden battered onion rings with dipping sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r1.Id, Name = "Chocolate Milkshake",      Price = 4.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300", Description = "Thick creamy chocolate shake topped with whipped cream." },

            // KFC Express (r2)
            new() { Id = Guid.NewGuid(), RestaurantId = r2.Id, Name = "Zinger Burger",            Price = 8.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?w=300", Description = "Spicy crispy chicken fillet, lettuce, mayo in a toasted bun." },
            new() { Id = Guid.NewGuid(), RestaurantId = r2.Id, Name = "Bucket of 8 Pieces",       Price = 22.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300", Description = "8 pieces original recipe fried chicken." },
            new() { Id = Guid.NewGuid(), RestaurantId = r2.Id, Name = "Popcorn Chicken",          Price = 6.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1562967914-608f82629710?w=300", Description = "Bite-sized crispy chicken pieces with hot sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r2.Id, Name = "Coleslaw",                 Price = 2.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300", Description = "Creamy homestyle coleslaw." },
            new() { Id = Guid.NewGuid(), RestaurantId = r2.Id, Name = "Corn on the Cob",          Price = 2.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1601004890657-faa8a8e7fad8?w=300", Description = "Buttery seasoned corn on the cob." },

            // Pizza Heaven (r3)
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "Margherita Pizza",         Price = 13.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300", Description = "San Marzano tomato, fresh mozzarella, basil, EVOO." },
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "Pepperoni Pizza",          Price = 15.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300", Description = "Double pepperoni, mozzarella, tomato sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "BBQ Chicken Pizza",        Price = 16.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300", Description = "Grilled chicken, BBQ sauce, red onion, mozzarella." },
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "Veggie Supreme Pizza",     Price = 14.49m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1571066811602-716837d681de?w=300", Description = "Bell peppers, mushrooms, olives, onions, corn." },
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "Garlic Bread",             Price = 4.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1619531040576-f9416740661f?w=300", Description = "Toasted sourdough with garlic butter and herbs." },
            new() { Id = Guid.NewGuid(), RestaurantId = r3.Id, Name = "Tiramisu",                 Price = 6.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300", Description = "Classic Italian tiramisu with mascarpone and espresso." },

            // Domino's Corner (r4)
            new() { Id = Guid.NewGuid(), RestaurantId = r4.Id, Name = "Chicken Feast Pizza",      Price = 17.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300", Description = "Loaded with grilled and crispy chicken pieces." },
            new() { Id = Guid.NewGuid(), RestaurantId = r4.Id, Name = "Cheese & Tomato Pizza",    Price = 11.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300", Description = "Simple, cheesy perfection on a hand-stretched base." },
            new() { Id = Guid.NewGuid(), RestaurantId = r4.Id, Name = "Potato Wedges",            Price = 4.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300", Description = "Seasoned crispy potato wedges with sour cream dip." },
            new() { Id = Guid.NewGuid(), RestaurantId = r4.Id, Name = "Chocolate Lava Cake",      Price = 5.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300", Description = "Warm chocolate cake with gooey molten centre." },

            // Tokyo Garden (r5)
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Salmon Nigiri (6 pcs)",    Price = 13.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1553621042-f6e147245754?w=300", Description = "Fresh Atlantic salmon over hand-pressed sushi rice." },
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Tuna & Avocado Roll",      Price = 11.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300", Description = "Tuna, avocado, cucumber wrapped in nori & sesame rice." },
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Dragon Roll",              Price = 15.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1562802378-063ec186a863?w=300", Description = "Shrimp tempura roll topped with avocado and eel sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Miso Soup",                Price = 3.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300", Description = "Traditional dashi miso with tofu and wakame." },
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Edamame",                  Price = 4.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1612187185664-fa9afe9d9d72?w=300", Description = "Steamed salted soybeans. Simple and delicious." },
            new() { Id = Guid.NewGuid(), RestaurantId = r5.Id, Name = "Matcha Ice Cream",         Price = 5.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300", Description = "Creamy Japanese matcha green tea ice cream." },

            // Spice Route (r6)
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Chicken Biryani",          Price = 14.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300", Description = "Fragrant basmati rice cooked with spiced chicken and saffron." },
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Butter Chicken",           Price = 13.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300", Description = "Tender chicken in a rich tomato-cream sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Garlic Naan",              Price = 2.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300", Description = "Soft tandoor-baked flatbread with garlic and butter." },
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Dal Makhani",              Price = 10.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300", Description = "Slow-cooked black lentils in butter and cream." },
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Samosa (4 pcs)",           Price = 4.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300", Description = "Crispy pastry filled with spiced potatoes and peas." },
            new() { Id = Guid.NewGuid(), RestaurantId = r6.Id, Name = "Mango Lassi",              Price = 3.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=300", Description = "Chilled yoghurt drink blended with fresh Alphonso mango." },

            // Karachi Kitchen (r7)
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Beef Karahi",              Price = 16.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=300", Description = "Tender beef slow-cooked in tomatoes, ginger and green chillies." },
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Mutton Biryani",           Price = 15.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300", Description = "Bone-in mutton biryani with caramelised onions and raita." },
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Seekh Kebab (4 pcs)",      Price = 9.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?w=300", Description = "Minced beef kebabs grilled on skewers with green chutney." },
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Chapli Kebab",             Price = 8.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=300", Description = "Peshwari-style spiced minced meat patties." },
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Roghni Naan",              Price = 2.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300", Description = "Sesame-topped butter naan baked in a traditional tandoor." },
            new() { Id = Guid.NewGuid(), RestaurantId = r7.Id, Name = "Kheer",                    Price = 4.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300", Description = "Creamy rice pudding with cardamom, saffron and pistachios." },

            // Dragon Wok (r8)
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Kung Pao Chicken",         Price = 13.49m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=300", Description = "Spicy stir-fried chicken with peanuts, chillies and vegetables." },
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Yang Chow Fried Rice",     Price = 10.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300", Description = "Wok-fried rice with shrimp, BBQ pork and egg." },
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Chicken Dim Sum (6 pcs)",  Price = 8.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300", Description = "Steamed chicken and prawn dumplings with soy dipping sauce." },
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Crispy Spring Rolls (4)",  Price = 6.49m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?w=300", Description = "Golden deep-fried rolls stuffed with vegetables and pork." },
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Hot & Sour Soup",          Price = 5.99m,  IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300", Description = "Classic Chinese soup with tofu, bamboo shoots and egg ribbons." },
            new() { Id = Guid.NewGuid(), RestaurantId = r8.Id, Name = "Beef Chow Mein",           Price = 12.99m, IsAvailable = true, ImageUrl = "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300", Description = "Stir-fried egg noodles with tender beef strips and vegetables." },
        };

        db.FoodItems.AddRange(foodItems);
        await db.SaveChangesAsync();
    }

    private static async Task SeedOwnersAsync(AppDbContext db)
    {
        // Guard by email so it works whether owners were seeded or created via the API
        if (await db.Users.AnyAsync(u => u.Email == "omar.shahid@gmail.com")) return;

        var o1 = new User
        {
            Id           = Guid.Parse("b1000000-0000-0000-0000-000000000001"),
            FullName     = "Omar Shahid",
            Email        = "omar.shahid@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"),
            PhoneNumber  = "+923011234567",
            Address      = "12 Main Street, Downtown",
            Role         = "RestaurantOwner",
            IsActive     = true,
            CreatedAt    = new DateTime(2024, 1, 2, 0, 0, 0, DateTimeKind.Utc)
        };
        var o2 = new User
        {
            Id           = Guid.Parse("b2000000-0000-0000-0000-000000000002"),
            FullName     = "Amara Khan",
            Email        = "amara.khan@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"),
            PhoneNumber  = "+923021234567",
            Address      = "45 Napoli Lane, East Side",
            Role         = "RestaurantOwner",
            IsActive     = true,
            CreatedAt    = new DateTime(2024, 1, 3, 0, 0, 0, DateTimeKind.Utc)
        };
        var o3 = new User
        {
            Id           = Guid.Parse("b3000000-0000-0000-0000-000000000003"),
            FullName     = "Hana Yuki",
            Email        = "hana.yuki@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"),
            PhoneNumber  = "+923031234567",
            Address      = "33 Sakura Blvd, Japantown",
            Role         = "RestaurantOwner",
            IsActive     = true,
            CreatedAt    = new DateTime(2024, 1, 4, 0, 0, 0, DateTimeKind.Utc)
        };

        db.Users.AddRange(o1, o2, o3);
        await db.SaveChangesAsync();

        // Link owners to their restaurants (look up from DB since r1/r3/r5 may already be tracked)
        var r1 = await db.Restaurants.FindAsync(Guid.Parse("a1000000-0000-0000-0000-000000000001"));
        var r3 = await db.Restaurants.FindAsync(Guid.Parse("a3000000-0000-0000-0000-000000000003"));
        var r5 = await db.Restaurants.FindAsync(Guid.Parse("a5000000-0000-0000-0000-000000000005"));
        if (r1 != null) r1.OwnerId = o1.Id;
        if (r3 != null) r3.OwnerId = o2.Id;
        if (r5 != null) r5.OwnerId = o3.Id;
        await db.SaveChangesAsync();
    }

    private static async Task SeedFurqanAsync(AppDbContext db)
    {
        // ── 1. Ensure furqan account exists ───────────────────────────────────
        var furqan = await db.Users.FirstOrDefaultAsync(u => u.Email == "furqan@gmail.com");
        if (furqan == null)
        {
            furqan = new User
            {
                Id           = Guid.Parse("f0000000-0000-0000-0000-000000000001"),
                FullName     = "Furqan Ahmed",
                Email        = "furqan@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"),
                PhoneNumber  = "+923001234567",
                Address      = "5 Biryani Street, North Quarter",
                Role         = "RestaurantOwner",
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 1, 5, 0, 0, 0, DateTimeKind.Utc),
            };
            db.Users.Add(furqan);
            await db.SaveChangesAsync();
        }

        // ── 2. Ensure a restaurant is linked to furqan ────────────────────────
        var restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == furqan.Id);
        if (restaurant == null)
        {
            var r7 = await db.Restaurants.FindAsync(Guid.Parse("a7000000-0000-0000-0000-000000000007"));
            if (r7 == null) return;
            r7.OwnerId = furqan.Id;
            await db.SaveChangesAsync();
            restaurant = r7;
        }

        // ── 3. Ensure menu items exist ────────────────────────────────────────
        var foodItems = await db.FoodItems
            .Where(f => f.RestaurantId == restaurant.Id)
            .ToListAsync();

        if (foodItems.Count == 0)
        {
            foodItems = new List<FoodItem>
            {
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Beef Karahi",       Price = 16.99m,
                    Description = "Tender beef slow-cooked in tomatoes, ginger and green chillies.",
                    ImageUrl = "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Mutton Biryani",    Price = 15.99m,
                    Description = "Bone-in mutton biryani with caramelised onions and raita.",
                    ImageUrl = "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Seekh Kebab (4 pcs)", Price = 9.99m,
                    Description = "Minced beef kebabs grilled on skewers with green chutney.",
                    ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Chapli Kebab",      Price = 8.99m,
                    Description = "Peshwari-style spiced minced meat patties.",
                    ImageUrl = "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Chicken Karahi",    Price = 14.99m,
                    Description = "Juicy chicken cooked in a spiced tomato-based sauce.",
                    ImageUrl = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Roghni Naan",       Price = 2.49m,
                    Description = "Sesame-topped butter naan baked in a traditional tandoor.",
                    ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Daal Mash",         Price = 7.99m,
                    Description = "Slow-cooked white lentils tempered with garlic and butter.",
                    ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Kheer",             Price = 4.49m,
                    Description = "Creamy rice pudding with cardamom, saffron and pistachios.",
                    ImageUrl = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Lassi (Large)",     Price = 3.49m,
                    Description = "Chilled sweet yoghurt drink, served with cream.",
                    ImageUrl = "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=300" },
                new() { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, IsAvailable = true,
                    Name = "Halwa Puri (2 pcs)", Price = 6.99m,
                    Description = "Crispy fried puris with sweet semolina halwa and chana masala.",
                    ImageUrl = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300" },
            };
            db.FoodItems.AddRange(foodItems);
            await db.SaveChangesAsync();
        }

        // ── 4. Skip if orders already exist for this restaurant ───────────────
        if (await db.Orders.AnyAsync(o => o.RestaurantId == restaurant.Id)) return;

        // ── 5. Ensure seed customers exist ────────────────────────────────────
        var customerDefs = new[]
        {
            (Id: "f1c00000-0000-0000-0000-000000000001", Name: "Ahmed Raza",   Email: "ahmed.c@gmail.com",  Phone: "+923001230001"),
            (Id: "f1c00000-0000-0000-0000-000000000002", Name: "Sana Mirza",   Email: "sana.c@gmail.com",   Phone: "+923001230002"),
            (Id: "f1c00000-0000-0000-0000-000000000003", Name: "Bilal Riaz",   Email: "bilal.c@gmail.com",  Phone: "+923001230003"),
            (Id: "f1c00000-0000-0000-0000-000000000004", Name: "Nadia Cheema", Email: "nadia.c@gmail.com",  Phone: "+923001230004"),
            (Id: "f1c00000-0000-0000-0000-000000000005", Name: "Usman Ghani",  Email: "usman.c@gmail.com",  Phone: "+923001230005"),
        };

        var customers = new List<User>();
        foreach (var def in customerDefs)
        {
            var u = await db.Users.FirstOrDefaultAsync(x => x.Email == def.Email);
            if (u == null)
            {
                u = new User
                {
                    Id           = Guid.Parse(def.Id),
                    FullName     = def.Name,
                    Email        = def.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123"),
                    PhoneNumber  = def.Phone,
                    Role         = "User",
                    Address      = "Karachi, Pakistan",
                    IsActive     = true,
                    CreatedAt    = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                };
                db.Users.Add(u);
            }
            customers.Add(u);
        }
        await db.SaveChangesAsync();

        // ── 6. Seed orders across last 30 days ────────────────────────────────
        var rng  = new Random(42);
        var now  = DateTime.UtcNow;

        var addresses = new[]
        {
            "Block 5, Gulshan-e-Iqbal, Karachi",
            "DHA Phase 2, Karachi",
            "F-8 Markaz, Islamabad",
            "Model Town, Lahore",
            "Saddar Bazaar, Karachi",
            "Clifton Block 4, Karachi",
        };

        // 18 Delivered, 3 Cancelled, 2 Pending, 1 Preparing, 1 OutForDelivery
        var statusPool = new List<string>();
        statusPool.AddRange(Enumerable.Repeat(OrderStatus.Delivered,      18));
        statusPool.AddRange(Enumerable.Repeat(OrderStatus.Cancelled,       3));
        statusPool.AddRange(Enumerable.Repeat(OrderStatus.Pending,         2));
        statusPool.AddRange(Enumerable.Repeat(OrderStatus.Preparing,       1));
        statusPool.AddRange(Enumerable.Repeat(OrderStatus.OutForDelivery,  1));

        // Fisher-Yates shuffle (deterministic)
        for (int i = statusPool.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (statusPool[i], statusPool[j]) = (statusPool[j], statusPool[i]);
        }

        var orders = new List<Order>();
        for (int i = 0; i < statusPool.Count; i++)
        {
            var status    = statusPool[i];
            var daysAgo   = status is OrderStatus.Pending or OrderStatus.Preparing or OrderStatus.OutForDelivery
                            ? rng.Next(0, 2)        // recent active orders
                            : rng.Next(1, 31);      // historical orders spread across 30 days
            var orderDate = now.Date.AddDays(-daysAgo)
                                   .AddHours(rng.Next(10, 22))
                                   .AddMinutes(rng.Next(0, 60));

            // Pick 1–3 random items
            var picked = foodItems.OrderBy(_ => rng.Next()).Take(rng.Next(1, 4)).ToList();
            var orderItems = picked.Select(fi =>
            {
                var qty = rng.Next(1, 4);
                return new OrderItem
                {
                    Id         = Guid.NewGuid(),
                    FoodItemId = fi.Id,
                    Quantity   = qty,
                    UnitPrice  = fi.Price,
                    SubTotal   = fi.Price * qty,
                };
            }).ToList();

            orders.Add(new Order
            {
                Id              = Guid.NewGuid(),
                Status          = status,
                TotalAmount     = orderItems.Sum(oi => oi.SubTotal),
                DeliveryAddress = addresses[rng.Next(addresses.Length)],
                Notes           = "",
                UserId          = customers[rng.Next(customers.Count)].Id,
                RestaurantId    = restaurant.Id,
                CreatedAt       = orderDate,
                UpdatedAt       = status == OrderStatus.Delivered
                                  ? orderDate.AddMinutes(rng.Next(30, 90))
                                  : orderDate.AddMinutes(rng.Next(5, 20)),
                OrderItems      = orderItems,
            });
        }

        db.Orders.AddRange(orders);
        await db.SaveChangesAsync();
    }

    private static async Task SeedKitchenStaffAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Email == "ali.cook@gmail.com")) return;

        var r1Id = Guid.Parse("a1000000-0000-0000-0000-000000000001"); // Burger Palace
        var r3Id = Guid.Parse("a3000000-0000-0000-0000-000000000003"); // Pizza Heaven
        var r5Id = Guid.Parse("a5000000-0000-0000-0000-000000000005"); // Tokyo Garden

        // Ensure restaurants exist before linking
        var r1 = await db.Restaurants.FindAsync(r1Id);
        var r3 = await db.Restaurants.FindAsync(r3Id);
        var r5 = await db.Restaurants.FindAsync(r5Id);

        var staff = new List<User>();

        if (r1 != null)
        {
            staff.Add(new User
            {
                Id           = Guid.Parse("c1000000-0000-0000-0000-000000000001"),
                FullName     = "Ali Hassan",
                Email        = "ali.cook@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923041234567",
                Address      = "12 Main Street, Downtown",
                Role         = "KitchenStaff",
                RestaurantId = r1Id,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc)
            });
            staff.Add(new User
            {
                Id           = Guid.Parse("c2000000-0000-0000-0000-000000000002"),
                FullName     = "Sara Malik",
                Email        = "sara.cook@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923051234567",
                Address      = "12 Main Street, Downtown",
                Role         = "KitchenStaff",
                RestaurantId = r1Id,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 2, 2, 0, 0, 0, DateTimeKind.Utc)
            });
        }

        if (r3 != null)
        {
            staff.Add(new User
            {
                Id           = Guid.Parse("c3000000-0000-0000-0000-000000000003"),
                FullName     = "Marco Ricci",
                Email        = "marco.cook@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923061234567",
                Address      = "45 Napoli Lane, East Side",
                Role         = "KitchenStaff",
                RestaurantId = r3Id,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 2, 3, 0, 0, 0, DateTimeKind.Utc)
            });
        }

        if (r5 != null)
        {
            staff.Add(new User
            {
                Id           = Guid.Parse("c4000000-0000-0000-0000-000000000004"),
                FullName     = "Yuki Tanaka",
                Email        = "yuki.cook@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923071234567",
                Address      = "33 Sakura Blvd, Japantown",
                Role         = "KitchenStaff",
                RestaurantId = r5Id,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 2, 4, 0, 0, 0, DateTimeKind.Utc)
            });
        }

        if (staff.Any())
        {
            db.Users.AddRange(staff);
            await db.SaveChangesAsync();
        }
    }

    private static async Task SeedBurgerHutStaffAsync(AppDbContext db)
    {
        // Guard by first staff email — skips if already seeded
        if (await db.Users.AnyAsync(u => u.Email == "zain.burgerhut@gmail.com")) return;

        var burgerHutId = Guid.Parse("CFE720DB-CAB1-4F41-9E13-AABD48063F81");
        var restaurant  = await db.Restaurants.FindAsync(burgerHutId);
        if (restaurant == null) return; // Restaurant not found — skip

        var staff = new List<User>
        {
            new()
            {
                Id           = Guid.Parse("d1000000-0000-0000-0000-000000000001"),
                FullName     = "Zain Ahmed",
                Email        = "zain.burgerhut@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923081234567",
                Address      = "Burger Hut Kitchen, Lahore",
                Role         = "KitchenStaff",
                RestaurantId = burgerHutId,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id           = Guid.Parse("d2000000-0000-0000-0000-000000000002"),
                FullName     = "Nadia Tariq",
                Email        = "nadia.burgerhut@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923091234567",
                Address      = "Burger Hut Kitchen, Lahore",
                Role         = "KitchenStaff",
                RestaurantId = burgerHutId,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 3, 2, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id           = Guid.Parse("d3000000-0000-0000-0000-000000000003"),
                FullName     = "Hamza Raza",
                Email        = "hamza.burgerhut@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                PhoneNumber  = "+923101234567",
                Address      = "Burger Hut Kitchen, Lahore",
                Role         = "KitchenStaff",
                RestaurantId = burgerHutId,
                IsActive     = true,
                CreatedAt    = new DateTime(2024, 3, 3, 0, 0, 0, DateTimeKind.Utc)
            },
        };

        db.Users.AddRange(staff);
        await db.SaveChangesAsync();
    }

    private static async Task SeedReviewsAsync(AppDbContext db)
    {
        var furqan = await db.Users.FirstOrDefaultAsync(u => u.Email == "furqan@gmail.com");
        if (furqan == null) return;

        var restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.OwnerId == furqan.Id);
        if (restaurant == null) return;

        if (await db.Reviews.AnyAsync(r => r.RestaurantId == restaurant.Id)) return;

        var deliveredOrders = await db.Orders
            .Where(o => o.RestaurantId == restaurant.Id && o.Status == OrderStatus.Delivered)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        if (deliveredOrders.Count == 0) return;

        var rng = new Random(42);

        var comments = new Dictionary<int, string[]>
        {
            [5] = new[]
            {
                "Absolutely amazing! The Beef Karahi was tender and perfectly spiced. Will definitely order again!",
                "Best biryani I have had in a long time. Fresh, aromatic and cooked just right.",
                "Outstanding quality and fast delivery. The seekh kebabs were perfectly grilled — restaurant quality at home.",
                "The kheer was heavenly — creamy with just the right cardamom. Love this place!",
                "Everything arrived piping hot and delicious. Never disappoints!",
                "Mutton Biryani was absolutely on point. Generous portions and great value for money.",
            },
            [4] = new[]
            {
                "Really good food, very authentic taste. Minor delay in delivery but worth the wait.",
                "Great flavours overall. The roghni naan was soft and fresh. Would definitely recommend.",
                "Solid Pakistani food at a fair price. The seekh kebabs could use a touch more spice but still great.",
                "Good portion sizes and tasty food. The lassi was refreshing and well chilled.",
                "Nice food, the chapli kebab was flavourful though slightly oily. Would order again.",
                "Consistent quality every time. The daal mash was comfort food at its best.",
            },
            [3] = new[]
            {
                "Decent food but nothing extraordinary. Delivery was on time though.",
                "Average. The chapli kebab was a bit dry. Everything else was fine.",
                "It was okay. Expected more spice in the karahi.",
                "Decent portions but the daal was slightly bland. Might give it another try.",
                "Packaging was good but the food felt lukewarm when it arrived.",
            },
            [2] = new[]
            {
                "Disappointing. The biryani was dry and lacked the depth of flavour I expected.",
                "Naan arrived cold and stiff. The karahi was too oily for my taste.",
                "Long wait and the order was partially wrong. Needs improvement.",
            },
            [1] = new[]
            {
                "Food arrived cold and tasteless. Very disappointing experience.",
                "Order arrived very late and was completely wrong. Will not order again.",
            },
        };

        // 6×5★  5×4★  3×3★  2×2★  2×1★  = 18 reviews
        var ratingPool = new List<int>();
        ratingPool.AddRange(Enumerable.Repeat(5, 6));
        ratingPool.AddRange(Enumerable.Repeat(4, 5));
        ratingPool.AddRange(Enumerable.Repeat(3, 3));
        ratingPool.AddRange(Enumerable.Repeat(2, 2));
        ratingPool.AddRange(Enumerable.Repeat(1, 2));

        for (int i = ratingPool.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (ratingPool[i], ratingPool[j]) = (ratingPool[j], ratingPool[i]);
        }

        var usedIdx  = new Dictionary<int, int>();
        var reviews  = new List<Review>();
        int count    = Math.Min(ratingPool.Count, deliveredOrders.Count);

        for (int i = 0; i < count; i++)
        {
            var order  = deliveredOrders[i];
            var rating = ratingPool[i];
            var pool   = comments[rating];
            usedIdx.TryGetValue(rating, out int idx);
            var comment = pool[idx % pool.Length];
            usedIdx[rating] = idx + 1;

            reviews.Add(new Review
            {
                Id           = Guid.NewGuid(),
                Rating       = rating,
                Comment      = comment,
                CreatedAt    = order.UpdatedAt.AddMinutes(rng.Next(10, 120)),
                OrderId      = order.Id,
                UserId       = order.UserId,
                RestaurantId = restaurant.Id,
            });
        }

        db.Reviews.AddRange(reviews);
        await db.SaveChangesAsync();

        restaurant.Rating = Math.Round((decimal)reviews.Average(r => r.Rating), 1);
        await db.SaveChangesAsync();
    }

    private static async Task SeedWorkersAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Email == "bilal.worker@gmail.com")) return;

        // Use actual restaurant IDs from the DB — avoids FK failures when
        // seeded restaurant GUIDs don't match what's in the database.
        var rIds = await db.Restaurants
            .OrderBy(r => r.Name)
            .Select(r => r.Id)
            .Take(5)
            .ToListAsync();

        if (rIds.Count == 0) return;   // no restaurants yet — skip worker seeding

        Guid R(int i) => rIds[i % rIds.Count];

        var workers = new List<User>
        {
            new() {
                Id = Guid.Parse("e1000000-0000-0000-0000-000000000001"),
                FullName = "Bilal Ahmed", Email = "bilal.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111001", Address = "Kitchen Staff, Karachi",
                Cnic = "4200011110001", RestaurantId = R(0), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e2000000-0000-0000-0000-000000000002"),
                FullName = "Fatima Malik", Email = "fatima.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111002", Address = "Kitchen Staff, Karachi",
                Cnic = "4200011110002", RestaurantId = R(0), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 11, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e3000000-0000-0000-0000-000000000003"),
                FullName = "Usman Qureshi", Email = "usman.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111003", Address = "Kitchen Staff, Lahore",
                Cnic = "3520011110003", RestaurantId = R(1), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 12, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e4000000-0000-0000-0000-000000000004"),
                FullName = "Sana Iqbal", Email = "sana.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111004", Address = "Kitchen Staff, Lahore",
                Cnic = "3520011110004", RestaurantId = R(1), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 13, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e5000000-0000-0000-0000-000000000005"),
                FullName = "Hassan Raza", Email = "hassan.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111005", Address = "Kitchen Staff, Islamabad",
                Cnic = "6110011110005", RestaurantId = R(2), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 14, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e6000000-0000-0000-0000-000000000006"),
                FullName = "Ayesha Noor", Email = "ayesha.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111006", Address = "Kitchen Staff, Islamabad",
                Cnic = "6110011110006", RestaurantId = R(2), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e7000000-0000-0000-0000-000000000007"),
                FullName = "Kamran Sheikh", Email = "kamran.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111007", Address = "Kitchen Staff, Karachi",
                Cnic = "4200011110007", RestaurantId = R(3), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 16, 0, 0, 0, DateTimeKind.Utc)
            },
            new() {
                Id = Guid.Parse("e8000000-0000-0000-0000-000000000008"),
                FullName = "Zara Khan", Email = "zara.worker@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker@123"),
                PhoneNumber = "+923001111008", Address = "Kitchen Staff, Karachi",
                Cnic = "4200011110008", RestaurantId = R(4), Role = "Worker", IsActive = true,
                CreatedAt = new DateTime(2024, 1, 17, 0, 0, 0, DateTimeKind.Utc)
            },
        };

        db.Users.AddRange(workers);
        await db.SaveChangesAsync();
    }
}
