import {
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

export default Profile;