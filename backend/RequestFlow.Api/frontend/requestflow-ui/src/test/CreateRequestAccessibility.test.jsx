import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import CreateRequest from "../pages/CreateRequest";
import api from "../services/api";

const mocks = vi.hoisted(() => ({
  showError: vi.fn()
}));

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 7,
      role: "User"
    }
  })
}));

vi.mock("../context/ConfirmContext", () => ({
  useConfirm: () => ({
    confirm: vi.fn()
  })
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({
    success: vi.fn(),
    info: vi.fn(),
    error: mocks.showError
  })
}));

vi.mock("../components/RequestAttachments", () => ({
  default: () => null
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  });

  api.get.mockResolvedValue({
    data: {
      defaultPriority: "Medium"
    }
  });
});

describe("CreateRequest accessibility", () => {
  it("links validation errors to fields and focuses the summary", async () => {
    render(
      <MemoryRouter>
        <CreateRequest />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Submit Request"
      })
    );

    const summary = await screen.findByRole(
      "alert",
      {
        name: "Check the required information"
      }
    );

    await waitFor(() => {
      expect(summary).toHaveFocus();
    });

    const titleInput =
      screen.getByLabelText(/Request Title/);

    expect(titleInput).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(titleInput).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(
        "request-title-error"
      )
    );
    expect(
      screen.getAllByText(
        "Request title is required."
      )
    ).toHaveLength(2);

    expect(
      screen.getByLabelText(/Description/)
    ).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    expect(api.post).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith(
      "Please correct the highlighted fields."
    );

    fireEvent.change(titleInput, {
      target: {
        name: "title",
        value: "New laptop request"
      }
    });

    await waitFor(() => {
      const remainingErrors =
        within(summary).getAllByRole(
          "listitem"
        );

      expect(remainingErrors).toHaveLength(2);
      expect(
        remainingErrors.every(item =>
          Boolean(item.textContent.trim())
        )
      ).toBe(true);
    });
  });
});
