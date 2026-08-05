import {
  ArrowLeft,
  Home,
  SearchX
} from "lucide-react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

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

        <div className="rf-system-state-icon warning">
          <SearchX
            size={38}
            strokeWidth={1.8}
          />
        </div>

        <span className="rf-system-state-code">
          ERROR 404
        </span>

        <h1>Page Not Found</h1>

        <p>
          The page you are looking for does not
          exist, may have been moved or the address
          may have been entered incorrectly.
        </p>

        <div className="rf-system-state-path">
          <span>
            Requested address
          </span>

          <strong>
            {location.pathname}
          </strong>
        </div>

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
          Check the address or use the navigation
          menu to open another page.
        </span>
      </div>
    </div>
  );
}

export default NotFound;