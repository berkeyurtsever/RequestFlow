using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/CategoryFields")]
[Authorize]
public class CategoryFieldsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoryFieldsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetFields(
        [FromQuery] string? category
    )
    {
        var query = _context.CategoryFields
            .AsNoTracking()
            .Where(field => field.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim();
            query = query.Where(field =>
                field.Category == normalizedCategory
            );
        }

        var fields = await query
            .OrderBy(field => field.Category)
            .ThenBy(field => field.DisplayOrder)
            .ThenBy(field => field.Label)
            .ToListAsync();

        return Ok(fields.Select(field => new
        {
            field.Id,
            field.Category,
            field.Key,
            field.Label,
            field.FieldType,
            field.Placeholder,
            field.HelpText,
            field.IsRequired,
            field.DisplayOrder,
            Options = ParseOptions(field.OptionsJson)
        }));
    }

    private static string[] ParseOptions(string optionsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<string[]>(optionsJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
