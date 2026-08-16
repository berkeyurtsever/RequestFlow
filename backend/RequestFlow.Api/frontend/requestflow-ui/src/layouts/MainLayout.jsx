import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  Outlet,
  useLocation
} from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const pageTitles = {
  "/overview": "Overview",
  "/requests": "Requests",
  "/requests/create": "Create Request",
  "/tasks": "Assigned Tasks",
  "/reports": "Reports",
  "/employees": "Employees",
  "/categories": "Categories",
  "/settings": "Settings",
  "/audit-logs": "Audit Logs",
  "/profile": "My Profile",
  "/change-password": "Change Password",
  "/access-denied": "Access Denied"
};

function MainLayout() {
  const location = useLocation();
  const mainContentRef = useRef(null);
  const menuButtonRef = useRef(null);
  const wasMobileSidebarOpenRef = useRef(false);

  const [
    isMobileSidebarOpen,
    setIsMobileSidebarOpen
  ] = useState(false);

  const [currentPageTitle, setCurrentPageTitle] =
    useState("RequestFlow");

  const openMobileSidebar = () => {
    setIsMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const getPageTitle = pathname => {
    if (
      pathname.startsWith("/requests/edit/")
    ) {
      return "Edit Request";
    }

    return (
      pageTitles[pathname] ||
      "Page Not Found"
    );
  };

  useEffect(() => {
    closeMobileSidebar();

    const pageTitle = getPageTitle(
      location.pathname
    );

    setCurrentPageTitle(pageTitle);

    document.title =
      `${pageTitle} | RequestFlow`;

    const focusTimer =
      window.setTimeout(() => {
        mainContentRef.current?.focus();
      }, 50);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      if (wasMobileSidebarOpenRef.current) {
        menuButtonRef.current?.focus();
      }

      wasMobileSidebarOpenRef.current = false;
      return undefined;
    }

    wasMobileSidebarOpenRef.current = true;

    const sidebar = document.getElementById(
      "rf-sidebar-navigation"
    );

    const getFocusableElements = () =>
      Array.from(
        sidebar?.querySelectorAll(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );

    const focusTimer = window.setTimeout(() => {
      const preferredElement =
        sidebar?.querySelector(
          ".rf-sidebar-mobile-close"
        );

      (
        preferredElement ||
        getFocusableElements()[0]
      )?.focus();
    }, 50);

    const handleSidebarKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSidebar();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements =
        getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement =
        focusableElements[0];
      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleSidebarKeyDown
    );

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener(
        "keydown",
        handleSidebarKeyDown
      );
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="rf-app-layout">
      <a
        href="#rf-main-content"
        className="rf-skip-link"
      >
        Skip to main content
      </a>

      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
      />

      <button
        type="button"
        className={`rf-sidebar-overlay ${
          isMobileSidebarOpen
            ? "rf-sidebar-overlay-visible"
            : ""
        }`}
        onClick={closeMobileSidebar}
        aria-label="Close navigation menu"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="rf-layout-content">
        <Navbar
          onMenuClick={openMobileSidebar}
          isMenuOpen={isMobileSidebarOpen}
          menuButtonRef={menuButtonRef}
        />

        <main
          id="rf-main-content"
          ref={mainContentRef}
          className="rf-main-content"
          tabIndex={-1}
          aria-label={currentPageTitle}
        >
          <Outlet />
        </main>
      </div>

      <div
        className="rf-route-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {currentPageTitle} page loaded
      </div>
    </div>
  );
}

export default MainLayout;
