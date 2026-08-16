import {
  BellRing,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import {
  useEffect,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const defaultPreferences = {
  emailEnabled: true,
  notifyAssignment: true,
  notifyStatusChange: true,
  notifyComments: true,
  notifySla: true
};

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [preferences, setPreferences] =
    useState(defaultPreferences);
  const [isLoadingPreferences, setIsLoadingPreferences] =
    useState(true);
  const [isSavingPreferences, setIsSavingPreferences] =
    useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(null);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [response, statusResponse] = await Promise.all([
          api.get("/notification-preferences"),
          api.get("/notification-preferences/delivery-status")
        ]);
        setPreferences({
          ...defaultPreferences,
          ...response.data
        });
        setDeliveryStatus(statusResponse.data);
      } catch (requestError) {
        console.error(
          "Notification preferences could not be loaded:",
          requestError
        );
        showError("Email preferences could not be loaded.");
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    void loadPreferences();
  }, [showError]);

  const savePreferences = async () => {
    setIsSavingPreferences(true);

    try {
      const response = await api.put(
        "/notification-preferences",
        preferences
      );
      setPreferences(response.data);
      success("Email preferences saved.");
    } catch (requestError) {
      console.error(
        "Notification preferences could not be saved:",
        requestError
      );
      showError("Email preferences could not be saved.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const fullName =
    user?.fullName ||
    user?.name ||
    "RequestFlow User";

  const email =
    user?.email ||
    "Not available";

  const role = normalizeRole(
    user?.role || "User"
  );

  const initials = getInitials(fullName);

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <span className="page-eyebrow">
            ACCOUNT
          </span>

          <h1>My Profile</h1>

          <p>
            View your personal account
            information.
          </p>
        </div>
      </header>

      <section className="profile-card">
        <div className="profile-card-top">
          <div className="profile-avatar-large">
            {initials}
          </div>

          <div className="profile-card-identity">
            <div className="profile-name-row">
              <h2>{fullName}</h2>

              <span
                className={`profile-role-badge ${role.toLowerCase()}`}
              >
                {role}
              </span>
            </div>

            <p>
              RequestFlow account information
            </p>
          </div>
        </div>

        <div className="profile-card-body">
          <ProfileInfoRow
            icon={UserRound}
            label="Full Name"
            value={fullName}
          />

          <ProfileInfoRow
            icon={Mail}
            label="Email Address"
            value={email}
          />

          <ProfileInfoRow
            icon={ShieldCheck}
            label="Account Role"
            value={role}
          />
        </div>

        <div className="profile-card-footer">
          <div className="profile-security-text">
            <div className="profile-security-icon">
              <KeyRound size={19} />
            </div>

            <div>
              <strong>Account Security</strong>

              <span>
                Update the password used to access
                your account.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="profile-password-button"
            onClick={() =>
              navigate("/change-password")
            }
          >
            <KeyRound size={16} />
            <span>Change Password</span>
          </button>
        </div>
      </section>

      <section className="profile-preferences-card">
        <div className="profile-preferences-heading">
          <div className="profile-security-icon">
            <BellRing size={19} />
          </div>
          <div>
            <h2>Email Notifications</h2>
            <p>
              Choose which request updates are also sent to your email.
            </p>
          </div>
        </div>

        <div className="profile-preferences-list">
          {deliveryStatus && (
            <div
              className={`profile-delivery-status ${deliveryStatus.configured ? "active" : "inactive"}`}
              role="status"
            >
              {deliveryStatus.message}
            </div>
          )}
          <PreferenceToggle
            label="Email delivery"
            description="Allow RequestFlow to send notification emails."
            checked={preferences.emailEnabled}
            disabled={isLoadingPreferences}
            onChange={checked => setPreferences(previous => ({
              ...previous,
              emailEnabled: checked
            }))}
          />
          <PreferenceToggle
            label="Assignments"
            description="When a request is assigned or unassigned."
            checked={preferences.notifyAssignment}
            disabled={isLoadingPreferences || !preferences.emailEnabled}
            onChange={checked => setPreferences(previous => ({
              ...previous,
              notifyAssignment: checked
            }))}
          />
          <PreferenceToggle
            label="Status changes"
            description="When a request moves through the workflow."
            checked={preferences.notifyStatusChange}
            disabled={isLoadingPreferences || !preferences.emailEnabled}
            onChange={checked => setPreferences(previous => ({
              ...previous,
              notifyStatusChange: checked
            }))}
          />
          <PreferenceToggle
            label="Comments"
            description="When someone adds a comment to your request."
            checked={preferences.notifyComments}
            disabled={isLoadingPreferences || !preferences.emailEnabled}
            onChange={checked => setPreferences(previous => ({
              ...previous,
              notifyComments: checked
            }))}
          />
          <PreferenceToggle
            label="SLA warnings"
            description="When a request exceeds its response deadline."
            checked={preferences.notifySla}
            disabled={isLoadingPreferences || !preferences.emailEnabled}
            onChange={checked => setPreferences(previous => ({
              ...previous,
              notifySla: checked
            }))}
          />
        </div>

        <button
          type="button"
          className="profile-preferences-save"
          onClick={savePreferences}
          disabled={isLoadingPreferences || isSavingPreferences}
        >
          {isSavingPreferences ? "Saving..." : "Save Email Preferences"}
        </button>
      </section>
    </div>
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

function ProfileInfoRow({
  icon: Icon,
  label,
  value
}) {
  return (
    <div className="profile-info-row">
      <div className="profile-info-icon-wrapper">
        <Icon
          className="profile-info-icon"
          size={20}
        />
      </div>

      <div className="profile-info-content">
        <span>{label}</span>
        <strong>
          {value || "Not available"}
        </strong>
      </div>
    </div>
  );
}

function getInitials(fullName) {
  if (!fullName) {
    return "U";
  }

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function normalizeRole(role) {
  const normalizedRole = role
    .trim()
    .toLowerCase();

  if (normalizedRole === "admin") {
    return "Admin";
  }

  if (normalizedRole === "supervisor") {
    return "Supervisor";
  }

  if (normalizedRole === "staff") {
    return "Staff";
  }

  return "User";
}

export default Profile;
