import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarRange,
  ChevronDown,
  CircleCheckBig,
  CircleDot,
  CirclePlus,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Tags,
  TrendingDown,
  TrendingUp,
  UsersRound
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import {
  StatCardsSkeleton
} from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const DAY_IN_MILLISECONDS =
  24 * 60 * 60 * 1000;

const RANGE_OPTIONS = [
  {
    value: 7,
    label: "Last 7 Days"
  },
  {
    value: 30,
    label: "Last 30 Days"
  }
];

const STATUS_COLORS = {
  open: "#2563eb",
  "in progress": "#7c3aed",
  pending: "#f59e0b",
  resolved: "#22c55e",
  rejected: "#ef4444"
};

const PRIORITY_COLORS = {
  Low: "#64748b",
  Medium: "#2563eb",
  High: "#f97316",
  Urgent: "#dc2626"
};

const PRIORITY_RESPONSE_HOURS = {
  Low: 120,
  Medium: 48,
  High: 24,
  Urgent: 2
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] =
    useState([]);

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedRange, setSelectedRange] =
    useState(7);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

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

  const loadTickets = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response =
          await api.get("/Tickets");

        setTickets(
          extractTickets(response.data)
        );
      } catch (requestError) {
        console.error(
          "Dashboard data could not be loaded:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 401) {
          setError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          setError(
            "You do not have permission to view request data."
          );
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              "Dashboard data could not be loaded. Check the backend connection."
          );
        }

        setTickets([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    let timer;

    const scheduleNextUpdate = () => {
      const millisecondsUntilNextMinute =
        60000 - (Date.now() % 60000);

      timer = window.setTimeout(() => {
        setCurrentDate(new Date());
        scheduleNextUpdate();
      }, millisecondsUntilNextMinute);
    };

    scheduleNextUpdate();

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const statistics = useMemo(() => {
    const result = {
      total: tickets.length,
      open: 0,
      inProgress: 0,
      pending: 0,
      resolved: 0,
      rejected: 0,
      overdue: 0
    };

    tickets.forEach(ticket => {
      const status =
        normalizeStatus(ticket.status);

      if (status === "open") {
        result.open += 1;
      } else if (
        status === "in progress"
      ) {
        result.inProgress += 1;
      } else if (
        status === "pending"
      ) {
        result.pending += 1;
      } else if (
        status === "resolved"
      ) {
        result.resolved += 1;
      } else if (
        status === "rejected"
      ) {
        result.rejected += 1;
      }

      if (
        isTicketOverdue(
          ticket,
          currentDate
        )
      ) {
        result.overdue += 1;
      }
    });

    return result;
  }, [
    tickets,
    currentDate
  ]);

  const periodMetrics = useMemo(() => {
    const rangeDays =
      Number(selectedRange);

    const currentRangeStart =
      startOfDay(
        new Date(
          currentDate.getTime() -
            (rangeDays - 1) *
              DAY_IN_MILLISECONDS
        )
      );

    const previousRangeStart =
      new Date(
        currentRangeStart.getTime() -
          rangeDays *
            DAY_IN_MILLISECONDS
      );

    const currentCreated =
      tickets.filter(ticket =>
        isDateWithinRange(
          ticket.createdAt,
          currentRangeStart,
          currentDate
        )
      ).length;

    const previousCreated =
      tickets.filter(ticket =>
        isDateWithinRange(
          ticket.createdAt,
          previousRangeStart,
          currentRangeStart,
          false
        )
      ).length;

    const resolvedInRange =
      tickets.filter(ticket => {
        if (
          normalizeStatus(
            ticket.status
          ) !== "resolved"
        ) {
          return false;
        }

        return isDateWithinRange(
          ticket.updatedAt ||
            ticket.createdAt,
          currentRangeStart,
          currentDate
        );
      }).length;

    const urgentInRange =
      tickets.filter(ticket => {
        const priority =
          normalizePriority(
            ticket.priority
          );

        return (
          priority === "Urgent" &&
          isDateWithinRange(
            ticket.createdAt,
            currentRangeStart,
            currentDate
          )
        );
      }).length;

    return {
      currentCreated,
      previousCreated,
      resolvedInRange,
      urgentInRange,
      trend: calculateTrend(
        currentCreated,
        previousCreated
      )
    };
  }, [
    tickets,
    selectedRange,
    currentDate
  ]);

  const statusItems = useMemo(() => {
    return [
      {
        label: "Open",
        value: statistics.open,
        className: "open",
        color: STATUS_COLORS.open
      },
      {
        label: "In Progress",
        value: statistics.inProgress,
        className: "in-progress",
        color:
          STATUS_COLORS["in progress"]
      },
      {
        label: "Pending",
        value: statistics.pending,
        className: "pending",
        color: STATUS_COLORS.pending
      },
      {
        label: "Resolved",
        value: statistics.resolved,
        className: "resolved",
        color: STATUS_COLORS.resolved
      },
      {
        label: "Rejected",
        value: statistics.rejected,
        className: "rejected",
        color: STATUS_COLORS.rejected
      }
    ];
  }, [statistics]);

  const donutBackground = useMemo(() => {
    return buildConicGradient(
      statusItems,
      statistics.total
    );
  }, [
    statusItems,
    statistics.total
  ]);

  const priorityBreakdown = useMemo(() => {
    const counts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0
    };

    tickets.forEach(ticket => {
      const priority =
        normalizePriority(
          ticket.priority
        );

      counts[priority] += 1;
    });

    return Object.entries(counts).map(
      ([label, value]) => ({
        label,
        value,
        percentage: percentage(
          value,
          tickets.length
        ),
        color:
          PRIORITY_COLORS[label]
      })
    );
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const categoryCounts = {};

    tickets.forEach(ticket => {
      const category =
        String(
          ticket.category ||
            "Uncategorized"
        ).trim() ||
        "Uncategorized";

      categoryCounts[category] =
        (categoryCounts[category] || 0) +
        1;
    });

    return Object.entries(categoryCounts)
      .map(([label, value]) => ({
        label,
        value,
        percentage: percentage(
          value,
          tickets.length
        )
      }))
      .sort(
        (firstItem, secondItem) =>
          secondItem.value -
          firstItem.value
      )
      .slice(0, 5);
  }, [tickets]);

  const workloadItems = useMemo(() => {
    const workloadCounts = {};

    tickets.forEach(ticket => {
      const status =
        normalizeStatus(ticket.status);

      if (
        status === "resolved" ||
        status === "rejected"
      ) {
        return;
      }

      const employeeName =
        getAssignedEmployeeName(ticket);

      workloadCounts[employeeName] =
        (workloadCounts[employeeName] ||
          0) + 1;
    });

    const items = Object.entries(
      workloadCounts
    )
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort(
        (firstItem, secondItem) =>
          secondItem.value -
          firstItem.value
      )
      .slice(0, 6);

    const maximumValue = Math.max(
      ...items.map(item => item.value),
      1
    );

    return items.map(item => ({
      ...item,
      percentage: Math.round(
        (item.value / maximumValue) *
          100
      )
    }));
  }, [tickets]);

  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort(
        (
          firstTicket,
          secondTicket
        ) =>
          getTicketTimestamp(
            secondTicket
          ) -
          getTicketTimestamp(
            firstTicket
          )
      )
      .slice(0, 5);
  }, [tickets]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        label: "Create Request",
        description:
          "Submit a new company request.",
        path: "/requests/create",
        icon: CirclePlus,
        className: "primary"
      },
      {
        label: isManagement
          ? "View All Requests"
          : "View My Requests",
        description:
          "Review and manage request records.",
        path: "/requests",
        icon: ClipboardList,
        className: "blue"
      }
    ];

    if (
      isStaff ||
      isManagement
    ) {
      actions.push({
        label: "Assigned Tasks",
        description:
          "Open your assigned request queue.",
        path: "/tasks",
        icon: ClipboardCheck,
        className: "purple"
      });
    }

    if (isManagement) {
      actions.push({
        label: "View Reports",
        description:
          "Review request analytics and KPIs.",
        path: "/reports",
        icon: BarChart3,
        className: "green"
      });
    }

    return actions;
  }, [
    isManagement,
    isStaff
  ]);

  const displayName =
    user?.fullName ||
    user?.name ||
    "RequestFlow User";

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    "User";

  const { message, emoji } = getGreeting(
    currentDate.getHours()
  );

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <span className="page-eyebrow">
              OVERVIEW
            </span>

            <h1>
              {message}, {firstName} {emoji}
            </h1>

            <p>
              Loading your dashboard...
            </p>
          </div>
        </div>

        <StatCardsSkeleton count={4} />

        <div className="dashboard-loading-grid">
          <div className="dashboard-loading-card">
            <span className="rf-skeleton-block dashboard-loading-title" />
            <span className="rf-skeleton-block dashboard-loading-chart" />
          </div>

          <div className="dashboard-loading-card">
            <span className="rf-skeleton-block dashboard-loading-title" />

            {Array.from({
              length: 5
            }).map((_, index) => (
              <span
                key={index}
                className="rf-skeleton-block dashboard-loading-row"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header dashboard-advanced-header">
        <div>
          <span className="page-eyebrow">
            OVERVIEW
          </span>

          <h1>
            {message}, {firstName} {emoji}
          </h1>

          <p>
            {formatCurrentDate(
              currentDate
            )}
          </p>
        </div>

        <div className="dashboard-header-controls">
          <div className="dashboard-range-control">
            <CalendarRange
              size={17}
              className="dashboard-range-calendar"
              aria-hidden="true"
            />

            <select
              value={selectedRange}
              onChange={event =>
                setSelectedRange(
                  Number(
                    event.target.value
                  )
                )
              }
              aria-label="Select dashboard date range"
            >
              {RANGE_OPTIONS.map(
                option => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={17}
              className="dashboard-range-chevron"
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() =>
              loadTickets(true)
            }
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <LoaderCircle
                className="login-button-spinner"
                size={16}
              />
            ) : (
              <RefreshCw size={16} />
            )}

            <span>
              {isRefreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="dashboard-error-message"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              loadTickets(true)
            }
          >
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      )}

      <section className="dashboard-period-card">
        <div className="dashboard-period-icon">
          <CalendarRange size={22} />
        </div>

        <div className="dashboard-period-main">
          <span>
            Last {selectedRange} days
          </span>

          <strong>
            {
              periodMetrics.currentCreated
            }{" "}
            new requests
          </strong>

          <p>
            Compared with{" "}
            {
              periodMetrics.previousCreated
            }{" "}
            requests in the previous period.
          </p>
        </div>

        <TrendBadge
          trend={periodMetrics.trend}
        />

        <div className="dashboard-period-metrics">
          <div>
            <span>Resolved</span>

            <strong>
              {
                periodMetrics.resolvedInRange
              }
            </strong>
          </div>

          <div>
            <span>Urgent</span>

            <strong>
              {
                periodMetrics.urgentInRange
              }
            </strong>
          </div>

          <div>
            <span>Total Records</span>

            <strong>
              {statistics.total}
            </strong>
          </div>
        </div>
      </section>

      <div className="dashboard-stats-grid">
        <DashboardStatCard
          title="Open Requests"
          value={statistics.open}
          description="Waiting to be processed"
          footer={`${percentage(
            statistics.open,
            statistics.total
          )}% of all requests`}
          percentageValue={percentage(
            statistics.open,
            statistics.total
          )}
          variant="open"
          icon={CircleDot}
        />

        <DashboardStatCard
          title="In Progress"
          value={
            statistics.inProgress
          }
          description="Currently being processed"
          footer={`${percentage(
            statistics.inProgress,
            statistics.total
          )}% of all requests`}
          percentageValue={percentage(
            statistics.inProgress,
            statistics.total
          )}
          variant="in-progress"
          icon={Clock3}
        />

        <DashboardStatCard
          title="Resolved Requests"
          value={statistics.resolved}
          description="Successfully completed"
          footer={`${percentage(
            statistics.resolved,
            statistics.total
          )}% of all requests`}
          percentageValue={percentage(
            statistics.resolved,
            statistics.total
          )}
          variant="resolved"
          icon={CircleCheckBig}
        />

        <DashboardStatCard
          title="Estimated Overdue"
          value={statistics.overdue}
          description="Outside estimated response time"
          footer="Estimated from priority SLA"
          percentageValue={percentage(
            statistics.overdue,
            statistics.total
          )}
          variant="overdue"
          icon={AlertTriangle}
        />
      </div>

      <div className="dashboard-content-grid">
        <section className="dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <h2>
                Requests by Status
              </h2>

              <p>
                Current workflow distribution
              </p>
            </div>
          </div>

          <div className="dashboard-chart-content">
            <div
              className="dashboard-donut"
              style={{
                background:
                  donutBackground
              }}
            >
              <div className="dashboard-donut-center">
                <strong>
                  {statistics.total}
                </strong>

                <span>Total</span>
              </div>
            </div>

            <div className="dashboard-chart-legend">
              {statusItems.map(item => (
                <div
                  key={item.label}
                  className="dashboard-chart-legend-row"
                >
                  <span
                    className={`dashboard-chart-dot ${item.className}`}
                    style={{
                      backgroundColor:
                        item.color
                    }}
                  />

                  <div className="dashboard-chart-label">
                    <strong>
                      {item.label}
                    </strong>

                    <span>
                      {item.value}{" "}
                      {item.value === 1
                        ? "request"
                        : "requests"}
                    </span>
                  </div>

                  <strong className="dashboard-chart-percent">
                    {percentage(
                      item.value,
                      statistics.total
                    )}
                    %
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dashboard-recent-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Recent Requests</h2>

              <p>
                Most recently updated records
              </p>
            </div>

            <button
              type="button"
              className="dashboard-view-all-button"
              onClick={() =>
                navigate("/requests")
              }
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <div className="dashboard-empty-requests">
              <ClipboardList size={27} />

              <strong>
                No requests available
              </strong>

              <span>
                New request records will appear
                here.
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/requests/create"
                  )
                }
              >
                Create Request
              </button>
            </div>
          ) : (
            <div className="recent-requests-table-wrapper">
              <table className="recent-requests-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentTickets.map(
                    ticket => (
                      <tr key={ticket.id}>
                        <td>
                          <span className="dashboard-request-id">
                            #{ticket.id}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="dashboard-request-title"
                            onClick={() =>
                              navigate(
                                `/requests/edit/${ticket.id}`
                              )
                            }
                          >
                            {ticket.title ||
                              "Untitled Request"}
                          </button>
                        </td>

                        <td>
                          {ticket.category ||
                            "Not available"}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              ticket.status
                            )}`}
                          >
                            {ticket.status ||
                              "Open"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`priority-badge ${getPriorityClass(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority ||
                              "Medium"}
                          </span>
                        </td>

                        <td>
                          <time
                            className="dashboard-request-date"
                            dateTime={
                              ticket.updatedAt ||
                              ticket.createdAt ||
                              undefined
                            }
                          >
                            {formatTicketDate(
                              ticket.updatedAt ||
                                ticket.createdAt
                            )}
                          </time>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-insights-grid">
        <AnalyticsCard
          title="Priority Distribution"
          description="Requests grouped by priority level"
          icon={AlertTriangle}
          items={priorityBreakdown}
          emptyMessage="No priority data available."
          showColors
        />

        <AnalyticsCard
          title="Top Categories"
          description="Most frequently used request categories"
          icon={Tags}
          items={categoryBreakdown}
          emptyMessage="No category data available."
        />

        <section className="dashboard-quick-actions-card">
          <div className="dashboard-insight-header">
            <div className="dashboard-insight-icon quick">
              <CirclePlus size={19} />
            </div>

            <div>
              <h2>Quick Actions</h2>

              <p>
                Common RequestFlow operations
              </p>
            </div>
          </div>

          <div className="dashboard-quick-actions-list">
            {quickActions.map(action => {
              const Icon = action.icon;

              return (
                <button
                  type="button"
                  key={action.path}
                  className={`dashboard-quick-action ${action.className}`}
                  onClick={() =>
                    navigate(action.path)
                  }
                >
                  <div>
                    <Icon size={18} />
                  </div>

                  <span>
                    <strong>
                      {action.label}
                    </strong>

                    <small>
                      {action.description}
                    </small>
                  </span>

                  <ArrowRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {isManagement && (
        <section className="dashboard-workload-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Team Workload</h2>

              <p>
                Active requests by assigned employee
              </p>
            </div>

            <div className="dashboard-workload-summary">
              <UsersRound size={16} />

              <span>
                {workloadItems.length}{" "}
                {workloadItems.length === 1
                  ? "assignee"
                  : "assignees"}
              </span>
            </div>
          </div>

          {workloadItems.length === 0 ? (
            <div className="dashboard-workload-empty">
              No active assignments are available.
            </div>
          ) : (
            <div className="dashboard-workload-list">
              {workloadItems.map(item => (
                <div
                  key={item.name}
                  className="dashboard-workload-row"
                >
                  <div className="dashboard-workload-avatar">
                    {getInitials(
                      item.name
                    )}
                  </div>

                  <div className="dashboard-workload-content">
                    <div className="dashboard-workload-label">
                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.value} active{" "}
                        {item.value === 1
                          ? "request"
                          : "requests"}
                      </span>
                    </div>

                    <div className="dashboard-workload-progress">
                      <span
                        style={{
                          width: `${item.percentage}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DashboardStatCard({
  title,
  value,
  description,
  footer,
  percentageValue,
  variant,
  icon: Icon
}) {
  const progressValue = Math.min(
    Math.max(percentageValue, 0),
    100
  );

  return (
    <article
      className={`dashboard-stat-card ${variant}`}
    >
      <div className="dashboard-stat-accent" />

      <div className="dashboard-stat-top">
        <div>
          <span className="dashboard-stat-title">
            {title}
          </span>

          <strong className="dashboard-stat-value">
            {value}
          </strong>
        </div>

        <div className="dashboard-stat-icon">
          <Icon size={23} />
        </div>
      </div>

      <p className="dashboard-stat-description">
        {description}
      </p>

      <div className="dashboard-stat-progress">
        <span
          style={{
            width: `${progressValue}%`
          }}
        />
      </div>

      <span className="dashboard-stat-footer">
        {footer}
      </span>
    </article>
  );
}

function TrendBadge({ trend }) {
  const isPositive =
    trend.value > 0;

  const isNegative =
    trend.value < 0;

  const Icon = isNegative
    ? TrendingDown
    : TrendingUp;

  return (
    <div
      className={`dashboard-trend-badge ${
        isPositive
          ? "positive"
          : isNegative
            ? "negative"
            : "neutral"
      }`}
    >
      <Icon size={15} />
      <span>{trend.label}</span>
    </div>
  );
}

function AnalyticsCard({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  showColors = false
}) {
  const maximumValue = Math.max(
    ...items.map(item => item.value),
    1
  );

  return (
    <section className="dashboard-insight-card">
      <div className="dashboard-insight-header">
        <div className="dashboard-insight-icon">
          <Icon size={19} />
        </div>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-insight-empty">
          {emptyMessage}
        </div>
      ) : (
        <div className="dashboard-insight-list">
          {items.map(item => {
            const barWidth = Math.round(
              (item.value /
                maximumValue) *
                100
            );

            return (
              <div
                key={item.label}
                className="dashboard-insight-row"
              >
                <div className="dashboard-insight-label">
                  <span>
                    {showColors && (
                      <i
                        style={{
                          backgroundColor:
                            item.color
                        }}
                      />
                    )}

                    {item.label}
                  </span>

                  <strong>
                    {item.value}
                  </strong>
                </div>

                <div className="dashboard-insight-progress">
                  <span
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor:
                        showColors
                          ? item.color
                          : undefined
                    }}
                  />
                </div>

                <small>
                  {item.percentage}% of total
                </small>
              </div>
            );
          })}
        </div>
      )}
    </section>
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

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePriority(priority) {
  const normalized = String(
    priority || "Medium"
  )
    .trim()
    .toLowerCase();

  if (normalized === "low") {
    return "Low";
  }

  if (normalized === "high") {
    return "High";
  }

  if (normalized === "urgent") {
    return "Urgent";
  }

  return "Medium";
}

function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round(
    (value / total) * 100
  );
}

function calculateTrend(
  currentValue,
  previousValue
) {
  if (
    currentValue === 0 &&
    previousValue === 0
  ) {
    return {
      value: 0,
      label: "No change"
    };
  }

  if (previousValue === 0) {
    return {
      value: 100,
      label: "+100% increase"
    };
  }

  const value = Math.round(
    ((currentValue - previousValue) /
      previousValue) *
      100
  );

  if (value > 0) {
    return {
      value,
      label: `+${value}% increase`
    };
  }

  if (value < 0) {
    return {
      value,
      label: `${Math.abs(
        value
      )}% decrease`
    };
  }

  return {
    value: 0,
    label: "No change"
  };
}

function isDateWithinRange(
  dateValue,
  startDate,
  endDate,
  includeEnd = true
) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const timestamp =
    date.getTime();

  const startTimestamp =
    startDate.getTime();

  const endTimestamp =
    endDate.getTime();

  return (
    timestamp >= startTimestamp &&
    (includeEnd
      ? timestamp <= endTimestamp
      : timestamp < endTimestamp)
  );
}

function startOfDay(date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function isTicketOverdue(
  ticket,
  currentDate
) {
  const status =
    normalizeStatus(ticket.status);

  if (
    status === "resolved" ||
    status === "rejected"
  ) {
    return false;
  }

  if (!ticket.createdAt) {
    return false;
  }

  const createdDate =
    new Date(ticket.createdAt);

  if (
    Number.isNaN(
      createdDate.getTime()
    )
  ) {
    return false;
  }

  const priority =
    normalizePriority(
      ticket.priority
    );

  const deadline =
    createdDate.getTime() +
    PRIORITY_RESPONSE_HOURS[
      priority
    ] *
      60 *
      60 *
      1000;

  return (
    currentDate.getTime() >
    deadline
  );
}

function buildConicGradient(
  items,
  total
) {
  if (!total) {
    return "#e2e8f0";
  }

  const visibleItems =
    items.filter(item => item.value > 0);

  if (visibleItems.length === 0) {
    return "#e2e8f0";
  }

  let currentDegree = 0;

  const segments =
    visibleItems.map(
      (item, index) => {
        const segmentDegree =
          (item.value / total) * 360;

        const startDegree =
          currentDegree;

        let endDegree =
          currentDegree +
          segmentDegree;

        if (
          index ===
          visibleItems.length - 1
        ) {
          endDegree = 360;
        }

        currentDegree = endDegree;

        return `${item.color} ${startDegree}deg ${endDegree}deg`;
      }
    );

  return `conic-gradient(${segments.join(
    ", "
  )})`;
}

function getAssignedEmployeeName(ticket) {
  return (
    ticket?.assignedToUserName ||
    ticket?.assignedStaffName ||
    ticket?.assignedToName ||
    ticket?.assignedToUser?.fullName ||
    ticket?.assignedToUser?.name ||
    (ticket?.assignedToUserId
      ? `User #${ticket.assignedToUserId}`
      : "Unassigned")
  );
}

function getTicketTimestamp(ticket) {
  const date = new Date(
    ticket?.updatedAt ||
      ticket?.createdAt ||
      0
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return 0;
  }

  return date.getTime();
}

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function getGreeting(hour) {
  if (hour < 5) {
    return {
      message: "Good Night",
      emoji: "🌙"
    };
  }

  if (hour < 12) {
    return {
      message: "Good Morning",
      emoji: "👋"
    };
  }

  if (hour < 17) {
    return {
      message: "Good Afternoon",
      emoji: "☀️"
    };
  }

  if (hour < 21) {
    return {
      message: "Good Evening",
      emoji: "🌆"
    };
  }

  return {
    message: "Good Night",
    emoji: "🌙"
  };
}

function formatCurrentDate(date) {
  return date.toLocaleString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function formatTicketDate(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function getStatusClass(status) {
  return normalizeStatus(status)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPriorityClass(priority) {
  return normalizePriority(priority)
    .toLowerCase();
}

export default Dashboard;
