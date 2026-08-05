using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Data;

public static class CategorySeeder
{
    public static async Task SeedAsync(
        AppDbContext context
    )
    {
        var defaultCategories =
            new List<Category>
            {
                new()
                {
                    Name =
                        "Information Technology",

                    Description =
                        "Hardware, software, access, network and technical support requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                },

                new()
                {
                    Name =
                        "Human Resources",

                    Description =
                        "Employee, leave, recruitment and HR-related requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                },

                new()
                {
                    Name =
                        "Finance",

                    Description =
                        "Payment, invoice, expense, budget and reimbursement requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                },

                new()
                {
                    Name =
                        "Administrative Affairs",

                    Description =
                        "Office supplies, transportation, facility and administrative requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                },

                new()
                {
                    Name =
                        "Operations",

                    Description =
                        "Equipment, inventory, logistics, maintenance and operational requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                },

                new()
                {
                    Name =
                        "General",

                    Description =
                        "General requests, suggestions, complaints and other requests.",

                    IsActive = true,

                    CreatedAt =
                        DateTime.UtcNow,

                    UpdatedAt = null
                }
            };

        var existingCategoryNames =
            await context.Categories
                .AsNoTracking()
                .Select(category =>
                    category.Name
                )
                .ToListAsync();

        var existingNames =
            new HashSet<string>(
                existingCategoryNames
                    .Where(name =>
                        !string.IsNullOrWhiteSpace(
                            name
                        )
                    )
                    .Select(name =>
                        name.Trim()
                    ),
                StringComparer.OrdinalIgnoreCase
            );

        var missingCategories =
            defaultCategories
                .Where(category =>
                    !existingNames.Contains(
                        category.Name
                    )
                )
                .ToList();

        if (missingCategories.Count == 0)
        {
            return;
        }

        await context.Categories.AddRangeAsync(
            missingCategories
        );

        await context.SaveChangesAsync();
    }
}