import { useMemo } from "react";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CirclePlus,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  HeartPulse,
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
import { useLanguage } from "../context/LanguageContext";
import { canUseDemoSettings } from "../utils/demoMode";

function Sidebar({
  isOpen = false,
  onClose = () => {}
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

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
      ? t("department.it")
      : isSupervisor
        ? t("department.management")
        : isStaff
          ? t("department.it")
          : t("department.standard"));

  const workspaceItems = useMemo(() => {
    const items = [
      {
        label: t("navigation.overview"),
        path: "/overview",
        icon: LayoutDashboard
      },
      {
        label: isManagement
          ? t("navigation.allRequests")
          : t("navigation.myRequests"),
        path: "/requests",
        icon: ClipboardList
      },
      {
        label: t("navigation.createRequest"),
        path: "/requests/create",
        icon: CirclePlus
      },
      {
      label: t("navigation.notifications"),
      path: "/notifications",
      icon: Bell
    },
    {
      label: t("navigation.knowledgeBase"),
      path: "/knowledge-base",
      icon: BookOpenCheck
    }
    ];

    if (isStaff || isManagement) {
      items.push({
        label: t("navigation.assignedTasks"),
        path: "/tasks",
        icon: ClipboardCheck
      });
    }

    return items;
  }, [isManagement, isStaff, t]);

  const managementItems = useMemo(() => {
    const items = [];

    if (isManagement) {
      items.push({
        label: t("navigation.reports"),
        path: "/reports",
        icon: BarChart3
      });
    }

    if (isAdmin) {
      items.push({
        label: t("navigation.employees"),
        path: "/employees",
        icon: UsersRound
      });

      items.push({
        label: t("navigation.auditLog"),
        path: "/audit-logs",
        icon: FileClock
      });

      items.push({
        label: t("navigation.systemHealth"),
        path: "/system-health",
        icon: HeartPulse
      });
    }

    if (isManagement) {
      items.push({
        label: t("navigation.categories"),
        path: "/categories",
        icon: Tags
      });
    }

    if (hasSettingsAccess) {
      items.push({
        label: t("navigation.settings"),
        path: "/settings",
        icon: Settings
      });
    }

    return items;
  }, [
    hasSettingsAccess,
    isAdmin,
    isManagement,
    t
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
      aria-label={t("navigation.main")}
    >
      <div className="rf-sidebar-mobile-header">
        <button
          type="button"
          className="rf-sidebar-brand"
          onClick={handleBrandClick}
          aria-label={t("navigation.overview")}
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
              {t("brand.subtitle")}
            </span>
          </div>
        </button>

        <button
          type="button"
          className="rf-sidebar-mobile-close"
          onClick={onClose}
          aria-label={t("navigation.close")}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="rf-sidebar-navigation">
        <SidebarSection
          title={t("navigation.workspace")}
          items={workspaceItems}
          onNavigate={onClose}
        />

        {managementItems.length > 0 && (
          <SidebarSection
            title={t("navigation.management")}
            items={managementItems}
            onNavigate={onClose}
          />
        )}
      </nav>

      <button
        type="button"
        className="rf-sidebar-profile"
        onClick={handleProfileClick}
        aria-label={t("navigation.profile")}
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
