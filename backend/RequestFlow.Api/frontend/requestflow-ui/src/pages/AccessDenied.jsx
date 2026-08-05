import {
  ArrowLeft,
  Home,
  ShieldX
} from "lucide-react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

function AccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();

  const attemptedPath =
    location.state?.attemptedPath;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/overview");
  };

  return (
    <div className="rf-system-state-page">
      <div className="rf-system-state-card">
        <div className="rf-system-state-decoration rf-system-state-decoration-one" />
        <div className="rf-system-state-decoration rf-system-state-decoration-two" />

        <div className="rf-system-state-icon danger">
          <ShieldX
            size={38}
            strokeWidth={1.8}
          />
        </div>

        <span className="rf-system-state-code">
          ERROR 403
        </span>

        <h1>Access Denied</h1>

        <p>
          You do not have permission to access this
          page. Your current account role does not
          include the required authorization.
        </p>

        {attemptedPath && (
          <div className="rf-system-state-path">
            <span>
              Requested page
            </span>

            <strong>
              {attemptedPath}
            </strong>
          </div>
        )}

        <div className="rf-system-state-actions">
          <button
            type="button"
            className="rf-system-state-secondary"
            onClick={handleGoBack}
          >
            <ArrowLeft size={17} />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            className="rf-system-state-primary"
            onClick={() =>
              navigate("/overview")
            }
          >
            <Home size={17} />
            <span>Return to Dashboard</span>
          </button>
        </div>

        <span className="rf-system-state-support">
          Contact an administrator if you believe
          your account should have access.
        </span>
      </div>
    </div>
  );
}

export default AccessDenied;