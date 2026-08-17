using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomatedReportSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportSchedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    Frequency = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Recipients = table.Column<string>(type: "TEXT", maxLength: 1500, nullable: false),
                    LastSentAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    NextRunAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastDeliveryStatus = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    LastError = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSchedules", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportSchedules");
        }
    }
}
