using System.Net;
using System.Net.Mail;
using FoodDelivery.API.Core.Interfaces;

namespace FoodDelivery.API.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendOtpEmailAsync(string toEmail, string recipientName, string otp)
    {
        var settings    = _config.GetSection("EmailSettings");
        var senderEmail = settings["SenderEmail"]!;
        var appPassword = settings["AppPassword"]!;
        var senderName  = settings["SenderName"] ?? "FoodRush";

        using var client = new SmtpClient("smtp.gmail.com", 587)
        {
            EnableSsl   = true,
            Credentials = new NetworkCredential(senderEmail, appPassword),
        };

        using var message = new MailMessage
        {
            From       = new MailAddress(senderEmail, senderName),
            Subject    = "Your FoodRush Password Reset OTP",
            IsBodyHtml = true,
            Body       = BuildBody(recipientName, otp),
        };
        message.To.Add(toEmail);

        _logger.LogInformation("Sending OTP email to {Email}", toEmail);
        await Task.Run(() => client.Send(message));
        _logger.LogInformation("OTP email sent to {Email}", toEmail);
    }

    private static string BuildBody(string name, string otp) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                      🍔 FoodRush
                    </h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">
                      Fast delivery, every time
                    </p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Password Reset Request</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                      Hi <strong>{name}</strong>, we received a request to reset your FoodRush password.
                      Use the OTP below to continue:
                    </p>

                    <!-- OTP box -->
                    <div style="background:#fff7ed;border:2px dashed #f97316;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px;">
                      <p style="margin:0 0 4px;color:#9a3412;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                        Your OTP Code
                      </p>
                      <span style="font-size:48px;font-weight:900;letter-spacing:16px;color:#f97316;display:block;margin:8px 0;">
                        {otp}
                      </span>
                      <p style="margin:4px 0 0;color:#ea580c;font-size:13px;font-weight:600;">
                        ⏳ Expires in 2 minutes
                      </p>
                    </div>

                    <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
                      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                        🔒 <strong>Security notice:</strong> This OTP is valid for one use only.
                        Maximum 3 attempts are allowed. If you didn't request this reset, please
                        ignore this email — your account remains secure.
                      </p>
                    </div>

                    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                      © {DateTime.UtcNow.Year} FoodRush · All rights reserved
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}
