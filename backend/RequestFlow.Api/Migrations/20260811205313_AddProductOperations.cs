using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SlaBreachedAt",
                table: "Tickets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SlaDueAt",
                table: "Tickets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailDeliveredAt",
                table: "Notifications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailDeliveryStatus",
                table: "Notifications",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.Sql(
                """
                UPDATE Tickets
                SET SlaDueAt = datetime(
                    CreatedAt,
                    CASE lower(Priority)
                        WHEN 'urgent' THEN '+4 hours'
                        WHEN 'high' THEN '+24 hours'
                        WHEN 'low' THEN '+72 hours'
                        ELSE '+48 hours'
                    END
                )
                WHERE SlaDueAt IS NULL;
                """
            );

            migrationBuilder.Sql(
                "UPDATE Notifications SET EmailDeliveryStatus = 'Skipped';"
            );

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ActorUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    ActorName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ActorRole = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Action = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    EntityType = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    Summary = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "UserNotificationPreferences",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    EmailEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyAssignment = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyStatusChange = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifyComments = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotifySla = table.Column<bool>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotificationPreferences", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserNotificationPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_SlaDueAt",
                table: "Tickets",
                column: "SlaDueAt");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_EmailDeliveryStatus",
                table: "Notifications",
                column: "EmailDeliveryStatus");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorUserId",
                table: "AuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "UserNotificationPreferences");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_SlaDueAt",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_EmailDeliveryStatus",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "SlaBreachedAt",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "SlaDueAt",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "EmailDeliveredAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "EmailDeliveryStatus",
                table: "Notifications");
        }
    }
}
