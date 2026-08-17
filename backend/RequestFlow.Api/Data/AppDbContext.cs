using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Data;

public class AppDbContext : DbContext
{
    private readonly INotificationPublisher?
        _notificationPublisher;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        INotificationPublisher? notificationPublisher = null
    ) : base(options)
    {
        _notificationPublisher = notificationPublisher;
    }

    public DbSet<User> Users =>
        Set<User>();

    public DbSet<Ticket> Tickets =>
        Set<Ticket>();

    public DbSet<Category> Categories =>
        Set<Category>();

    public DbSet<TicketComment> TicketComments =>
        Set<TicketComment>();

    public DbSet<TicketAttachment> TicketAttachments =>
        Set<TicketAttachment>();

    public DbSet<TicketActivity> TicketActivities =>
        Set<TicketActivity>();

    public DbSet<Notification> Notifications =>
        Set<Notification>();

    public DbSet<SystemSetting> SystemSettings =>
        Set<SystemSetting>();

    public DbSet<PasswordResetToken>
        PasswordResetTokens =>
        Set<PasswordResetToken>();

    public DbSet<UserNotificationPreference>
        UserNotificationPreferences =>
        Set<UserNotificationPreference>();

    public DbSet<UserDashboardPreference>
        UserDashboardPreferences =>
        Set<UserDashboardPreference>();

    public DbSet<AuditLog> AuditLogs =>
        Set<AuditLog>();

    public DbSet<KnowledgeArticle> KnowledgeArticles =>
        Set<KnowledgeArticle>();

    public DbSet<RequestTemplate> RequestTemplates =>
        Set<RequestTemplate>();

    public DbSet<CategoryField> CategoryFields =>
        Set<CategoryField>();

    public DbSet<ReportSchedule> ReportSchedules =>
        Set<ReportSchedule>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder
    )
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUser(modelBuilder);
        ConfigureTicket(modelBuilder);
        ConfigureCategory(modelBuilder);
        ConfigureTicketComment(modelBuilder);
        ConfigureTicketAttachment(modelBuilder);
        ConfigureTicketActivity(modelBuilder);
        ConfigureNotification(modelBuilder);
        ConfigurePasswordResetToken(modelBuilder);
        ConfigureUserNotificationPreference(modelBuilder);
        ConfigureUserDashboardPreference(modelBuilder);
        ConfigureAuditLog(modelBuilder);
        ConfigureKnowledgeArticle(modelBuilder);
        ConfigureRequestTemplate(modelBuilder);
        ConfigureCategoryField(modelBuilder);
        ConfigureReportSchedule(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var addedNotifications = ChangeTracker
            .Entries<Notification>()
            .Where(entry =>
                entry.State == EntityState.Added
            )
            .Select(entry => entry.Entity)
            .ToList();

        var result = await base.SaveChangesAsync(
            cancellationToken
        );

        if (_notificationPublisher != null)
        {
            foreach (var notification in addedNotifications)
            {
                await _notificationPublisher.PublishAsync(
                    notification,
                    cancellationToken
                );
            }
        }

        return result;
    }

    private static void ConfigureUserNotificationPreference(
        ModelBuilder modelBuilder
    )
    {
        var preferenceEntity = modelBuilder
            .Entity<UserNotificationPreference>();

        preferenceEntity.HasKey(preference =>
            preference.UserId
        );

        preferenceEntity
            .HasOne(preference => preference.User)
            .WithOne(user => user.NotificationPreference)
            .HasForeignKey<UserNotificationPreference>(
                preference => preference.UserId
            )
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureUserDashboardPreference(
        ModelBuilder modelBuilder
    )
    {
        var preferenceEntity = modelBuilder
            .Entity<UserDashboardPreference>();

        preferenceEntity.HasKey(preference =>
            preference.UserId
        );

        preferenceEntity
            .Property(preference => preference.VisibleCardsJson)
            .IsRequired()
            .HasDefaultValue("[]");

        preferenceEntity
            .HasOne(preference => preference.User)
            .WithOne(user => user.DashboardPreference)
            .HasForeignKey<UserDashboardPreference>(
                preference => preference.UserId
            )
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureAuditLog(
        ModelBuilder modelBuilder
    )
    {
        var auditEntity = modelBuilder.Entity<AuditLog>();

        auditEntity.HasKey(audit => audit.Id);
        auditEntity.Property(audit => audit.ActorName)
            .IsRequired().HasMaxLength(100);
        auditEntity.Property(audit => audit.ActorRole)
            .IsRequired().HasMaxLength(30);
        auditEntity.Property(audit => audit.Action)
            .IsRequired().HasMaxLength(60);
        auditEntity.Property(audit => audit.EntityType)
            .IsRequired().HasMaxLength(60);
        auditEntity.Property(audit => audit.EntityId)
            .HasMaxLength(80);
        auditEntity.Property(audit => audit.Summary)
            .IsRequired().HasMaxLength(500);
        auditEntity.HasIndex(audit => audit.CreatedAt);
        auditEntity
            .HasOne(audit => audit.ActorUser)
            .WithMany()
            .HasForeignKey(audit => audit.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    private static void ConfigureKnowledgeArticle(
        ModelBuilder modelBuilder
    )
    {
        var articleEntity = modelBuilder
            .Entity<KnowledgeArticle>();

        articleEntity.HasKey(article => article.Id);
        articleEntity.Property(article => article.Title)
            .IsRequired().HasMaxLength(180);
        articleEntity.Property(article => article.Category)
            .IsRequired().HasMaxLength(120);
        articleEntity.Property(article => article.ArticleType)
            .IsRequired().HasMaxLength(20);
        articleEntity.Property(article => article.Summary)
            .IsRequired().HasMaxLength(320);
        articleEntity.Property(article => article.Content)
            .IsRequired().HasMaxLength(6000);
        articleEntity.Property(article => article.Keywords)
            .HasMaxLength(240);
        articleEntity.HasIndex(article => new
        {
            article.IsPublished,
            article.DisplayOrder
        });
    }

    private static void ConfigureRequestTemplate(
        ModelBuilder modelBuilder
    )
    {
        var templateEntity = modelBuilder
            .Entity<RequestTemplate>();

        templateEntity.HasKey(template => template.Id);
        templateEntity.Property(template => template.Name)
            .IsRequired().HasMaxLength(120);
        templateEntity.Property(template => template.Category)
            .IsRequired().HasMaxLength(100);
        templateEntity.Property(template => template.Title)
            .IsRequired().HasMaxLength(150);
        templateEntity.Property(template => template.Description)
            .IsRequired().HasMaxLength(500);
        templateEntity.Property(template => template.Priority)
            .IsRequired().HasMaxLength(20);
        templateEntity.Property(template => template.Icon)
            .HasMaxLength(80);
        templateEntity.HasIndex(template => new
        {
            template.IsActive,
            template.Category,
            template.DisplayOrder
        });
    }

    private static void ConfigureCategoryField(
        ModelBuilder modelBuilder
    )
    {
        var fieldEntity = modelBuilder
            .Entity<CategoryField>();

        fieldEntity.HasKey(field => field.Id);
        fieldEntity.Property(field => field.Category)
            .IsRequired().HasMaxLength(100);
        fieldEntity.Property(field => field.Key)
            .IsRequired().HasMaxLength(80);
        fieldEntity.Property(field => field.Label)
            .IsRequired().HasMaxLength(120);
        fieldEntity.Property(field => field.FieldType)
            .IsRequired().HasMaxLength(20);
        fieldEntity.Property(field => field.Placeholder)
            .HasMaxLength(180);
        fieldEntity.Property(field => field.HelpText)
            .HasMaxLength(300);
        fieldEntity.Property(field => field.OptionsJson)
            .HasMaxLength(1000);
        fieldEntity.HasIndex(field => new
        {
            field.Category,
            field.Key
        }).IsUnique();
    }

    private static void ConfigureReportSchedule(
        ModelBuilder modelBuilder
    )
    {
        var scheduleEntity = modelBuilder
            .Entity<ReportSchedule>();

        scheduleEntity.HasKey(schedule => schedule.Id);
        scheduleEntity.Property(schedule => schedule.Frequency)
            .IsRequired().HasMaxLength(20);
        scheduleEntity.Property(schedule => schedule.Recipients)
            .IsRequired().HasMaxLength(1500);
        scheduleEntity.Property(schedule => schedule.LastDeliveryStatus)
            .IsRequired().HasMaxLength(80);
        scheduleEntity.Property(schedule => schedule.LastError)
            .HasMaxLength(500);
    }

    private static void ConfigureUser(
        ModelBuilder modelBuilder
    )
    {
        var userEntity =
            modelBuilder.Entity<User>();

        userEntity.HasKey(
            user => user.Id
        );

        userEntity
            .Property(user => user.FullName)
            .IsRequired()
            .HasMaxLength(100);

        userEntity
            .Property(user => user.Email)
            .IsRequired()
            .HasMaxLength(150);

        userEntity
            .HasIndex(user => user.Email)
            .IsUnique();

        userEntity
            .Property(user => user.PasswordHash)
            .IsRequired();

        userEntity
            .Property(user => user.Role)
            .IsRequired()
            .HasMaxLength(30);

        userEntity
            .Property(user => user.SecurityVersion)
            .HasDefaultValue(0);
    }

    private static void ConfigurePasswordResetToken(
        ModelBuilder modelBuilder
    )
    {
        var tokenEntity =
            modelBuilder.Entity<PasswordResetToken>();

        tokenEntity.HasKey(token => token.Id);

        tokenEntity
            .Property(token => token.TokenHash)
            .IsRequired()
            .HasMaxLength(64);

        tokenEntity
            .HasIndex(token => token.TokenHash)
            .IsUnique();

        tokenEntity
            .HasIndex(token => new
            {
                token.UserId,
                token.ExpiresAtUtc
            });

        tokenEntity
            .HasOne(token => token.User)
            .WithMany(user => user.PasswordResetTokens)
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureTicket(
        ModelBuilder modelBuilder
    )
    {
        var ticketEntity =
            modelBuilder.Entity<Ticket>();

        ticketEntity.HasKey(
            ticket => ticket.Id
        );

        ticketEntity
            .Property(ticket => ticket.Title)
            .IsRequired()
            .HasMaxLength(150);

        ticketEntity
            .Property(ticket => ticket.Description)
            .IsRequired()
            .HasMaxLength(2000);

        ticketEntity
            .Property(ticket => ticket.Category)
            .IsRequired()
            .HasMaxLength(100);

        ticketEntity
            .Property(ticket => ticket.Priority)
            .IsRequired()
            .HasMaxLength(20);

        ticketEntity
            .Property(ticket => ticket.Status)
            .IsRequired()
            .HasMaxLength(30);

        ticketEntity
            .Property(ticket => ticket.CustomFieldsJson)
            .IsRequired()
            .HasDefaultValue("{}");

        ticketEntity
            .Property(ticket => ticket.CreatedAt)
            .IsRequired();

        ticketEntity.HasIndex(ticket => ticket.SlaDueAt);

        ticketEntity
            .HasOne(ticket => ticket.CreatedByUser)
            .WithMany(user => user.CreatedTickets)
            .HasForeignKey(
                ticket => ticket.CreatedByUserId
            )
            .OnDelete(DeleteBehavior.Restrict);

        ticketEntity
            .HasOne(ticket => ticket.AssignedToUser)
            .WithMany(user => user.AssignedTickets)
            .HasForeignKey(
                ticket => ticket.AssignedToUserId
            )
            .OnDelete(DeleteBehavior.SetNull);
    }

    private static void ConfigureCategory(
        ModelBuilder modelBuilder
    )
    {
        var categoryEntity =
            modelBuilder.Entity<Category>();

        categoryEntity.HasKey(
            category => category.Id
        );

        categoryEntity
            .Property(category => category.Name)
            .IsRequired()
            .HasMaxLength(100);

        categoryEntity
            .HasIndex(category => category.Name)
            .IsUnique();
    }

    private static void ConfigureTicketComment(
        ModelBuilder modelBuilder
    )
    {
        var commentEntity =
            modelBuilder.Entity<TicketComment>();

        commentEntity.HasKey(
            comment => comment.Id
        );

        commentEntity
            .Property(comment => comment.AuthorName)
            .IsRequired()
            .HasMaxLength(100);

        commentEntity
            .Property(comment => comment.AuthorRole)
            .IsRequired()
            .HasMaxLength(30);

        commentEntity
            .Property(comment => comment.Content)
            .IsRequired()
            .HasMaxLength(1000);

        commentEntity
            .Property(comment => comment.CreatedAt)
            .IsRequired();

        commentEntity
            .HasOne(comment => comment.Ticket)
            .WithMany(ticket => ticket.Comments)
            .HasForeignKey(
                comment => comment.TicketId
            )
            .OnDelete(DeleteBehavior.Cascade);

        commentEntity
            .HasOne(comment => comment.AuthorUser)
            .WithMany()
            .HasForeignKey(
                comment => comment.AuthorUserId
            )
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureTicketAttachment(
        ModelBuilder modelBuilder
    )
    {
        var attachmentEntity =
            modelBuilder.Entity<TicketAttachment>();

        attachmentEntity.HasKey(
            attachment => attachment.Id
        );

        attachmentEntity
            .Property(
                attachment =>
                    attachment.UploadedByName
            )
            .IsRequired()
            .HasMaxLength(100);

        attachmentEntity
            .Property(
                attachment =>
                    attachment.OriginalFileName
            )
            .IsRequired()
            .HasMaxLength(255);

        attachmentEntity
            .Property(
                attachment =>
                    attachment.StoredFileName
            )
            .IsRequired()
            .HasMaxLength(255);

        attachmentEntity
            .Property(
                attachment =>
                    attachment.RelativePath
            )
            .IsRequired()
            .HasMaxLength(500);

        attachmentEntity
            .Property(
                attachment =>
                    attachment.ContentType
            )
            .IsRequired()
            .HasMaxLength(150);

        attachmentEntity
            .Property(
                attachment =>
                    attachment.FileSize
            )
            .IsRequired();

        attachmentEntity
            .Property(
                attachment =>
                    attachment.CreatedAt
            )
            .IsRequired();

        attachmentEntity
            .HasOne(
                attachment =>
                    attachment.Ticket
            )
            .WithMany(
                ticket =>
                    ticket.Attachments
            )
            .HasForeignKey(
                attachment =>
                    attachment.TicketId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );

        attachmentEntity
            .HasOne(
                attachment =>
                    attachment.UploadedByUser
            )
            .WithMany()
            .HasForeignKey(
                attachment =>
                    attachment.UploadedByUserId
            )
            .OnDelete(
                DeleteBehavior.SetNull
            );
    }

    private static void ConfigureTicketActivity(
        ModelBuilder modelBuilder
    )
    {
        var activityEntity =
            modelBuilder.Entity<TicketActivity>();

        activityEntity.HasKey(
            activity => activity.Id
        );

        activityEntity
            .Property(activity => activity.ActorName)
            .IsRequired()
            .HasMaxLength(100);

        activityEntity
            .Property(activity => activity.ActorRole)
            .IsRequired()
            .HasMaxLength(30);

        activityEntity
            .Property(activity => activity.Type)
            .IsRequired()
            .HasMaxLength(30);

        activityEntity
            .Property(activity => activity.Title)
            .IsRequired()
            .HasMaxLength(150);

        activityEntity
            .Property(activity => activity.Description)
            .IsRequired()
            .HasMaxLength(500);

        activityEntity
            .Property(activity => activity.CreatedAt)
            .IsRequired();

        activityEntity
            .HasOne(activity => activity.Ticket)
            .WithMany(ticket => ticket.Activities)
            .HasForeignKey(
                activity => activity.TicketId
            )
            .OnDelete(DeleteBehavior.Cascade);

        activityEntity
            .HasOne(activity => activity.ActorUser)
            .WithMany()
            .HasForeignKey(
                activity => activity.ActorUserId
            )
            .OnDelete(DeleteBehavior.SetNull);
    }

    private static void ConfigureNotification(
        ModelBuilder modelBuilder
    )
    {
        var notificationEntity =
            modelBuilder.Entity<Notification>();

        notificationEntity
            .Property(notification => notification.EmailDeliveryStatus)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("Pending");

        notificationEntity.HasIndex(notification =>
            notification.EmailDeliveryStatus
        );

        notificationEntity
            .HasOne(notification => notification.Ticket)
            .WithMany()
            .HasForeignKey(notification => notification.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        notificationEntity
            .HasOne(notification => notification.User)
            .WithMany()
            .HasForeignKey(notification => notification.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
