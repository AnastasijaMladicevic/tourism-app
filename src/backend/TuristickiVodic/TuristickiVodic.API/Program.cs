using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using TuristickiVodic.API.Hubs;
using TuristickiVodic.API.Infrastructure;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services;
using TuristickiVodic.Services.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();
builder.Services.AddHostedService<PlannerReminderBackgroundService>();
builder.Services.Configure<OllamaOptions>(builder.Configuration.GetSection("Ollama"));
builder.Services.AddHttpClient();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 5 * 1024 * 1024;
});
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TuristickiVodic API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Unesite samo JWT token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddScoped<NotificationSaveChangesInterceptor>();
builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.UseNetTopologySuite()
    )
    .AddInterceptors(serviceProvider.GetRequiredService<NotificationSaveChangesInterceptor>())
);

builder.Services.AddAutoMapper(typeof(TuristickiVodic.Services.Mappings.MappingProfile));

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IRegionService, RegionService>();
builder.Services.AddScoped<ILocalityService, LocalityService>();
builder.Services.AddScoped<IDestinationService, DestinationService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IReviewImageService, ReviewImageService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IFavoriteService, FavoriteService>();
builder.Services.AddScoped<ITouristObjectService, TouristObjectService>();
builder.Services.AddScoped<IDeletionRequestService, DeletionRequestService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IRoutePointService, RoutePointService>();
builder.Services.AddScoped<IEventPlannerService, EventPlannerService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IManagerReportService, ManagerReportService>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<ISmartSearchService, SmartSearchService>();
builder.Services.AddScoped<IAiSemanticSearchService, AiSemanticSearchService>();
builder.Services.AddScoped<IAiChatService, AiChatService>();
builder.Services.AddScoped<ITranslationService, TranslationService>();
builder.Services.AddScoped<IExternalTranslationProvider, ArgosTranslateProvider>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],

            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),

            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) &&
                    path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

                if (string.IsNullOrWhiteSpace(jti))
                {
                    context.Fail("Token does not contain jti.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

                var isRevoked = await db.RevokedTokens
                    .AnyAsync(x => x.Jti == jti && x.ExpiresAt > DateTime.UtcNow);

                if (isRevoked)
                {
                    context.Fail("Token has been revoked.");
                    return;
                }

                var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    context.Fail("Token does not contain a valid user id.");
                    return;
                }

                var user = await db.Users
                    .Include(x => x.Role)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == userId);

                if (user == null || user.Role == null)
                {
                    context.Fail("User not found.");
                    return;
                }

                var tokenRole = NormalizeRoleValue(context.Principal?.FindFirst(ClaimTypes.Role)?.Value);
                var databaseRole = NormalizeRoleValue(user.Role.Name.ToString());

                if (!string.IsNullOrWhiteSpace(tokenRole) &&
                    !string.IsNullOrWhiteSpace(databaseRole) &&
                    !string.Equals(tokenRole, databaseRole, StringComparison.Ordinal) &&
                    GetRoleRank(tokenRole) > GetRoleRank(databaseRole))
                {
                    context.Fail("Token role is outdated.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        var configuredOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? new[] { "http://localhost:4200" };

        var fallbackOrigins = new[]
        {
            "http://softeng.pmf.kg.ac.rs:10201",
            "http://softeng.pmf.kg.ac.rs:10202",
            "https://softeng.pmf.kg.ac.rs:10201",
            "https://softeng.pmf.kg.ac.rs:10202",
            "http://147.91.204.115:10201",
            "http://147.91.204.115:10202",
            "https://147.91.204.115:10201",
            "https://147.91.204.115:10202"
        };

        var allowedOrigins = configuredOrigins
            .Concat(fallbackOrigins)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        policy.SetIsOriginAllowed(origin =>
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
            (builder.Environment.IsDevelopment() && IsAllowedDevelopmentOrigin(origin)))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger(c =>
    {
        c.PreSerializeFilters.Add((swagger, httpReq) =>
        {
            swagger.Servers = new List<OpenApiServer>
            {
                new OpenApiServer { Url = $"{httpReq.Scheme}://{httpReq.Host.Value}" }
            };
        });
    });

    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "TuristickiVodic API v1"));
}

var useHttpsRedirection = app.Configuration.GetValue<bool?>("ReverseProxy:UseHttpsRedirection") ?? true;

app.UseForwardedHeaders();

if (useHttpsRedirection)
{
    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }
}

app.UseCors("AllowAngular");

var defaultFileOptions = new DefaultFilesOptions();
defaultFileOptions.DefaultFileNames.Clear();
defaultFileOptions.DefaultFileNames.Add("index.html");
app.UseDefaultFiles(defaultFileOptions);

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();
app.MapHub<NotificationsHub>("/hubs/notifications");

