import {
  render,
  screen,
  waitFor
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { LanguageProvider } from "../context/LanguageContext";
import SystemHealth from "../pages/SystemHealth";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn()
  }
}));

describe("SystemHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const values = new Map();

    vi.stubGlobal("localStorage", {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) =>
        values.set(key, String(value)),
      removeItem: key => values.delete(key),
      clear: () => values.clear()
    });

    localStorage.setItem(
      "requestflow_language",
      "en"
    );

    api.get.mockResolvedValue({
      data: {
        status: "healthy",
        checkedAt: "2026-09-08T00:00:00Z",
        uptimeSeconds: 7200,
        environment: "Testing",
        version: "1.0.0",
        resources: {
          workingSetMegabytes: 80
        },
        summary: {
          users: 4,
          requests: 12,
          openRequests: 5,
          overdueRequests: 1,
          unreadNotifications: 3
        },
        components: [
          {
            key: "api",
            status: "healthy",
            detailKey: "operational",
            responseTimeMs: 0
          },
          {
            key: "database",
            status: "healthy",
            detailKey: "connected",
            responseTimeMs: 4
          }
        ]
      }
    });
  });

  it("loads and displays administrator health metrics", async () => {
    render(
      <LanguageProvider>
        <SystemHealth />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/system-health"
      );
    });

    expect(
      screen.getByRole("heading", {
        name: "System Health"
      })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Healthy").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
