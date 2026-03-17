using Microsoft.EntityFrameworkCore;
using Net_Bekend_ucenje.Data;
using Net_Bekend_ucenje.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<KonekcijaKaBazi>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<DestinacijeServis>();
builder.Services.AddScoped<RecenzijeServis>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")

              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAngular");
//app.UseHttpsRedirection();

app.UseAuthorization();
app.MapControllers();

app.Run();