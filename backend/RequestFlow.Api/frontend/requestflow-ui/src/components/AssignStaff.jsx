import {
  useCallback,
  useEffect,
  useState
} from "react";
import {
  CheckCircle2,
  LoaderCircle,
  UserRoundPlus
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function AssignStaff({
  ticketId,
  assignedToUserId,
  onAssigned
}) {
  const { user } = useAuth();

  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] =
    useState(
      assignedToUserId
        ? String(assignedToUserId)
        : ""
    );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const normalizedRole = (user?.role || "User")
    .trim()
    .toLowerCase();

  const isManagement =
    normalizedRole === "admin" ||
    normalizedRole === "supervisor";

  const loadStaffUsers = useCallback(async () => {
    if (!isManagement) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/Users/staff");

      setStaffUsers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (requestError) {
      console.error(
        "Staff users could not be loaded:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Staff users could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, [isManagement]);

  useEffect(() => {
    loadStaffUsers();
  }, [loadStaffUsers]);

  useEffect(() => {
    setSelectedUserId(
      assignedToUserId
        ? String(assignedToUserId)
        : ""
    );
  }, [assignedToUserId]);

  const handleSaveAssignment = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    const assignedUserId = selectedUserId
      ? Number(selectedUserId)
      : null;

    try {
      const response = await api.patch(
        `/Tickets/${ticketId}/assign`,
        {
          assignedToUserId: assignedUserId
        }
      );

      setSuccessMessage(
        assignedUserId
          ? "Request assigned successfully."
          : "Request assignment was removed."
      );

      onAssigned?.({
        assignedToUserId:
          response.data?.assignedToUserId ??
          assignedUserId,
        assignedToName:
          response.data?.assignedToName || null
      });
    } catch (requestError) {
      console.error(
        "Request assignment could not be saved:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Request assignment could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isManagement) {
    return null;
  }

  return (
    <section className="assign-staff-card">
      <div className="assign-staff-header">
        <div className="assign-staff-header-icon">
          <UserRoundPlus size={22} />
        </div>

        <div>
          <h3>Assign Staff</h3>
          <p>
            Select the staff member responsible for
            this request.
          </p>
        </div>
      </div>

      <div className="assign-staff-content">
        <label htmlFor="assigned-staff">
          Assigned Staff Member
        </label>

        {isLoading ? (
          <div className="assign-staff-loading">
            <LoaderCircle
              className="login-button-spinner"
              size={18}
            />
            <span>Loading staff...</span>
          </div>
        ) : (
          <div className="assign-staff-actions">
            <select
              id="assigned-staff"
              value={selectedUserId}
              onChange={event => {
                setSelectedUserId(
                  event.target.value
                );
                setError("");
                setSuccessMessage("");
              }}
              disabled={isSaving}
            >
              <option value="">Unassigned</option>

              {staffUsers.map(staffUser => (
                <option
                  key={staffUser.id}
                  value={staffUser.id}
                >
                  {staffUser.fullName} —{" "}
                  {staffUser.email}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="assign-staff-save-button"
              onClick={handleSaveAssignment}
              disabled={isSaving}
            >
              {isSaving ? (
                <LoaderCircle
                  className="login-button-spinner"
                  size={15}
                />
              ) : (
                <UserRoundPlus size={15} />
              )}

              <span>
                {isSaving
                  ? "Saving..."
                  : "Save Assignment"}
              </span>
            </button>
          </div>
        )}

        {error && (
          <span className="assign-staff-error">
            {error}
          </span>
        )}

        {successMessage && (
          <span className="assign-staff-success">
            <CheckCircle2 size={14} />
            {successMessage}
          </span>
        )}
      </div>
    </section>
  );
}

export default AssignStaff;