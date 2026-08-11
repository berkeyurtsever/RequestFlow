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
  default: ({
    onMenuClick,
    isMenuOpen,
    menuButtonRef
  }) => (
    <button
      ref={menuButtonRef}
      type="button"
      onClick={onMenuClick}
      aria-expanded={isMenuOpen}
    >
      Open navigation
    </button>
  )
}));

vi.mock("../components/Sidebar", () => ({
  default: ({ isOpen, onClose }) => (
    <aside
      id="rf-sidebar-navigation"
      data-testid="sidebar"
      data-open={isOpen}
    >
      <button
        type="button"
        onClick={onClose}
      >
        Close navigation
      </button>
    </aside>
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
    const { container } = renderLayout();

    fireEvent.click(screen.getByRole("button", {
      name: "Open navigation"
    }));

    fireEvent.click(
      container.querySelector(
        ".rf-sidebar-overlay"
      )
    );

    expect(screen.getByTestId("sidebar")).toHaveAttribute(
      "data-open",
      "false"
    );
  });

  it("provides a skip link and restores focus after closing the menu", async () => {
    renderLayout();

    expect(
      screen.getByRole("link", {
        name: "Skip to main content"
      })
    ).toHaveAttribute(
      "href",
      "#rf-main-content"
    );

    const menuButton = screen.getByRole(
      "button",
      {
        name: "Open navigation"
      }
    );

    fireEvent.click(menuButton);

    const closeButton = screen.getByRole(
      "button",
      {
        name: "Close navigation"
      }
    );

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    fireEvent.keyDown(document, {
      key: "Escape"
    });

    await waitFor(() => {
      expect(menuButton).toHaveFocus();
    });
  });
});
