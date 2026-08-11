import {
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import ResetPassword from "../pages/ResetPassword";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: {
    post: vi.fn()
  }
}));

function renderResetPassword(
  initialEntry = "/reset-password?token=secure-test-token"
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe("ResetPassword", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows linked validation errors before submitting", () => {
    renderResetPassword();

    fireEvent.change(
      screen.getByLabelText("New Password"),
      {
        target: { value: "short" }
      }
    );

    fireEvent.change(
      screen.getByLabelText("Confirm Password"),
      {
        target: { value: "different" }
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Password"
      })
    );

    expect(
      screen.getByLabelText("New Password")
    ).toHaveAttribute("aria-invalid", "true");

    expect(
      screen.getByText(
        "Password must contain at least 8 characters."
      )
    ).toHaveAttribute("role", "alert");

    expect(
      screen.getByText("Passwords do not match.")
    ).toHaveAttribute("role", "alert");

    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the token once and shows the success state", async () => {
    api.post.mockResolvedValue({
      data: {
        message: "Password reset completed."
      }
    });

    renderResetPassword();

    fireEvent.change(
      screen.getByLabelText("New Password"),
      {
        target: {
          value: "NewPassword123!"
        }
      }
    );

    fireEvent.change(
      screen.getByLabelText("Confirm Password"),
      {
        target: {
          value: "NewPassword123!"
        }
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Password"
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/Auth/reset-password",
        {
          token: "secure-test-token",
          newPassword: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        }
      );
    });

    expect(
      await screen.findByText(
        "Password reset completed."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: "Continue to Sign In"
      })
    ).toHaveAttribute("href", "/login");
  });
});
