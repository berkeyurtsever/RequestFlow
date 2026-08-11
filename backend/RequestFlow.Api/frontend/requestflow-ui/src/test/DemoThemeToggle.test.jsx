import {
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import DemoThemeToggle from "../components/DemoThemeToggle";
import { useTheme } from "../context/ThemeContext";

vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn()
}));

describe("DemoThemeToggle", () => {
  const setTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches a dark demo to light mode", () => {
    useTheme.mockReturnValue({
      activeTheme: "dark",
      setTheme
    });

    render(<DemoThemeToggle />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Switch to light mode"
      })
    );

    expect(setTheme).toHaveBeenCalledWith(
      "light"
    );
  });

  it("switches a light demo to dark mode", () => {
    useTheme.mockReturnValue({
      activeTheme: "light",
      setTheme
    });

    render(<DemoThemeToggle />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Switch to dark mode"
      })
    );

    expect(setTheme).toHaveBeenCalledWith(
      "dark"
    );
  });
});
