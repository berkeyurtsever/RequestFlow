import {
  useEffect,
  useState
} from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  Link,
  useNavigate
} from "react-router-dom";
import LanguageSelector from "../components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const {
    login,
    loginDemo,
    isAuthenticated
  } = useAuth();

  const isDemoMode =
    import.meta.env.VITE_DEMO_MODE ===
    "true";

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [rememberMe, setRememberMe] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [capsLockOn, setCapsLockOn] =
    useState(false);

  const [formErrors, setFormErrors] =
    useState({});

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    isDemoSubmitting,
    setIsDemoSubmitting
  ] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/overview", {
        replace: true
      });
    }
  }, [isAuthenticated, navigate]);

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
  };

  const handlePasswordKeyEvent = event => {
    setCapsLockOn(
      event.getModifierState("CapsLock")
    );
  };

  const validateForm = () => {
    const errors = {};
    const email = formData.email.trim();

    if (!email) {
      errors.email =
        t("login.emailRequired");
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      errors.email =
        t("login.emailInvalid");
    }

    if (!formData.password) {
      errors.password =
        t("login.passwordRequired");
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

    try {
      await login(
        formData.email.trim(),
        formData.password,
        rememberMe
      );

      navigate("/overview", {
        replace: true
      });
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      const status =
        loginError.response?.status;

      const message =
        loginError.response?.data?.message;

      if (status === 400) {
        setError(
          message ||
            "Check your email and password."
        );
      } else if (status === 401) {
        setError(
          message ||
            "Email address or password is incorrect."
        );
      } else if (status === 403) {
        setError(
          "This account does not have permission to sign in."
        );
      } else {
        setError(
          message ||
            "Sign in failed. Check the backend connection."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoSubmitting(true);
    setError("");

    try {
      await loginDemo();

      navigate("/overview", {
        replace: true
      });
    } catch (demoError) {
      setError(
        demoError.message ||
          "The public demo could not be opened."
      );
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <LanguageSelector className="login-language-selector" />

      <section className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand">
            <RequestFlowLogo />

            <div className="login-brand-copy">
              <div className="login-brand-name">
                <span>Request</span>
                <strong>Flow</strong>
              </div>

              <p>
                {t("login.managementSystem")}
              </p>
            </div>
          </div>

          <div className="login-welcome-content">
            <span className="login-welcome-label">
              {t("login.welcome")}
            </span>

            <h1>
              {t("login.heroTitle")}
            </h1>

            <p>
              {t("login.heroDescription")}
            </p>

            <div className="login-feature-list">
              <LoginFeature
                text={t("login.featureTrack")}
              />

              <LoginFeature
                text={t("login.featureAssign")}
              />

              <LoginFeature
                text={t("login.featureRoles")}
              />
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>© 2026 RequestFlow</span>

          <span>
            {t("login.secureFooter")}
          </span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-mobile-brand">
            <RequestFlowLogo />

            <div>
              <strong>
                Request
                <span>Flow</span>
              </strong>

              <small>
                {t("brand.subtitle")}
              </small>
            </div>
          </div>

          <div className="login-form-heading">
            <div className="login-security-icon">
              <ShieldCheck size={24} />
            </div>

            <h2>{t("login.title")}</h2>

            <p>
              {t("login.description")}
            </p>
          </div>

          {error && (
            <div
              className="login-error-message"
              role="alert"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="login-form-group">
              <label htmlFor="login-email">
                {t("login.email")}
              </label>

              <div
                className={`login-input-wrapper ${
                  formErrors.email
                    ? "login-input-error"
                    : ""
                }`}
              >
                <Mail
                  className="login-input-icon"
                  size={18}
                />

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>

              {formErrors.email && (
                <span className="login-field-error">
                  {formErrors.email}
                </span>
              )}
            </div>

            <div className="login-form-group">
              <label htmlFor="login-password">
                {t("login.password")}
              </label>

              <div
                className={`login-input-wrapper ${
                  formErrors.password
                    ? "login-input-error"
                    : ""
                }`}
              >
                <LockKeyhole
                  className="login-input-icon"
                  size={18}
                />

                <input
                  id="login-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder={t("login.passwordPlaceholder")}
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyDown={
                    handlePasswordKeyEvent
                  }
                  onKeyUp={
                    handlePasswordKeyEvent
                  }
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      previousValue =>
                        !previousValue
                    )
                  }
                  aria-label={
                    showPassword
                      ? t("login.hidePassword")
                      : t("login.showPassword")
                  }
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {formErrors.password && (
                <span className="login-field-error">
                  {formErrors.password}
                </span>
              )}

              {capsLockOn && (
                <span className="login-caps-warning">
                  {t("login.capsLock")}
                </span>
              )}
            </div>

            <div className="login-form-options">
              <label className="login-remember-control">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={event =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                  disabled={isSubmitting}
                />

                <span>{t("login.remember")}</span>
              </label>

              <Link
                className="login-forgot-link"
                to="/forgot-password"
              >
                {t("login.forgot")}
              </Link>
            </div>

            <button
              type="submit"
              className="login-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    className="login-button-spinner"
                    size={18}
                  />

                  <span>{t("login.submitting")}</span>
                </>
              ) : (
                <>
                  <span>{t("login.submit")}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {isDemoMode ? (
            <div className="login-development-account login-demo-account">
              <div className="login-development-icon">
                <Sparkles size={18} />
              </div>

              <div className="login-demo-copy">
                <span>{t("login.demoLabel")}</span>
                <strong>
                  {t("login.demoTitle")}
                </strong>

                <button
                  type="button"
                  className="login-demo-button"
                  onClick={handleDemoLogin}
                  disabled={
                    isSubmitting ||
                    isDemoSubmitting
                  }
                >
                  {isDemoSubmitting ? (
                    <>
                      <LoaderCircle
                        className="login-button-spinner"
                        size={16}
                      />
                      {t("login.demoOpening")}
                    </>
                  ) : (
                    t("login.demoOpen")
                  )}
                </button>
              </div>
            </div>
          ) : (
            import.meta.env.DEV && (
              <div className="login-development-account">
                <div className="login-development-icon">
                  <CheckCircle2 size={18} />
                </div>

                <div>
                  <span>{t("login.development")}</span>
                  <strong>
                    {t("login.localAccount")}
                  </strong>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}

function RequestFlowLogo() {
  return (
    <svg
      className="login-logo-symbol"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        d="
          M9 17
          C20 6 44 6 55 17
          L45 27
          C38 20 26 20 19 27
          Z
        "
      />

      <circle
        cx="32"
        cy="31"
        r="8"
      />

      <path
        d="
          M14 40
          L23 32
          C28 37 36 37 41 32
          L50 40
          L32 58
          Z
        "
      />
    </svg>
  );
}

function LoginFeature({ text }) {
  return (
    <div className="login-feature-item">
      <CheckCircle2 size={18} />
      <span>{text}</span>
    </div>
  );
}

export default Login;
