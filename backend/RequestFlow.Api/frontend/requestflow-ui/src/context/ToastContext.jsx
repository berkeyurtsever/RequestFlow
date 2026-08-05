import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  XCircle
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback(id => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts(currentToasts =>
      currentToasts.filter(
        toast => toast.id !== id
      )
    );
  }, []);

  const showToast = useCallback(
    (
      message,
      type = "success",
      options = {}
    ) => {
      const id =
        Date.now() +
        Math.random().toString(16).slice(2);

      const duration =
        options.duration ?? 3500;

      const newToast = {
        id,
        message,
        type,
        title:
          options.title ||
          getDefaultTitle(type)
      };

      setToasts(currentToasts => [
        ...currentToasts,
        newToast
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);

        timers.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message, options = {}) => {
      return showToast(
        message,
        "success",
        options
      );
    },
    [showToast]
  );

  const error = useCallback(
    (message, options = {}) => {
      return showToast(
        message,
        "error",
        options
      );
    },
    [showToast]
  );

  const warning = useCallback(
    (message, options = {}) => {
      return showToast(
        message,
        "warning",
        options
      );
    },
    [showToast]
  );

  const info = useCallback(
    (message, options = {}) => {
      return showToast(
        message,
        "info",
        options
      );
    },
    [showToast]
  );

  useEffect(() => {
    const currentTimers = timers.current;

    return () => {
      currentTimers.forEach(timer => {
        clearTimeout(timer);
      });

      currentTimers.clear();
    };
  }, []);

  const contextValue = {
    showToast,
    success,
    error,
    warning,
    info,
    removeToast
  };

  return (
    <ToastContext.Provider
      value={contextValue}
    >
      {children}

      <div
        className="rf-toast-container"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() =>
              removeToast(toast.id)
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const Icon = getToastIcon(toast.type);

  return (
    <div
      className={`rf-toast rf-toast-${toast.type}`}
      role={
        toast.type === "error"
          ? "alert"
          : "status"
      }
    >
      <div className="rf-toast-icon">
        <Icon size={20} />
      </div>

      <div className="rf-toast-content">
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>

      <button
        type="button"
        className="rf-toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={17} />
      </button>
    </div>
  );
}

function getToastIcon(type) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  return icons[type] || Info;
}

function getDefaultTitle(type) {
  const titles = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information"
  };

  return titles[type] || "Information";
}

function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider."
    );
  }

  return context;
}

export {
  ToastProvider,
  useToast
};