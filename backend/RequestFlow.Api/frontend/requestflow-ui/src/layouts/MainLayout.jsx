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
  "/profile": "My Profile",
  "/change-password": "Change Password",
  "/access-denied": "Access Denied"
};

function MainLayout() {
  const location = useLocation();
  const mainContentRef = useRef(null);

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
    const handleEscapeKey = event => {
      if (event.key === "Escape") {
        closeMobileSidebar();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscapeKey
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscapeKey
      );
    };
  }, []);

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
        aria-hidden={!isMobileSidebarOpen}
        tabIndex={
          isMobileSidebarOpen ? 0 : -1
        }
      />

      <div className="rf-layout-content">
        <Navbar
          onMenuClick={openMobileSidebar}
          isMenuOpen={isMobileSidebarOpen}
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
