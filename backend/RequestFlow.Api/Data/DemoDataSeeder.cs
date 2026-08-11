using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Data;

public static class DemoDataSeeder
{
    public const string DefaultSupervisorEmail =
        "demo.supervisor@requestflow.example";

    public static async Task SeedAsync(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        string supervisorEmail = DefaultSupervisorEmail
    )
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        var createdAt = DateTime.UtcNow.AddDays(-7);

        var supervisor = CreateUser(
            passwordHasher,
            "Demo Supervisor",
            supervisorEmail,
            "Supervisor",
            createdAt
        );

        var staff = CreateUser(
            passwordHasher,
            "Alex Morgan",
            "demo.staff@requestflow.example",
            "Staff",
            createdAt.AddHours(1)
        );

        var employee = CreateUser(
            passwordHasher,
            "Taylor Reed",
            "demo.user@requestflow.example",
            "User",
            createdAt.AddHours(2)
        );

        await context.Users.AddRangeAsync(
            supervisor,
            staff,
            employee
        );

        await context.SaveChangesAsync();

        var tickets = new List<Ticket>
        {
            new()
            {
                Title = "New employee equipment request",
                Description =
                    "Prepare a laptop, monitor and access card for the new team member.",
                Category = "Information Technology",
                Priority = "High",
                Status = "In Progress",
                CreatedByUserId = employee.Id,
                AssignedToUserId = staff.Id,
                CreatedAt = createdAt.AddDays(1),
                UpdatedAt = createdAt.AddDays(3)
            },
            new()
            {
                Title = "Ergonomic office chair replacement",
                Description =
                    "The current chair is damaged and should be replaced before the next office day.",
                Category = "Administrative Affairs",
                Priority = "Medium",
                Status = "Open",
                CreatedByUserId = employee.Id,
                CreatedAt = createdAt.AddDays(2)
            },
            new()
            {
                Title = "Quarterly software access review",
                Description =
                    "Review active software licenses and remove access that is no longer required.",
                Category = "Information Technology",
                Priority = "Low",
                Status = "Resolved",
                CreatedByUserId = employee.Id,
                AssignedToUserId = staff.Id,
                CreatedAt = createdAt.AddDays(3),
                UpdatedAt = createdAt.AddDays(5)
            }
        };

        await context.Tickets.AddRangeAsync(tickets);
        await context.SaveChangesAsync();

        await context.TicketActivities.AddRangeAsync(
            tickets.Select(ticket => new TicketActivity
            {
                TicketId = ticket.Id,
                ActorUserId = employee.Id,
                ActorName = employee.FullName,
                ActorRole = employee.Role,
                Type = "created",
                Title = "Request created",
                Description =
                    $"Request \"{ticket.Title}\" was created with demo data.",
                CreatedAt = ticket.CreatedAt
            })
        );

        await context.SaveChangesAsync();
    }

    private static User CreateUser(
        IPasswordHasher<User> passwordHasher,
        string fullName,
        string email,
        string role,
        DateTime createdAt
    )
    {
        var user = new User
        {
            FullName = fullName,
            Email = email.Trim().ToLowerInvariant(),
            Role = role,
            CreatedAt = createdAt
        };

        user.PasswordHash = passwordHasher.HashPassword(
            user,
            Guid.NewGuid().ToString("N")
        );

        return user;
    }
}
