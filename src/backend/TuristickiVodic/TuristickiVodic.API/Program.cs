using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(
                    builder.Configuration.GetConnectionString("Default"),
                    o => o.UseNetTopologySuite()
                ));

            var app = builder.Build();

            //Ovaj scope se odnosi samo na testnu proveru konekcije sa bazom
            using (var scope = app.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                try
                {
                    var count = context.Gradovi.Count();
                    Console.WriteLine($"Broj gradova u bazi: {count}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Problem sa konekcijom: " + ex.Message);
                }
            }

            //Swagger 
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.MapControllers();

            app.Run();
        }
    }
}