using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Core.Validation;
using static System.Runtime.InteropServices.JavaScript.JSType;
using Image = TuristickiVodic.Core.Models.Image;
using Locality = TuristickiVodic.Core.Models.Locality;

namespace TuristickiVodic.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Role> Roles { get; set; }
    public DbSet<Region> Regions { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<LocalityType> LocalityTypes { get; set; }
    public DbSet<Locality> Localities { get; set; }
    public DbSet<DestinationType> DestinationTypes { get; set; }
    public DbSet<Destination> Destinations { get; set; }
    public DbSet<ObjectType> ObjectTypes { get; set; }
    public DbSet<TouristObject> Objects { get; set; }
    public DbSet<ActivityType> ActivityTypes { get; set; }
    public DbSet<Activity> Activities { get; set; }
    public DbSet<EventType> EventTypes { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<ReviewImage> ReviewImages { get; set; }
    public DbSet<Image> Images { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<Route> Routes { get; set; }
    public DbSet<RoutePoint> RoutePoints { get; set; }
    public DbSet<UserLog> UserLogs { get; set; }
    public DbSet<ManagerReport> ManagerReports { get; set; }
    public DbSet<DeletionRequest> DeletionRequests { get; set; }
    public DbSet<EventPlannerItem> EventPlannerItems { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<BrowserPushSubscription> BrowserPushSubscriptions { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<RevokedToken> RevokedTokens { get; set; }
    public DbSet<UserLocationHistory> UserLocationHistories { get; set; }
    public DbSet<Language> Languages { get; set; }
    public DbSet<Translation> Translations { get; set; }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepareRegionDefaults();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        PrepareRegionDefaults();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ==================== USER ====================
        mb.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        mb.Entity<User>()
            .Property(u => u.CreatorRoleRequestStatus)
            .HasConversion<string>();

        mb.Entity<User>()
            .HasOne(u => u.PreferredRegion)
            .WithMany(r => r.PreferredByUsers)
            .HasForeignKey(u => u.PreferredRegionId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<User>()
            .HasIndex(u => u.LastKnownLocation)
            .HasMethod("GIST");

        mb.Entity<UserLocationHistory>()
            .HasIndex(ulh => new { ulh.UserId, ulh.RecordedAt });

        mb.Entity<UserLocationHistory>()
            .HasIndex(ulh => ulh.Location)
            .HasMethod("GIST");

        mb.Entity<UserLocationHistory>()
            .HasOne(ulh => ulh.User)
            .WithMany(u => u.LocationHistory)
            .HasForeignKey(ulh => ulh.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<User>()
            .HasOne(u => u.ManagedDestination)
            .WithOne(d => d.ManagedBy)
            .HasForeignKey<Destination>(d => d.ManagedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ==================== REGION ====================
        mb.Entity<Region>()
            .HasIndex(r => r.Name)
            .IsUnique();

        mb.Entity<Region>()
            .HasIndex(r => r.Code)
            .IsUnique();

        mb.Entity<Region>()
            .HasIndex(r => r.IsDefault)
            .HasFilter("\"IsDefault\" = TRUE")
            .IsUnique();

        // ==================== DESTINATION ====================
        mb.Entity<Destination>()
            .Property(d => d.Status)
            .HasConversion<string>();

        mb.Entity<Destination>()
            .Property(d => d.RegionId)
            .HasDefaultValue(1);

        mb.Entity<Destination>()
            .Property(d => d.DisplayTitle)
            .HasMaxLength(250);

        mb.Entity<Destination>()
            .HasIndex(d => d.Geolocation)
            .HasMethod("GIST");

        mb.Entity<Destination>()
            .HasOne(d => d.CreatedBy)
            .WithMany(u => u.CreatedDestinations)
            .HasForeignKey(d => d.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Destination>()
            .HasOne(d => d.DestinationType)
            .WithMany(dt => dt.Destinations)
            .HasForeignKey(d => d.DestinationTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Destination>()
            .HasOne(d => d.Region)
            .WithMany(r => r.Destinations)
            .HasForeignKey(d => d.RegionId)
            .OnDelete(DeleteBehavior.Restrict);

        // ==================== LOCATION ====================
        mb.Entity<Locality>()
            .HasIndex(l => l.Geolocation)
            .HasMethod("GIST");

        mb.Entity<Locality>()
            .HasOne(l => l.Destination)
            .WithMany(d => d.Localities)
            .HasForeignKey(l => l.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Locality>()
            .HasOne(l => l.LocalityType)
            .WithMany(lt => lt.Localities)
            .HasForeignKey(l => l.LocalityTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Locality>()
            .HasOne(l => l.CreatedBy)
            .WithMany()
            .HasForeignKey(l => l.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== TOURIST OBJECT ====================
        mb.Entity<TouristObject>()
            .Property(o => o.Status)
            .HasConversion<string>();

        mb.Entity<TouristObject>()
            .Property(o => o.Amenities)
            .HasColumnType("text[]");

        mb.Entity<TouristObject>()
            .Property(o => o.MenuUrl)
            .HasMaxLength(2000);

        mb.Entity<TouristObject>()
            .Property(o => o.CuisineType)
            .HasMaxLength(100);

        mb.Entity<TouristObject>()
            .HasIndex(o => o.Geolocation)
            .HasMethod("GIST");

        mb.Entity<TouristObject>()
            .HasOne(o => o.Locality)
            .WithMany(l => l.Objects)
            .HasForeignKey(o => o.LocalityId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<TouristObject>()
            .HasOne(o => o.Destination)
            .WithMany(d => d.Objects)
            .HasForeignKey(o => o.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<TouristObject>()
            .HasOne(o => o.ObjectType)
            .WithMany(ot => ot.Objects)
            .HasForeignKey(o => o.ObjectTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<TouristObject>()
            .HasOne(o => o.CreatedBy)
            .WithMany(u => u.CreatedObjects)
            .HasForeignKey(o => o.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<TouristObject>()
            .HasOne(o => o.ApprovedBy)
            .WithMany()
            .HasForeignKey(o => o.ApprovedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== EVENT ====================
        mb.Entity<Event>()
            .Property(e => e.Status)
            .HasConversion<string>();

        mb.Entity<Event>()
            .HasOne(e => e.Locality)
            .WithMany(l => l.Events)
            .HasForeignKey(e => e.LocalityId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Event>()
            .HasOne(e => e.Destination)
            .WithMany(d => d.Events)
            .HasForeignKey(e => e.DestinationId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Event>()
            .HasOne(e => e.Object)
            .WithMany(o => o.Events)
            .HasForeignKey(e => e.ObjectId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Event>()
            .HasOne(e => e.EventType)
            .WithMany(et => et.Events)
            .HasForeignKey(e => e.EventTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Event>()
            .HasOne(e => e.CreatedBy)
            .WithMany(u => u.CreatedEvents)
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Event>()
            .HasOne(e => e.ApprovedBy)
            .WithMany()
            .HasForeignKey(e => e.ApprovedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== ACTIVITY ====================
        mb.Entity<Activity>()
            .HasIndex(a => a.Geolocation)
            .HasMethod("GIST");

        mb.Entity<Activity>()
            .HasOne(a => a.Locality)
            .WithMany(l => l.Activities)
            .HasForeignKey(a => a.LocalityId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Activity>()
            .HasOne(a => a.Destination)
            .WithMany(d => d.Activities)
            .HasForeignKey(a => a.DestinationId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Activity>()
            .HasOne(a => a.Object)
            .WithMany(o => o.Activities)
            .HasForeignKey(a => a.ObjectId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Activity>()
            .HasOne(a => a.ActivityType)
            .WithMany(at => at.Activities)
            .HasForeignKey(a => a.ActivityTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Activity>()
            .HasOne(a => a.CreatedBy)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ==================== REVIEW ====================
        mb.Entity<Review>()
            .Property(r => r.Status)
            .HasConversion<string>();

        mb.Entity<Review>()
            .HasIndex(r => new { r.UserId, r.ObjectId })
            .IsUnique();

        mb.Entity<Review>()
            .HasOne(r => r.User)
            .WithMany(u => u.Reviews)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Review>()
            .HasOne(r => r.Object)
            .WithMany(o => o.Reviews)
            .HasForeignKey(r => r.ObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Review>()
            .HasOne(r => r.ReviewedBy)
            .WithMany()
            .HasForeignKey(r => r.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== REVIEW IMAGE ====================
        mb.Entity<ReviewImage>()
            .Property(ri => ri.Url)
            .HasMaxLength(ValidationLengths.ImageUrl);

        mb.Entity<ReviewImage>()
            .Property(ri => ri.AltText)
            .HasMaxLength(ValidationLengths.ImageAltText);

        mb.Entity<ReviewImage>()
            .HasOne(ri => ri.Review)
            .WithMany(r => r.Images)
            .HasForeignKey(ri => ri.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<ReviewImage>()
            .HasIndex(ri => ri.ReviewId);

        // ==================== FAVORITE ====================
        mb.Entity<Favorite>()
            .ToTable(t => t.HasCheckConstraint(
                "CK_Favorite_OnlyOne",
                @"(CASE WHEN ""ObjectId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""ActivityId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""DestinationId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""RouteId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""LocalityId"" IS NOT NULL THEN 1 ELSE 0 END) = 1"));

        mb.Entity<Favorite>()
            .HasOne(f => f.User)
            .WithMany(u => u.Favorites)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasOne(f => f.Object)
            .WithMany(o => o.Favorites)
            .HasForeignKey(f => f.ObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasOne(f => f.Activity)
            .WithMany(a => a.Favorites)
            .HasForeignKey(f => f.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasOne(f => f.Destination)
            .WithMany(d => d.Favorites)
            .HasForeignKey(f => f.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasOne(f => f.Route)
            .WithMany(r => r.Favorites)
            .HasForeignKey(f => f.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasOne(f => f.Locality)
            .WithMany(l => l.Favorites)
            .HasForeignKey(f => f.LocalityId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.ObjectId })
            .IsUnique()
            .HasFilter("\"ObjectId\" IS NOT NULL");

        mb.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.ActivityId })
            .IsUnique()
            .HasFilter("\"ActivityId\" IS NOT NULL");

        mb.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.DestinationId })
            .IsUnique()
            .HasFilter("\"DestinationId\" IS NOT NULL");

        mb.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.RouteId })
            .IsUnique()
            .HasFilter("\"RouteId\" IS NOT NULL");

        mb.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.LocalityId })
            .IsUnique()
            .HasFilter("\"LocalityId\" IS NOT NULL");

        // ==================== IMAGE ====================
        mb.Entity<Image>()
            .Property(i => i.Url)
            .HasMaxLength(ValidationLengths.ImageUrl);

        mb.Entity<Image>()
            .Property(i => i.AltText)
            .HasMaxLength(ValidationLengths.ImageAltText);

        mb.Entity<Image>()
            .ToTable(t => t.HasCheckConstraint(
                "CK_Image_OnlyOne",
                @"(CASE WHEN ""ObjectId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""ActivityId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""EventId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""DestinationId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""LocalityId"" IS NOT NULL THEN 1 ELSE 0 END) = 1"));

        mb.Entity<Image>()
            .HasIndex(i => new { i.ObjectId, i.IsMain })
            .HasDatabaseName("IX_Images_ObjectId_IsMain_MainUnique")
            .IsUnique()
            .HasFilter("\"ObjectId\" IS NOT NULL AND \"IsMain\" = TRUE");

        mb.Entity<Image>()
            .HasIndex(i => new { i.ActivityId, i.IsMain })
            .HasDatabaseName("IX_Images_ActivityId_IsMain_MainUnique")
            .IsUnique()
            .HasFilter("\"ActivityId\" IS NOT NULL AND \"IsMain\" = TRUE");

        mb.Entity<Image>()
            .HasIndex(i => new { i.EventId, i.IsMain })
            .HasDatabaseName("IX_Images_EventId_IsMain_MainUnique")
            .IsUnique()
            .HasFilter("\"EventId\" IS NOT NULL AND \"IsMain\" = TRUE");

        mb.Entity<Image>()
            .HasIndex(i => new { i.DestinationId, i.IsMain })
            .HasDatabaseName("IX_Images_DestinationId_IsMain_MainUnique")
            .IsUnique()
            .HasFilter("\"DestinationId\" IS NOT NULL AND \"IsMain\" = TRUE");

        mb.Entity<Image>()
            .HasIndex(i => new { i.LocalityId, i.IsMain })
            .HasDatabaseName("IX_Images_LocalityId_IsMain_MainUnique")
            .IsUnique()
            .HasFilter("\"LocalityId\" IS NOT NULL AND \"IsMain\" = TRUE");

        mb.Entity<Image>()
            .HasOne(i => i.Object)
            .WithMany(o => o.Images)
            .HasForeignKey(i => i.ObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Image>()
            .HasOne(i => i.Activity)
            .WithMany(a => a.Images)
            .HasForeignKey(i => i.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Image>()
            .HasOne(i => i.Event)
            .WithMany(e => e.Images)
            .HasForeignKey(i => i.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Image>()
            .HasOne(i => i.Destination)
            .WithMany(d => d.Images)
            .HasForeignKey(i => i.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Image>()
            .HasOne(i => i.Locality)
            .WithMany(l => l.Images)
            .HasForeignKey(i => i.LocalityId)
            .OnDelete(DeleteBehavior.Cascade);

        // ==================== ROUTE & ROUTE POINT ====================
        mb.Entity<RoutePoint>()
            .HasIndex(rp => new { rp.RouteId, rp.Order })
            .IsUnique();

        mb.Entity<RoutePoint>()
            .HasOne(rp => rp.Route)
            .WithMany(r => r.RoutePoints)
            .HasForeignKey(rp => rp.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Route>()
            .HasOne(r => r.CreatedBy)
            .WithMany()
            .HasForeignKey(r => r.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== EVENT PLANNER ====================
        mb.Entity<EventPlannerItem>()
            .HasIndex(x => new { x.UserId, x.EventId })
            .IsUnique();

        mb.Entity<EventPlannerItem>()
            .HasOne(x => x.User)
            .WithMany(u => u.EventPlannerItems)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<EventPlannerItem>()
            .HasOne(x => x.Event)
            .WithMany(e => e.EventPlannerItems)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        // ==================== NOTIFICATION ====================
        mb.Entity<Notification>()
            .Property(n => n.Type)
            .HasConversion<string>();

        mb.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Notification>()
            .HasOne(n => n.Event)
            .WithMany()
            .HasForeignKey(n => n.EventId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Notification>()
            .HasOne(n => n.Review)
            .WithMany()
            .HasForeignKey(n => n.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Notification>()
            .HasOne(n => n.EventPlannerItem)
            .WithMany()
            .HasForeignKey(n => n.EventPlannerItemId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });

        mb.Entity<Notification>()
            .HasIndex(n => n.ReviewId);

        mb.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.Type, n.EventPlannerItemId, n.TriggerAtUtc })
            .IsUnique()
            .HasFilter("\"EventPlannerItemId\" IS NOT NULL AND \"TriggerAtUtc\" IS NOT NULL");

        // ==================== BROWSER PUSH SUBSCRIPTION ====================
        mb.Entity<BrowserPushSubscription>()
            .HasOne(subscription => subscription.User)
            .WithMany(user => user.BrowserPushSubscriptions)
            .HasForeignKey(subscription => subscription.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<BrowserPushSubscription>()
            .HasIndex(subscription => subscription.UserId);

        mb.Entity<BrowserPushSubscription>()
            .HasIndex(subscription => subscription.Endpoint)
            .IsUnique();

        // ==================== USER LOG ====================
        mb.Entity<UserLog>()
            .ToTable(t => t.HasCheckConstraint(
                "CK_UserLog_UserOrSession",
                @"""UserId"" IS NOT NULL OR ""SessionId"" IS NOT NULL"));

        mb.Entity<UserLog>()
            .Property(l => l.Action)
            .HasConversion<string>();

        mb.Entity<UserLog>()
            .HasOne(ul => ul.User)
            .WithMany(u => u.UserLogs)
            .HasForeignKey(ul => ul.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<UserLog>()
            .HasOne(ul => ul.Object)
            .WithMany()
            .HasForeignKey(ul => ul.ObjectId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<ManagerReport>()
           .HasIndex(r => r.ManagerId);

        mb.Entity<ManagerReport>()
            .HasIndex(r => r.ReportedUserId)
            .HasFilter("\"Status\" = 0")
            .IsUnique();


        // ==================== MANAGER REPORT ====================
        mb.Entity<ManagerReport>()
            .HasOne(r => r.Manager)
            .WithMany(u => u.SentReports)
            .HasForeignKey(r => r.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<ManagerReport>()
            .HasOne(r => r.ReportedUser)
            .WithMany()
            .HasForeignKey(r => r.ReportedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<ManagerReport>()
            .HasOne(r => r.ResolvedBy)
            .WithMany()
            .HasForeignKey(r => r.ResolvedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ==================== ROLE ====================
        mb.Entity<Role>()
            .Property(r => r.Name)
            .HasConversion<string>();

        // ==================== DELETION REQUEST ====================
        mb.Entity<DeletionRequest>()
            .Property(r => r.Status)
            .HasConversion<string>();

        mb.Entity<DeletionRequest>()
            .ToTable(t => t.HasCheckConstraint(
                "CK_DeletionRequest_OnlyOne",
                @"(CASE WHEN ""ObjectId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""EventId"" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ""ActivityId"" IS NOT NULL THEN 1 ELSE 0 END) = 1"));

        mb.Entity<DeletionRequest>()
            .HasOne(r => r.Object)
            .WithMany()
            .HasForeignKey(r => r.ObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<DeletionRequest>()
            .HasOne(r => r.Event)
            .WithMany()
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<DeletionRequest>()
            .HasOne(r => r.Activity)
            .WithMany()
            .HasForeignKey(r => r.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<DeletionRequest>()
            .HasOne(r => r.RequestedBy)
            .WithMany()
            .HasForeignKey(r => r.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<DeletionRequest>()
            .HasOne(r => r.ReviewedBy)
            .WithMany()
            .HasForeignKey(r => r.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Sprečava više Pending zahteva za isti objekat
        mb.Entity<DeletionRequest>()
            .HasIndex(r => r.ObjectId)
            .HasFilter("\"ObjectId\" IS NOT NULL AND \"Status\" = 'Pending'")
            .IsUnique();

        // Sprečava više Pending zahteva za isti event
        mb.Entity<DeletionRequest>()
            .HasIndex(r => r.EventId)
            .HasFilter("\"EventId\" IS NOT NULL AND \"Status\" = 'Pending'")
            .IsUnique();

        // Sprečava više Pending zahteva za istu aktivnost
        mb.Entity<DeletionRequest>()
            .HasIndex(r => r.ActivityId)
            .HasFilter("\"ActivityId\" IS NOT NULL AND \"Status\" = 'Pending'")
            .IsUnique();

        // ==================== REFRESH TOKEN ====================
        mb.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithOne(u => u.RefreshToken)
            .HasForeignKey<RefreshToken>(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ==================== REVOKED TOKEN ====================
        mb.Entity<RevokedToken>()
            .HasIndex(rt => rt.Jti)
            .IsUnique();
        mb.Entity<RevokedToken>()
            .HasIndex(rt => rt.ExpiresAt);

        // ==================== TRANSLATIONS ====================

        mb.Entity<Language>(entity =>
        {
            entity.HasKey(e => e.Code);
        });

        mb.Entity<Translation>(entity =>
        {
            entity.HasIndex(e => new
            {
                e.EntityType,
                e.EntityId,
                e.FieldName,
                e.LanguageCode
            }).IsUnique();

            entity.HasIndex(e => new
            {
                e.EntityType,
                e.EntityId
            });
        });

    }

    private void PrepareRegionDefaults()
    {
        foreach (var entry in ChangeTracker.Entries<Destination>())
        {
            if ((entry.State == EntityState.Added || entry.State == EntityState.Modified) &&
                entry.Entity.RegionId <= 0)
            {
                entry.Entity.RegionId = 1;
            }
        }

        var hasPendingRegionChanges = ChangeTracker.Entries<Region>()
            .Any(entry => entry.State != EntityState.Unchanged && entry.State != EntityState.Detached);

        if (hasPendingRegionChanges || Regions.AsNoTracking().Any())
            return;

        var now = new DateTime(2026, 4, 23, 17, 45, 0, DateTimeKind.Utc);

        Regions.AddRange(
            new Region
            {
                Id = 1,
                Name = "Crna Gora",
                Code = "ME",
                Description = "Podrazumevani region aplikacije.",
                CenterLongitude = 19.3744,
                CenterLatitude = 42.7087,
                DefaultMapZoom = 8.0,
                IsDefault = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Region
            {
                Id = 2,
                Name = "Srbija",
                Code = "RS",
                Description = "Region za sadrzaj iz Srbije.",
                CenterLongitude = 20.7505,
                CenterLatitude = 43.8914,
                DefaultMapZoom = 7.2,
                IsDefault = false,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Region
            {
                Id = 3,
                Name = "Spanija",
                Code = "ES",
                Description = "Region za sadrzaj iz Spanije.",
                CenterLongitude = -3.7492,
                CenterLatitude = 40.4637,
                DefaultMapZoom = 6.0,
                IsDefault = false,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Region
            {
                Id = 4,
                Name = "Italija",
                Code = "IT",
                Description = "Region za sadrzaj iz Italije.",
                CenterLongitude = 12.4964,
                CenterLatitude = 42.4279,
                DefaultMapZoom = 6.4,
                IsDefault = false,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Region
            {
                Id = 5,
                Name = "Grcka",
                Code = "GR",
                Description = "Region za sadrzaj iz Grcke.",
                CenterLongitude = 23.6500,
                CenterLatitude = 38.3500,
                DefaultMapZoom = 6.4,
                IsDefault = false,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            });
    }
}
