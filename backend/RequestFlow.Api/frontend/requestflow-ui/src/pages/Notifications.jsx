import {
  Bell,
  CheckCheck,
  LoaderCircle,
  Trash2
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const FILTER_OPTIONS = [
  {
    value: "all",
    label: "All"
  },
  {
    value: "unread",
    label: "Unread"
  },
  {
    value: "read",
    label: "Read"
  }
];

function Notifications() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const {
    success,
    info,
    error: showError
  } = useToast();

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    activeFilter,
    setActiveFilter
  ] = useState("all");

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isMarkingAllRead,
    setIsMarkingAllRead
  ] = useState(false);

  const [
    processingNotificationId,
    setProcessingNotificationId
  ] = useState(null);

  const [
    loadError,
    setLoadError
  ] = useState("");

  const loadNotifications =
    useCallback(async () => {
      setIsLoading(true);
      setLoadError("");

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

        setNotifications([]);

        setLoadError(
          getErrorMessage(
            requestError,
            "Notifications could not be loaded."
          )
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(
      notification =>
        !notification.isRead
    ).length;
  }, [notifications]);

  const filteredNotifications =
    useMemo(() => {
      if (activeFilter === "unread") {
        return notifications.filter(
          notification =>
            !notification.isRead
        );
      }

      if (activeFilter === "read") {
        return notifications.filter(
          notification =>
            notification.isRead
        );
      }

      return notifications;
    }, [
      activeFilter,
      notifications
    ]);

  const markNotificationAsRead =
    async notification => {
      if (notification.isRead) {
        return true;
      }

      setProcessingNotificationId(
        notification.id
      );

      try {
        const response =
          await api.patch(
            `/Notifications/${notification.id}/read`
          );

        setNotifications(
          previousNotifications =>
            previousNotifications.map(
              currentNotification =>
                currentNotification.id ===
                notification.id
                  ? {
                      ...currentNotification,
                      ...response.data,
                      isRead: true
                    }
                  : currentNotification
            )
        );

        return true;
      } catch (requestError) {
        console.error(
          "Notification could not be marked as read:",
          requestError
        );

        showError(
          getErrorMessage(
            requestError,
            "Notification could not be marked as read."
          )
        );

        return false;
      } finally {
        setProcessingNotificationId(
          null
        );
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

  const handleMarkAllAsRead =
    async () => {
      if (
        unreadCount === 0 ||
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

        success(
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
          getErrorMessage(
            requestError,
            "Notifications could not be marked as read."
          )
        );
      } finally {
        setIsMarkingAllRead(false);
      }
    };

  const handleDeleteNotification =
    async notification => {
      const confirmed =
        await confirm({
          title:
            "Delete notification?",

          message:
            "This notification will be permanently removed.",

          confirmText:
            "Delete Notification",

          cancelText:
            "Cancel",

          variant: "danger"
        });

      if (!confirmed) {
        return;
      }

      setProcessingNotificationId(
        notification.id
      );

      try {
        await api.delete(
          `/Notifications/${notification.id}`
        );

        setNotifications(
          previousNotifications =>
            previousNotifications.filter(
              currentNotification =>
                currentNotification.id !==
                notification.id
            )
        );

        success(
          "Notification was deleted."
        );
      } catch (requestError) {
        console.error(
          "Notification could not be deleted:",
          requestError
        );

        showError(
          getErrorMessage(
            requestError,
            "Notification could not be deleted."
          )
        );
      } finally {
        setProcessingNotificationId(
          null
        );
      }
    };

  return (
    <div className="notifications-page">
      <header className="notifications-page-header">
        <div>
          <span className="page-eyebrow">
            WORKSPACE
          </span>

          <h1>
            Notifications
          </h1>

          <p>
            Review your recent request updates,
            assignments, comments and attachments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notifications-mark-all-button"
            onClick={() =>
              void handleMarkAllAsRead()
            }
            disabled={
              isMarkingAllRead
            }
          >
            {isMarkingAllRead ? (
              <LoaderCircle
                size={17}
                className="login-button-spinner"
              />
            ) : (
              <CheckCheck size={17} />
            )}

            <span>
              {isMarkingAllRead
                ? "Updating..."
                : "Mark all as read"}
            </span>
          </button>
        )}
      </header>

      <section className="notifications-summary-card">
        <div className="notifications-summary-icon">
          <Bell size={22} />
        </div>

        <div>
          <span>
            Unread notifications
          </span>

          <strong>
            {unreadCount}
          </strong>
        </div>
      </section>

      <div className="notifications-filter-bar">
        {FILTER_OPTIONS.map(option => (
          <button
            type="button"
            key={option.value}
            className={
              activeFilter ===
              option.value
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveFilter(
                option.value
              )
            }
          >
            {option.label}

            {option.value === "unread" &&
              unreadCount > 0 && (
                <span>
                  {unreadCount}
                </span>
              )}
          </button>
        ))}
      </div>

      <section className="notifications-list-card">
        {isLoading ? (
          <div className="notifications-state">
            <LoaderCircle
              size={28}
              className="login-button-spinner"
            />

            <strong>
              Loading notifications...
            </strong>
          </div>
        ) : loadError ? (
          <div className="notifications-state">
            <Bell size={28} />

            <strong>
              Notifications unavailable
            </strong>

            <span>
              {loadError}
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
        ) : filteredNotifications.length ===
          0 ? (
          <div className="notifications-state">
            <Bell size={30} />

            <strong>
              No notifications
            </strong>

            <span>
              Notifications matching this filter
              will appear here.
            </span>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map(
              notification => {
                const isProcessing =
                  processingNotificationId ===
                  notification.id;

                return (
                  <article
                    key={notification.id}
                    className={`notifications-list-item ${
                      notification.isRead
                        ? "read"
                        : "unread"
                    }`}
                  >
                    <button
                      type="button"
                      className="notifications-item-main"
                      onClick={() =>
                        void handleNotificationClick(
                          notification
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      <div className="notifications-item-icon">
                        {isProcessing ? (
                          <LoaderCircle
                            size={19}
                            className="login-button-spinner"
                          />
                        ) : (
                          <Bell size={19} />
                        )}
                      </div>

                      <div className="notifications-item-content">
                        <div className="notifications-item-title">
                          <strong>
                            {notification.title}
                          </strong>

                          {!notification.isRead && (
                            <span className="notifications-unread-label">
                              New
                            </span>
                          )}
                        </div>

                        <p>
                          {notification.message}
                        </p>

                        <span>
                          {formatDateTime(
                            notification.createdAt
                          )}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="notifications-delete-button"
                      onClick={() =>
                        void handleDeleteNotification(
                          notification
                        )
                      }
                      disabled={
                        isProcessing
                      }
                      aria-label={`Delete ${notification.title}`}
                      title="Delete notification"
                    >
                      {isProcessing ? (
                        <LoaderCircle
                          size={16}
                          className="login-button-spinner"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function extractNotifications(
  responseData
) {
  const items =
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

  return items
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
    );
}

function getErrorMessage(
  requestError,
  fallbackMessage
) {
  const status =
    requestError.response?.status;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to view notifications.";
  }

  return (
    requestError.response?.data
      ?.message ||
    requestError.response?.data
      ?.detail ||
    fallbackMessage
  );
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
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

function parseDate(dateValue) {
  const parsedDate =
    new Date(dateValue);

  return Number.isNaN(
    parsedDate.getTime()
  )
    ? new Date()
    : parsedDate;
}

export default Notifications;