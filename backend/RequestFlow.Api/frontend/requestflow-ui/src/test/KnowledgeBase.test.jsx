import {
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import KnowledgeBase from "../pages/KnowledgeBase";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({
    data: [
      {
        id: 1,
        title: "How to create an effective request",
        category: "Getting Started",
        articleType: "Guide",
        summary: "Choose the closest category.",
        content: "Use a clear title and add useful details.",
        keywords: "create request"
      },
      {
        id: 2,
        title: "Can I edit a request?",
        category: "Requests",
        articleType: "Faq",
        summary: "Yes, open the request and edit it.",
        content: "Yes, open the request and edit it.",
        keywords: "faq edit"
      }
    ]
  });
});

describe("KnowledgeBase", () => {
  it("searches guides and exposes FAQ answers", async () => {
    render(
      <MemoryRouter>
        <KnowledgeBase />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(
        "How to create an effective request"
      )
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search the knowledge base"
      }),
      { target: { value: "edit" } }
    );

    expect(
      screen.queryByText(
        "How to create an effective request"
      )
    ).not.toBeInTheDocument();

    const faqSummary = screen.getByText(
      "Can I edit a request?"
    );

    fireEvent.click(faqSummary);

    expect(
      screen.getByText(
        "Yes, open the request and edit it."
      )
    ).toBeInTheDocument();
  });
});
