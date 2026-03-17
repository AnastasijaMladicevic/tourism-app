namespace projekat.backend.Models
{
    public class Student
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime EnrollmentDate { get; set; } = DateTime.UtcNow;
        public string Major { get; set; } = string.Empty;
        public double GPA { get; set; } // 6-10 srpski sistem
    }
}
