import {
  BellRing,
  Mail,
  Save
} from "lucide-react";
import {
  useEffect,
  useState
} from "react";

import { useToast } from "../context/ToastContext";
import api from "../services/api";

const defaultPreferences = {
  emailEnabled: true,
  notifyAssignment: true,
  notifyStatusChange: true,
  notifyComments: true,
  notifySla: true
};

const preferenceOptions = [
  {
    key: "notifyAssignment",
    label: "Assignments",
    description: "When a request is assigned or unassigned."
  },
  {
    key: "notifyStatusChange",
    label: "Status changes",
    description: "When a request moves through the workflow."
  },
  {
    key: "notifyComments",
    label: "Comments",
    description: "When someone adds a comment to your request."
  },
  {
    key: "notifySla",
    label: "SLA warnings",
    description: "When a request exceeds its response deadline."
  }
];

function NotificationPreferencePanel({ compact = false }) {
  const { success, error: showError } = useToast();
  const [preferences, setPreferences] =
    useState(defaultPreferences);
  const [deliveryStatus, setDeliveryStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadPreferences = async () => {
      try {
        const [response, statusResponse] = await Promise.all([
          api.get("/notification-preferences"),
          api.get("/notification-preferences/delivery-status")
        ]);

        if (isActive) {
          setPreferences({
            ...defaultPreferences,
            ...response.data
          });
          setDeliveryStatus(statusResponse.data);
        }
      } catch (requestError) {
        console.error(
          "Notification preferences could not be loaded:",
          requestError
        );
        showError("Notification preferences could not be loaded.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPreferences();

    return () => {
      isActive = false;
    };
  }, [showError]);

  const updatePreference = (key, checked) => {
    setPreferences(previous => ({
      ...previous,
      [key]: checked
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);

    try {
      const response = await api.put(
        "/notification-preferences",
        preferences
      );
      setPreferences(response.data);
      success("Notification preferences saved.");
    } catch (requestError) {
      console.error(
        "Notification preferences could not be saved:",
        requestError
      );
      showError("Notification preferences could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={`notification-preferences-card ${compact ? "compact" : ""}`}>
      <div className="notification-preferences-heading">
        <div className="profile-security-icon">
          <BellRing size={19} />
        </div>
        <div>
          <h2>Notification Center Settings</h2>
          <p>
            Choose which request events are delivered by email.
            In-app notifications remain available in this center.
          </p>
        </div>
      </div>

      {deliveryStatus && (
        <div
          className={`profile-delivery-status ${deliveryStatus.configured ? "active" : "inactive"}`}
          role="status"
        >
          <Mail size={16} />
          {deliveryStatus.message}
        </div>
      )}

      <div className="notification-preferences-list">
        <PreferenceToggle
          label="Email delivery"
          description="Allow RequestFlow to send notification emails."
          checked={preferences.emailEnabled}
          disabled={isLoading}
          onChange={checked => updatePreference("emailEnabled", checked)}
        />

        {preferenceOptions.map(option => (
          <PreferenceToggle
            key={option.key}
            label={option.label}
            description={option.description}
            checked={preferences[option.key]}
            disabled={isLoading || !preferences.emailEnabled}
            onChange={checked => updatePreference(option.key, checked)}
          />
        ))}
      </div>

      <button
        type="button"
        className="profile-preferences-save"
        onClick={savePreferences}
        disabled={isLoading || isSaving}
      >
        <Save size={16} />
        {isSaving ? "Saving..." : "Save Preferences"}
      </button>
    </section>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onChange
}) {
  return (
    <label className="profile-preference-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
    </label>
  );
}

export default NotificationPreferencePanel;
