using Microsoft.Extensions.Configuration;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace TuristickiVodic.Services.Services
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public SmtpEmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            var host = _configuration["Smtp:Host"]?.Trim();
            var fromEmail = _configuration["Smtp:FromEmail"]?.Trim();
            var fromName = _configuration["Smtp:FromName"] ?? "TuristickiVodic";

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
                throw new InvalidOperationException("SMTP settings are not configured.");

            var port = int.TryParse(_configuration["Smtp:Port"], out var configuredPort)
                ? configuredPort : 587;

            var username = _configuration["Smtp:Username"]?.Trim();
            var password = _configuration["Smtp:Password"]?.Trim().Replace(" ", string.Empty);

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new MailKit.Net.Smtp.SmtpClient();

            try
            {
                var secureOption = port == 465
                    ? SecureSocketOptions.SslOnConnect
                    : SecureSocketOptions.StartTls;

                await client.ConnectAsync(host, port, secureOption);

                if (!string.IsNullOrWhiteSpace(username))
                    await client.AuthenticateAsync(username, password);

                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Email could not be sent. Check SMTP settings.", ex);
            }
        }
    }
}