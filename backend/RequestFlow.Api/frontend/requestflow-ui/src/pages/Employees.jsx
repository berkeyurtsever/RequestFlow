import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import {
  StatCardsSkeleton,
  TableSkeleton
} from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const roleOptions = [
  "Admin",
  "Supervisor",
  "Staff",
  "User"
];

const DEFAULT_SORT_CONFIG = {
  key: "name",
  direction: "asc"
};

function Employees() {
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const [employees, setEmployees] =
    useState([]);

  const [selectedRoles, setSelectedRoles] =
    useState({});

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedRoleFilter,
    setSelectedRoleFilter
  ] = useState("All");

  const [sortConfig, setSortConfig] =
    useState(DEFAULT_SORT_CONFIG);

  const [
    updatingUserId,
    setUpdatingUserId
  ] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const currentUserId = Number(
    currentUser?.id ||
      currentUser?.userId ||
      currentUser?.sub
  );

  const loadEmployees = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response =
          await api.get("/Users");

        const userList = Array.isArray(
          response.data
        )
          ? response.data
          : Array.isArray(
                response.data?.users
              )
            ? response.data.users
            : [];

        setEmployees(userList);

        const roles = {};

        userList.forEach(employee => {
          roles[employee.id] =
            normalizeRole(
              employee.role
            );
        });

        setSelectedRoles(roles);
      } catch (requestError) {
        console.error(
          "Employees could not be loaded:",
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
            "You do not have permission to view employees."
          );
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              "Employees could not be loaded. Check the backend connection."
          );
        }

        setEmployees([]);
        setSelectedRoles({});
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const statistics = useMemo(() => {
    const result = {
      total: employees.length,
      administrators: 0,
      managementAndStaff: 0,
      standardUsers: 0
    };

    employees.forEach(employee => {
      const role = normalizeRole(
        employee.role
      );

      if (role === "Admin") {
        result.administrators += 1;
      } else if (
        role === "Supervisor" ||
        role === "Staff"
      ) {
        result.managementAndStaff += 1;
      } else {
        result.standardUsers += 1;
      }
    });

    return result;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch =
      searchText
        .trim()
        .toLowerCase();

    return employees.filter(employee => {
      const fullName =
        getFullName(employee)
          .toLowerCase();

      const email = String(
        employee.email || ""
      ).toLowerCase();

      const role = normalizeRole(
        employee.role
      );

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(
          normalizedSearch
        ) ||
        email.includes(
          normalizedSearch
        );

      const matchesRole =
        selectedRoleFilter === "All" ||
        role === selectedRoleFilter;

      return (
        matchesSearch &&
        matchesRole
      );
    });
  }, [
    employees,
    searchText,
    selectedRoleFilter
  ]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort(
      (
        firstEmployee,
        secondEmployee
      ) =>
        compareEmployees(
          firstEmployee,
          secondEmployee,
          sortConfig.key,
          sortConfig.direction
        )
    );
  }, [
    filteredEmployees,
    sortConfig
  ]);

  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedRoleFilter !== "All";

  const handleSort = key => {
    setSortConfig(
      previousConfig => {
        if (
          previousConfig.key === key
        ) {
          return {
            key,
            direction:
              previousConfig.direction ===
              "asc"
                ? "desc"
                : "asc"
          };
        }

        return {
          key,
          direction:
            getDefaultSortDirection(key)
        };
      }
    );
  };

  const handleRoleSelection = (
    employeeId,
    newRole
  ) => {
    setSelectedRoles(
      previousRoles => ({
        ...previousRoles,
        [employeeId]: newRole
      })
    );
  };

  const handleUpdateRole =
    async employee => {
      const employeeId =
        employee.id;

      const employeeName =
        getFullName(employee);

      const currentRole =
        normalizeRole(
          employee.role
        );

      const newRole =
        selectedRoles[employeeId] ||
        currentRole;

      if (
        Number(employeeId) ===
        currentUserId
      ) {
        showError(
          "You cannot change your own account role."
        );

        setSelectedRoles(
          previousRoles => ({
            ...previousRoles,
            [employeeId]:
              currentRole
          })
        );

        return;
      }

      if (newRole === currentRole) {
        return;
      }

      const confirmed =
        await confirm({
          title:
            "Change user role?",
          message: `${employeeName}'s role will be changed from ${currentRole} to ${newRole}. This may change the pages and actions available to this user.`,
          confirmText:
            "Change Role",
          cancelText: "Cancel",
          variant: "warning"
        });

      if (!confirmed) {
        setSelectedRoles(
          previousRoles => ({
            ...previousRoles,
            [employeeId]:
              currentRole
          })
        );

        return;
      }

      setUpdatingUserId(employeeId);

      try {
        const response =
          await api.patch(
            `/Users/${employeeId}/role`,
            {
              role: newRole
            }
          );

        const updatedEmployee =
          response.data?.user ||
          response.data?.employee ||
          response.data;

        setEmployees(
          previousEmployees =>
            previousEmployees.map(
              currentEmployee => {
                if (
                  Number(
                    currentEmployee.id
                  ) !==
                  Number(employeeId)
                ) {
                  return currentEmployee;
                }

                return {
                  ...currentEmployee,
                  ...(updatedEmployee &&
                  typeof updatedEmployee ===
                    "object"
                    ? updatedEmployee
                    : {}),
                  role: newRole
                };
              }
            )
        );

        setSelectedRoles(
          previousRoles => ({
            ...previousRoles,
            [employeeId]: newRole
          })
        );

        success(
          `${employeeName}'s role was updated to ${newRole}.`
        );
      } catch (requestError) {
        console.error(
          "Employee role could not be updated:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 400) {
          showError(
            requestError.response?.data
              ?.message ||
              "The selected role is not valid."
          );
        } else if (status === 401) {
          showError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          showError(
            "You do not have permission to change user roles."
          );
        } else if (status === 404) {
          showError(
            "The selected employee could not be found."
          );
        } else if (status === 405) {
          showError(
            "The role update endpoint does not accept PATCH requests. Check UsersController."
          );
        } else {
          showError(
            requestError.response?.data
              ?.message ||
              "The employee role could not be updated."
          );
        }

        setSelectedRoles(
          previousRoles => ({
            ...previousRoles,
            [employeeId]:
              currentRole
          })
        );
      } finally {
        setUpdatingUserId(null);
      }
    };

  const clearFilters = () => {
    setSearchText("");
    setSelectedRoleFilter("All");
    setSortConfig(
      DEFAULT_SORT_CONFIG
    );
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <div>
          <span className="page-eyebrow">
            MANAGEMENT
          </span>

          <h1>Employees</h1>

          <p>
            View registered users, sort records
            and manage account roles.
          </p>
        </div>

        <button
          type="button"
          className="page-refresh-button"
          onClick={() =>
            loadEmployees(true)
          }
          disabled={
            isLoading ||
            isRefreshing
          }
        >
          <RefreshCw
            size={16}
            className={
              isRefreshing
                ? "login-button-spinner"
                : ""
            }
          />

          <span>
            {isRefreshing
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>
      </div>

      {error && !isLoading && (
        <div
          className="request-page-error"
          role="alert"
        >
          <div className="employees-error-content">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              loadEmployees(true)
            }
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="employees-stats-grid">
          <EmployeeStatCard
            title="Total Users"
            value={statistics.total}
            icon={UsersRound}
          />

          <EmployeeStatCard
            title="Administrators"
            value={
              statistics.administrators
            }
            icon={ShieldCheck}
          />

          <EmployeeStatCard
            title="Management & Staff"
            value={
              statistics.managementAndStaff
            }
            icon={UserRound}
          />

          <EmployeeStatCard
            title="Standard Users"
            value={
              statistics.standardUsers
            }
            icon={UserRound}
          />
        </div>
      )}

      <div
        className={`employees-toolbar ${
          isLoading
            ? "is-disabled"
            : ""
        }`}
      >
        <div className="employees-search-wrapper">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchText}
            onChange={event =>
              setSearchText(
                event.target.value
              )
            }
            disabled={isLoading}
          />

          {searchText && (
            <button
              type="button"
              className="employees-search-clear"
              onClick={() =>
                setSearchText("")
              }
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <select
          value={
            selectedRoleFilter
          }
          onChange={event =>
            setSelectedRoleFilter(
              event.target.value
            )
          }
          aria-label="Filter employees by role"
          disabled={isLoading}
        >
          <option value="All">
            All Roles
          </option>

          <option value="Admin">
            Admin
          </option>

          <option value="Supervisor">
            Supervisor
          </option>

          <option value="Staff">
            Staff
          </option>

          <option value="User">
            User
          </option>
        </select>

        {hasActiveFilters &&
          !isLoading && (
            <button
              type="button"
              className="employees-clear-filter-button"
              onClick={clearFilters}
            >
              <X size={15} />
              <span>
                Clear Filters
              </span>
            </button>
          )}
      </div>

      <div className="employees-table-card">
        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={7}
            showToolbar={false}
          />
        ) : error ? (
          <div className="employees-empty-state">
            <AlertCircle size={30} />

            <h2>
              Employees could not be
              loaded
            </h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                loadEmployees(true)
              }
            >
              Try Again
            </button>
          </div>
        ) : sortedEmployees.length ===
          0 ? (
          <EmptyState
            icon={UsersRound}
            title="No employees found"
            description={
              hasActiveFilters
                ? "No users match the current search text and role filter. Try changing or clearing the filters."
                : "There are no registered users available."
            }
            actionText={
              hasActiveFilters
                ? "Clear Filters"
                : undefined
            }
            onAction={
              hasActiveFilters
                ? clearFilters
                : undefined
            }
          />
        ) : (
          <div className="employees-table-wrapper">
            <table className="employees-table">
              <caption className="rf-visually-hidden">
                Employees, account roles and status
              </caption>

              <thead>
                <tr>
                  <EmployeeSortableHeader
                    label="Employee"
                    columnKey="name"
                    sortConfig={
                      sortConfig
                    }
                    onSort={
                      handleSort
                    }
                  />

                  <EmployeeSortableHeader
                    label="Email Address"
                    columnKey="email"
                    sortConfig={
                      sortConfig
                    }
                    onSort={
                      handleSort
                    }
                  />

                  <EmployeeSortableHeader
                    label="Current Role"
                    columnKey="role"
                    sortConfig={
                      sortConfig
                    }
                    onSort={
                      handleSort
                    }
                  />

                  <th scope="col">Change Role</th>

                  <EmployeeSortableHeader
                    label="Status"
                    columnKey="status"
                    sortConfig={
                      sortConfig
                    }
                    onSort={
                      handleSort
                    }
                  />

                  <EmployeeSortableHeader
                    label="Created"
                    columnKey="createdAt"
                    sortConfig={
                      sortConfig
                    }
                    onSort={
                      handleSort
                    }
                  />

                  <th scope="col">Action</th>
                </tr>
              </thead>

              <tbody>
                {sortedEmployees.map(
                  employee => {
                    const employeeId =
                      Number(
                        employee.id
                      );

                    const currentRole =
                      normalizeRole(
                        employee.role
                      );

                    const selectedRole =
                      selectedRoles[
                        employee.id
                      ] || currentRole;

                    const isCurrentUser =
                      employeeId ===
                      currentUserId;

                    const roleHasChanged =
                      selectedRole !==
                      currentRole;

                    const isUpdating =
                      Number(
                        updatingUserId
                      ) === employeeId;

                    const isActive =
                      employee.isActive !==
                      false;

                    return (
                      <tr key={employee.id}>
                        <td data-label="Employee">
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {getInitials(
                                getFullName(
                                  employee
                                )
                              )}
                            </div>

                            <div className="employee-cell-info">
                              <strong>
                                {getFullName(
                                  employee
                                )}
                              </strong>

                              <span>
                                User #
                                {employee.id}

                                {isCurrentUser
                                  ? " · Your account"
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td data-label="Email Address">
                          {employee.email ||
                            "Not available"}
                        </td>

                        <td data-label="Current Role">
                          <span
                            className={`role-badge ${currentRole.toLowerCase()}`}
                          >
                            {currentRole}
                          </span>
                        </td>

                        <td data-label="Change Role">
                          <div className="employee-role-control">
                            <select
                              className="employee-role-select"
                              aria-label={`Change role for ${getFullName(
                                employee
                              )}`}
                              value={
                                selectedRole
                              }
                              onChange={event =>
                                handleRoleSelection(
                                  employee.id,
                                  event.target
                                    .value
                                )
                              }
                              disabled={
                                isCurrentUser ||
                                isUpdating
                              }
                            >
                              {roleOptions.map(
                                role => (
                                  <option
                                    key={role}
                                    value={role}
                                  >
                                    {role}
                                  </option>
                                )
                              )}
                            </select>

                            {isCurrentUser && (
                              <span className="employee-role-note">
                                Your role cannot
                                be changed.
                              </span>
                            )}
                          </div>
                        </td>

                        <td data-label="Status">
                          <span
                            className={`employee-status-badge ${
                              isActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td data-label="Created">
                          {formatDate(
                            employee.createdAt
                          )}
                        </td>

                        <td data-label="Action">
                          <button
                            type="button"
                            className="update-role-button"
                            onClick={() =>
                              handleUpdateRole(
                                employee
                              )
                            }
                            disabled={
                              isCurrentUser ||
                              !roleHasChanged ||
                              isUpdating
                            }
                          >
                            {isUpdating ? (
                              <>
                                <LoaderCircle
                                  className="login-button-spinner"
                                  size={14}
                                />

                                <span>
                                  Updating...
                                </span>
                              </>
                            ) : (
                              <span>
                                Update Role
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeSortableHeader({
  label,
  columnKey,
  sortConfig,
  onSort
}) {
  const isActive =
    sortConfig.key === columnKey;

  const ariaSort = !isActive
    ? "none"
    : sortConfig.direction ===
        "asc"
      ? "ascending"
      : "descending";

  let SortIcon = ArrowUpDown;

  if (isActive) {
    SortIcon =
      sortConfig.direction ===
      "asc"
        ? ArrowUp
        : ArrowDown;
  }

  return (
    <th scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className={`employees-sort-button ${
          isActive ? "active" : ""
        }`}
        onClick={() =>
          onSort(columnKey)
        }
        title={`Sort by ${label}`}
      >
        <span>{label}</span>

        <SortIcon
          size={13}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function EmployeeStatCard({
  title,
  value,
  icon: Icon
}) {
  return (
    <article className="employee-stat-card">
      <div className="employee-stat-icon">
        <Icon size={22} />
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function compareEmployees(
  firstEmployee,
  secondEmployee,
  key,
  direction
) {
  let comparison = 0;

  if (key === "name") {
    comparison = compareText(
      getFullName(firstEmployee),
      getFullName(secondEmployee)
    );
  } else if (key === "email") {
    comparison = compareText(
      firstEmployee.email,
      secondEmployee.email
    );
  } else if (key === "role") {
    comparison =
      getRoleOrder(
        firstEmployee.role
      ) -
      getRoleOrder(
        secondEmployee.role
      );
  } else if (key === "status") {
    comparison =
      getEmployeeStatusOrder(
        firstEmployee
      ) -
      getEmployeeStatusOrder(
        secondEmployee
      );
  } else if (key === "createdAt") {
    comparison =
      getDateTimestamp(
        firstEmployee.createdAt
      ) -
      getDateTimestamp(
        secondEmployee.createdAt
      );
  }

  if (comparison === 0) {
    comparison =
      Number(
        firstEmployee.id || 0
      ) -
      Number(
        secondEmployee.id || 0
      );
  }

  return direction === "asc"
    ? comparison
    : comparison * -1;
}

function compareText(
  firstValue,
  secondValue
) {
  return String(firstValue || "")
    .localeCompare(
      String(secondValue || ""),
      "en",
      {
        numeric: true,
        sensitivity: "base"
      }
    );
}

function getRoleOrder(role) {
  const roleOrder = {
    Admin: 1,
    Supervisor: 2,
    Staff: 3,
    User: 4
  };

  return (
    roleOrder[
      normalizeRole(role)
    ] || 5
  );
}

function getEmployeeStatusOrder(
  employee
) {
  return employee?.isActive ===
    false
    ? 2
    : 1;
}

function getDefaultSortDirection(
  key
) {
  if (key === "createdAt") {
    return "desc";
  }

  return "asc";
}

function getDateTimestamp(dateValue) {
  if (!dateValue) {
    return 0;
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return 0;
  }

  return date.getTime();
}

function getFullName(employee) {
  return (
    employee?.fullName ||
    employee?.name ||
    employee?.userName ||
    "Unknown User"
  );
}

function getInitials(fullName) {
  return String(fullName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part
        .charAt(0)
        .toUpperCase()
    )
    .join("");
}

function normalizeRole(role) {
  const normalizedRole = String(
    role || "User"
  )
    .trim()
    .toLowerCase();

  if (
    normalizedRole === "admin"
  ) {
    return "Admin";
  }

  if (
    normalizedRole ===
    "supervisor"
  ) {
    return "Supervisor";
  }

  if (
    normalizedRole === "staff"
  ) {
    return "Staff";
  }

  return "User";
}

function formatDate(dateValue) {
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

export default Employees;
