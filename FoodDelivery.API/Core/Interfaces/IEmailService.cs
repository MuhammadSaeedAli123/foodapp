namespace FoodDelivery.API.Core.Interfaces;

public interface IEmailService
{
    Task SendOtpEmailAsync(string toEmail, string recipientName, string otp);
}
