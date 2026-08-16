import { useMemo } from "react";
import {
  BarChart3,
  Bell,
  CirclePlus,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  Settings,
  Tags,
  UsersRound,
  X
} from "lucide-react";
import {
  NavLink,
  useNavigate
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canUseDemoSettings } from "../utils/demoMode";

function Sidebar({
  isOpen = false,
  onClose = () => {}
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const normalizedRole = String(
    user?.role || "User"
  )
    .trim()
    .toLowerCase();

  const isAdmin =
    normalizedRole === "admin";

  const isSupervisor =
    normalizedRole === "supervisor";

  const isStaff =
    normalizedRole === "staff";

  const isManagement =
    isAdmin || isSupervisor;

  const hasSettingsAccess =
    isAdmin || canUseDemoSettings(user);

  const fullName =
    user?.fullName ||
    user?.name ||
    "RequestFlow User";

  const department =
    user?.department ||
    (isAdmin
      ? "IT Department"
      : isSupervisor
        ? "Management"
        : isStaff
          ? "IT Department"
          : "Standard User");

  const workspaceItems = useMemo(() => {
    const items = [
      {
        label: "Overview",
        path: "/overview",
        icon: LayoutDashboard
      },
      {
        label: isManagement
          ? "All Requests"
          : "My Requests",
        path: "/requests",
        icon: ClipboardList
      },
      {
        label: "Create Request",
        path: "/requests/create",
        icon: CirclePlus
      },
      {
      label: "Notifications",
      path: "/notifications",
      icon: Bell
    }
    ];

    if (isStaff || isManagement) {
      items.push({
        label: "Assigned Tasks",
        path: "/tasks",
        icon: ClipboardCheck
      });
    }

    return items;
  }, [isManagement, isStaff]);

  const managementItems = useMemo(() => {
    const items = [];

    if (isManagement) {
      items.push({
        label: "Reports",
        path: "/reports",
        icon: BarChart3
      });
    }

    if (isAdmin) {
      items.push({
        label: "Employees",
        path: "/employees",
        icon: UsersRound
      });

      items.push({
        label: "Audit Log",
        path: "/audit-logs",
        icon: FileClock
      });
    }

    if (isManagement) {
      items.push({
        label: "Categories",
        path: "/categories",
        icon: Tags
      });
    }

    if (hasSettingsAccess) {
      items.push({
        label: "Settings",
        path: "/settings",
        icon: Settings
      });
    }

    return items;
  }, [
    hasSettingsAccess,
    isAdmin,
    isManagement
  ]);

  const getInitials = name => {
    if (!name) {
      return "U";
    }

    return String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  };

  const handleBrandClick = () => {
    navigate("/overview");
    onClose();
  };

  const handleProfileClick = () => {
    navigate("/profile");
    onClose();
  };

  return (
    <aside
      id="rf-sidebar-navigation"
      className={`rf-sidebar ${
        isOpen
          ? "rf-sidebar-mobile-open"
          : ""
      }`}
      aria-label="Main navigation"
    >
      <div className="rf-sidebar-mobile-header">
        <button
          type="button"
          className="rf-sidebar-brand"
          onClick={handleBrandClick}
          aria-label="Go to overview"
        >
          <svg
            className="rf-brand-symbol"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <path
              className="rf-brand-symbol-orange"
              d="
                M11 17
                C22 6 42 6 53 17
                L44 27
                C37 20 27 20 20 27
                L11 17Z
              "
            />

            <circle
              cx="32"
              cy="32"
              r="8"
              className="rf-brand-symbol-center"
            />

            <path
              className="rf-brand-symbol-orange"
              d="
                M14 42
                L23 33
                C28 38 36 38 41 33
                L50 42
                L32 59
                L14 42Z
              "
            />
          </svg>

          <div className="rf-sidebar-brand-copy">
            <div className="rf-sidebar-brand-name">
              <span className="rf-brand-request">
                Request
              </span>

              <span className="rf-brand-flow">
                Flow
              </span>
            </div>

            <span className="rf-sidebar-brand-subtitle">
              Request Management
            </span>
          </div>
        </button>

        <button
          type="button"
          className="rf-sidebar-mobile-close"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="rf-sidebar-navigation">
        <SidebarSection
          title="WORKSPACE"
          items={workspaceItems}
          onNavigate={onClose}
        />

        {managementItems.length > 0 && (
          <SidebarSection
            title="MANAGEMENT"
            items={managementItems}
            onNavigate={onClose}
          />
        )}
      </nav>

      <button
        type="button"
        className="rf-sidebar-profile"
        onClick={handleProfileClick}
        aria-label="Open profile"
      >
        <div className="rf-sidebar-avatar">
          {getInitials(fullName)}
        </div>

        <div className="rf-sidebar-user-info">
          <strong>{fullName}</strong>
          <span>{department}</span>
        </div>
      </button>
    </aside>
  );
}

function SidebarSection({
  title,
  items,
  onNavigate
}) {
  return (
    <section className="rf-sidebar-section">
      <span className="rf-sidebar-section-title">
        {title}
      </span>

      <div className="rf-sidebar-menu">
        {items.map(item => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `rf-sidebar-link ${
                  isActive
                    ? "rf-sidebar-link-active"
                    : ""
                }`
              }
            >
              <Icon
                size={22}
                strokeWidth={1.9}
              />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}

export default Sidebar;
