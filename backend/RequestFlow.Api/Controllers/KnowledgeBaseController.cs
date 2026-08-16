using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/KnowledgeBase")]
[Authorize]
public class KnowledgeBaseController : ControllerBase
{
    private readonly AppDbContext _context;

    public KnowledgeBaseController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetArticles(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? type
    )
    {
        var query = _context.KnowledgeArticles
            .AsNoTracking()
            .Where(article => article.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim();
            query = query.Where(article =>
                article.Category == normalizedCategory
            );
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalizedType = type.Trim();
            query = query.Where(article =>
                article.ArticleType == normalizedType
            );
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(article =>
                article.Title.ToLower().Contains(normalizedSearch) ||
                article.Summary.ToLower().Contains(normalizedSearch) ||
                article.Content.ToLower().Contains(normalizedSearch) ||
                article.Keywords.ToLower().Contains(normalizedSearch)
            );
        }

        var articles = await query
            .OrderBy(article => article.DisplayOrder)
            .ThenBy(article => article.Title)
            .Select(article => new
            {
                article.Id,
                article.Title,
                article.Category,
                article.ArticleType,
                article.Summary,
                article.Content,
                article.Keywords,
                article.UpdatedAt
            })
            .ToListAsync();

        return Ok(articles);
    }
}
