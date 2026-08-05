import {
  render,
  screen
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

import { ProtectedRoute } from "../App";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn()
}));

function renderProtectedRoute({
  allowedRoles,
  initialPath = "/protected"
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <h1>Protected content</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<h1>Login page</h1>} />
        <Route
          path="/access-denied"
          element={<h1>Access denied page</h1>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while the session is being restored", () => {
    useAuth.mockReturnValue({
      user: null,
      isLoading: true
    });

    renderProtectedRoute();

    expect(
      screen.getByText("Loading your account...")
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to login", () => {
    useAuth.mockReturnValue({
      user: null,
      isLoading: false
    });

    renderProtectedRoute();

    expect(
      screen.getByRole("heading", { name: "Login page" })
    ).toBeInTheDocument();
  });

  it("redirects users without the required role", () => {
    useAuth.mockReturnValue({
      user: { role: "User" },
      isLoading: false
    });

    renderProtectedRoute({ allowedRoles: ["Admin"] });

    expect(
      screen.getByRole("heading", { name: "Access denied page" })
    ).toBeInTheDocument();
  });

  it("renders content for an allowed role", () => {
    useAuth.mockReturnValue({
      user: { role: "Supervisor" },
      isLoading: false
    });

    renderProtectedRoute({
      allowedRoles: ["Admin", "Supervisor"]
    });

    expect(
      screen.getByRole("heading", { name: "Protected content" })
    ).toBeInTheDocument();
  });
});
