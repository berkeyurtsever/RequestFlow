import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const initialFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

function ChangePassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(
    initialFormData
  );

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleInputChange = event => {
    const { name, value } = event.target;

    setFormData(previousData => ({
      ...previousData,
      [name]: value
    }));

    setFormErrors(previousErrors => ({
      ...previousErrors,
      [name]: ""
    }));

    setError("");
    setSuccessMessage("");
  };

  const togglePasswordVisibility = fieldName => {
    setShowPasswords(previousState => ({
      ...previousState,
      [fieldName]: !previousState[fieldName]
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.currentPassword.trim()) {
      errors.currentPassword =
        "Current password is required.";
    }

    if (!formData.newPassword) {
      errors.newPassword =
        "New password is required.";
    } else if (formData.newPassword.length < 6) {
      errors.newPassword =
        "New password must contain at least 6 characters.";
    } else if (
      formData.newPassword ===
      formData.currentPassword
    ) {
      errors.newPassword =
        "New password must be different from the current password.";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      formData.confirmPassword !==
      formData.newPassword
    ) {
      errors.confirmPassword =
        "The new passwords do not match.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.post(
        "/Auth/change-password",
        {
          currentPassword:
            formData.currentPassword,
          newPassword: formData.newPassword
        }
      );

      setSuccessMessage(
        response.data?.message ||
          "Your password was updated successfully."
      );

      setFormData(initialFormData);

      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      });

      setFormErrors({});
    } catch (requestError) {
      console.error(
        "Password could not be changed:",
        requestError
      );

      const status = requestError.response?.status;
      const message =
        requestError.response?.data?.message;

      if (status === 400) {
        setError(
          message ||
            "The current password is incorrect."
        );
      } else if (status === 401) {
        setError(
          "Your session has expired. Please sign in again."
        );
      } else if (status === 403) {
        setError(
          "You do not have permission to change this password."
        );
      } else if (status === 404) {
        setError(
          "Your user account could not be found."
        );
      } else {
        setError(
          message ||
            "The password could not be updated."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
  id="change-password-page"
  className="change-password-page"
>
      <div className="change-password-topbar">
        <header className="change-password-header">
          <div>
            <span className="page-eyebrow">
              ACCOUNT
            </span>

            <h1>Change Password</h1>

            <p>
              Update the password used to access your
              RequestFlow account.
            </p>
          </div>
        </header>

        <button
          type="button"
          className="change-password-back-button"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft size={17} />
          <span>Back to Profile</span>
        </button>
      </div>

      {error && (
        <div
          className="change-password-message error"
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div
          className="change-password-message success"
          role="status"
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <section className="password-card">
        <div className="password-card-header">
          <div className="password-card-icon">
            <KeyRound size={23} />
          </div>

          <div>
            <h2>Account Security</h2>

            <p>
              Choose a secure password that you have
              not used before.
            </p>
          </div>
        </div>

        <form
          className="password-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <PasswordInput
            id="current-password"
            name="currentPassword"
            label="Current Password"
            placeholder="Enter your current password"
            value={formData.currentPassword}
            isVisible={
              showPasswords.currentPassword
            }
            error={formErrors.currentPassword}
            autoComplete="current-password"
            onChange={handleInputChange}
            onToggle={() =>
              togglePasswordVisibility(
                "currentPassword"
              )
            }
          />

          <PasswordInput
            id="new-password"
            name="newPassword"
            label="New Password"
            placeholder="Enter your new password"
            value={formData.newPassword}
            isVisible={showPasswords.newPassword}
            error={formErrors.newPassword}
            autoComplete="new-password"
            onChange={handleInputChange}
            onToggle={() =>
              togglePasswordVisibility(
                "newPassword"
              )
            }
          />

          <PasswordInput
            id="confirm-password"
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="Enter the new password again"
            value={formData.confirmPassword}
            isVisible={
              showPasswords.confirmPassword
            }
            error={formErrors.confirmPassword}
            autoComplete="new-password"
            onChange={handleInputChange}
            onToggle={() =>
              togglePasswordVisibility(
                "confirmPassword"
              )
            }
          />

          <div className="password-requirements">
            <KeyRound size={17} />

            <div>
              <strong>Password requirements</strong>

              <span>
                Use at least 6 characters and choose
                a password different from your
                current password.
              </span>
            </div>
          </div>

          <div className="password-form-actions">
            <button
              type="button"
              className="password-cancel-button"
              onClick={() => navigate("/profile")}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="password-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle
                  className="login-button-spinner"
                  size={16}
                />
              ) : (
                <KeyRound size={16} />
              )}

              <span>
                {isSubmitting
                  ? "Updating..."
                  : "Update Password"}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PasswordInput({
  id,
  name,
  label,
  placeholder,
  value,
  isVisible,
  error,
  autoComplete,
  onChange,
  onToggle
}) {
  return (
    <div className="password-form-group">
      <label htmlFor={id}>{label}</label>

      <div
        className={`password-input-wrapper ${
          error ? "password-input-error" : ""
        }`}
      >
        <LockKeyhole
          className="password-input-icon"
          size={18}
        />

        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange}
          disabled={false}
        />

        <button
          type="button"
          className="password-visibility-button"
          onClick={onToggle}
          aria-label={
            isVisible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {isVisible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>

      {error && (
        <span className="password-field-error">
          {error}
        </span>
      )}
    </div>
  );
}

export default ChangePassword;