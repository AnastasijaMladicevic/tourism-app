using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;

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
            var host = _configuration["Smtp:Host"];
            var fromEmail = _configuration["Smtp:FromEmail"];
            var fromName = _configuration["Smtp:FromName"] ?? "TuristickiVodic";

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
                throw new InvalidOperationException("SMTP settings are not configured.");

            var port = int.TryParse(_configuration["Smtp:Port"], out var configuredPort)
                ? configuredPort
                : 587;

            var enableSsl = bool.TryParse(_configuration["Smtp:EnableSsl"], out var configuredEnableSsl)
                ? configuredEnableSsl
                : true;

            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"];

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl
            };

            if (!string.IsNullOrWhiteSpace(username))
            {
                client.Credentials = new NetworkCredential(username, password);
            }

            try
            {
                await client.SendMailAsync(message);
            }
            catch (Exception ex) when (ex is SmtpException || ex is InvalidOperationException)
            {
                throw new InvalidOperationException("Email could not be sent. Check SMTP settings.", ex);
            }
        }
    }
}
