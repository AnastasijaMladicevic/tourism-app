using System.ComponentModel.DataAnnotations;

namespace server.Models
{
    public class PaymentDetail
    {
        public int PaymentDetailId { get; set; }

        [Required(ErrorMessage = "Name on card is required.")]
        [RegularExpression(@"^[a-zA-Z\s]+$",
        ErrorMessage = "Name on card can contain only letters and spaces.")]
        public string CardOwnerName { get; set; }

        [Required(ErrorMessage = "Card number is required.")]
        [RegularExpression(@"^[0-9]+$",
        ErrorMessage = "Card number must contain numbers only.")]
        public string CardNumber { get; set; }

        [Required(ErrorMessage = "Security code is required.")]
        [RegularExpression(@"^[0-9]{3}$",
        ErrorMessage = "Security code must be a 3 digit number.")]
        public string SecurityCode { get; set; }

        [Required(ErrorMessage = "Valid through date is required.")]
        [RegularExpression(@"^(0[1-9]|1[0-2])\/\d{2}$",
        ErrorMessage = "Valid through must be in MM/YY format (example: 05/27).")]
        public string ExpirationDate { get; set; }
    }
}