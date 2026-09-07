import {
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  expect,
  test,
  vi
} from "vitest";
import AppErrorBoundary from "../components/AppErrorBoundary";

function BrokenContent() {
  throw new Error("Expected test error");
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows a recovery screen when rendering fails", () => {
  vi.spyOn(
    console,
    "error"
  ).mockImplementation(() => {});

  render(
    <AppErrorBoundary>
      <BrokenContent />
    </AppErrorBoundary>
  );

  expect(
    screen.getByRole("heading", {
      name: "This page could not be displayed"
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole("button", {
      name: "Reload Page"
    })
  ).toBeInTheDocument();
});
