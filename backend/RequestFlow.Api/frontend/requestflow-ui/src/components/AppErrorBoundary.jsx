import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { captureApplicationError } from "../services/monitoring";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidCatch(error, errorInfo) {
    captureApplicationError(error, {
      componentStack:
        errorInfo.componentStack ||
        "Unavailable"
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="application-error-page">
        <section
          className="application-error-card"
          role="alert"
        >
          <div className="application-error-icon">
            <AlertTriangle
              size={28}
              aria-hidden="true"
            />
          </div>

          <span>REQUESTFLOW</span>
          <h1>This page could not be displayed</h1>
          <p>
            The error has been recorded. Reload the
            page to try again.
          </p>

          <button
            type="button"
            onClick={this.handleReload}
          >
            Reload Page
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
