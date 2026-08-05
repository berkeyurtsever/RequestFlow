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
  describe,
  expect,
  it,
  vi
} from "vitest";

import MainLayout from "../layouts/MainLayout";

vi.mock("../components/Navbar", () => ({
  default: ({ onMenuClick, isMenuOpen }) => (
    <button
      type="button"
      onClick={onMenuClick}
      aria-expanded={isMenuOpen}
    >
      Open navigation
    </button>
  )
}));

vi.mock("../components/Sidebar", () => ({
  default: ({ isOpen }) => (
    <aside data-testid="sidebar" data-open={isOpen} />
  )
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/overview"]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="overview" element={<p>Overview</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("MainLayout mobile navigation", () => {
  it("opens from the menu button and closes with Escape", async () => {
    renderLayout();

    const menuButton = screen.getByRole("button", {
      name: "Open navigation"
    });

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("sidebar")).toHaveAttribute(
      "data-open",
      "true"
    );
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });

    expect(document.body.style.overflow).toBe("");
  });

  it("closes when the backdrop is selected", () => {
    renderLayout();

    fireEvent.click(screen.getByRole("button", {
      name: "Open navigation"
    }));

    fireEvent.click(screen.getByRole("button", {
      name: "Close navigation menu"
    }));

    expect(screen.getByTestId("sidebar")).toHaveAttribute(
      "data-open",
      "false"
    );
  });
});
