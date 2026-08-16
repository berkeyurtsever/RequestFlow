using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RequestFlow.Api.Hubs;

[Authorize]
public sealed class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                $"user:{userId}"
            );
        }

        await base.OnConnectedAsync();
    }
}
