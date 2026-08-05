using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RequestFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "CreatedAt", "Description", "IsActive", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "Computer, monitor and device requests.", true, "Hardware", null },
                    { 2, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "Software installation and application requests.", true, "Software", null },
                    { 3, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "System access and authorization requests.", true, "Access", null },
                    { 4, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "Maintenance and technical support requests.", true, "Maintenance", null },
                    { 5, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "Office and facility service requests.", true, "Facilities", null },
                    { 6, new DateTime(2026, 7, 28, 0, 0, 0, 0, DateTimeKind.Utc), "Requests that do not belong to another category.", true, "General", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
