import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
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

import Requests from "../pages/Requests";
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

const tickets = [
  {
    id: 1,
    title: "Printer is unavailable",
    category: "Technical Support",
    priority: "High",
    status: "Open",
    description: "The office printer is offline.",
    assignedToUserName: "Alex Morgan",
    createdAt: "2026-08-15T10:00:00Z"
  },
  {
    id: 2,
    title: "Update onboarding document",
    category: "Human Resources",
    priority: "Medium",
    status: "In Progress",
    description: "The onboarding guide needs an update.",
    assignedToUserName: "Taylor Reed",
    createdAt: "2026-08-14T09:00:00Z"
  },
  {
    id: 3,
    title: "Replace meeting room cable",
    category: "Facilities",
    priority: "Low",
    status: "Resolved",
    description: "The display cable was replaced.",
    assignedToUserName: "Jordan Lee",
    createdAt: "2026-08-13T08:00:00Z"
  }
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/requests"]}>
      <Routes>
        <Route
          path="/requests"
          element={<Requests />}
        />

        <Route
          path="/requests/edit/:id"
          element={<p>Edit request page</p>}
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userRole = "Admin";
  mocks.confirm.mockResolvedValue(true);

  api.get.mockResolvedValue({
    data: tickets
  });

  api.put.mockImplementation(
    (url, payload) =>
      Promise.resolve({
        data: {
          ...tickets.find(
            ticket =>
              url ===
              `/Tickets/${ticket.id}`
          ),
          ...payload
        }
      })
  );
});

describe("Requests Kanban view", () => {
  it("groups filtered requests into workflow columns", async () => {
    renderPage();

    await screen.findByText(
      "Printer is unavailable"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Kanban"
      })
    );

    const openColumn =
      screen.getByRole("region", {
        name: "Open"
      });

    const inProgressColumn =
      screen.getByRole("region", {
        name: "In Progress"
      });

    const resolvedColumn =
      screen.getByRole("region", {
        name: "Resolved"
      });

    expect(
      within(openColumn).getByText(
        "Printer is unavailable"
      )
    ).toBeInTheDocument();

    expect(
      within(inProgressColumn).getByText(
        "Update onboarding document"
      )
    ).toBeInTheDocument();

    expect(
      within(resolvedColumn).getByText(
        "Replace meeting room cable"
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("table")
    ).not.toBeInTheDocument();
  });

  it("updates a request status from the accessible card menu", async () => {
    renderPage();

    await screen.findByText(
      "Printer is unavailable"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Kanban"
      })
    );

    fireEvent.change(
      screen.getByLabelText(
        "Move request 1 to another status"
      ),
      {
        target: {
          value: "In Progress"
        }
      }
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/Tickets/1",
        {
          title: "Printer is unavailable",
          category: "Technical Support",
          priority: "High",
          status: "In Progress",
          description:
            "The office printer is offline."
        }
      );
    });

    const inProgressColumn =
      screen.getByRole("region", {
        name: "In Progress"
      });

    expect(
      within(inProgressColumn).getByText(
        "Printer is unavailable"
      )
    ).toBeInTheDocument();

    expect(mocks.success).toHaveBeenCalledWith(
      "Request #1 moved to In Progress."
    );
  });

  it("keeps status controls read-only for a User", async () => {
    mocks.userRole = "User";

    renderPage();

    await screen.findByText(
      "Printer is unavailable"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Kanban"
      })
    );

    expect(
      screen.queryByLabelText(
        "Move request 1 to another status"
      )
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(
        "Request status is read-only for your role."
      )
    ).toBeInTheDocument();

    expect(
      screen
        .getByText(
          "Printer is unavailable"
        )
        .closest("article")
    ).toHaveAttribute(
      "draggable",
      "false"
    );
  });
});
