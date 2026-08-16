using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Services;

public interface IReportPdfService
{
    Task<byte[]> GenerateAsync(
        CancellationToken cancellationToken = default
    );
}

public sealed class ReportPdfService : IReportPdfService
{
    private readonly AppDbContext _context;

    public ReportPdfService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenerateAsync(
        CancellationToken cancellationToken = default
    )
    {
        var tickets = await _context.Tickets
            .AsNoTracking()
            .OrderByDescending(ticket => ticket.UpdatedAt ?? ticket.CreatedAt)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var resolved = tickets.Where(ticket =>
            SlaPolicy.IsClosed(ticket.Status)
        ).ToList();

        var overdue = tickets.Count(ticket =>
            !SlaPolicy.IsClosed(ticket.Status) &&
            ticket.SlaDueAt.HasValue &&
            ticket.SlaDueAt.Value <= now
        );

        var averageResolutionHours = resolved.Count == 0
            ? 0
            : Math.Round(
                resolved
                    .Where(ticket => ticket.UpdatedAt.HasValue)
                    .Select(ticket =>
                        (ticket.UpdatedAt!.Value - ticket.CreatedAt).TotalHours
                    )
                    .DefaultIfEmpty(0)
                    .Average(),
                1
            );

        var statusGroups = tickets
            .GroupBy(ticket => ticket.Status)
            .OrderByDescending(group => group.Count())
            .ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(style =>
                    style.FontSize(10).FontColor("#334155")
                );

                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(column =>
                    {
                        column.Item().Text("RequestFlow")
                            .FontSize(24)
                            .Bold()
                            .FontColor("#0f172a");
                        column.Item().Text("Request Management Report")
                            .FontSize(11)
                            .FontColor("#64748b");
                    });

                    row.ConstantItem(170).AlignRight().Column(column =>
                    {
                        column.Item().Text("GENERATED")
                            .FontSize(8).Bold().FontColor("#2563eb");
                        column.Item().Text(now.ToString("yyyy-MM-dd HH:mm 'UTC'"))
                            .FontSize(9);
                    });
                });

                page.Content().PaddingVertical(24).Column(column =>
                {
                    column.Spacing(18);
                    column.Item().Row(row =>
                    {
                        AddMetric(row, "Total", tickets.Count, "#2563eb");
                        AddMetric(row, "Resolved", resolved.Count, "#16a34a");
                        AddMetric(row, "Overdue", overdue, "#dc2626");
                        AddMetric(row, "Avg. resolution", $"{averageResolutionHours:0.0}h", "#7c3aed");
                    });

                    column.Item().Text("Status distribution")
                        .FontSize(14).Bold().FontColor("#0f172a");

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            HeaderCell(header.Cell(), "Status");
                            HeaderCell(header.Cell(), "Requests");
                        });

                        foreach (var group in statusGroups)
                        {
                            BodyCell(table.Cell(), group.Key);
                            BodyCell(table.Cell(), group.Count().ToString());
                        }
                    });

                    column.Item().Text("Recent requests")
                        .FontSize(14).Bold().FontColor("#0f172a");

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(34);
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(1.4f);
                            columns.RelativeColumn(1.2f);
                            columns.RelativeColumn(1.3f);
                        });

                        table.Header(header =>
                        {
                            HeaderCell(header.Cell(), "ID");
                            HeaderCell(header.Cell(), "Title");
                            HeaderCell(header.Cell(), "Status");
                            HeaderCell(header.Cell(), "Priority");
                            HeaderCell(header.Cell(), "SLA due");
                        });

                        foreach (var ticket in tickets.Take(20))
                        {
                            BodyCell(table.Cell(), $"#{ticket.Id}");
                            BodyCell(table.Cell(), ticket.Title);
                            BodyCell(table.Cell(), ticket.Status);
                            BodyCell(table.Cell(), ticket.Priority);
                            BodyCell(
                                table.Cell(),
                                ticket.SlaDueAt?.ToString("yyyy-MM-dd HH:mm") ?? "-"
                            );
                        }
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("RequestFlow - Page ").FontColor("#94a3b8");
                    text.CurrentPageNumber().FontColor("#64748b");
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void AddMetric(
        RowDescriptor row,
        string label,
        object value,
        string color
    )
    {
        row.RelativeItem().PaddingRight(8).Background("#f8fafc")
            .Border(1).BorderColor("#e2e8f0").Padding(12)
            .Column(column =>
            {
                column.Item().Text(label).FontSize(8).Bold()
                    .FontColor("#64748b");
                column.Item().Text(value.ToString() ?? "0")
                    .FontSize(18).Bold().FontColor(color);
            });
    }

    private static void HeaderCell(IContainer container, string text)
    {
        container.Background("#eff6ff")
            .BorderBottom(1).BorderColor("#bfdbfe")
            .Padding(7).Text(text).Bold().FontSize(8)
            .FontColor("#1e3a8a");
    }

    private static void BodyCell(IContainer container, string text)
    {
        container.BorderBottom(1).BorderColor("#e2e8f0")
            .PaddingVertical(7).PaddingHorizontal(6)
            .Text(text).FontSize(8.5f).FontColor("#334155");
    }
}
