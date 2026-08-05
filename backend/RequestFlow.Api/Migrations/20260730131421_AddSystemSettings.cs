using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SystemName = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SystemDescription = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    DefaultPriority = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    AutoAssignment = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmailNotifications = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyNewRequest = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyAssignment = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyStatusChange = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyComments = table.Column<bool>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemSettings_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "SystemSettings",
                columns: new[] { "Id", "AutoAssignment", "DefaultPriority", "EmailNotifications", "NotifyAssignment", "NotifyComments", "NotifyNewRequest", "NotifyStatusChange", "SystemDescription", "SystemName", "UpdatedAt", "UpdatedByUserId" },
                values: new object[] { 1, false, "Medium", true, true, true, true, true, "Company request tracking and workflow management system.", "RequestFlow", new DateTime(2026, 7, 30, 0, 0, 0, 0, DateTimeKind.Utc), null });

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_UpdatedByUserId",
                table: "SystemSettings",
                column: "UpdatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemSettings");
        }
    }
}
