import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

const isContinuousIntegration =
  Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 2 : 0,
  workers: 1,
  reporter: isContinuousIntegration
    ? [["line"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://127.0.0.1:5373",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  webServer: [
    {
      command:
        "dotnet run --project ../../RequestFlow.Api.csproj --no-launch-profile --urls http://127.0.0.1:5311",
      url: "http://127.0.0.1:5311/health",
      reuseExistingServer:
        !isContinuousIntegration,
      timeout: 120000,
      env: {
        ASPNETCORE_ENVIRONMENT: "E2E",
        ConnectionStrings__DefaultConnection:
          "Data Source=requestflow-e2e.db",
        Jwt__Key:
          "REQUESTFLOW_E2E_ONLY_SIGNING_KEY_2026_123456789",
        Jwt__Issuer: "RequestFlow.Api",
        Jwt__Audience: "RequestFlow.Client",
        Cors__AllowedOrigins__0:
          "http://127.0.0.1:5373",
        Demo__Enabled: "true",
        Email__Enabled: "false"
      }
    },
    {
      command:
        "npm run dev -- --host 127.0.0.1 --port 5373",
      url: "http://127.0.0.1:5373/login",
      reuseExistingServer:
        !isContinuousIntegration,
      timeout: 120000,
      env: {
        VITE_API_BASE_URL:
          "http://127.0.0.1:5311/api",
        VITE_DEMO_MODE: "true"
      }
    }
  ]
});
