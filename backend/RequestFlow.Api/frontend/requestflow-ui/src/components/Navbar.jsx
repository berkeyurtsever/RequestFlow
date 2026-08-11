import {
  Bell,
  CheckCheck,
  ChevronDown,
  FileText,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

import api from "../services/api";
import DemoThemeToggle from "./DemoThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { isDemoModeEnabled } from "../utils/demoMode";

const NOTIFICATION_REFRESH_TIME = 30000;

function Navbar({
  onMenuClick = () => {},
  isMenuOpen = false,
  menuButtonRef
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const profileMenuRef = useRef(null);

  const { user, logout } = useAuth();
  const { confirm } = useConfirm();

  const {
    info,
    error: showError
  } = useToast();

  const [
    navbarTickets,
    setNavbarTickets
  ] = useState([]);

  const [
    isNavbarDataLoading,
    setIsNavbarDataLoading
  ] = useState(true);

  const [
    navbarDataError,
    setNavbarDataError
  ] = useState("");

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    isNotificationLoading,
    setIsNotificationLoading
  ] = useState(true);

  const [
    notificationError,
    setNotificationError
  ] = useState("");

  const [
    isMarkingAllRead,
    setIsMarkingAllRead
  ] = useState(false);

  const [
    readingNotificationId,
    setReadingNotificationId
  ] = useState(null);

  const [
    searchValue,
    setSearchValue
  ] = useState("");

  const [
    searchResults,
    setSearchResults
  ] = useState([]);

  const [
    isSearching,
    setIsSearching
  ] = useState(false);

  const [
    isSearchPanelOpen,
    setIsSearchPanelOpen
  ] = useState(false);

  const [
    isNotificationPanelOpen,
    setIsNotificationPanelOpen
  ] = useState(false);

  const [
    isProfileMenuOpen,
    setIsProfileMenuOpen
  ] = useState(false);

  const [
    isLoggingOut,
    setIsLoggingOut
  ] = useState(false);

  const fullName =
    user?.fullName ||
    user?.name ||
    "RequestFlow User";

  const role =
    user?.role || "User";

  const loadNavbarTickets =
    useCallback(async () => {
      setIsNavbarDataLoading(true);
      setNavbarDataError("");

      try {
        const response =
          await api.get("/Tickets");

        setNavbarTickets(
          extractTickets(response.data)
        );
      } catch (requestError) {
        console.error(
          "Navbar request data could not be loaded:",
          requestError
        );

        setNavbarTickets([]);

        setNavbarDataError(
          getRequestErrorMessage(
            requestError,
            "Request data could not be loaded."
          )
        );
      } finally {
        setIsNavbarDataLoading(false);
      }
    }, []);

  const loadNotifications =
    useCallback(async ({
      showLoading = true
    } = {}) => {
      if (showLoading) {
        setIsNotificationLoading(true);
      }

      setNotificationError("");

      try {
        const response =
          await api.get("/Notifications");

        setNotifications(
          extractNotifications(
            response.data
          )
        );
      } catch (requestError) {
        console.error(
          "Notifications could not be loaded:",
          requestError
        );

        if (showLoading) {
          setNotifications([]);
        }

        setNotificationError(
          getRequestErrorMessage(
            requestError,
            "Notifications could not be loaded."
          )
        );
      } finally {
        if (showLoading) {
          setIsNotificationLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    void loadNavbarTickets();
  }, [
    loadNavbarTickets,
    location.pathname
  ]);

  useEffect(() => {
    void loadNotifications();
  }, [
    loadNotifications,
    location.pathname
  ]);

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        void loadNotifications({
          showLoading: false
        });
      }, NOTIFICATION_REFRESH_TIME);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const unreadNotificationCount =
    useMemo(() => {
      return notifications.filter(
        notification =>
          !notification.isRead
      ).length;
    }, [notifications]);

  const markNotificationAsRead =
    async notification => {
      if (
        notification.isRead ||
        readingNotificationId ===
          notification.id
      ) {
        return true;
      }

      setReadingNotificationId(
        notification.id
      );

      setNotifications(
        previousNotifications =>
          previousNotifications.map(
            currentNotification =>
              currentNotification.id ===
              notification.id
                ? {
                    ...currentNotification,
                    isRead: true,
                    readAt:
                      new Date().toISOString()
                  }
                : currentNotification
          )
      );

      try {
        await api.patch(
          `/Notifications/${notification.id}/read`
        );

        return true;
      } catch (requestError) {
        console.error(
          "Notification could not be marked as read:",
          requestError
        );

        setNotifications(
          previousNotifications =>
            previousNotifications.map(
              currentNotification =>
                currentNotification.id ===
                notification.id
                  ? {
                      ...currentNotification,
                      isRead: false,
                      readAt: null
                    }
                  : currentNotification
            )
        );

        showError(
          getRequestErrorMessage(
            requestError,
            "Notification could not be marked as read."
          )
        );

        return false;
      } finally {
        setReadingNotificationId(null);
      }
    };

  const handleMarkAllAsRead =
    async () => {
      if (
        unreadNotificationCount === 0 ||
        isMarkingAllRead
      ) {
        return;
      }

      setIsMarkingAllRead(true);

      const previousNotifications =
        notifications;

      const readAt =
        new Date().toISOString();

      setNotifications(
        previousNotifications.map(
          notification => ({
            ...notification,
            isRead: true,
            readAt:
              notification.readAt ||
              readAt
          })
        )
      );

      try {
        await api.patch(
          "/Notifications/read-all"
        );

        info(
          "All notifications were marked as read."
        );
      } catch (requestError) {
        console.error(
          "Notifications could not be marked as read:",
          requestError
        );

        setNotifications(
          previousNotifications
        );

        showError(
          getRequestErrorMessage(
            requestError,
            "Notifications could not be marked as read."
          )
        );
      } finally {
        setIsMarkingAllRead(false);
      }
    };

  const handleNotificationClick =
    async notification => {
      const markedAsRead =
        await markNotificationAsRead(
          notification
        );

      if (!markedAsRead) {
        return;
      }

      setIsNotificationPanelOpen(false);

      if (!notification.ticketId) {
        info(
          "The related request is no longer available."
        );

        return;
      }

      try {
        await api.get(
          `/Tickets/${notification.ticketId}`
        );

        navigate(
          `/requests/edit/${notification.ticketId}`
        );
      } catch (requestError) {
        const status =
          requestError.response?.status;

        if (status === 403) {
          info(
            "This request is no longer assigned to you."
          );
        } else if (status === 404) {
          info(
            "The related request no longer exists."
          );
        } else if (status === 401) {
          showError(
            "Your session has expired. Please sign in again."
          );
        } else {
          showError(
            "The related request could not be opened."
          );
        }
      }
    };

  useEffect(() => {
    const normalizedSearch =
      searchValue
        .trim()
        .toLowerCase();

    if (normalizedSearch.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer =
      window.setTimeout(() => {
        const results =
          navbarTickets
            .filter(ticket => {
              const searchableValues = [
                ticket.id,
                ticket.title,
                ticket.category,
                ticket.status,
                ticket.priority,
                ticket.description
              ];

              return searchableValues.some(
                value =>
                  String(value || "")
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    )
              );
            })
            .slice(0, 6);

        setSearchResults(results);
        setIsSearchPanelOpen(true);
        setIsSearching(false);
      }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    searchValue,
    navbarTickets
  ]);

  const handleSearchChange = event => {
    const value =
      event.target.value;

    setSearchValue(value);

    if (value.trim().length >= 2) {
      setIsSearchPanelOpen(true);
      setIsNotificationPanelOpen(false);
      setIsProfileMenuOpen(false);
    } else {
      setSearchResults([]);
      setIsSearchPanelOpen(false);
    }
  };

  const handleSearchSubmit = event => {
    event.preventDefault();

    openAllSearchResults();
  };

  const openAllSearchResults = () => {
    const normalizedSearch =
      searchValue.trim();

    if (!normalizedSearch) {
      return;
    }

    setIsSearchPanelOpen(false);

    navigate(
      `/requests?search=${encodeURIComponent(
        normalizedSearch
      )}`
    );
  };

  const handleSearchResultClick =
    ticketId => {
      setIsSearchPanelOpen(false);
      setSearchValue("");
      setSearchResults([]);

      navigate(
        `/requests/edit/${ticketId}`
      );
    };

  const clearSearch = () => {
    setSearchValue("");
    setSearchResults([]);
    setIsSearchPanelOpen(false);
  };

  const toggleNotificationPanel = () => {
    const willOpen =
      !isNotificationPanelOpen;

    setIsNotificationPanelOpen(
      willOpen
    );

    setIsSearchPanelOpen(false);
    setIsProfileMenuOpen(false);

    if (willOpen) {
      void loadNotifications({
        showLoading:
          notifications.length === 0
      });
    }
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(
      previousValue =>
        !previousValue
    );

    setIsSearchPanelOpen(false);
    setIsNotificationPanelOpen(false);
  };

  const handleProfileNavigation = () => {
    setIsProfileMenuOpen(false);
    navigate("/profile");
  };

  const handlePasswordNavigation = () => {
    setIsProfileMenuOpen(false);
    navigate("/change-password");
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);

    const confirmed =
      await confirm({
        title:
          "Sign out of RequestFlow?",

        message:
          "You will need to enter your email and password to access your account again.",

        confirmText:
          "Sign Out",

        cancelText:
          "Cancel",

        variant: "warning"
      });

    if (!confirmed) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await Promise.resolve(
        logout()
      );

      navigate("/login", {
        replace: true
      });

      info(
        "You have signed out successfully."
      );
    } catch (logoutError) {
      console.error(
        "Sign out failed:",
        logoutError
      );

      showError(
        "Your session could not be closed. Please try again."
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsSearchPanelOpen(false);
    setIsNotificationPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = event => {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target
        )
      ) {
        setIsSearchPanelOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {
        setIsNotificationPanelOpen(false);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target
        )
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    const handleEscapeKey = event => {
      if (event.key !== "Escape") {
        return;
      }

      setIsSearchPanelOpen(false);
      setIsNotificationPanelOpen(false);
      setIsProfileMenuOpen(false);
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

  return (
    <header className="rf-navbar">
      <button
        ref={menuButtonRef}
        type="button"
        className="rf-navbar-mobile-menu"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-controls="rf-sidebar-navigation"
        aria-expanded={isMenuOpen}
      >
        <Menu size={21} />
      </button>

      <div
        ref={searchRef}
        className="rf-navbar-search-container"
      >
        <form
          className="rf-navbar-search"
          onSubmit={handleSearchSubmit}
        >
          <Search size={19} />

          <input
            type="text"
            placeholder="Search requests..."
            value={searchValue}
            onChange={handleSearchChange}
            onFocus={() => {
              if (
                searchValue.trim()
                  .length >= 2
              ) {
                setIsSearchPanelOpen(true);
                setIsNotificationPanelOpen(false);
                setIsProfileMenuOpen(false);
              }
            }}
            aria-label="Search requests"
            autoComplete="off"
          />

          {isSearching ||
          (
            isNavbarDataLoading &&
            searchValue.trim().length >= 2
          ) ? (
            <LoaderCircle
              size={17}
              className="rf-navbar-search-spinner"
            />
          ) : searchValue ? (
            <button
              type="button"
              className="rf-navbar-search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          ) : null}
        </form>

        {isSearchPanelOpen && (
          <div className="rf-navbar-search-panel">
            <div className="rf-navbar-search-panel-header">
              <span>
                SEARCH RESULTS
              </span>

              <strong>
                {searchResults.length}
              </strong>
            </div>

            {isSearching ||
            isNavbarDataLoading ? (
              <div className="rf-navbar-search-state">
                <LoaderCircle
                  size={21}
                  className="rf-navbar-search-spinner"
                />

                <span>
                  Searching requests...
                </span>
              </div>
            ) : navbarDataError ? (
              <div className="rf-navbar-search-state">
                <Search size={23} />

                <strong>
                  Search unavailable
                </strong>

                <span>
                  {navbarDataError}
                </span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="rf-navbar-search-state">
                <Search size={23} />

                <strong>
                  No requests found
                </strong>

                <span>
                  Try searching with another title,
                  category or request ID.
                </span>
              </div>
            ) : (
              <div className="rf-navbar-search-results">
                {searchResults.map(
                  ticket => (
                    <button
                      type="button"
                      key={ticket.id}
                      className="rf-navbar-search-result"
                      onClick={() =>
                        handleSearchResultClick(
                          ticket.id
                        )
                      }
                    >
                      <div className="rf-navbar-search-result-icon">
                        <FileText size={17} />
                      </div>

                      <div className="rf-navbar-search-result-content">
                        <strong>
                          {ticket.title ||
                            "Untitled Request"}
                        </strong>

                        <span>
                          #{ticket.id}
                          {" · "}
                          {ticket.category ||
                            "Uncategorized"}
                        </span>
                      </div>

                      <div className="rf-navbar-search-result-meta">
                        <span
                          className={`rf-navbar-search-status ${createClassName(
                            ticket.status
                          )}`}
                        >
                          {ticket.status ||
                            "Unknown"}
                        </span>

                        <small>
                          {ticket.priority ||
                            "Unknown"}
                        </small>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}

            <button
              type="button"
              className="rf-navbar-search-view-all"
              onClick={
                openAllSearchResults
              }
            >
              View all results for “
              {searchValue.trim()}”
            </button>
          </div>
        )}
      </div>

      <div className="rf-navbar-actions">
        {isDemoModeEnabled() && (
          <DemoThemeToggle />
        )}

        <div
          ref={notificationRef}
          className="rf-navbar-notification-wrapper"
        >
          <button
            type="button"
            className="rf-navbar-notification-button"
            onClick={
              toggleNotificationPanel
            }
            aria-label="Open notifications"
            aria-expanded={
              isNotificationPanelOpen
            }
          >
            <Bell size={19} />

            {unreadNotificationCount >
              0 && (
              <span className="rf-navbar-notification-badge">
                {unreadNotificationCount >
                9
                  ? "9+"
                  : unreadNotificationCount}
              </span>
            )}
          </button>

          {isNotificationPanelOpen && (
            <div className="rf-navbar-notification-panel">
              <div className="rf-navbar-notification-header">
                <div>
                  <h2>
                    Notifications
                  </h2>

                  <p>
                    Recent request updates
                  </p>
                </div>

                {unreadNotificationCount >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleMarkAllAsRead()
                    }
                    disabled={
                      isMarkingAllRead
                    }
                  >
                    {isMarkingAllRead ? (
                      <LoaderCircle
                        size={15}
                        className="rf-navbar-search-spinner"
                      />
                    ) : (
                      <CheckCheck
                        size={15}
                      />
                    )}

                    <span>
                      {isMarkingAllRead
                        ? "Updating..."
                        : "Mark all read"}
                    </span>
                  </button>
                )}
              </div>

              {isNotificationLoading ? (
                <div className="rf-navbar-notification-state">
                  <LoaderCircle
                    size={23}
                    className="rf-navbar-search-spinner"
                  />

                  <span>
                    Loading notifications...
                  </span>
                </div>
              ) : notificationError ? (
                <div className="rf-navbar-notification-state error">
                  <Bell size={24} />

                  <strong>
                    Notifications unavailable
                  </strong>

                  <span>
                    {notificationError}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void loadNotifications()
                    }
                  >
                    Try Again
                  </button>
                </div>
              ) : notifications.length ===
                0 ? (
                <div className="rf-navbar-notification-state">
                  <Bell size={24} />

                  <strong>
                    No notifications
                  </strong>

                  <span>
                    Request updates will appear
                    here.
                  </span>
                </div>
              ) : (
                <div className="rf-navbar-notification-list">
                  {notifications.map(
                    notification => {
                      const isUnread =
                        !notification.isRead;

                      const isReading =
                        readingNotificationId ===
                        notification.id;

                      return (
                        <button
                          type="button"
                          key={notification.id}
                          className={`rf-navbar-notification-item ${
                            isUnread
                              ? "unread"
                              : ""
                          }`}
                          onClick={() =>
                            void handleNotificationClick(
                              notification
                            )
                          }
                          disabled={isReading}
                        >
                          <div
                            className={`rf-navbar-notification-icon ${createClassName(
                              notification.type
                            )}`}
                          >
                            {isReading ? (
                              <LoaderCircle
                                size={17}
                                className="rf-navbar-search-spinner"
                              />
                            ) : (
                              <FileText size={17} />
                            )}
                          </div>

                          <div className="rf-navbar-notification-content">
                            <strong>
                              {notification.title}
                            </strong>

                            <p>
                              {notification.message}
                            </p>

                            <span>
                              {formatRelativeTime(
                                notification.createdAt
                              )}
                            </span>
                          </div>

                          {isUnread && (
                            <span className="rf-navbar-unread-dot" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              <button
                type="button"
                className="rf-navbar-notification-footer"
                onClick={() => {
                  setIsNotificationPanelOpen(
                    false
                  );

                  navigate(
                    "/notifications"
                  );
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div
          ref={profileMenuRef}
          className="rf-navbar-user-wrapper"
        >
          <button
            type="button"
            className="rf-navbar-user"
            onClick={toggleProfileMenu}
            aria-expanded={
              isProfileMenuOpen
            }
            aria-haspopup="menu"
          >
            <div className="rf-navbar-avatar">
              {getInitials(fullName)}
            </div>

            <div className="rf-navbar-user-text">
              <strong>
                {fullName}
              </strong>

              <span>
                {getRoleLabel(role)}
              </span>
            </div>

            <ChevronDown
              size={17}
              className={
                isProfileMenuOpen
                  ? "rf-navbar-chevron-open"
                  : ""
              }
            />
          </button>

          {isProfileMenuOpen && (
            <div
              className="rf-navbar-user-menu"
              role="menu"
            >
              <button
                type="button"
                onClick={
                  handleProfileNavigation
                }
                role="menuitem"
              >
                <UserRound size={17} />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={
                  handlePasswordNavigation
                }
                role="menuitem"
              >
                <ShieldCheck size={17} />

                <span>
                  Change Password
                </span>
              </button>

              <div className="rf-navbar-menu-divider" />

              <button
                type="button"
                className="rf-navbar-logout"
                onClick={handleLogout}
                disabled={isLoggingOut}
                role="menuitem"
              >
                <LogOut size={17} />

                <span>
                  {isLoggingOut
                    ? "Signing Out..."
                    : "Sign Out"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function extractTickets(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (
    Array.isArray(responseData?.items)
  ) {
    return responseData.items;
  }

  if (
    Array.isArray(responseData?.tickets)
  ) {
    return responseData.tickets;
  }

  return [];
}

function extractNotifications(
  responseData
) {
  const notificationItems =
    Array.isArray(responseData)
      ? responseData
      : Array.isArray(
            responseData?.items
          )
        ? responseData.items
        : Array.isArray(
              responseData
                ?.notifications
            )
          ? responseData.notifications
          : [];

  return notificationItems
    .filter(notification =>
      Boolean(notification?.id)
    )
    .map(notification => ({
      id: notification.id,
      userId:
        notification.userId,
      ticketId:
        notification.ticketId,
      type:
        notification.type ||
        "update",
      title:
        notification.title ||
        "Request update",
      message:
        notification.message ||
        "A request was updated.",
      isRead:
        Boolean(notification.isRead),
      createdAt:
        notification.createdAt,
      readAt:
        notification.readAt
    }))
    .sort(
      (
        firstNotification,
        secondNotification
      ) =>
        parseDate(
          secondNotification.createdAt
        ).getTime() -
        parseDate(
          firstNotification.createdAt
        ).getTime()
    )
    .slice(0, 30);
}

function getRequestErrorMessage(
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

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to complete this operation.";
  }

  return (
    backendMessage ||
    fallbackMessage
  );
}

function getInitials(name) {
  const initials = String(
    name || "User"
  )
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "U";
}

function getRoleLabel(currentRole) {
  const normalizedRole = String(
    currentRole || "User"
  )
    .trim()
    .toLowerCase();

  if (normalizedRole === "admin") {
    return "Administrator";
  }

  if (
    normalizedRole === "supervisor"
  ) {
    return "Supervisor";
  }

  if (normalizedRole === "staff") {
    return "Staff Member";
  }

  return "Standard User";
}

function formatRelativeTime(dateValue) {
  const date = parseDate(dateValue);

  const difference =
    Date.now() - date.getTime();

  const seconds = Math.max(
    0,
    Math.floor(difference / 1000)
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric"
    }
  );
}

function parseDate(dateValue) {
  const parsedDate =
    new Date(dateValue);

  return Number.isNaN(
    parsedDate.getTime()
  )
    ? new Date()
    : parsedDate;
}

function createClassName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    );
}

export default Navbar;
