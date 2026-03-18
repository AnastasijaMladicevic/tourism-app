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

app.MapGet("/api/words", () =>
{
    return new WordService().GetAll();
});

app.MapPost("/api/words", (Word w) =>
{
    new WordService().Add(w.Text);
});

app.MapDelete("/api/words/{id}", (int id) =>
{
    new WordService().Delete(id);
});

app.MapPut("/api/words/{id}", (int id, Word w) =>
{
    new WordService().Update(id, w.Text);
});

app.Run();