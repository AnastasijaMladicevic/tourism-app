var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("angular",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("angular");

app.MapGet("/api/test", () =>
{
    var proxy = new TestServiceProxy();
    return proxy.GetData();
});

app.Run();