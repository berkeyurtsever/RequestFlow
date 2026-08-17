using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RequestFlow.Api.DTOs.Reports;

namespace RequestFlow.Api.Services;

public interface IReportPdfService
{
    Task<byte[]> GenerateAsync(
        string? period = null,
        CancellationToken cancellationToken = default
    );
}

public sealed class ReportPdfService : IReportPdfService
{
    private readonly IReportDataService _reportDataService;

    public ReportPdfService(IReportDataService reportDataService)
    {
        _reportDataService = reportDataService;
    }

    public async Task<byte[]> GenerateAsync(
        string? period = null,
        CancellationToken cancellationToken = default
    )
    {
        var report = await _reportDataService.GetAsync(
            period,
            cancellationToken
        );

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
                        column.Item().Text(report.PeriodLabel)
                            .FontSize(9)
                            .Bold()
                            .FontColor("#2563eb");
                    });

                    row.ConstantItem(170).AlignRight().Column(column =>
                    {
                        column.Item().Text("GENERATED")
                            .FontSize(8).Bold().FontColor("#2563eb");
                        column.Item().Text(
                            report.ToUtc.ToString("yyyy-MM-dd HH:mm 'UTC'")
                        ).FontSize(9);
                    });
                });

                page.Content().PaddingVertical(24).Column(column =>
                {
                    column.Spacing(18);
                    column.Item().Row(row =>
                    {
                        AddMetric(row, "Total", report.TotalRequests, "#2563eb");
                        AddMetric(row, "Resolved", report.CompletedRequests, "#16a34a");
                        AddMetric(row, "Overdue", report.OverdueRequests, "#dc2626");
                        AddMetric(
                            row,
                            "Avg. resolution",
                            $"{report.AverageResolutionHours:0.0}h",
                            "#7c3aed"
                        );
                    });

                    AddStatusTable(column, report.StatusData);
                    AddCategoryTable(column, report.CategoryData);
                    AddRecentRequestsTable(column, report.RecentRequests);
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

    private static void AddStatusTable(
        ColumnDescriptor column,
        IReadOnlyCollection<ReportStatusDto> items
    )
    {
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

            foreach (var item in items)
            {
                BodyCell(table.Cell(), item.Name);
                BodyCell(table.Cell(), item.Value.ToString());
            }
        });
    }

    private static void AddCategoryTable(
        ColumnDescriptor column,
        IReadOnlyCollection<ReportCategoryDto> items
    )
    {
        column.Item().Text("Category intensity")
            .FontSize(14).Bold().FontColor("#0f172a");
        column.Item().Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(3);
                columns.RelativeColumn(1);
                columns.RelativeColumn(1);
                columns.RelativeColumn(1.3f);
            });
            table.Header(header =>
            {
                HeaderCell(header.Cell(), "Category");
                HeaderCell(header.Cell(), "Requests");
                HeaderCell(header.Cell(), "Share");
                HeaderCell(header.Cell(), "Intensity");
            });

            foreach (var item in items.Take(10))
            {
                BodyCell(table.Cell(), item.Name);
                BodyCell(table.Cell(), item.Requests.ToString());
                BodyCell(table.Cell(), $"{item.Percentage:0.0}%");
                BodyCell(table.Cell(), item.Intensity);
            }
        });
    }

    private static void AddRecentRequestsTable(
        ColumnDescriptor column,
        IReadOnlyCollection<ReportRequestDto> requests
    )
    {
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

            foreach (var request in requests.Take(20))
            {
                BodyCell(table.Cell(), $"#{request.Id}");
                BodyCell(table.Cell(), request.Title);
                BodyCell(table.Cell(), request.Status);
                BodyCell(table.Cell(), request.Priority);
                BodyCell(
                    table.Cell(),
                    request.SlaDueAt?.ToString("yyyy-MM-dd HH:mm") ?? "-"
                );
            }
        });
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
