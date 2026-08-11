import {
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import EditRequest from "../pages/EditRequest";
import api from "../services/api";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  showError: vi.fn(),
  success: vi.fn(),
  userRole: "Admin"
}));

vi.mock("../services/api", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      role: mocks.userRole
    }
  })
}));

vi.mock("../context/ConfirmContext", () => ({
  useConfirm: () => ({
    confirm: mocks.confirm
  })
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({
    error: mocks.showError,
    success: mocks.success
  })
}));

vi.mock("../components/AssignStaff", () => ({
  default: () => null
}));

vi.mock("../components/RequestAttachments", () => ({
  default: () => null
}));

vi.mock("../components/RequestComments", () => ({
  default: () => null
}));

const ticket = {
  id: 42,
  title: "Original request",
  category: "Technical Support",
  priority: "Medium",
  status: "Open",
  description: "Original description",
  createdAt: "2026-08-05T18:00:00Z",
  updatedAt: "2026-08-05T18:00:00Z"
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/requests/edit/42"]}>
      <Routes>
        <Route
          path="/requests/edit/:id"
          element={<EditRequest />}
        />

        <Route
          path="/requests"
          element={<p>Requests page</p>}
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userRole = "Admin";

  api.get.mockImplementation(url => {
    if (url === "/Tickets/42/activities") {
      return Promise.resolve({ data: [] });
    }

    return Promise.resolve({ data: ticket });
  });

  api.put.mockResolvedValue({
    data: {
      ...ticket,
      updatedAt: "2026-08-05T18:05:00Z"
    }
  });

  mocks.confirm.mockResolvedValue(true);
});

describe("EditRequest", () => {
  it("autosaves valid changes after a short delay", async () => {
    renderPage();

    const titleInput =
      await screen.findByDisplayValue("Original request");

    fireEvent.change(titleInput, {
      target: {
        name: "title",
        value: "Updated request"
      }
    });

    expect(
      screen.getByText("Autosave pending...")
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(api.put).toHaveBeenCalledWith(
          "/Tickets/42",
          expect.objectContaining({
            title: "Updated request"
          })
        );
      },
      {
        timeout: 2500
      }
    );

    await waitFor(() => {
      expect(
        screen.getByText(/^Saved at /)
      ).toBeInTheDocument();
    });
  });

  it("keeps a delete failure visible on the page", async () => {
    api.delete.mockRejectedValue({
      response: {
        status: 500,
        data: {
          message: "Database delete failed."
        }
      }
    });

    renderPage();

    await screen.findByDisplayValue("Original request");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete Request"
      })
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "Database delete failed."
    );

    expect(mocks.showError).toHaveBeenCalledWith(
      "Database delete failed.",
      {
        duration: 7000
      }
    );
  });

  it("does not delete when the confirmation is cancelled", async () => {
    mocks.confirm.mockResolvedValue(false);

    renderPage();

    await screen.findByDisplayValue("Original request");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete Request"
      })
    );

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalledTimes(1);
    });

    expect(api.delete).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Requests page")
    ).not.toBeInTheDocument();
  });

  it("deletes after confirmation and returns to the request list", async () => {
    api.delete.mockResolvedValue({
      status: 204
    });

    renderPage();

    await screen.findByDisplayValue("Original request");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete Request"
      })
    );

    expect(
      await screen.findByText("Requests page")
    ).toBeInTheDocument();

    expect(api.delete).toHaveBeenCalledWith(
      "/Tickets/42"
    );

    expect(mocks.success).toHaveBeenCalledWith(
      "Request was deleted successfully."
    );
  });

  it("shows an autosave failure and allows a manual retry", async () => {
    api.put
      .mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            message: "Autosave service is unavailable."
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          ...ticket,
          title: "Retry request",
          updatedAt: "2026-08-05T18:10:00Z"
        }
      });

    renderPage();

    const titleInput =
      await screen.findByDisplayValue("Original request");

    fireEvent.change(titleInput, {
      target: {
        name: "title",
        value: "Retry request"
      }
    });

    expect(
      await screen.findByText(
        "Autosave failed. Use Update Request to retry.",
        {},
        {
          timeout: 2500
        }
      )
    ).toBeInTheDocument();

    expect(mocks.showError).toHaveBeenCalledWith(
      "Autosave service is unavailable.",
      {
        duration: 6000
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Update Request"
      })
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/^Saved at /)
      ).toBeInTheDocument();
    });
  });

  it("hides request deletion from regular users", async () => {
    mocks.userRole = "User";

    renderPage();

    await screen.findByDisplayValue("Original request");

    expect(
      screen.queryByRole("button", {
        name: "Delete Request"
      })
    ).not.toBeInTheDocument();
  });
});
