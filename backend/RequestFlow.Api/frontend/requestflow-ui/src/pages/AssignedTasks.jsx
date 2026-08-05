import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertCircle,
  ClipboardCheck,
  LoaderCircle,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AssignedTasks() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssignedTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/Tickets");

      const ticketList = Array.isArray(response.data)
        ? response.data
        : [];

      setTickets(ticketList);
    } catch (requestError) {
      console.error(
        "Assigned tasks could not be loaded:",
        requestError
      );

      if (requestError.response?.status === 401) {
        setError(
          "Your session has expired. Please sign in again."
        );
      } else if (requestError.response?.status === 403) {
        setError(
          "You do not have permission to view assigned tasks."
        );
      } else {
        setError(
          requestError.response?.data?.message ||
            "Assigned tasks could not be loaded. Check the backend connection."
        );
      }

      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedTasks();
  }, [loadAssignedTasks]);

  const assignedTasks = useMemo(() => {
    return tickets
      .filter(ticket => ticket.assignedToUserId)
      .sort((firstTicket, secondTicket) => {
        const firstDate = new Date(
          firstTicket.createdAt || 0
        ).getTime();

        const secondDate = new Date(
          secondTicket.createdAt || 0
        ).getTime();

        return secondDate - firstDate;
      });
  }, [tickets]);

  if (isLoading) {
    return (
      <div className="request-page-loading">
        <LoaderCircle
          className="login-button-spinner"
          size={30}
        />

        <span>Loading assigned tasks...</span>
      </div>
    );
  }

  return (
    <div className="assigned-tasks-page">
      <div className="assigned-tasks-header">
        <div>
          <span className="page-eyebrow">
            WORKSPACE
          </span>

          <h1>Assigned Tasks</h1>

          <p>
            View requests currently assigned to staff
            members.
          </p>
        </div>

        <button
          type="button"
          className="page-refresh-button"
          onClick={loadAssignedTasks}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div
          className="request-page-error"
          role="alert"
        >
          <div className="assigned-tasks-error-content">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={loadAssignedTasks}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      <div className="assigned-tasks-summary-card">
        <div className="assigned-tasks-summary-icon">
          <ClipboardCheck size={23} />
        </div>

        <div>
          <span>Total Assigned Tasks</span>
          <strong>{assignedTasks.length}</strong>
        </div>
      </div>

      <div className="assigned-tasks-table-card">
        {assignedTasks.length === 0 ? (
          <div className="assigned-tasks-empty-state">
            <div className="assigned-tasks-empty-icon">
              <ClipboardCheck size={27} />
            </div>

            <h2>No assigned tasks found</h2>

            <p>
              Requests assigned to staff members will
              appear here.
            </p>
          </div>
        ) : (
          <div className="assigned-tasks-table-wrapper">
            <table className="assigned-tasks-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned Staff</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {assignedTasks.map(ticket => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>#{ticket.id}</strong>
                    </td>

                    <td>
                      <div className="task-title">
                        <strong>
                          {ticket.title ||
                            "Untitled Request"}
                        </strong>

                        <span>
                          {getShortDescription(
                            ticket.description
                          )}
                        </span>
                      </div>
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
                        {ticket.status || "Open"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`priority-badge ${getPriorityClass(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority || "Medium"}
                      </span>
                    </td>

                    <td>
                      {getAssignedStaff(ticket)}
                    </td>

                    <td>
                      {formatDate(ticket.createdAt)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="task-view-button"
                        onClick={() =>
                          navigate(
                            `/requests/edit/${ticket.id}`
                          )
                        }
                      >
                        View Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getAssignedStaff(ticket) {
  if (ticket.assignedToName) {
    return ticket.assignedToName;
  }

  if (ticket.assignedToUser?.fullName) {
    return ticket.assignedToUser.fullName;
  }

  if (ticket.assignedToUserId) {
    return `User #${ticket.assignedToUserId}`;
  }

  return "Unassigned";
}

function getShortDescription(description) {
  if (!description) {
    return "No description provided.";
  }

  if (description.length <= 65) {
    return description;
  }

  return `${description.slice(0, 65)}...`;
}

function normalizeValue(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getStatusClass(status) {
  return normalizeValue(status || "Open");
}

function getPriorityClass(priority) {
  return normalizeValue(priority || "Medium");
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

export default AssignedTasks;