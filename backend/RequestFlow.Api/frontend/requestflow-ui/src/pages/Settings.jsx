import {
  Bell,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Workflow
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import ThemeSelector from "../components/ThemeSelector";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const defaultSettings = {
  systemName: "RequestFlow",
  systemDescription:
    "Company request tracking and workflow management system.",
  defaultPriority: "Medium",
  autoAssignment: false,
  emailNotifications: true,
  notifyNewRequest: true,
  notifyAssignment: true,
  notifyStatusChange: true,
  notifyComments: true
};

const priorityOptions = [
  "Low",
  "Medium",
  "High",
  "Urgent"
];

function Settings() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    error: showError,
    info
  } = useToast();

  const [settings, setSettings] =
    useState(defaultSettings);

  const [savedSettings, setSavedSettings] =
    useState(defaultSettings);

  const [settingMetadata, setSettingMetadata] =
    useState({
      updatedAt: null,
      updatedByUserName: null
    });

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isRestoring, setIsRestoring] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const normalizedRole = String(
    user?.role || "User"
  )
    .trim()
    .toLowerCase();

  const isAdmin =
    normalizedRole === "admin";

  const loadSettings =
    useCallback(async () => {
      if (!isAdmin) {
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response =
          await api.get("/Settings");

        const normalizedSettings =
          normalizeSettings(
            response.data
          );

        setSettings(
          normalizedSettings
        );

        setSavedSettings(
          normalizedSettings
        );

        setSettingMetadata({
          updatedAt:
            response.data?.updatedAt ||
            null,

          updatedByUserName:
            response.data
              ?.updatedByUserName ||
            null
        });
      } catch (requestError) {
        console.error(
          "Settings could not be loaded:",
          requestError
        );

        const errorMessage =
          getErrorMessage(
            requestError,
            "System settings could not be loaded."
          );

        setLoadError(errorMessage);
        showError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [
      isAdmin,
      showError
    ]);

  useEffect(() => {
    if (!isAdmin) {
      navigate(
        "/access-denied",
        {
          replace: true
        }
      );

      return;
    }

    void loadSettings();
  }, [
    isAdmin,
    loadSettings,
    navigate
  ]);

  const hasUnsavedChanges =
    useMemo(() => {
      return (
        JSON.stringify(settings) !==
        JSON.stringify(savedSettings)
      );
    }, [
      settings,
      savedSettings
    ]);

  const enabledNotificationCount =
    useMemo(() => {
      return [
        settings.notifyNewRequest,
        settings.notifyAssignment,
        settings.notifyStatusChange,
        settings.notifyComments
      ].filter(Boolean).length;
    }, [settings]);

  const isProcessing =
    isSaving || isRestoring;

  const handleInputChange = event => {
    const {
      name,
      value
    } = event.target;

    setSettings(
      previousSettings => ({
        ...previousSettings,
        [name]: value
      })
    );
  };

  const handleToggle = settingName => {
    setSettings(
      previousSettings => ({
        ...previousSettings,

        [settingName]:
          !previousSettings[
            settingName
          ]
      })
    );
  };

  const handleSave = async event => {
    event.preventDefault();

    const trimmedSystemName =
      settings.systemName.trim();

    const trimmedDescription =
      settings.systemDescription.trim();

    if (!trimmedSystemName) {
      showError(
        "System name is required."
      );

      return;
    }

    if (
      trimmedSystemName.length < 3
    ) {
      showError(
        "System name must contain at least 3 characters."
      );

      return;
    }

    if (
      trimmedSystemName.length > 50
    ) {
      showError(
        "System name cannot exceed 50 characters."
      );

      return;
    }

    if (!trimmedDescription) {
      showError(
        "System description is required."
      );

      return;
    }

    if (
      trimmedDescription.length < 3
    ) {
      showError(
        "System description must contain at least 3 characters."
      );

      return;
    }

    if (
      trimmedDescription.length > 250
    ) {
      showError(
        "System description cannot exceed 250 characters."
      );

      return;
    }

    if (
      !priorityOptions.includes(
        settings.defaultPriority
      )
    ) {
      showError(
        "Please select a valid default priority."
      );

      return;
    }

    setIsSaving(true);

    try {
      const updatePayload = {
        systemName:
          trimmedSystemName,

        systemDescription:
          trimmedDescription,

        defaultPriority:
          settings.defaultPriority,

        autoAssignment:
          Boolean(
            settings.autoAssignment
          ),

        emailNotifications:
          Boolean(
            settings.emailNotifications
          ),

        notifyNewRequest:
          Boolean(
            settings.notifyNewRequest
          ),

        notifyAssignment:
          Boolean(
            settings.notifyAssignment
          ),

        notifyStatusChange:
          Boolean(
            settings.notifyStatusChange
          ),

        notifyComments:
          Boolean(
            settings.notifyComments
          )
      };

      const response =
        await api.put(
          "/Settings",
          updatePayload
        );

      const normalizedSettings =
        normalizeSettings(
          response.data
        );

      setSettings(
        normalizedSettings
      );

      setSavedSettings(
        normalizedSettings
      );

      setSettingMetadata({
        updatedAt:
          response.data?.updatedAt ||
          new Date().toISOString(),

        updatedByUserName:
          response.data
            ?.updatedByUserName ||
          user?.fullName ||
          user?.name ||
          null
      });

      success(
        "System settings were saved successfully."
      );
    } catch (requestError) {
      console.error(
        "Settings could not be saved:",
        requestError
      );

      showError(
        getErrorMessage(
          requestError,
          "System settings could not be saved."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults =
    async () => {
      const confirmed =
        await confirm({
          title:
            "Restore default settings?",

          message:
            "System preferences and notification settings will return to their original values.",

          confirmText:
            "Restore Defaults",

          cancelText:
            "Cancel",

          variant: "warning"
        });

      if (!confirmed) {
        return;
      }

      setIsRestoring(true);

      try {
        const response =
          await api.post(
            "/Settings/restore-defaults"
          );

        const normalizedSettings =
          normalizeSettings(
            response.data
          );

        setSettings(
          normalizedSettings
        );

        setSavedSettings(
          normalizedSettings
        );

        setSettingMetadata({
          updatedAt:
            response.data?.updatedAt ||
            new Date().toISOString(),

          updatedByUserName:
            response.data
              ?.updatedByUserName ||
            user?.fullName ||
            user?.name ||
            null
        });

        info(
          "Default system settings were restored."
        );
      } catch (requestError) {
        console.error(
          "Default settings could not be restored:",
          requestError
        );

        showError(
          getErrorMessage(
            requestError,
            "Default settings could not be restored."
          )
        );
      } finally {
        setIsRestoring(false);
      }
    };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="settings-loading-state">
        <RefreshCw
          size={28}
          className="login-button-spinner"
        />

        <strong>
          Loading settings...
        </strong>

        <span>
          System preferences are being
          retrieved from the server.
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="settings-loading-state">
        <Settings2 size={30} />

        <strong>
          Settings could not be loaded
        </strong>

        <span>
          {loadError}
        </span>

        <button
          type="button"
          onClick={() =>
            void loadSettings()
          }
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <span className="page-eyebrow">
            MANAGEMENT
          </span>

          <h1>Settings</h1>

          <p>
            Configure RequestFlow appearance,
            system preferences and notification
            options.
          </p>
        </div>

        <div className="settings-header-actions">
          {hasUnsavedChanges && (
            <span className="settings-unsaved-badge">
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            className="settings-restore-button"
            onClick={
              handleRestoreDefaults
            }
            disabled={isProcessing}
          >
            <RefreshCw
              size={16}
              className={
                isRestoring
                  ? "login-button-spinner"
                  : ""
              }
            />

            <span>
              {isRestoring
                ? "Restoring..."
                : "Restore Defaults"}
            </span>
          </button>
        </div>
      </header>

      <ThemeSelector />

      <form
        className="settings-form"
        onSubmit={handleSave}
      >
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-header-icon">
              <Building2 size={21} />
            </div>

            <div>
              <h2>
                System Information
              </h2>

              <p>
                Configure the name and description
                displayed throughout RequestFlow.
              </p>
            </div>
          </div>

          <div className="settings-card-content">
            <div className="settings-form-group">
              <label htmlFor="system-name">
                System Name
              </label>

              <input
                id="system-name"
                name="systemName"
                type="text"
                value={
                  settings.systemName
                }
                onChange={
                  handleInputChange
                }
                placeholder="Enter system name"
                maxLength={50}
                disabled={isProcessing}
              />

              <div className="settings-field-footer">
                <span>
                  This name appears in page
                  headings and system branding.
                </span>

                <small>
                  {
                    settings.systemName
                      .length
                  }
                  /50
                </small>
              </div>
            </div>

            <div className="settings-form-group">
              <label htmlFor="system-description">
                System Description
              </label>

              <textarea
                id="system-description"
                name="systemDescription"
                value={
                  settings.systemDescription
                }
                onChange={
                  handleInputChange
                }
                placeholder="Describe the purpose of the system"
                maxLength={250}
                rows={4}
                disabled={isProcessing}
              />

              <div className="settings-field-footer">
                <span>
                  A short description of the
                  RequestFlow platform.
                </span>

                <small>
                  {
                    settings
                      .systemDescription
                      .length
                  }
                  /250
                </small>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-header-icon workflow">
              <Workflow size={21} />
            </div>

            <div>
              <h2>
                Request Workflow
              </h2>

              <p>
                Configure default request behavior
                and assignment preferences.
              </p>
            </div>
          </div>

          <div className="settings-card-content">
            <div className="settings-form-group">
              <label htmlFor="default-priority">
                Default Request Priority
              </label>

              <select
                id="default-priority"
                name="defaultPriority"
                value={
                  settings.defaultPriority
                }
                onChange={
                  handleInputChange
                }
                disabled={isProcessing}
              >
                {priorityOptions.map(
                  priority => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {priority}
                    </option>
                  )
                )}
              </select>

              <span className="settings-field-description">
                New request forms can use this
                priority as their initial value.
              </span>
            </div>

            <ToggleSetting
              icon={SlidersHorizontal}
              title="Automatic assignment"
              description="Automatically assign new requests to available staff members."
              checked={
                settings.autoAssignment
              }
              onChange={() =>
                handleToggle(
                  "autoAssignment"
                )
              }
              disabled={isProcessing}
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-header-icon notifications">
              <Bell size={21} />
            </div>

            <div>
              <h2>
                Notifications
              </h2>

              <p>
                Select which system activities
                should produce notifications.
              </p>
            </div>

            <span className="settings-section-count">
              {enabledNotificationCount}/4
              enabled
            </span>
          </div>

          <div className="settings-card-content">
            <ToggleSetting
              icon={Mail}
              title="Email notifications"
              description="Allow RequestFlow to send notification emails when email delivery is configured."
              checked={
                settings.emailNotifications
              }
              onChange={() =>
                handleToggle(
                  "emailNotifications"
                )
              }
              disabled={isProcessing}
            />

            <div className="settings-notification-divider" />

            <ToggleSetting
              icon={CheckCircle2}
              title="New request notifications"
              description="Notify management when a new request is created."
              checked={
                settings.notifyNewRequest
              }
              onChange={() =>
                handleToggle(
                  "notifyNewRequest"
                )
              }
              disabled={isProcessing}
            />

            <ToggleSetting
              icon={ShieldCheck}
              title="Assignment notifications"
              description="Notify users when a request is assigned or reassigned."
              checked={
                settings.notifyAssignment
              }
              onChange={() =>
                handleToggle(
                  "notifyAssignment"
                )
              }
              disabled={isProcessing}
            />

            <ToggleSetting
              icon={Workflow}
              title="Status change notifications"
              description="Notify related users when the workflow status changes."
              checked={
                settings.notifyStatusChange
              }
              onChange={() =>
                handleToggle(
                  "notifyStatusChange"
                )
              }
              disabled={isProcessing}
            />

            <ToggleSetting
              icon={Bell}
              title="Comment notifications"
              description="Notify related users when a new comment is added to a request."
              checked={
                settings.notifyComments
              }
              onChange={() =>
                handleToggle(
                  "notifyComments"
                )
              }
              disabled={isProcessing}
            />
          </div>
        </section>

        <footer className="settings-form-actions">
          <div className="settings-storage-note">
            <Settings2 size={15} />

            <div>
              <span>
                Settings are stored permanently in
                the RequestFlow database.
              </span>

              {settingMetadata.updatedAt && (
                <small>
                  Last updated{" "}
                  {formatDateTime(
                    settingMetadata.updatedAt
                  )}

                  {settingMetadata
                    .updatedByUserName
                    ? ` by ${settingMetadata.updatedByUserName}`
                    : ""}
                </small>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="settings-save-button"
            disabled={
              isProcessing ||
              !hasUnsavedChanges
            }
          >
            {isSaving ? (
              <RefreshCw
                size={16}
                className="login-button-spinner"
              />
            ) : (
              <Save size={16} />
            )}

            <span>
              {isSaving
                ? "Saving..."
                : "Save Settings"}
            </span>
          </button>
        </footer>
      </form>
    </div>
  );
}

function ToggleSetting({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled
}) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-row-icon">
        <Icon size={19} />
      </div>

      <div className="settings-toggle-row-content">
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <button
        type="button"
        className={`settings-toggle-button ${
          checked ? "active" : ""
        }`}
        onClick={onChange}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={title}
      >
        <span />
      </button>
    </div>
  );
}

function normalizeSettings(value) {
  return {
    systemName:
      typeof value?.systemName ===
      "string"
        ? value.systemName
        : defaultSettings.systemName,

    systemDescription:
      typeof value?.systemDescription ===
      "string"
        ? value.systemDescription
        : defaultSettings.systemDescription,

    defaultPriority:
      priorityOptions.includes(
        value?.defaultPriority
      )
        ? value.defaultPriority
        : defaultSettings.defaultPriority,

    autoAssignment:
      typeof value?.autoAssignment ===
      "boolean"
        ? value.autoAssignment
        : defaultSettings.autoAssignment,

    emailNotifications:
      typeof value?.emailNotifications ===
      "boolean"
        ? value.emailNotifications
        : defaultSettings.emailNotifications,

    notifyNewRequest:
      typeof value?.notifyNewRequest ===
      "boolean"
        ? value.notifyNewRequest
        : defaultSettings.notifyNewRequest,

    notifyAssignment:
      typeof value?.notifyAssignment ===
      "boolean"
        ? value.notifyAssignment
        : defaultSettings.notifyAssignment,

    notifyStatusChange:
      typeof value?.notifyStatusChange ===
      "boolean"
        ? value.notifyStatusChange
        : defaultSettings.notifyStatusChange,

    notifyComments:
      typeof value?.notifyComments ===
      "boolean"
        ? value.notifyComments
        : defaultSettings.notifyComments
  };
}

function getErrorMessage(
  requestError,
  fallbackMessage
) {
  const status =
    requestError.response?.status;

  const backendMessage =
    requestError.response?.data
      ?.message ||
    requestError.response?.data
      ?.detail;

  if (status === 400) {
    return (
      backendMessage ||
      "Check the settings information and try again."
    );
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "Only administrators can manage system settings.";
  }

  if (status === 404) {
    return "The system settings endpoint could not be found.";
  }

  return (
    backendMessage ||
    fallbackMessage
  );
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "recently";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "recently";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

export default Settings;