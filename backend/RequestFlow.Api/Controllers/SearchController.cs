using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/search")]
public sealed class SearchController : ControllerBase
{
    private readonly AppDbContext _context;

    public SearchController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? query,
        [FromQuery] int limit = 8
    )
    {
        var normalizedQuery = query?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedQuery) ||
            normalizedQuery.Length < 2)
        {
            return Ok(new
            {
                query = normalizedQuery ?? string.Empty,
                items = Array.Empty<object>(),
                total = 0
            });
        }

        normalizedQuery = normalizedQuery[..Math.Min(
            normalizedQuery.Length,
            100
        )];
        var searchTerm = normalizedQuery.ToLower();
        var resultLimit = Math.Clamp(limit, 1, 30);

        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var role = GetCurrentRole();
        var ticketQuery = _context.Tickets.AsNoTracking();

        if (role == "staff")
        {
            ticketQuery = ticketQuery.Where(ticket =>
                ticket.AssignedToUserId == userId
            );
        }
        else if (role is not ("admin" or "supervisor"))
        {
            ticketQuery = ticketQuery.Where(ticket =>
                ticket.CreatedByUserId == userId
            );
        }

        var requests = await ticketQuery
            .Where(ticket =>
                ticket.Title.ToLower().Contains(searchTerm) ||
                ticket.Description.ToLower().Contains(searchTerm) ||
                ticket.Category.ToLower().Contains(searchTerm) ||
                ticket.Status.ToLower().Contains(searchTerm) ||
                ticket.Priority.ToLower().Contains(searchTerm) ||
                ticket.Id.ToString() == normalizedQuery
            )
            .OrderByDescending(ticket => ticket.UpdatedAt ?? ticket.CreatedAt)
            .Take(resultLimit)
            .Select(ticket => new SearchResult(
                "request",
                ticket.Id.ToString(),
                ticket.Title,
                $"#{ticket.Id} · {ticket.Category}",
                ticket.Status,
                $"/requests/edit/{ticket.Id}"
            ))
            .ToListAsync();

        var knowledge = await _context.KnowledgeArticles
            .AsNoTracking()
            .Where(article =>
                article.IsPublished &&
                (
                    article.Title.ToLower().Contains(searchTerm) ||
                    article.Summary.ToLower().Contains(searchTerm) ||
                    article.Keywords.ToLower().Contains(searchTerm)
                )
            )
            .OrderBy(article => article.DisplayOrder)
            .Take(resultLimit)
            .Select(article => new SearchResult(
                "knowledge",
                article.Id.ToString(),
                article.Title,
                article.Summary,
                article.ArticleType,
                $"/knowledge-base?article={article.Id}"
            ))
            .ToListAsync();

        var people = new List<SearchResult>();

        if (role == "admin")
        {
            people = await _context.Users
                .AsNoTracking()
                .Where(user =>
                    user.FullName.ToLower().Contains(searchTerm) ||
                    user.Email.ToLower().Contains(searchTerm) ||
                    user.Role.ToLower().Contains(searchTerm)
                )
                .OrderBy(user => user.FullName)
                .Take(resultLimit)
                .Select(user => new SearchResult(
                    "person",
                    user.Id.ToString(),
                    user.FullName,
                    user.Email,
                    user.Role,
                    "/employees"
                ))
                .ToListAsync();
        }

        var items = requests
            .Concat(knowledge)
            .Concat(people)
            .Take(resultLimit)
            .ToList();

        return Ok(new
        {
            query = normalizedQuery,
            items,
            total = requests.Count + knowledge.Count + people.Count
        });
    }

    private bool TryGetCurrentUserId(out int userId)
    {
        var value = User.FindFirst("sub")?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(value, out userId);
    }

    private string GetCurrentRole() =>
        (User.FindFirst("role")?.Value ??
            User.FindFirst(ClaimTypes.Role)?.Value ??
            "User")
        .Trim()
        .ToLowerInvariant();

    private sealed record SearchResult(
        string Type,
        string Id,
        string Title,
        string Subtitle,
        string Meta,
        string Url
    );
}
