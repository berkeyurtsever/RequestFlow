import {
  HubConnectionBuilder,
  LogLevel
} from "@microsoft/signalr";
import api from "./api";

let connection = null;

function getHubUrl() {
  const apiUrl = api.defaults.baseURL || "/api";
  const normalized = apiUrl.replace(/\/+$/, "");

  if (normalized.endsWith("/api")) {
    return `${normalized.slice(0, -4)}/hubs/notifications`;
  }

  return `${normalized}/hubs/notifications`;
}

export async function startRealtimeNotifications(token) {
  if (!token || connection) {
    return;
  }

  connection = new HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on(
    "notificationReceived",
    notification => {
      window.dispatchEvent(
        new CustomEvent(
          "requestflow:notification",
          { detail: notification }
        )
      );
    }
  );

  try {
    await connection.start();
  } catch (error) {
    console.warn(
      "Realtime notifications are temporarily unavailable:",
      error
    );
    connection = null;
  }
}

export async function stopRealtimeNotifications() {
  const activeConnection = connection;
  connection = null;

  if (activeConnection) {
    await activeConnection.stop();
  }
}
