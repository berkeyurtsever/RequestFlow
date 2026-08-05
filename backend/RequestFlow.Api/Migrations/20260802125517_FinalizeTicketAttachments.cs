using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class FinalizeTicketAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketActivities_Users_ActorUserId",
                table: "TicketActivities");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketAttachments_Users_UploadedByUserId",
                table: "TicketAttachments");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketActivities_Users_ActorUserId",
                table: "TicketActivities",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAttachments_Users_UploadedByUserId",
                table: "TicketAttachments",
                column: "UploadedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketActivities_Users_ActorUserId",
                table: "TicketActivities");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketAttachments_Users_UploadedByUserId",
                table: "TicketAttachments");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketActivities_Users_ActorUserId",
                table: "TicketActivities",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAttachments_Users_UploadedByUserId",
                table: "TicketAttachments",
                column: "UploadedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
