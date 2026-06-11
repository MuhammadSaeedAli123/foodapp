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
        await SendAsync(toEmail, "Your FoodRush Password Reset OTP", BuildBody(recipientName, otp));
    }

    public async Task SendRiderRegistrationToAdminAsync(
        string adminEmail,
        string fullName, string email, string phone,
        string cnic, string vehicleType, string vehicleNumber, string city)
    {
        await SendAsync(adminEmail, "New Rider Registration – Pending Approval",
            BuildRiderRegistrationBody(fullName, email, phone, cnic, vehicleType, vehicleNumber, city));
    }

    public async Task SendRiderApprovalAsync(string riderEmail, string riderName)
    {
        await SendAsync(riderEmail, "Your FoodRush Rider Application is Approved!",
            BuildApprovalBody(riderName));
    }

    public async Task SendRiderRejectionAsync(string riderEmail, string riderName, string? reason)
    {
        await SendAsync(riderEmail, "Update on Your FoodRush Rider Application",
            BuildRejectionBody(riderName, reason));
    }

    public async Task SendRestaurantApplicationToAdminAsync(
        string adminEmail,
        string restaurantName, string ownerName, string email,
        string phone, string location, string description)
    {
        await SendAsync(adminEmail, "New Restaurant Partnership Application – Pending Approval",
            BuildRestaurantApplicationBody(restaurantName, ownerName, email, phone, location, description));
    }

    public async Task SendRestaurantApprovalAsync(string ownerEmail, string ownerName, string restaurantName)
    {
        await SendAsync(ownerEmail, "Your FoodRush Restaurant Partnership is Approved!",
            BuildRestaurantApprovalBody(ownerName, restaurantName));
    }

    public async Task SendRestaurantRejectionAsync(string ownerEmail, string ownerName, string restaurantName, string? reason)
    {
        await SendAsync(ownerEmail, "Update on Your FoodRush Restaurant Application",
            BuildRestaurantRejectionBody(ownerName, restaurantName, reason));
    }

    // ── Shared send helper ───────────────────────────────────────────────────

    private async Task SendAsync(string toEmail, string subject, string htmlBody)
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
            Subject    = subject,
            IsBodyHtml = true,
            Body       = htmlBody,
        };
        message.To.Add(toEmail);

        _logger.LogInformation("Sending email '{Subject}' to {Email}", subject, toEmail);
        await Task.Run(() => client.Send(message));
    }

    // ── Email body builders ──────────────────────────────────────────────────

    private static string BuildRiderRegistrationBody(
        string fullName, string email, string phone,
        string cnic, string vehicleType, string vehicleNumber, string city) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Rider Management System</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 6px;color:#111827;font-size:20px;">New Rider Registration</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                      A new rider has registered and is awaiting approval.
                    </p>

                    <!-- Status badge -->
                    <div style="display:inline-block;background:#fff7ed;border:1.5px solid #f97316;color:#c2410c;font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px;margin-bottom:24px;text-transform:uppercase;letter-spacing:.5px;">
                      📌 Pending Approval
                    </div>

                    <!-- Details table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                      <tr><td colspan="2" style="background:#f9fafb;padding:12px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">🧾 Rider Details</td></tr>
                      {DetailRow("Full Name",       fullName)}
                      {DetailRow("Email",           email)}
                      {DetailRow("Phone Number",    phone)}
                      {DetailRow("CNIC",            string.IsNullOrWhiteSpace(cnic) ? "—" : cnic)}
                      {DetailRow("Vehicle Type",    string.IsNullOrWhiteSpace(vehicleType) ? "—" : vehicleType)}
                      {DetailRow("Vehicle Number",  string.IsNullOrWhiteSpace(vehicleNumber) ? "—" : vehicleNumber)}
                      {DetailRow("City / Area",     string.IsNullOrWhiteSpace(city) ? "—" : city)}
                    </table>

                    <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                      👉 Please review this request in the <strong>Admin Panel</strong> and take appropriate action.
                    </p>

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

    private static string DetailRow(string label, string value) =>
        "<tr style=\"border-top:1px solid #e5e7eb;\">" +
        $"<td style=\"padding:10px 16px;font-size:13px;color:#6b7280;width:160px;background:#f9fafb;\">{label}</td>" +
        $"<td style=\"padding:10px 16px;font-size:13px;color:#111827;font-weight:600;\">{value}</td>" +
        "</tr>";

    private static string BuildApprovalBody(string name) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Fast delivery, every time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <div style="text-align:center;margin-bottom:28px;">
                      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#dcfce7;border-radius:50%;font-size:32px;margin-bottom:16px;">✅</div>
                      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">You're Approved!</h2>
                      <p style="margin:0;color:#6b7280;font-size:15px;">Hi <strong>{name}</strong>, welcome to the FoodRush rider team!</p>
                    </div>

                    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
                      <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">
                        Your rider application has been <strong>approved</strong> by the admin.<br/>
                        You can now log in to the FoodRush app and start accepting deliveries. 🛵
                      </p>
                    </div>

                    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;text-align:center;line-height:1.6;">
                      If you have any questions, please contact support.
                    </p>
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

    private static string BuildRejectionBody(string name, string? reason) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Fast delivery, every time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Application Update</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                      Hi <strong>{name}</strong>, thank you for your interest in joining FoodRush as a rider.
                    </p>

                    <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:700;">Application Not Approved</p>
                      <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.6;">
                        {(string.IsNullOrWhiteSpace(reason)
                            ? "Unfortunately, your rider application has not been approved at this time."
                            : $"Reason: {reason}")}
                      </p>
                    </div>

                    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;line-height:1.6;">
                      If you believe this is a mistake or would like to provide additional information,
                      please contact our support team.
                    </p>
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

    private static string BuildRestaurantApplicationBody(
        string restaurantName, string ownerName, string email,
        string phone, string location, string description) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Restaurant Partner Management</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 6px;color:#111827;font-size:20px;">New Restaurant Partnership Application</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                      A new restaurant owner has applied for partnership and is awaiting approval.
                    </p>
                    <div style="display:inline-block;background:#fff7ed;border:1.5px solid #f97316;color:#c2410c;font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px;margin-bottom:24px;text-transform:uppercase;letter-spacing:.5px;">
                      📌 Pending Approval
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                      <tr><td colspan="2" style="background:#f9fafb;padding:12px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">🏪 Restaurant Details</td></tr>
                      {DetailRow("Restaurant Name", restaurantName)}
                      {DetailRow("Location",        location)}
                      {DetailRow("Description",     string.IsNullOrWhiteSpace(description) ? "—" : description)}
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                      <tr><td colspan="2" style="background:#f9fafb;padding:12px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">👤 Owner Details</td></tr>
                      {DetailRow("Owner Name",   ownerName)}
                      {DetailRow("Email",        email)}
                      {DetailRow("Phone Number", phone)}
                    </table>
                    <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                      👉 Please review this request in the <strong>Admin Panel</strong> under Restaurant Requests.
                    </p>
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

    private static string BuildRestaurantApprovalBody(string ownerName, string restaurantName) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Fast delivery, every time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <div style="text-align:center;margin-bottom:28px;">
                      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#dcfce7;border-radius:50%;font-size:32px;margin-bottom:16px;">✅</div>
                      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Partnership Approved!</h2>
                      <p style="margin:0;color:#6b7280;font-size:15px;">Hi <strong>{ownerName}</strong>, welcome to the FoodRush family!</p>
                    </div>
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
                      <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">
                        Your restaurant <strong>{restaurantName}</strong> has been <strong>approved</strong>.<br/>
                        You can now log in with the email and password you registered with and start managing your restaurant. 🏪
                      </p>
                    </div>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;text-align:center;line-height:1.6;">
                      If you have any questions, please contact support.
                    </p>
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

    private static string BuildRestaurantRejectionBody(string ownerName, string restaurantName, string? reason) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">🍔 FoodRush</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Fast delivery, every time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Application Update</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                      Hi <strong>{ownerName}</strong>, thank you for your interest in partnering with FoodRush.
                    </p>
                    <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:700;">Application Not Approved — {restaurantName}</p>
                      <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.6;">
                        {(string.IsNullOrWhiteSpace(reason)
                            ? "Unfortunately, your restaurant partnership application has not been approved at this time."
                            : $"Reason: {reason}")}
                      </p>
                    </div>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;line-height:1.6;">
                      If you believe this is a mistake or would like to provide additional information,
                      please contact our support team.
                    </p>
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
