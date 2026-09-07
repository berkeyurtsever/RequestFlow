import {
  Clock3,
  Check,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Pencil,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import {
  useEffect,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import NotificationPreferencePanel from "../components/NotificationPreferencePanel";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { success, error: showError } = useToast();
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadSessions = async () => {
      try {
        const response = await api.get("/Auth/sessions");

        if (isActive) {
          setSessions(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch (requestError) {
        console.error(
          "Session history could not be loaded:",
          requestError
        );
        showError("Session history could not be loaded.");
      } finally {
        if (isActive) {
          setIsLoadingSessions(false);
        }
      }
    };

    void loadSessions();

    return () => {
      isActive = false;
    };
  }, [showError]);

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

  const beginProfileEdit = () => {
    setFullNameDraft(fullName);
    setIsEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setFullNameDraft(fullName);
    setIsEditingProfile(false);
  };

  const saveProfile = async event => {
    event.preventDefault();

    const normalizedName = fullNameDraft.trim();

    if (!normalizedName) {
      showError("Full name is required.");
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({ fullName: normalizedName });
      setIsEditingProfile(false);
      success("Profile information updated.");
    } catch (requestError) {
      console.error("Profile could not be updated:", requestError);
      showError(
        requestError.response?.data?.message ||
          "Profile information could not be updated."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

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
        <div className="profile-edit-action">
          {!isEditingProfile && (
            <button type="button" onClick={beginProfileEdit}>
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>
        <div className="profile-card-top">
          <div className="profile-avatar-large">
            {initials}
          </div>

          <div className="profile-card-identity">
            <div className="profile-name-row">
              {isEditingProfile ? (
                <form className="profile-name-form" onSubmit={saveProfile}>
                  <label htmlFor="profile-full-name">Full name</label>
                  <div>
                    <input
                      id="profile-full-name"
                      value={fullNameDraft}
                      maxLength={100}
                      autoFocus
                      onChange={event => setFullNameDraft(event.target.value)}
                    />
                    <button type="submit" disabled={isSavingProfile}>
                      <Check size={15} />
                      {isSavingProfile ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={cancelProfileEdit}
                      disabled={isSavingProfile}
                    >
                      <X size={15} />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <h2>{fullName}</h2>
              )}

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

      <section className="profile-sessions-card">
        <div className="profile-sessions-heading">
          <div className="profile-security-icon">
            <MonitorSmartphone size={19} />
          </div>
          <div>
            <h2>Sign-in History</h2>
            <p>
              Review the most recent devices that accessed your account.
            </p>
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="profile-sessions-state">
            Loading sign-in history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="profile-sessions-state">
            New sign-ins will appear here.
          </div>
        ) : (
          <div className="profile-sessions-list">
            {sessions.map(session => (
              <article key={session.id} className="profile-session-row">
                <div className="profile-session-device-icon">
                  <MonitorSmartphone size={19} />
                </div>
                <div className="profile-session-copy">
                  <div>
                    <strong>{session.device}</strong>
                    {session.isCurrent && (
                      <span className="profile-session-current">
                        Current session
                      </span>
                    )}
                  </div>
                  <small>{session.network}</small>
                </div>
                <div className="profile-session-time">
                  <Clock3 size={15} />
                  <span>{formatSessionDate(session.signedInAtUtc)}</span>
                  {session.isExpired && <small>Expired</small>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <NotificationPreferencePanel />
    </div>
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

function formatSessionDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default Profile;
