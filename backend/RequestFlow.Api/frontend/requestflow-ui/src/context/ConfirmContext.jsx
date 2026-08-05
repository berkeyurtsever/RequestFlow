import {
  AlertTriangle,
  HelpCircle,
  X
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

const ConfirmContext = createContext(null);

const defaultOptions = {
  title: "Are you sure?",
  message:
    "Please confirm that you want to continue.",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "primary"
};

function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const closeConfirm = useCallback(result => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }

    setDialog(null);
  }, []);

  const confirm = useCallback(options => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    const finalOptions = {
      ...defaultOptions,
      ...options
    };

    setDialog(finalOptions);

    return new Promise(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!dialog) {
      return undefined;
    }

    const handleKeyDown = event => {
      if (event.key === "Escape") {
        closeConfirm(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [dialog, closeConfirm]);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

  return (
    <ConfirmContext.Provider
      value={{ confirm }}
    >
      {children}

      {dialog && (
        <ConfirmModal
          options={dialog}
          onCancel={() =>
            closeConfirm(false)
          }
          onConfirm={() =>
            closeConfirm(true)
          }
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({
  options,
  onCancel,
  onConfirm
}) {
  const {
    title,
    message,
    confirmText,
    cancelText,
    variant
  } = options;

  const Icon =
    variant === "danger" ||
    variant === "warning"
      ? AlertTriangle
      : HelpCircle;

  const handleOverlayClick = event => {
    if (
      event.target === event.currentTarget
    ) {
      onCancel();
    }
  };

  return (
    <div
      className="rf-confirm-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`rf-confirm-modal rf-confirm-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-confirm-title"
        aria-describedby="rf-confirm-message"
      >
        <button
          type="button"
          className="rf-confirm-close"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={18} />
        </button>

        <div className="rf-confirm-content">
          <div className="rf-confirm-icon">
            <Icon size={24} />
          </div>

          <div className="rf-confirm-copy">
            <h2 id="rf-confirm-title">
              {title}
            </h2>

            <p id="rf-confirm-message">
              {message}
            </p>
          </div>
        </div>

        <div className="rf-confirm-actions">
          <button
            type="button"
            className="rf-confirm-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`rf-confirm-submit rf-confirm-submit-${variant}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const context = useContext(
    ConfirmContext
  );

  if (!context) {
    throw new Error(
      "useConfirm must be used inside ConfirmProvider."
    );
  }

  return context;
}

export {
  ConfirmProvider,
  useConfirm
};