// Sve rute koje nisu API vrati index.html (SPA routing)
app.MapFallbackToFile("index.html");
// ──────────────────────────────────────────────────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""ReviewImages"" (
            ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            ""ReviewId"" integer NOT NULL REFERENCES ""Reviews""(""Id"") ON DELETE CASCADE,
            ""Url"" character varying(2000) NOT NULL,
            ""AltText"" character varying(200),
            ""CreatedAt"" timestamp with time zone NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_ReviewImages_ReviewId"" ON ""ReviewImages""(""ReviewId"");
    ");

    var resetAndSeedOnStartup =
        app.Configuration.GetValue<bool>("SeedData:ResetAndSeedOnStartup") ||
        app.Configuration.GetValue<bool>("SeedData:RunOnStartup");
    var seedIfDatabaseEmpty = app.Configuration.GetValue<bool?>("SeedData:SeedIfDatabaseEmpty")
        ?? app.Environment.IsDevelopment();
    var applyIncrementalSeedOnStartup = app.Configuration.GetValue<bool?>("SeedData:ApplyIncrementalSeedOnStartup")
        ?? app.Environment.IsDevelopment();
    var failStartupOnSeedError = app.Configuration.GetValue<bool?>("SeedData:FailStartupOnError")
        ?? false;

    var databaseIsEffectivelyEmpty =
        !db.Destinations.Any() &&
        !db.Localities.Any() &&
        !db.Objects.Any() &&
        !db.Activities.Any() &&
        !db.Events.Any();

    try
    {
        if (resetAndSeedOnStartup || (seedIfDatabaseEmpty && databaseIsEffectivelyEmpty))
        {
            var configuredSeedFilePath = app.Configuration["SeedData:FilePath"];

            var solutionRoot = Path.GetFullPath(
                Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..")
            );

            var seedFilePath = !string.IsNullOrWhiteSpace(configuredSeedFilePath)
                ? configuredSeedFilePath
                : Path.Combine(solutionRoot, "baza", "seed.sql");

            Console.WriteLine($"Seed path: {seedFilePath}");

            if (File.Exists(seedFilePath))
            {
                Console.WriteLine(
                    resetAndSeedOnStartup
                        ? "seed.sql found, executing destructive reset + seed..."
                        : "Database is empty, executing initial seed.sql bootstrap..."
                );

                var sql = File.ReadAllText(seedFilePath);
                var connection = db.Database.GetDbConnection();

                if (connection.State != System.Data.ConnectionState.Open)
                    connection.Open();

                using var command = connection.CreateCommand();
                command.CommandText = sql;
                command.ExecuteNonQuery();

                SeedSqlExecutor.SyncHistory(connection, sql, seedFilePath);
                Console.WriteLine("seed.sql executed successfully.");
            }
            else
            {
                Console.WriteLine("seed.sql NOT FOUND.");
            }
        }
        else if (applyIncrementalSeedOnStartup)
        {
            var configuredSeedFilePath = app.Configuration["SeedData:FilePath"];

            var solutionRoot = Path.GetFullPath(
                Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..")
            );

            var seedFilePath = !string.IsNullOrWhiteSpace(configuredSeedFilePath)
                ? configuredSeedFilePath
                : Path.Combine(solutionRoot, "baza", "seed.sql");

            if (File.Exists(seedFilePath))
            {
                var sql = File.ReadAllText(seedFilePath);
                var connection = db.Database.GetDbConnection();

                if (connection.State != System.Data.ConnectionState.Open)
                    connection.Open();

                if (!SeedSqlExecutor.HasHistory(connection))
                {
                    SeedSqlExecutor.SyncHistory(connection, sql, seedFilePath);
                    Console.WriteLine("Seed history initialized from current seed.sql. Future appended SQL blocks will apply automatically.");
                }
                else
                {
                    var appliedStatements = SeedSqlExecutor.ApplyNewStatements(connection, sql, seedFilePath);
                    Console.WriteLine(appliedStatements > 0
                        ? $"Applied {appliedStatements} new seed.sql statement(s) to the existing database."
                        : "No new seed.sql statements detected for the existing database.");
                }
            }
            else
            {
                Console.WriteLine("seed.sql NOT FOUND.");
            }
        }
        else if (app.Environment.IsDevelopment())
        {
            Console.WriteLine("Automatic reset/seed is disabled. Existing database data will be preserved.");
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "SeedData startup step failed. API will {Mode}.", failStartupOnSeedError ? "stop" : "continue");

        if (failStartupOnSeedError)
        {
            throw;
        }
    }
}

app.Run();

static bool IsAllowedDevelopmentOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        return false;

    if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        return false;

    if (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
        return true;

    if (!IPAddress.TryParse(uri.Host, out var ipAddress))
        return false;

    return ipAddress.AddressFamily == AddressFamily.InterNetwork && IsPrivateIpv4(ipAddress);
}

static string NormalizeRoleValue(string? role)
{
    if (string.IsNullOrWhiteSpace(role))
        return string.Empty;

    return role
        .Trim()
        .ToLowerInvariant()
        .Replace("_", string.Empty)
        .Replace("-", string.Empty)
        .Replace(" ", string.Empty);
}

static int GetRoleRank(string normalizedRole)
{
    return normalizedRole switch
    {
        "admin" => 300,
        "manager" => 200,
        "contentcreator" => 100,
        "tourist" => 0,
        _ => 0
    };
}

static bool IsPrivateIpv4(IPAddress ipAddress)
{
    var bytes = ipAddress.GetAddressBytes();

    return bytes[0] == 10 ||
           (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
           (bytes[0] == 192 && bytes[1] == 168);
}
