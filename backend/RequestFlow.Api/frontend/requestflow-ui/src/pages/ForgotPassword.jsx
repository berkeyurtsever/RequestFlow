import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import AuthBrandLogo from "../components/AuthBrandLogo";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const validateEmail = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setEmailError(
        "Enter a valid email address."
      );
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.post(
        "/Auth/forgot-password",
        {
          email: email.trim()
        }
      );

      setSuccessMessage(
        response.data?.message ||
          "If an account exists for this email address, password reset instructions have been sent."
      );

      setEmail("");
      setEmailError("");
    } catch (requestError) {
      console.error(
        "Password reset request failed:",
        requestError
      );

      const status =
        requestError.response?.status;

      const message =
        requestError.response?.data?.message;

      if (status === 400) {
        setError(
          message ||
            "Enter a valid email address."
        );
      } else {
        setError(
          message ||
            "Password reset instructions could not be requested. Check the backend connection."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
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
              ACCOUNT RECOVERY
            </span>

            <div className="forgot-password-intro-icon">
              <Mail size={20} />
            </div>

            <h1>
              Recover access to your RequestFlow
              account.
            </h1>

            <p>
              Enter your registered email address to
              request password reset instructions.
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
            <Mail size={25} />
          </div>

          <div className="forgot-password-heading">
            <h2>Forgot your password?</h2>

            <p>
              Enter your email address and we will
              send password reset instructions.
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

          {successMessage && (
            <div
              className="forgot-password-message success"
              role="status"
            >
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <form
            className="forgot-password-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="forgot-password-form-group">
              <label htmlFor="forgot-email">
                Email Address
              </label>

              <div
                className={`forgot-password-input-wrapper ${
                  emailError
                    ? "forgot-password-input-error"
                    : ""
                }`}
              >
                <Mail
                  className="forgot-password-input-icon"
                  size={18}
                />

                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setEmailError("");
                    setError("");
                    setSuccessMessage("");
                  }}
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    emailError
                  )}
                  aria-describedby={
                    emailError
                      ? "forgot-email-error"
                      : undefined
                  }
                />
              </div>

              {emailError && (
                <span
                  id="forgot-email-error"
                  className="forgot-password-field-error"
                  role="alert"
                >
                  {emailError}
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
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={17} />
                  <span>
                    Send Reset Instructions
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="forgot-password-security-note">
            <AlertCircle size={17} />

            <p>
              For security reasons, the same
              confirmation message is displayed for
              all email addresses.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
