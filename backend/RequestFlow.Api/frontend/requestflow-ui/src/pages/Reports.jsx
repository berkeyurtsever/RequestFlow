import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../services/api";

const emptyReport = {
  totalRequests: 0,
  openRequests: 0,
  inProgressRequests: 0,
  pendingRequests: 0,
  completedRequests: 0,
  rejectedRequests: 0,
  overdueRequests: 0,
  dueSoonRequests: 0,
  averageResolutionHours: 0,
  statusData: [],
  categoryData: [],
  priorityData: [],
  recentRequests: []
};

const chartColors = {
  open: "#2563eb",
  "in progress": "#7c3aed",
  pending: "#f59e0b",
  resolved: "#22c55e",
  completed: "#22c55e",
  rejected: "#ef4444",
  unknown: "#94a3b8"
};

function Reports() {
  const navigate = useNavigate();

  const [report, setReport] = useState(emptyReport);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const loadReports = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await api.get("/Reports");

        setReport({
          ...emptyReport,
          ...response.data,
          statusData: Array.isArray(
            response.data?.statusData
          )
            ? response.data.statusData
            : [],
          categoryData: Array.isArray(
            response.data?.categoryData
          )
            ? response.data.categoryData
            : [],
          priorityData: Array.isArray(
            response.data?.priorityData
          )
            ? response.data.priorityData
            : [],
          recentRequests: Array.isArray(
            response.data?.recentRequests
          )
            ? response.data.recentRequests
            : []
        });
      } catch (requestError) {
        console.error(
          "Reports could not be loaded:",
          requestError
        );

        const status =
          requestError.response?.status;

        const message =
          requestError.response?.data?.message;

        if (status === 401) {
          setError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          setError(
            "Only administrators and supervisors can view reports."
          );
        } else {
          setError(
            message ||
              "Reports could not be loaded. Check the backend connection."
          );
        }

        setReport(emptyReport);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const statusData = useMemo(() => {
    return report.statusData.map(item => ({
      name: item.name || "Unknown",
      value: Number(item.value) || 0,
      color: getStatusColor(item.name)
    }));
  }, [report.statusData]);

  const categoryData = useMemo(() => {
    return [...report.categoryData]
      .map(item => ({
        name: shortenText(
          item.name || "Uncategorized",
          18
        ),
        fullName:
          item.name || "Uncategorized",
        requests:
          Number(item.requests) || 0
      }))
      .sort(
        (first, second) =>
          second.requests - first.requests
      )
      .slice(0, 8);
  }, [report.categoryData]);

  const totalStatusRequests = statusData.reduce(
    (total, item) => total + item.value,
    0
  );

  const handleExportCsv = () => {
    const rows = [
      ["RequestFlow Reports"],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["Summary"],
      ["Total Requests", report.totalRequests],
      ["Open Requests", report.openRequests],
      [
        "In Progress Requests",
        report.inProgressRequests
      ],
      ["Pending Requests", report.pendingRequests],
      [
        "Resolved Requests",
        report.completedRequests
      ],
      ["Rejected Requests", report.rejectedRequests],
      [
        "Average Resolution Hours",
        report.averageResolutionHours
      ],
      [],
      ["Status Distribution"],
      ["Status", "Request Count"],
      ...report.statusData.map(item => [
        item.name,
        item.value
      ]),
      [],
      ["Category Distribution"],
      ["Category", "Request Count"],
      ...report.categoryData.map(item => [
        item.name,
        item.requests
      ]),
      [],
      ["Recent Requests"],
      [
        "ID",
        "Title",
        "Category",
        "Status",
        "Priority",
        "Created"
      ],
      ...report.recentRequests.map(request => [
        request.id,
        request.title,
        request.category,
        request.status,
        request.priority,
        formatDate(request.createdAt)
      ])
    ];

    const csvContent = rows
      .map(row =>
        row.map(value => escapeCsvValue(value)).join(",")
      )
      .join("\n");

    const csvBlob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const downloadUrl =
      URL.createObjectURL(csvBlob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download =
      `requestflow-report-${getFileDate()}.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);

    try {
      const response = await api.get("/Reports/pdf", {
        responseType: "blob"
      });
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download =
        `requestflow-report-${getFileDate()}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (requestError) {
      console.error("PDF report could not be exported:", requestError);
      setError("PDF report could not be exported.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="reports-loading">
        <LoaderCircle
          className="login-button-spinner"
          size={31}
        />

        <span>Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <header className="reports-page-header">
        <div>
          <span className="reports-eyebrow">
            MANAGEMENT
          </span>

          <h1>Reports & Analytics</h1>

          <p>
            Monitor request performance and system
            statistics.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="reports-refresh-button"
            onClick={handleExportPdf}
            disabled={report.totalRequests === 0 || isExportingPdf}
          >
            <FileText size={16} />
            <span>{isExportingPdf ? "Preparing PDF..." : "Export PDF"}</span>
          </button>

          <button
            type="button"
            className="reports-refresh-button"
            onClick={() => loadReports(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              size={16}
              className={
                isRefreshing
                  ? "reports-refreshing-icon"
                  : ""
              }
            />

            <span>
              {isRefreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            className="reports-export-button"
            onClick={handleExportCsv}
            disabled={report.totalRequests === 0}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="reports-error" role="alert">
          <div>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => loadReports(true)}
          >
            Try Again
          </button>
        </div>
      )}

      <section className="reports-summary-grid">
        <ReportSummaryCard
          title="Total Requests"
          value={report.totalRequests}
          description="All requests in the system"
          icon={FileText}
          variant="total"
        />

        <ReportSummaryCard
          title="Open Requests"
          value={report.openRequests}
          description={`${report.inProgressRequests} currently in progress`}
          icon={AlertCircle}
          variant="open"
        />

        <ReportSummaryCard
          title="Resolved Requests"
          value={report.completedRequests}
          description={getResolvedPercentage(
            report.completedRequests,
            report.totalRequests
          )}
          icon={CheckCircle2}
          variant="resolved"
        />

        <ReportSummaryCard
          title="Overdue SLA"
          value={report.overdueRequests}
          description={`${report.dueSoonRequests} due within 8 hours`}
          icon={Clock3}
          variant="overdue"
        />

        <ReportSummaryCard
          title="Average Resolution"
          value={formatAverageTime(
            report.averageResolutionHours
          )}
          description="Based on resolved requests"
          icon={Clock3}
          variant="time"
          textValue
        />
      </section>

      <section className="reports-chart-grid">
        <article className="reports-chart-card">
          <div className="reports-card-heading">
            <div>
              <h2>Requests by Status</h2>
              <p>
                Distribution of requests by current
                workflow status.
              </p>
            </div>

            <BarChart3 size={20} />
          </div>

          {statusData.length === 0 ? (
            <ReportsEmptyState
              message="No status data is available."
            />
          ) : (
            <div className="reports-status-content">
              <div className="reports-pie-wrapper">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={98}
                      paddingAngle={1}
                      stroke="none"
                    >
                      {statusData.map(item => (
                        <Cell
                          key={item.name}
                          fill={item.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={value => [
                        `${value} requests`,
                        "Count"
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="reports-pie-center">
                  <strong>
                    {totalStatusRequests}
                  </strong>
                  <span>Total</span>
                </div>
              </div>

              <div className="reports-status-legend">
                {statusData.map(item => {
                  const percentage =
                    totalStatusRequests === 0
                      ? 0
                      : Math.round(
                          (item.value /
                            totalStatusRequests) *
                            100
                        );

                  return (
                    <div
                      className="reports-legend-row"
                      key={item.name}
                    >
                      <span
                        className="reports-legend-color"
                        style={{
                          backgroundColor: item.color
                        }}
                      />

                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.value}{" "}
                          {item.value === 1
                            ? "request"
                            : "requests"}
                        </span>
                      </div>

                      <b>{percentage}%</b>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>

        <article className="reports-chart-card">
          <div className="reports-card-heading">
            <div>
              <h2>Requests by Category</h2>
              <p>
                Categories with the highest number of
                requests.
              </p>
            </div>

            <BarChart3 size={20} />
          </div>

          {categoryData.length === 0 ? (
            <ReportsEmptyState
              message="No category data is available."
            />
          ) : (
            <div className="reports-bar-wrapper">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={categoryData}
                  margin={{
                    top: 12,
                    right: 12,
                    left: -18,
                    bottom: 15
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 10
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(37, 99, 235, 0.05)"
                    }}
                    formatter={value => [
                      `${value} requests`,
                      "Count"
                    ]}
                    labelFormatter={(
                      label,
                      payload
                    ) =>
                      payload?.[0]?.payload
                        ?.fullName || label
                    }
                  />

                  <Bar
                    dataKey="requests"
                    fill="#2563eb"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="reports-recent-card">
        <div className="reports-recent-header">
          <div>
            <h2>Recent Requests</h2>
            <p>
              The latest requests included in the
              report.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/requests")}
          >
            View All
          </button>
        </div>

        {report.recentRequests.length === 0 ? (
          <ReportsEmptyState
            message="No recent requests were found."
          />
        ) : (
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {report.recentRequests.map(request => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>

                    <td>
                      <strong>
                        {request.title}
                      </strong>
                    </td>

                    <td>{request.category}</td>

                    <td>
                      <span
                        className={`reports-status-badge ${getClassName(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`reports-priority-badge ${getClassName(
                          request.priority
                        )}`}
                      >
                        {request.priority}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        request.createdAt
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="reports-view-button"
                        onClick={() =>
                          navigate(
                            `/requests/edit/${request.id}`
                          )
                        }
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportSummaryCard({
  title,
  value,
  description,
  icon: Icon,
  variant,
  textValue = false
}) {
  return (
    <article
      className={`reports-summary-card ${variant}`}
    >
      <div className="reports-summary-icon">
        <Icon size={23} />
      </div>

      <div>
        <span>{title}</span>

        <strong
          className={
            textValue
              ? "reports-summary-text-value"
              : ""
          }
        >
          {value}
        </strong>

        <p>{description}</p>
      </div>
    </article>
  );
}

function ReportsEmptyState({ message }) {
  return (
    <div className="reports-empty-state">
      <BarChart3 size={29} />
      <span>{message}</span>
    </div>
  );
}

function getStatusColor(status) {
  const normalizedStatus = (
    status || "unknown"
  )
    .trim()
    .toLowerCase();

  return (
    chartColors[normalizedStatus] ||
    chartColors.unknown
  );
}

function getResolvedPercentage(
  resolvedRequests,
  totalRequests
) {
  if (!totalRequests) {
    return "0% of all requests";
  }

  const percentage = Math.round(
    (resolvedRequests / totalRequests) * 100
  );

  return `${percentage}% of all requests`;
}

function formatAverageTime(hours) {
  const numericHours = Number(hours) || 0;

  if (numericHours <= 0) {
    return "Not available";
  }

  if (numericHours < 24) {
    return `${numericHours} hrs`;
  }

  const days = Math.round(
    (numericHours / 24) * 10
  ) / 10;

  return `${days} days`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function shortenText(value, maximumLength) {
  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(
    0,
    maximumLength - 1
  )}…`;
}

function getClassName(value) {
  return (value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function escapeCsvValue(value) {
  const textValue =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${textValue.replace(/"/g, '""')}"`;
}

function getFileDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

export default Reports;
