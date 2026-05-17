namespace FoodDelivery.API.Core.Entities;

public class PasswordResetOtp
{
    public Guid     Id                   { get; set; } = Guid.NewGuid();
    public Guid     UserId               { get; set; }
    public User     User                 { get; set; } = null!;
    public string   OtpHash              { get; set; } = string.Empty;
    public DateTime ExpiresAt            { get; set; }
    public int      Attempts             { get; set; } = 0;
    public bool     IsVerified           { get; set; } = false;
    public bool     IsUsed               { get; set; } = false;
    public string?  ResetToken           { get; set; }
    public DateTime? ResetTokenExpiresAt { get; set; }
    public DateTime CreatedAt            { get; set; } = DateTime.UtcNow;
}
