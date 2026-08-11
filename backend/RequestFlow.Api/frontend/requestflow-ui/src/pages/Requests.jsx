import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CirclePlus,
  Filter,
  Inbox,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  UserRound,
  UsersRound,
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
  useNavigate,
  useSearchParams
} from "react-router-dom";
import EmptyState from "../components/EmptyState";
import {
  TableSkeleton
} from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const ITEMS_PER_PAGE = 7;

const statusOptions = [
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Rejected"
];

const priorityOptions = [
  "Low",
  "Medium",
  "High",
  "Urgent"
];

const priorityOrder = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4
};

const statusOrder = {
  open: 1,
  "in progress": 2,
  pending: 3,
  resolved: 4,
  rejected: 5
};

function Requests() {
  const navigate = useNavigate();

  const [
    searchParams,
    setSearchParams
  ] = useSearchParams();

  const { user } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const [tickets, setTickets] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [loadError, setLoadError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState(
      searchParams.get("search") || ""
    );

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [priorityFilter, setPriorityFilter] =
    useState("All");

  const [ownerFilter, setOwnerFilter] =
    useState("All");

  const [assigneeFilter, setAssigneeFilter] =
    useState("All");

  const [createdFrom, setCreatedFrom] =
    useState("");

  const [createdTo, setCreatedTo] =
    useState("");

  const [isFiltersOpen, setIsFiltersOpen] =
    useState(false);

  const [sortConfig, setSortConfig] =
    useState({
      key: "createdAt",
      direction: "desc"
    });

  const [currentPage, setCurrentPage] =
    useState(1);

  const normalizedRole = String(
    user?.role || "User"
  )
    .trim()
    .toLowerCase();

  const isManagement =
    normalizedRole === "admin" ||
    normalizedRole === "supervisor";

  const pageTitle = isManagement
    ? "All Requests"
    : "My Requests";

  const loadTickets = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setLoadError("");

      try {
        const response =
          await api.get("/Tickets");

        setTickets(
          extractTickets(response.data)
        );
      } catch (requestError) {
        console.error(
          "Requests could not be loaded:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 401) {
          setLoadError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          setLoadError(
            "You do not have permission to view these requests."
          );
        } else {
          setLoadError(
            requestError.response?.data
              ?.message ||
              "Requests could not be loaded. Check the backend connection."
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
    const searchFromUrl =
      searchParams.get("search") || "";

    setSearchTerm(searchFromUrl);
  }, [searchParams]);

  const categories = useMemo(() => {
    return createUniqueOptions(
      tickets.map(ticket =>
        String(
          ticket.category || ""
        ).trim()
      )
    );
  }, [tickets]);

  const requestOwners = useMemo(() => {
    return createUniqueOptions(
      tickets.map(ticket =>
        getRequestOwnerName(ticket)
      )
    );
  }, [tickets]);

  const assignedEmployees = useMemo(() => {
    return createUniqueOptions(
      tickets.map(ticket =>
        getAssignedEmployeeName(ticket)
      )
    );
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch =
      normalizeValue(searchTerm);

    return tickets.filter(ticket => {
      const requestOwner =
        getRequestOwnerName(ticket);

      const assignedEmployee =
        getAssignedEmployeeName(ticket);

      const searchableValues = [
        ticket.id,
        ticket.title,
        ticket.category,
        ticket.status,
        ticket.priority,
        ticket.description,
        requestOwner,
        assignedEmployee
      ];

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some(value =>
          normalizeValue(value).includes(
            normalizedSearch
          )
        );

      const matchesCategory =
        categoryFilter === "All" ||
        normalizeValue(ticket.category) ===
          normalizeValue(categoryFilter);

      const matchesStatus =
        statusFilter === "All" ||
        normalizeValue(ticket.status) ===
          normalizeValue(statusFilter);

      const matchesPriority =
        priorityFilter === "All" ||
        normalizeValue(ticket.priority) ===
          normalizeValue(priorityFilter);

      const matchesOwner =
        ownerFilter === "All" ||
        normalizeValue(requestOwner) ===
          normalizeValue(ownerFilter);

      const matchesAssignee =
        assigneeFilter === "All" ||
        normalizeValue(assignedEmployee) ===
          normalizeValue(assigneeFilter);

      const matchesDate =
        matchesCreatedDate(
          ticket.createdAt,
          createdFrom,
          createdTo
        );

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority &&
        matchesOwner &&
        matchesAssignee &&
        matchesDate
      );
    });
  }, [
    tickets,
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
    ownerFilter,
    assigneeFilter,
    createdFrom,
    createdTo
  ]);

  const sortedTickets = useMemo(() => {
    return filteredTickets
      .map((ticket, originalIndex) => ({
        ticket,
        originalIndex
      }))
      .sort((firstItem, secondItem) => {
        const comparison =
          compareTicketValues(
            firstItem.ticket,
            secondItem.ticket,
            sortConfig.key
          );

        if (comparison === 0) {
          return (
            firstItem.originalIndex -
            secondItem.originalIndex
          );
        }

        return sortConfig.direction === "asc"
          ? comparison
          : comparison * -1;
      })
      .map(item => item.ticket);
  }, [
    filteredTickets,
    sortConfig
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedTickets.length /
        ITEMS_PER_PAGE
    )
  );

  const visibleTickets = useMemo(() => {
    const startIndex =
      (currentPage - 1) *
      ITEMS_PER_PAGE;

    return sortedTickets.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [
    sortedTickets,
    currentPage
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
    ownerFilter,
    assigneeFilter,
    createdFrom,
    createdTo,
    sortConfig.key,
    sortConfig.direction
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages
  ]);

  const activeFilterCount = [
    searchTerm.trim() !== "",
    categoryFilter !== "All",
    statusFilter !== "All",
    priorityFilter !== "All",
    ownerFilter !== "All",
    assigneeFilter !== "All",
    createdFrom !== "",
    createdTo !== ""
  ].filter(Boolean).length;

  const hasActiveFilters =
    activeFilterCount > 0;

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm.trim()) {
      chips.push({
        key: "search",
        label: `Search: ${searchTerm.trim()}`
      });
    }

    if (categoryFilter !== "All") {
      chips.push({
        key: "category",
        label: `Category: ${categoryFilter}`
      });
    }

    if (statusFilter !== "All") {
      chips.push({
        key: "status",
        label: `Status: ${statusFilter}`
      });
    }

    if (priorityFilter !== "All") {
      chips.push({
        key: "priority",
        label: `Priority: ${priorityFilter}`
      });
    }

    if (ownerFilter !== "All") {
      chips.push({
        key: "owner",
        label: `Owner: ${ownerFilter}`
      });
    }

    if (assigneeFilter !== "All") {
      chips.push({
        key: "assignee",
        label: `Assignee: ${assigneeFilter}`
      });
    }

    if (createdFrom) {
      chips.push({
        key: "createdFrom",
        label: `From: ${formatFilterDate(
          createdFrom
        )}`
      });
    }

    if (createdTo) {
      chips.push({
        key: "createdTo",
        label: `To: ${formatFilterDate(
          createdTo
        )}`
      });
    }

    return chips;
  }, [
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
    ownerFilter,
    assigneeFilter,
    createdFrom,
    createdTo
  ]);

  const handleSearchChange = event => {
    const value = event.target.value;

    setSearchTerm(value);

    if (value.trim()) {
      setSearchParams({
        search: value
      });
    } else {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchParams({});
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
    setOwnerFilter("All");
    setAssigneeFilter("All");
    setCreatedFrom("");
    setCreatedTo("");
    setCurrentPage(1);
    setSearchParams({});
  };

  const removeFilter = filterKey => {
    if (filterKey === "search") {
      clearSearch();
      return;
    }

    if (filterKey === "category") {
      setCategoryFilter("All");
    } else if (filterKey === "status") {
      setStatusFilter("All");
    } else if (filterKey === "priority") {
      setPriorityFilter("All");
    } else if (filterKey === "owner") {
      setOwnerFilter("All");
    } else if (filterKey === "assignee") {
      setAssigneeFilter("All");
    } else if (filterKey === "createdFrom") {
      setCreatedFrom("");
    } else if (filterKey === "createdTo") {
      setCreatedTo("");
    }
  };

  const handleSort = sortKey => {
    setSortConfig(previousSort => {
      if (previousSort.key === sortKey) {
        return {
          key: sortKey,
          direction:
            previousSort.direction === "asc"
              ? "desc"
              : "asc"
        };
      }

      return {
        key: sortKey,
        direction:
          sortKey === "id" ||
          sortKey === "createdAt"
            ? "desc"
            : "asc"
      };
    });
  };

  const handleDelete = async requestId => {
    const requestToDelete =
      tickets.find(
        ticket =>
          Number(ticket.id) ===
          Number(requestId)
      );

    const confirmed =
      await confirm({
        title: "Delete this request?",
        message: requestToDelete?.title
          ? `"${requestToDelete.title}" will be permanently deleted. This action cannot be undone.`
          : "This request will be permanently deleted. This action cannot be undone.",
        confirmText: "Delete Request",
        cancelText: "Cancel",
        variant: "danger"
      });

    if (!confirmed) {
      return;
    }

    setDeletingId(requestId);

    try {
      await api.delete(
        `/Tickets/${requestId}`
      );

      setTickets(currentTickets =>
        currentTickets.filter(
          ticket =>
            Number(ticket.id) !==
            Number(requestId)
        )
      );

      success(
        "Request was deleted successfully."
      );
    } catch (requestError) {
      console.error(
        "Request could not be deleted:",
        requestError
      );

      const status =
        requestError.response?.status;

      if (status === 401) {
        showError(
          "Your session has expired. Please sign in again."
        );
      } else if (status === 403) {
        showError(
          "You do not have permission to delete this request."
        );
      } else if (status === 404) {
        showError(
          "The request could not be found."
        );

        setTickets(currentTickets =>
          currentTickets.filter(
            ticket =>
              Number(ticket.id) !==
              Number(requestId)
          )
        );
      } else {
        showError(
          requestError.response?.data
            ?.message ||
            "Request could not be deleted."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const firstVisibleEntry =
    sortedTickets.length === 0
      ? 0
      : (currentPage - 1) *
          ITEMS_PER_PAGE +
        1;

  const lastVisibleEntry = Math.min(
    currentPage * ITEMS_PER_PAGE,
    sortedTickets.length
  );

  const getAriaSort = sortKey => {
    if (sortConfig.key !== sortKey) {
      return "none";
    }

    return sortConfig.direction === "asc"
      ? "ascending"
      : "descending";
  };

  const renderSortIcon = sortKey => {
    if (sortConfig.key !== sortKey) {
      return (
        <ArrowUpDown
          size={13}
          aria-hidden="true"
        />
      );
    }

    if (sortConfig.direction === "asc") {
      return (
        <ArrowUp
          size={13}
          aria-hidden="true"
        />
      );
    }

    return (
      <ArrowDown
        size={13}
        aria-hidden="true"
      />
    );
  };

  return (
    <div className="requests-page">
      <header className="requests-header">
        <div>
          <span className="requests-eyebrow">
            REQUEST MANAGEMENT
          </span>

          <h1>{pageTitle}</h1>

          <p>
            Search, filter, sort and manage
            request records.
          </p>
        </div>

        <div className="requests-header-actions">
          <button
            type="button"
            className="requests-refresh-button"
            onClick={() =>
              loadTickets(true)
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
                  ? "requests-rotating-icon"
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
            className="requests-new-button"
            onClick={() =>
              navigate("/requests/create")
            }
          >
            <CirclePlus size={17} />
            <span>New Request</span>
          </button>
        </div>
      </header>

      <section className="requests-content-card">
        {isLoading ? (
          <TableSkeleton
            rows={7}
            columns={7}
          />
        ) : (
          <>
            <div className="requests-toolbar">
              <div className="requests-toolbar-main">
                <div className="requests-search-wrapper">
                  <Search
                    size={17}
                    className="requests-search-icon"
                  />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search requests..."
                    aria-label="Search requests"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      className="requests-search-clear"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={`requests-filter-toggle ${
                    isFiltersOpen
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setIsFiltersOpen(
                      previousValue =>
                        !previousValue
                    )
                  }
                  aria-expanded={isFiltersOpen}
                  aria-controls="requests-advanced-filters"
                >
                  <Filter size={16} />

                  <span>Filters</span>

                  {activeFilterCount > 0 && (
                    <span className="requests-filter-count">
                      {activeFilterCount}
                    </span>
                  )}

                  <ChevronDown
                    size={15}
                    className={
                      isFiltersOpen
                        ? "rotated"
                        : ""
                    }
                  />
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="requests-clear-filters"
                  onClick={clearFilters}
                >
                  <X size={15} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {isFiltersOpen && (
              <section
                id="requests-advanced-filters"
                className="requests-advanced-filter-panel"
              >
                <div className="requests-filter-panel-header">
                  <div className="requests-filter-panel-title">
                    <div className="requests-filter-panel-icon">
                      <Filter size={20} />
                    </div>

                    <div>
                      <h2>
                        Advanced Filters
                      </h2>

                      <p>
                        Narrow the request list
                        using workflow, ownership
                        and date information.
                      </p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="requests-filter-panel-clear"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <div className="requests-filter-grid">
                  <FilterField
                    id="requests-category-filter"
                    label="Category"
                    icon={Tags}
                  >
                    <FilterSelect
                      id="requests-category-filter"
                      value={categoryFilter}
                      onChange={event =>
                        setCategoryFilter(
                          event.target.value
                        )
                      }
                    >
                      <option value="All">
                        All Categories
                      </option>

                      {categories.map(category => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </FilterSelect>
                  </FilterField>

                  <FilterField
                    id="requests-status-filter"
                    label="Status"
                    icon={CircleDot}
                  >
                    <FilterSelect
                      id="requests-status-filter"
                      value={statusFilter}
                      onChange={event =>
                        setStatusFilter(
                          event.target.value
                        )
                      }
                    >
                      <option value="All">
                        All Statuses
                      </option>

                      {statusOptions.map(status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </FilterSelect>
                  </FilterField>

                  <FilterField
                    id="requests-priority-filter"
                    label="Priority"
                    icon={AlertCircle}
                  >
                    <FilterSelect
                      id="requests-priority-filter"
                      value={priorityFilter}
                      onChange={event =>
                        setPriorityFilter(
                          event.target.value
                        )
                      }
                    >
                      <option value="All">
                        All Priorities
                      </option>

                      {priorityOptions.map(
                        priority => (
                          <option
                            key={priority}
                            value={priority}
                          >
                            {priority}
                          </option>
                        )
                      )}
                    </FilterSelect>
                  </FilterField>

                  {isManagement && (
                    <FilterField
                      id="requests-owner-filter"
                      label="Request Owner"
                      icon={UserRound}
                    >
                      <FilterSelect
                        id="requests-owner-filter"
                        value={ownerFilter}
                        onChange={event =>
                          setOwnerFilter(
                            event.target.value
                          )
                        }
                      >
                        <option value="All">
                          All Owners
                        </option>

                        {requestOwners.map(owner => (
                          <option
                            key={owner}
                            value={owner}
                          >
                            {owner}
                          </option>
                        ))}
                      </FilterSelect>
                    </FilterField>
                  )}

                  {isManagement && (
                    <FilterField
                      id="requests-assignee-filter"
                      label="Assigned Staff"
                      icon={UsersRound}
                    >
                      <FilterSelect
                        id="requests-assignee-filter"
                        value={assigneeFilter}
                        onChange={event =>
                          setAssigneeFilter(
                            event.target.value
                          )
                        }
                      >
                        <option value="All">
                          All Assignees
                        </option>

                        {assignedEmployees.map(
                          employee => (
                            <option
                              key={employee}
                              value={employee}
                            >
                              {employee}
                            </option>
                          )
                        )}
                      </FilterSelect>
                    </FilterField>
                  )}

                  <FilterField
                    id="requests-created-from"
                    label="Created From"
                    icon={CalendarDays}
                  >
                    <FilterDateInput
                      id="requests-created-from"
                      label="Created From"
                      value={createdFrom}
                      onChange={event =>
                        setCreatedFrom(
                          event.target.value
                        )
                      }
                      max={
                        createdTo ||
                        undefined
                      }
                    />
                  </FilterField>

                  <FilterField
                    id="requests-created-to"
                    label="Created To"
                    icon={CalendarDays}
                  >
                    <FilterDateInput
                      id="requests-created-to"
                      label="Created To"
                      value={createdTo}
                      onChange={event =>
                        setCreatedTo(
                          event.target.value
                        )
                      }
                      min={
                        createdFrom ||
                        undefined
                      }
                    />
                  </FilterField>
                </div>
              </section>
            )}

            {activeFilterChips.length > 0 && (
              <div className="requests-active-filters">
                <div className="requests-active-filters-label">
                  <Filter size={14} />

                  <span>
                    Active filters
                  </span>
                </div>

                <div className="requests-filter-chip-list">
                  {activeFilterChips.map(
                    chip => (
                      <button
                        type="button"
                        key={chip.key}
                        className="requests-filter-chip"
                        onClick={() =>
                          removeFilter(
                            chip.key
                          )
                        }
                        title={`Remove ${chip.label}`}
                      >
                        <span>
                          {chip.label}
                        </span>

                        <X size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {loadError ? (
              <div className="requests-state requests-error-state">
                <AlertCircle size={34} />

                <strong>
                  Requests could not be loaded
                </strong>

                <span>{loadError}</span>

                <button
                  type="button"
                  onClick={() =>
                    loadTickets()
                  }
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>
              </div>
            ) : sortedTickets.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={
                  hasActiveFilters
                    ? "No matching requests"
                    : "No requests yet"
                }
                description={
                  hasActiveFilters
                    ? "No requests match the selected search and filters. Try changing or clearing your current filters."
                    : "You have not created any requests yet. Create your first request to get started."
                }
                actionText={
                  hasActiveFilters
                    ? "Clear Filters"
                    : "Create Request"
                }
                onAction={
                  hasActiveFilters
                    ? clearFilters
                    : () =>
                        navigate(
                          "/requests/create"
                        )
                }
              />
            ) : (
              <>
                <div className="requests-table-wrapper">
                  <table className="requests-table">
                    <thead>
                      <tr>
                        <th
                          aria-sort={
                            getAriaSort("id")
                          }
                        >
                          <SortButton
                            label="ID"
                            sortKey="id"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "id"
                            )}
                          />
                        </th>

                        <th
                          aria-sort={
                            getAriaSort("title")
                          }
                        >
                          <SortButton
                            label="Title"
                            sortKey="title"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "title"
                            )}
                          />
                        </th>

                        <th
                          aria-sort={
                            getAriaSort(
                              "category"
                            )
                          }
                        >
                          <SortButton
                            label="Category"
                            sortKey="category"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "category"
                            )}
                          />
                        </th>

                        <th
                          aria-sort={
                            getAriaSort(
                              "status"
                            )
                          }
                        >
                          <SortButton
                            label="Status"
                            sortKey="status"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "status"
                            )}
                          />
                        </th>

                        <th
                          aria-sort={
                            getAriaSort(
                              "priority"
                            )
                          }
                        >
                          <SortButton
                            label="Priority"
                            sortKey="priority"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "priority"
                            )}
                          />
                        </th>

                        <th
                          aria-sort={
                            getAriaSort(
                              "createdAt"
                            )
                          }
                        >
                          <SortButton
                            label="Created At"
                            sortKey="createdAt"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            icon={renderSortIcon(
                              "createdAt"
                            )}
                          />
                        </th>

                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleTickets.map(
                        ticket => (
                          <tr key={ticket.id}>
                            <td>
                              <span className="requests-id">
                                #{ticket.id}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="requests-title-button"
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
                                "Uncategorized"}
                            </td>

                            <td>
                              <span
                                className={`requests-status-badge ${createClassName(
                                  ticket.status
                                )}`}
                              >
                                {ticket.status ||
                                  "Unknown"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`requests-priority-badge ${createClassName(
                                  ticket.priority
                                )}`}
                              >
                                {ticket.priority ||
                                  "Unknown"}
                              </span>
                            </td>

                            <td>
                              <time
                                className="requests-date"
                                dateTime={
                                  ticket.createdAt ||
                                  undefined
                                }
                              >
                                {formatDate(
                                  ticket.createdAt
                                )}
                              </time>
                            </td>

                            <td>
                              <div className="requests-actions">
                                <button
                                  type="button"
                                  className="requests-action-button edit"
                                  onClick={() =>
                                    navigate(
                                      `/requests/edit/${ticket.id}`
                                    )
                                  }
                                  title="Edit request"
                                  aria-label={`Edit request ${ticket.id}`}
                                >
                                  <Pencil size={15} />
                                </button>

                                {isManagement && (
                                  <button
                                    type="button"
                                    className="requests-action-button delete"
                                    onClick={() =>
                                      handleDelete(
                                        ticket.id
                                      )
                                    }
                                    disabled={
                                      Number(
                                        deletingId
                                      ) ===
                                      Number(
                                        ticket.id
                                      )
                                    }
                                    title="Delete request"
                                    aria-label={`Delete request ${ticket.id}`}
                                  >
                                    {Number(
                                      deletingId
                                    ) ===
                                    Number(
                                      ticket.id
                                    ) ? (
                                      <LoaderCircle
                                        size={15}
                                        className="requests-rotating-icon"
                                      />
                                    ) : (
                                      <Trash2
                                        size={15}
                                      />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="requests-pagination">
                  <span>
                    Showing {firstVisibleEntry} to{" "}
                    {lastVisibleEntry} of{" "}
                    {sortedTickets.length} entries
                  </span>

                  <div className="requests-pagination-controls">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          previousPage =>
                            Math.max(
                              1,
                              previousPage - 1
                            )
                        )
                      }
                      disabled={
                        currentPage === 1
                      }
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {createPageNumbers(
                      currentPage,
                      totalPages
                    ).map(pageNumber => (
                      <button
                        type="button"
                        key={pageNumber}
                        className={
                          pageNumber ===
                          currentPage
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setCurrentPage(
                            pageNumber
                          )
                        }
                        aria-current={
                          pageNumber ===
                          currentPage
                            ? "page"
                            : undefined
                        }
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          previousPage =>
                            Math.min(
                              totalPages,
                              previousPage + 1
                            )
                        )
                      }
                      disabled={
                        currentPage === totalPages
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </footer>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function FilterField({
  id,
  label,
  icon: Icon,
  children
}) {
  return (
    <div className="requests-filter-field">
      <label htmlFor={id}>
        <Icon size={16} />
        <span>{label}</span>
      </label>

      {children}
    </div>
  );
}

function FilterSelect({
  id,
  value,
  onChange,
  children
}) {
  return (
    <div className="requests-filter-control">
      <select
        id={id}
        className="requests-custom-select"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>

      <ChevronDown
        size={17}
        className="requests-control-icon"
        aria-hidden="true"
      />
    </div>
  );
}

function FilterDateInput({
  id,
  label,
  value,
  onChange,
  min,
  max
}) {
  const inputRef = useRef(null);

  const openDatePicker = () => {
    const dateInput = inputRef.current;

    if (!dateInput) {
      return;
    }

    dateInput.focus();

    try {
      if (
        typeof dateInput.showPicker ===
        "function"
      ) {
        dateInput.showPicker();
      } else {
        dateInput.click();
      }
    } catch {
      dateInput.click();
    }
  };

  return (
    <div className="requests-filter-control requests-date-control">
      <input
        ref={inputRef}
        id={id}
        className="requests-custom-date"
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
      />

      <button
        type="button"
        className="requests-date-picker-button"
        onClick={openDatePicker}
        aria-label={`Open ${label} date picker`}
        title={`Select ${label.toLowerCase()} date`}
      >
        <CalendarDays
          size={17}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  sortConfig,
  onSort,
  icon
}) {
  const isActive =
    sortConfig.key === sortKey;

  return (
    <button
      type="button"
      className={`requests-sort-button ${
        isActive ? "active" : ""
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      {icon}
    </button>
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

function createUniqueOptions(values) {
  return [
    ...new Set(
      values
        .map(value =>
          String(value || "").trim()
        )
        .filter(Boolean)
    )
  ].sort((firstValue, secondValue) =>
    firstValue.localeCompare(
      secondValue,
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    )
  );
}

function getRequestOwnerName(ticket) {
  return (
    ticket?.createdByUserName ||
    ticket?.requestOwnerName ||
    ticket?.ownerName ||
    ticket?.createdByName ||
    ticket?.createdByUser?.fullName ||
    ticket?.createdByUser?.name ||
    (ticket?.createdByUserId
      ? `User #${ticket.createdByUserId}`
      : "Unknown Owner")
  );
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

function matchesCreatedDate(
  dateValue,
  createdFrom,
  createdTo
) {
  if (!createdFrom && !createdTo) {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  const ticketDate =
    new Date(dateValue);

  if (
    Number.isNaN(ticketDate.getTime())
  ) {
    return false;
  }

  if (createdFrom) {
    const fromDate =
      createLocalDate(createdFrom);

    fromDate.setHours(0, 0, 0, 0);

    if (ticketDate < fromDate) {
      return false;
    }
  }

  if (createdTo) {
    const toDate =
      createLocalDate(createdTo);

    toDate.setHours(23, 59, 59, 999);

    if (ticketDate > toDate) {
      return false;
    }
  }

  return true;
}

function createLocalDate(dateValue) {
  const [
    year,
    month,
    day
  ] = String(dateValue)
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function compareTicketValues(
  firstTicket,
  secondTicket,
  sortKey
) {
  const firstValue =
    getTicketSortValue(
      firstTicket,
      sortKey
    );

  const secondValue =
    getTicketSortValue(
      secondTicket,
      sortKey
    );

  if (
    typeof firstValue === "number" &&
    typeof secondValue === "number"
  ) {
    return firstValue - secondValue;
  }

  return String(firstValue).localeCompare(
    String(secondValue),
    undefined,
    {
      numeric: true,
      sensitivity: "base"
    }
  );
}

function getTicketSortValue(
  ticket,
  sortKey
) {
  if (sortKey === "id") {
    return Number(ticket?.id) || 0;
  }

  if (sortKey === "priority") {
    return (
      priorityOrder[
        normalizeValue(ticket?.priority)
      ] || 0
    );
  }

  if (sortKey === "status") {
    return (
      statusOrder[
        normalizeValue(ticket?.status)
      ] || 0
    );
  }

  if (sortKey === "createdAt") {
    const date = new Date(
      ticket?.createdAt || 0
    );

    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();
  }

  if (sortKey === "category") {
    return ticket?.category || "";
  }

  if (sortKey === "title") {
    return ticket?.title || "";
  }

  return "";
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createClassName(value) {
  return normalizeValue(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
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

function formatFilterDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date =
    createLocalDate(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
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

function createPageNumbers(
  currentPage,
  totalPages
) {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1
    );
  }

  const startPage = Math.max(
    1,
    Math.min(
      currentPage - 2,
      totalPages - 4
    )
  );

  return Array.from(
    { length: 5 },
    (_, index) => startPage + index
  );
}

export default Requests;
