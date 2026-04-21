using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net.Mail;

namespace TuristickiVodic.Core.Validation
{
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter, AllowMultiple = false)]
    public sealed class RfcEmailAddressAttribute : ValidationAttribute
    {
        public RfcEmailAddressAttribute()
            : base("Neispravan format email-a")
        {
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is null)
                return ValidationResult.Success;

            if (value is not string email || string.IsNullOrWhiteSpace(email))
                return ValidationResult.Success;

            if (EmailAddressParser.IsValid(email))
                return ValidationResult.Success;

            if (validationContext.MemberName is null)
                return new ValidationResult(ErrorMessageString);

            return new ValidationResult(ErrorMessageString, new[] { validationContext.MemberName });
        }
    }

    public static class EmailAddressParser
    {
        private const int MaxEmailLength = 254;
        private const int MaxLocalPartLength = 64;
        private const int MaxDomainLength = 253;

        public static bool IsValid(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            if (!string.Equals(email, email.Trim(), StringComparison.Ordinal))
                return false;

            if (email.Length > MaxEmailLength)
                return false;

            MailAddress parsedAddress;
            try
            {
                parsedAddress = new MailAddress(email);
            }
            catch (FormatException)
            {
                return false;
            }

            if (!string.Equals(parsedAddress.Address, email, StringComparison.Ordinal))
                return false;

            if (parsedAddress.User.Length == 0 || parsedAddress.User.Length > MaxLocalPartLength)
                return false;

            if (parsedAddress.Host.Length == 0 || parsedAddress.Host.Length > MaxDomainLength)
                return false;

            if (IsDomainLiteral(parsedAddress.Host))
                return true;

            if (!TryNormalizeDomain(parsedAddress.Host, out var normalizedDomain))
                return false;

            return HasValidDomainLabels(normalizedDomain);
        }

        private static bool IsDomainLiteral(string host)
        {
            return host.StartsWith("[", StringComparison.Ordinal) &&
                   host.EndsWith("]", StringComparison.Ordinal);
        }

        private static bool TryNormalizeDomain(string domain, out string normalizedDomain)
        {
            try
            {
                normalizedDomain = new IdnMapping().GetAscii(domain);
                return true;
            }
            catch (ArgumentException)
            {
                normalizedDomain = string.Empty;
                return false;
            }
        }

        private static bool HasValidDomainLabels(string domain)
        {
            var labels = domain.Split('.', StringSplitOptions.None);
            if (labels.Length == 0)
                return false;

            foreach (var label in labels)
            {
                if (label.Length == 0)
                    return false;

                if (label.StartsWith("-", StringComparison.Ordinal) ||
                    label.EndsWith("-", StringComparison.Ordinal))
                {
                    return false;
                }
            }

            return true;
        }
    }
}
