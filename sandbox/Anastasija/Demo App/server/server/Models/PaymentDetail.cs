using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Models
{
    public class PaymentDetail
    {
        [Key]
        public int PaymentDetailId { get; set; }

        [Column(TypeName = "nvarchar(100)")]
        public string CardOwnerName { get; set; } = "";

        [Column(TypeName = "nvarchar(16)")]
        public String CardNumber { get; set; } = "";

        [Column(TypeName = "nvarchar(16)")]
        public String ExpirationDate { get; set; } = "";

        [Column(TypeName = "nvarchar(16)")]
        public String SecurityCode { get; set; } = "";

    }
}
