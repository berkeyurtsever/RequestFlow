using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/Categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLog;

    public CategoriesController(
        AppDbContext context,
        IAuditLogService auditLog
    )
    {
        _context = context;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var role = GetCurrentRole();

        IQueryable<Category> query =
            _context.Categories.AsNoTracking();

        if (!IsManagementRole(role))
        {
            query = query.Where(
                category => category.IsActive
            );
        }

        var categories = await query
            .OrderByDescending(
                category => category.IsActive
            )
            .ThenBy(category => category.Name)
            .Select(category => new
            {
                category.Id,
                category.Name,
                category.Description,
                category.IsActive,
                category.CreatedAt,
                category.UpdatedAt
            })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCategory(
        int id
    )
    {
        var category = await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(
                category => category.Id == id
            );

        if (category == null)
        {
            return NotFound(new
            {
                message =
                    "Category could not be found."
            });
        }

        var role = GetCurrentRole();

        if (
            !category.IsActive &&
            !IsManagementRole(role)
        )
        {
            return NotFound(new
            {
                message =
                    "Category could not be found."
            });
        }

        return Ok(new
        {
            category.Id,
            category.Name,
            category.Description,
            category.IsActive,
            category.CreatedAt,
            category.UpdatedAt
        });
    }

    [Authorize(Policy = "ManagementOnly")]
    [HttpPost]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateCategoryDto createCategoryDto
    )
    {
        var categoryName =
            createCategoryDto.Name.Trim();

        if (string.IsNullOrWhiteSpace(categoryName))
        {
            return BadRequest(new
            {
                message =
                    "Category name is required."
            });
        }

        var normalizedName =
            categoryName.ToLower();

        var categoryExists =
            await _context.Categories.AnyAsync(
                category =>
                    category.Name.ToLower() ==
                    normalizedName
            );

        if (categoryExists)
        {
            return Conflict(new
            {
                message =
                    "A category with this name already exists."
            });
        }

        var category = new Category
        {
            Name = categoryName,
            Description =
                createCategoryDto.Description
                    ?.Trim() ?? string.Empty,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        _auditLog.Add(
            User,
            "category.created",
            "Category",
            null,
            $"Category \"{category.Name}\" was created."
        );
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetCategory),
            new { id = category.Id },
            new
            {
                category.Id,
                category.Name,
                category.Description,
                category.IsActive,
                category.CreatedAt,
                category.UpdatedAt
            }
        );
    }

    [Authorize(Policy = "ManagementOnly")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCategory(
        int id,
        [FromBody] UpdateCategoryDto updateCategoryDto
    )
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(
                category => category.Id == id
            );

        if (category == null)
        {
            return NotFound(new
            {
                message =
                    "Category could not be found."
            });
        }

        var categoryName =
            updateCategoryDto.Name.Trim();

        if (string.IsNullOrWhiteSpace(categoryName))
        {
            return BadRequest(new
            {
                message =
                    "Category name is required."
            });
        }

        var normalizedName =
            categoryName.ToLower();

        var duplicateCategory =
            await _context.Categories.AnyAsync(
                existingCategory =>
                    existingCategory.Id != id &&
                    existingCategory.Name.ToLower() ==
                    normalizedName
            );

        if (duplicateCategory)
        {
            return Conflict(new
            {
                message =
                    "A category with this name already exists."
            });
        }

        category.Name = categoryName;
        category.Description =
            updateCategoryDto.Description
                ?.Trim() ?? string.Empty;
        category.IsActive =
            updateCategoryDto.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        _auditLog.Add(
            User,
            "category.updated",
            "Category",
            category.Id.ToString(),
            $"Category \"{category.Name}\" was updated."
        );

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message =
                "Category updated successfully.",
            category = new
            {
                category.Id,
                category.Name,
                category.Description,
                category.IsActive,
                category.CreatedAt,
                category.UpdatedAt
            }
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCategory(
        int id
    )
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(
                category => category.Id == id
            );

        if (category == null)
        {
            return NotFound(new
            {
                message =
                    "Category could not be found."
            });
        }

        _context.Categories.Remove(category);
        _auditLog.Add(
            User,
            "category.deleted",
            "Category",
            category.Id.ToString(),
            $"Category \"{category.Name}\" was deleted."
        );
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GetCurrentRole()
    {
        var role =
            User.FindFirst("role")?.Value ??
            User.FindFirst(ClaimTypes.Role)?.Value ??
            "User";

        return role.Trim().ToLowerInvariant();
    }

    private static bool IsManagementRole(
        string role
    )
    {
        return role == "admin" ||
               role == "supervisor";
    }
}
