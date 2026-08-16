using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/RequestTemplates")]
[Authorize]
public class RequestTemplatesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RequestTemplatesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] string? category
    )
    {
        var query = _context.RequestTemplates
            .AsNoTracking()
            .Where(template => template.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim();
            query = query.Where(template =>
                template.Category == normalizedCategory
            );
        }

        var templates = await query
            .OrderBy(template => template.DisplayOrder)
            .ThenBy(template => template.Name)
            .Select(template => new
            {
                template.Id,
                template.Name,
                template.Category,
                template.Title,
                template.Description,
                template.Priority,
                template.Icon
            })
            .ToListAsync();

        return Ok(templates);
    }
}
