import {
  useEffect,
  useState
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole
} from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import AuthBrandLogo from "../components/AuthBrandLogo";
import api from "../services/api";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token] = useState(
    () => searchParams.get("token")?.trim() || ""
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    if (searchParams.has("token")) {
      navigate("/reset-password", {
        replace: true
      });
    }
  }, [navigate, searchParams]);

  const validateForm = () => {
    const errors = {};

    if (newPassword.length < 8) {
      errors.newPassword =
        "Password must contain at least 8 characters.";
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword =
        "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!token) {
      setError(
        "This reset link is incomplete. Request a new password reset email."
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post(
        "/Auth/reset-password",
        {
          token,
          newPassword,
          confirmPassword
        }
      );

      setSuccessMessage(
        response.data?.message ||
          "Your password has been reset successfully."
      );
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});

    } catch (requestError) {
      const message =
        requestError.response?.data?.message;

      setError(
        message ||
          "This password reset link is invalid or has expired. Request a new link."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearMessages = fieldName => {
    setFieldErrors(previousErrors => ({
      ...previousErrors,
      [fieldName]: ""
    }));
    setError("");
  };

  return (
    <main className="forgot-password-page">
      <section className="forgot-password-brand-panel">
        <div className="forgot-password-brand-content">
          <div className="forgot-password-brand">
            <AuthBrandLogo />

            <div>
              <div className="forgot-password-brand-name">
                <span>Request</span>
                <strong>Flow</strong>
              </div>

              <p>Request Management System</p>
            </div>
          </div>

          <div className="forgot-password-intro">
            <span className="forgot-password-eyebrow">
              SECURE RECOVERY
            </span>

            <div className="forgot-password-intro-icon">
              <LockKeyhole size={20} />
            </div>

            <h1>Create a new account password.</h1>

            <p>
              Reset links are single-use and expire after a
              short time for your protection.
            </p>
          </div>
        </div>

        <div className="forgot-password-brand-footer">
          © 2026 RequestFlow
        </div>
      </section>

      <section className="forgot-password-form-panel">
        <div className="forgot-password-card">
          <Link
            to="/login"
            className="forgot-password-back-link"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>

          <div className="forgot-password-card-icon">
            <KeyRound size={25} />
          </div>

          <div className="forgot-password-heading">
            <h2>Reset your password</h2>

            <p>
              Choose a new password with at least 8
              characters.
            </p>
          </div>

          {error && (
            <div
              className="forgot-password-message error"
              role="alert"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMessage ? (
            <>
              <div
                className="forgot-password-message success"
                role="status"
              >
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>

              <Link
                to="/login"
                className="forgot-password-submit-button reset-password-login-link"
              >
                Continue to Sign In
              </Link>
            </>
          ) : (
            <form
              className="forgot-password-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="forgot-password-form-group">
                <label htmlFor="reset-new-password">
                  New Password
                </label>

                <div
                  className={`forgot-password-input-wrapper ${
                    fieldErrors.newPassword
                      ? "forgot-password-input-error"
                      : ""
                  }`}
                >
                  <KeyRound
                    className="forgot-password-input-icon"
                    size={18}
                  />

                  <input
                    id="reset-new-password"
                    type="password"
                    value={newPassword}
                    onChange={event => {
                      setNewPassword(event.target.value);
                      clearMessages("newPassword");
                    }}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={100}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(
                      fieldErrors.newPassword
                    )}
                    aria-describedby={
                      fieldErrors.newPassword
                        ? "reset-new-password-error"
                        : "reset-password-requirement"
                    }
                  />
                </div>

                <span
                  id="reset-password-requirement"
                  className="reset-password-requirement"
                >
                  Use at least 8 characters.
                </span>

                {fieldErrors.newPassword && (
                  <span
                    id="reset-new-password-error"
                    className="forgot-password-field-error"
                    role="alert"
                  >
                    {fieldErrors.newPassword}
                  </span>
                )}
              </div>

              <div className="forgot-password-form-group">
                <label htmlFor="reset-confirm-password">
                  Confirm Password
                </label>

                <div
                  className={`forgot-password-input-wrapper ${
                    fieldErrors.confirmPassword
                      ? "forgot-password-input-error"
                      : ""
                  }`}
                >
                  <KeyRound
                    className="forgot-password-input-icon"
                    size={18}
                  />

                  <input
                    id="reset-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={event => {
                      setConfirmPassword(event.target.value);
                      clearMessages("confirmPassword");
                    }}
                    autoComplete="new-password"
                    maxLength={100}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(
                      fieldErrors.confirmPassword
                    )}
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? "reset-confirm-password-error"
                        : undefined
                    }
                  />
                </div>

                {fieldErrors.confirmPassword && (
                  <span
                    id="reset-confirm-password-error"
                    className="forgot-password-field-error"
                    role="alert"
                  >
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="forgot-password-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="forgot-password-spinner" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={17} />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {!token && !successMessage && (
            <div className="forgot-password-security-note">
              <AlertCircle size={17} />

              <p>
                This page needs the secure token from your
                reset email. Request a new link from the
                forgot-password page.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
