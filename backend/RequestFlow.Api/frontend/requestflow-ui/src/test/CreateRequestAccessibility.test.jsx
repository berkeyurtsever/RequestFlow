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

  api.get.mockImplementation(url => {
    if (url === "/RequestTemplates") {
      return Promise.resolve({ data: [] });
    }

    if (url === "/CategoryFields") {
      return Promise.resolve({ data: [] });
    }

    return Promise.resolve({
      data: {
        defaultPriority: "Medium"
      }
    });
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

  it("applies templates and submits category-specific fields", async () => {
    api.get.mockImplementation(url => {
      if (url === "/RequestTemplates") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: "New computer setup",
              category: "Hardware Request",
              title: "New computer setup for employee",
              description:
                "Please prepare a standard laptop and required accessories.",
              priority: "High"
            }
          ]
        });
      }

      if (url === "/CategoryFields") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              category: "Hardware Request",
              key: "deviceType",
              label: "Device type",
              fieldType: "select",
              placeholder: "Select a device",
              helpText: "Choose the required device.",
              isRequired: true,
              options: ["Laptop", "Desktop"]
            },
            {
              id: 2,
              category: "Hardware Request",
              key: "neededBy",
              label: "Required date",
              fieldType: "date",
              isRequired: true,
              options: []
            }
          ]
        });
      }

      return Promise.resolve({
        data: { defaultPriority: "Medium" }
      });
    });

    api.post.mockResolvedValue({
      data: { id: 42 }
    });

    render(
      <MemoryRouter>
        <CreateRequest />
      </MemoryRouter>
    );

    const templateName = await screen.findByText(
      "New computer setup"
    );

    fireEvent.click(
      templateName.closest("button")
    );

    expect(
      screen.getByLabelText(/Request Title/)
    ).toHaveValue("New computer setup for employee");

    fireEvent.change(
      screen.getByLabelText(/Device type/),
      { target: { value: "Laptop" } }
    );

    fireEvent.change(
      screen.getByLabelText(/Required date/),
      { target: { value: "2026-09-01" } }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Submit Request"
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/Tickets",
        expect.objectContaining({
          category: "Hardware Request",
          priority: "High",
          customFields: {
            deviceType: "Laptop",
            neededBy: "2026-09-01"
          }
        })
      );
    });
  });
});
