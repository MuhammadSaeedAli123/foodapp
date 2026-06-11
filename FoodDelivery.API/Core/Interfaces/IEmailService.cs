namespace FoodDelivery.API.Core.Interfaces;

public interface IEmailService
{
    Task SendOtpEmailAsync(string toEmail, string recipientName, string otp);

    Task SendRiderRegistrationToAdminAsync(
        string adminEmail,
        string fullName, string email, string phone,
        string cnic, string vehicleType, string vehicleNumber, string city);

    Task SendRiderApprovalAsync(string riderEmail, string riderName);

    Task SendRiderRejectionAsync(string riderEmail, string riderName, string? reason);

    Task SendRestaurantApplicationToAdminAsync(
        string adminEmail,
        string restaurantName, string ownerName, string email,
        string phone, string location, string description);

    Task SendRestaurantApprovalAsync(string ownerEmail, string ownerName, string restaurantName);

    Task SendRestaurantRejectionAsync(string ownerEmail, string ownerName, string restaurantName, string? reason);
}
