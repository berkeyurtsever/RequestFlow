import {
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { LanguageProvider } from "../context/LanguageContext";
import SearchResults from "../pages/SearchResults";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn()
  }
}));

describe("SearchResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const values = new Map();

    vi.stubGlobal("localStorage", {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
      clear: () => values.clear()
    });

    localStorage.setItem("requestflow_language", "en");

    api.get.mockResolvedValue({
      data: {
        items: [
          {
            type: "request",
            id: "14",
            title: "Ergonomic chair replacement",
            subtitle: "#14 · Office Supplies",
            meta: "Open",
            url: "/requests/edit/14"
          },
          {
            type: "knowledge",
            id: "3",
            title: "Choosing request priorities",
            subtitle: "Use priorities consistently.",
            meta: "Guide",
            url: "/knowledge-base?article=3"
          }
        ]
      }
    });
  });

  it("groups global results from requests and the knowledge base", async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/search?query=request"]}>
          <SearchResults />
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "request",
          limit: 30
        }
      });
    });

    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(
      screen.getByText("Ergonomic chair replacement")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choosing request priorities")
    ).toBeInTheDocument();
  });
});
