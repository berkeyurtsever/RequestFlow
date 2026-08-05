import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  LoaderCircle,
  MessageSquare,
  PencilLine,
  Save,
  Tag,
  Trash2,
  UserCheck,
  UserRound
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
  useParams
} from "react-router-dom";

import AssignStaff from "../components/AssignStaff";
import RequestAttachments from "../components/RequestAttachments";
import RequestComments from "../components/RequestComments";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const CATEGORY_GROUPS = [
  {
    label: "Information Technology",
    options: [
      "Hardware Request",
      "Software Request",
      "Access and Authorization",
      "Network and Internet",
      "Email Account",
      "User Account",
      "Printer and Scanner",
      "Technical Support",
      "System Maintenance"
    ]
  },
  {
    label: "Human Resources",
    options: [
      "Leave Request",
      "Employee Document",
      "Recruitment Request",
      "Training Request",
      "Payroll Question",
      "Performance Review",
      "Employee Information Update"
    ]
  },
  {
    label: "Finance",
    options: [
      "Expense Request",
      "Invoice Request",
      "Payment Request",
      "Budget Request",
      "Reimbursement Request",
      "Purchase Approval"
    ]
  },
  {
    label: "Administrative Affairs",
    options: [
      "Office Supplies",
      "Facility Maintenance",
      "Cleaning Request",
      "Transportation Request",
      "Security Request",
      "Meeting Room Request",
      "Visitor Registration"
    ]
  },
  {
    label: "Operations",
    options: [
      "Equipment Request",
      "Maintenance Request",
      "Inventory Request",
      "Logistics Request",
      "Operational Support"
    ]
  },
  {
    label: "General",
    options: [
      "General Request",
      "Suggestion",
      "Complaint",
      "Other"
    ]
  }
];

const PRIORITY_OPTIONS = [
  "Low",
  "Medium",
  "High",
  "Urgent"
];

const STATUS_OPTIONS = [
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Rejected"
];

const initialForm = {
  title: "",
  category: "",
  priority: "Medium",
  status: "Open",
  description: ""
};

function EditRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const [ticket, setTicket] =
    useState(null);

  const [formData, setFormData] =
    useState(initialForm);

  const [savedFormData, setSavedFormData] =
    useState(null);

  const [activityItems, setActivityItems] =
    useState([]);

  const [
    isActivityLoading,
    setIsActivityLoading
  ] = useState(true);

  const [
    activityError,
    setActivityError
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const hasUnsavedChangesRef =
    useRef(false);

  const navigationApprovedRef =
    useRef(false);

  const promptOpenRef =
    useRef(false);

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

  const canChangeStatus =
    isManagement || isStaff;

  const canDelete =
    isManagement;

  const allCategoryOptions = useMemo(
    () =>
      CATEGORY_GROUPS.flatMap(
        group => group.options
      ),
    []
  );

  const hasUnknownCategory =
    Boolean(formData.category) &&
    !allCategoryOptions.includes(
      formData.category
    );

  const hasUnsavedChanges = useMemo(() => {
    if (!savedFormData) {
      return false;
    }

    return (
      JSON.stringify(
        normalizeFormData(formData)
      ) !==
      JSON.stringify(
        normalizeFormData(savedFormData)
      )
    );
  }, [
    formData,
    savedFormData
  ]);

  useEffect(() => {
    hasUnsavedChangesRef.current =
      hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const loadTicket = useCallback(
    async () => {
      setIsLoading(true);
      setLoadError("");

      navigationApprovedRef.current =
        false;

      try {
        const response = await api.get(
          `/Tickets/${id}`
        );

        const loadedTicket =
          response.data;

        const loadedForm = {
          title:
            loadedTicket?.title || "",

          category:
            loadedTicket?.category || "",

          priority:
            loadedTicket?.priority ||
            "Medium",

          status:
            loadedTicket?.status ||
            "Open",

          description:
            loadedTicket?.description ||
            ""
        };

        setTicket(loadedTicket);
        setFormData(loadedForm);
        setSavedFormData(loadedForm);
      } catch (requestError) {
        console.error(
          "Request could not be loaded:",
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
            "You do not have permission to view this request."
          );
        } else if (status === 404) {
          setLoadError(
            "The requested record could not be found."
          );
        } else {
          setLoadError(
            requestError.response?.data
              ?.message ||
              "The request could not be loaded. Check the backend connection."
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [id]
  );

  const loadActivities = useCallback(
    async () => {
      if (!id) {
        setActivityItems([]);
        setIsActivityLoading(false);
        return;
      }

      setIsActivityLoading(true);
      setActivityError("");

      try {
        const response = await api.get(
          `/Tickets/${id}/activities`
        );

        const loadedActivities =
          Array.isArray(response.data)
            ? response.data
            : [];

        const mappedActivities =
          loadedActivities.map(
            activity => ({
              id: activity.id,

              type:
                activity.type ||
                "update",

              title:
                activity.title ||
                "Request activity",

              description:
                activity.description ||
                "",

              actor:
                activity.actorName ||
                "RequestFlow",

              actorRole:
                activity.actorRole ||
                "",

              date:
                activity.createdAt
            })
          );

        setActivityItems(
          mappedActivities
        );
      } catch (requestError) {
        console.error(
          "Activities could not be loaded:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 401) {
          setActivityError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          setActivityError(
            "You do not have permission to view request activity."
          );
        } else if (status === 404) {
          setActivityError(
            "The request could not be found."
          );
        } else {
          setActivityError(
            requestError.response?.data
              ?.message ||
              "Activity records could not be loaded."
          );
        }

        setActivityItems([]);
      } finally {
        setIsActivityLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const navigateWithGuard = useCallback(
    async (
      destination,
      options = {}
    ) => {
      if (
        navigationApprovedRef.current ||
        !hasUnsavedChangesRef.current
      ) {
        navigate(destination, options);
        return;
      }

      if (promptOpenRef.current) {
        return;
      }

      promptOpenRef.current = true;

      try {
        const shouldLeave =
          await confirm({
            title:
              "Discard unsaved changes?",

            message:
              "You have changes that have not been saved. Leaving this page will discard those changes.",

            confirmText:
              "Discard Changes",

            cancelText:
              "Keep Editing",

            variant: "warning"
          });

        if (!shouldLeave) {
          return;
        }

        navigationApprovedRef.current =
          true;

        navigate(
          destination,
          options
        );
      } finally {
        promptOpenRef.current = false;
      }
    },
    [
      confirm,
      navigate
    ]
  );

  useEffect(() => {
    const handleBeforeUnload = event => {
      if (
        !hasUnsavedChangesRef.current ||
        navigationApprovedRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, []);

  useEffect(() => {
    const handleInternalLinkClick = event => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        navigationApprovedRef.current ||
        !hasUnsavedChangesRef.current
      ) {
        return;
      }

      const clickedElement =
        event.target instanceof Element
          ? event.target
          : null;

      const anchor =
        clickedElement?.closest("a[href]");

      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const targetUrl = new URL(
        anchor.href,
        window.location.href
      );

      if (
        targetUrl.origin !==
        window.location.origin
      ) {
        return;
      }

      const currentAddress =
        `${window.location.pathname}${window.location.search}${window.location.hash}`;

      const targetAddress =
        `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

      if (
        currentAddress === targetAddress
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void navigateWithGuard(
        targetAddress
      );
    };

    document.addEventListener(
      "click",
      handleInternalLinkClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleInternalLinkClick,
        true
      );
    };
  }, [navigateWithGuard]);

  const handleInputChange = event => {
    const {
      name,
      value
    } = event.target;

    setFormData(previousForm => ({
      ...previousForm,
      [name]: value
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!formData.title.trim()) {
      showError(
        "Request title is required."
      );
      return;
    }

    if (!formData.category) {
      showError(
        "Please select a request category."
      );
      return;
    }

    if (!formData.description.trim()) {
      showError(
        "Request description is required."
      );
      return;
    }

    if (!hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);

    try {
      const updatePayload = {
        title:
          formData.title.trim(),

        category:
          formData.category,

        priority:
          formData.priority,

        status:
          canChangeStatus
            ? formData.status
            : ticket?.status ||
              "Open",

        description:
          formData.description.trim()
      };

      const response = await api.put(
        `/Tickets/${id}`,
        updatePayload
      );

      const responseTicket =
        response.data &&
        typeof response.data === "object"
          ? response.data
          : {};

      const updatedAt =
        responseTicket.updatedAt ||
        new Date().toISOString();

      const updatedTicket = {
        ...ticket,
        ...responseTicket,
        ...updatePayload,
        updatedAt
      };

      setTicket(updatedTicket);
      setFormData(updatePayload);
      setSavedFormData(updatePayload);

      success(
        "Request was updated successfully."
      );

      await loadActivities();
    } catch (requestError) {
      console.error(
        "Request could not be updated:",
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
          "You do not have permission to update this request."
        );
      } else if (status === 404) {
        showError(
          "The request could not be found."
        );
      } else {
        showError(
          requestError.response?.data
            ?.message ||
            "Request could not be updated."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title:
        "Delete this request?",

      message: ticket?.title
        ? `"${ticket.title}" will be permanently deleted. This action cannot be undone.`
        : "This request will be permanently deleted. This action cannot be undone.",

      confirmText:
        "Delete Request",

      cancelText:
        "Cancel",

      variant: "danger"
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.delete(
        `/Tickets/${id}`
      );

      navigationApprovedRef.current =
        true;

      success(
        "Request was deleted successfully."
      );

      navigate("/requests", {
        replace: true
      });
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
      } else {
        showError(
          requestError.response?.data
            ?.message ||
            "Request could not be deleted."
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssigned = assignment => {
    const assignedUserId =
      typeof assignment === "object"
        ? assignment
            ?.assignedToUserId ??
          assignment?.userId ??
          assignment?.id ??
          null
        : assignment ?? null;

    const assignedUserName =
      typeof assignment === "object"
        ? assignment
            ?.assignedToUserName ??
          assignment?.assignedToName ??
          assignment?.fullName ??
          assignment?.name ??
          null
        : null;

    const updatedAt =
      new Date().toISOString();

    setTicket(previousTicket => ({
      ...previousTicket,

      assignedToUserId:
        assignedUserId,

      assignedToUserName:
        assignedUserId
          ? assignedUserName ||
            previousTicket
              ?.assignedToUserName ||
            null
          : null,

      updatedAt
    }));

    void loadActivities();
  };

  const handleActivityChanged =
    useCallback(async () => {
      await loadActivities();
    }, [loadActivities]);

  if (isLoading) {
    return (
      <div className="edit-request-state">
        <LoaderCircle
          className="edit-request-spinner"
          size={32}
        />

        <strong>
          Loading request...
        </strong>

        <span>
          Request details are being retrieved.
        </span>
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="edit-request-state edit-request-error-state">
        <AlertCircle size={36} />

        <strong>
          Request could not be opened
        </strong>

        <span>
          {loadError ||
            "The request record is unavailable."}
        </span>

        <div className="edit-request-state-actions">
          <button
            type="button"
            onClick={loadTicket}
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() =>
              navigateWithGuard(
                "/requests"
              )
            }
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-request-page">
      <header className="edit-request-header">
        <div>
          <span className="edit-request-eyebrow">
            REQUEST MANAGEMENT
          </span>

          <h1>Edit Request</h1>

          <p>
            Update request details, workflow
            status and staff assignment.
          </p>

          {hasUnsavedChanges && (
            <span className="edit-request-unsaved-badge">
              <AlertCircle size={14} />
              Unsaved changes
            </span>
          )}
        </div>

        <div className="edit-request-header-actions">
          <button
            type="button"
            className="edit-request-back-button"
            onClick={() =>
              navigateWithGuard(
                "/requests"
              )
            }
          >
            <ArrowLeft size={16} />
            Back to Requests
          </button>

          {canDelete && (
            <button
              type="button"
              className="edit-request-delete-button"
              onClick={handleDelete}
              disabled={
                isDeleting ||
                isSaving
              }
            >
              {isDeleting ? (
                <LoaderCircle
                  className="edit-request-spinner"
                  size={16}
                />
              ) : (
                <Trash2 size={16} />
              )}

              {isDeleting
                ? "Deleting..."
                : "Delete Request"}
            </button>
          )}
        </div>
      </header>

      <div className="edit-request-layout">
        <div className="edit-request-main-column">
          <form
            className="edit-request-form-card"
            onSubmit={handleSubmit}
          >
            <div className="edit-request-card-header">
              <div className="edit-request-card-icon">
                <FileText size={21} />
              </div>

              <div>
                <h2>
                  Request Information
                </h2>

                <p>
                  Review and update the request
                  information below.
                </p>
              </div>
            </div>

            <div className="edit-request-form-grid">
              <div className="edit-request-form-group edit-request-full-width">
                <label htmlFor="edit-title">
                  Request Title
                  <span>*</span>
                </label>

                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter request title"
                  maxLength={120}
                  required
                />
              </div>

              <div className="edit-request-form-group">
                <label htmlFor="edit-category">
                  Category
                  <span>*</span>
                </label>

                <select
                  id="edit-category"
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                >
                  <option value="">
                    Select a category
                  </option>

                  {hasUnknownCategory && (
                    <optgroup label="Current Category">
                      <option
                        value={
                          formData.category
                        }
                      >
                        {formData.category}
                      </option>
                    </optgroup>
                  )}

                  {CATEGORY_GROUPS.map(
                    group => (
                      <optgroup
                        key={group.label}
                        label={group.label}
                      >
                        {group.options.map(
                          category => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          )
                        )}
                      </optgroup>
                    )
                  )}
                </select>
              </div>

              <div className="edit-request-form-group">
                <label htmlFor="edit-priority">
                  Priority
                </label>

                <select
                  id="edit-priority"
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleInputChange
                  }
                >
                  {PRIORITY_OPTIONS.map(
                    priority => (
                      <option
                        key={priority}
                        value={priority}
                      >
                        {priority}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="edit-request-form-group">
                <label htmlFor="edit-status">
                  Status
                </label>

                {canChangeStatus ? (
                  <select
                    id="edit-status"
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleInputChange
                    }
                  >
                    {STATUS_OPTIONS.map(
                      status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <input
                    id="edit-status"
                    type="text"
                    value={
                      formData.status
                    }
                    disabled
                  />
                )}
              </div>

              <div className="edit-request-form-group">
                <label>
                  Request ID
                </label>

                <input
                  type="text"
                  value={`#${ticket.id}`}
                  disabled
                />
              </div>

              <div className="edit-request-form-group edit-request-full-width">
                <div className="edit-request-description-label">
                  <label htmlFor="edit-description">
                    Description
                    <span>*</span>
                  </label>

                  <span>
                    {formData.description.length}
                    /500
                  </span>
                </div>

                <textarea
                  id="edit-description"
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Describe the request"
                  maxLength={500}
                  rows={7}
                  required
                />
              </div>
            </div>

            <div className="edit-request-form-actions">
              <button
                type="button"
                className="edit-request-cancel-button"
                onClick={() =>
                  navigateWithGuard(
                    "/requests"
                  )
                }
                disabled={
                  isSaving ||
                  isDeleting
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="edit-request-save-button"
                disabled={
                  isSaving ||
                  isDeleting ||
                  !hasUnsavedChanges
                }
              >
                {isSaving ? (
                  <LoaderCircle
                    className="edit-request-spinner"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}

                {isSaving
                  ? "Saving Changes..."
                  : "Update Request"}
              </button>
            </div>
          </form>

          <RequestAttachments
            ticketId={ticket.id}
            canModerate={isManagement}
            disabled={
              isSaving ||
              isDeleting
            }
            onActivityChanged={
              handleActivityChanged
            }
          />

          <ActivityTimeline
            activities={activityItems}
            isLoading={
              isActivityLoading
            }
            errorMessage={
              activityError
            }
            onRetry={loadActivities}
          />

          <RequestComments
            ticketId={ticket.id}
            canModerate={isManagement}
            onActivityChanged={
              handleActivityChanged
            }
          />
        </div>

        <aside className="edit-request-sidebar">
          <section className="edit-request-summary-card">
            <div className="edit-request-summary-heading">
              <div className="edit-request-summary-icon">
                <FileText size={20} />
              </div>

              <div>
                <h2>
                  Request Summary
                </h2>

                <p>
                  Current request information.
                </p>
              </div>
            </div>

            <div className="edit-request-summary-list">
              <SummaryRow
                icon={FileText}
                label="Request ID"
                value={`#${ticket.id}`}
              />

              <SummaryRow
                icon={Tag}
                label="Category"
                value={
                  formData.category ||
                  "Not available"
                }
              />

              <SummaryRow
                icon={AlertCircle}
                label="Priority"
                value={
                  formData.priority ||
                  "Not available"
                }
                badgeClass={`edit-request-summary-badge ${createClassName(
                  formData.priority
                )}`}
              />

              <SummaryRow
                icon={CheckCircle2}
                label="Status"
                value={
                  formData.status ||
                  "Not available"
                }
                badgeClass={`edit-request-summary-badge ${createClassName(
                  formData.status
                )}`}
              />

              <SummaryRow
                icon={UserRound}
                label="Request Owner"
                value={
                  getOwnerName(ticket)
                }
              />

              <SummaryRow
                icon={UserRound}
                label="Assigned Staff"
                value={
                  getAssignedStaffName(
                    ticket
                  )
                }
              />

              <SummaryRow
                icon={CalendarDays}
                label="Created At"
                value={
                  formatDateTime(
                    ticket.createdAt
                  )
                }
              />

              <SummaryRow
                icon={Clock3}
                label="Last Updated"
                value={
                  formatDateTime(
                    ticket.updatedAt
                  )
                }
              />
            </div>
          </section>

          {isManagement && (
            <AssignStaff
              ticketId={ticket.id}
              assignedToUserId={
                ticket.assignedToUserId
              }
              onAssigned={
                handleAssigned
              }
            />
          )}

          <section className="edit-request-workflow-card">
            <h2>
              Workflow Information
            </h2>

            <p>
              Status changes are visible to the
              request owner and assigned staff
              members.
            </p>

            <div className="edit-request-workflow-status">
              <span
                className={`edit-request-workflow-dot ${createClassName(
                  formData.status
                )}`}
              />

              <div>
                <strong>
                  {formData.status}
                </strong>

                <span>
                  Current request status
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ActivityTimeline({
  activities,
  isLoading,
  errorMessage,
  onRetry
}) {
  return (
    <section className="edit-request-activity-card">
      <div className="edit-request-activity-header">
        <div className="edit-request-activity-header-icon">
          <History size={21} />
        </div>

        <div>
          <h2>
            Activity Timeline
          </h2>

          <p>
            Permanent workflow and request activity
            records.
          </p>
        </div>

        <span className="edit-request-activity-note">
          Activities are synchronized with the
          RequestFlow database.
        </span>
      </div>

      <div className="edit-request-activity-list">
        {isLoading ? (
          <div className="edit-request-activity-empty">
            <LoaderCircle
              size={24}
              className="edit-request-spinner"
            />

            <strong>
              Loading activity...
            </strong>

            <span>
              Activity records are being retrieved.
            </span>
          </div>
        ) : errorMessage ? (
          <div className="edit-request-activity-empty">
            <AlertCircle size={24} />

            <strong>
              Activity could not be loaded
            </strong>

            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={onRetry}
            >
              Try Again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="edit-request-activity-empty">
            <History size={24} />

            <strong>
              No activity available
            </strong>

            <span>
              Permanent request activities will
              appear here.
            </span>
          </div>
        ) : (
          activities.map(
            (
              activity,
              index
            ) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={
                  index ===
                  activities.length - 1
                }
              />
            )
          )
        )}
      </div>
    </section>
  );
}

function ActivityItem({
  activity,
  isLast
}) {
  const Icon =
    getActivityIcon(
      activity.type
    );

  return (
    <article
      className={`edit-request-activity-item ${createClassName(
        activity.type
      )}`}
    >
      <div className="edit-request-activity-track">
        <div className="edit-request-activity-marker">
          <Icon size={16} />
        </div>

        {!isLast && (
          <span className="edit-request-activity-line" />
        )}
      </div>

      <div className="edit-request-activity-content">
        <div className="edit-request-activity-title-row">
          <strong>
            {activity.title}
          </strong>

          <time
            dateTime={
              activity.date
            }
          >
            {formatDateTime(
              activity.date
            )}
          </time>
        </div>

        <p>
          {activity.description}
        </p>

        {activity.actor && (
          <span className="edit-request-activity-actor">
            By {activity.actor}
            {activity.actorRole
              ? ` · ${activity.actorRole}`
              : ""}
          </span>
        )}
      </div>
    </article>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  badgeClass = ""
}) {
  return (
    <div className="edit-request-summary-row">
      <div className="edit-request-summary-row-icon">
        <Icon size={16} />
      </div>

      <div>
        <span>
          {label}
        </span>

        {badgeClass ? (
          <strong
            className={
              badgeClass
            }
          >
            {value}
          </strong>
        ) : (
          <strong>
            {value}
          </strong>
        )}
      </div>
    </div>
  );
}

function getActivityIcon(type) {
  const normalizedType =
    String(type || "")
      .trim()
      .toLowerCase();

  if (
    normalizedType ===
    "assignment"
  ) {
    return UserCheck;
  }

  if (
    normalizedType ===
    "status"
  ) {
    return CheckCircle2;
  }

  if (
    normalizedType ===
    "priority"
  ) {
    return AlertCircle;
  }

  if (
    normalizedType ===
    "comment"
  ) {
    return MessageSquare;
  }

  if (
    normalizedType ===
    "update"
  ) {
    return PencilLine;
  }

  return FileText;
}

function normalizeFormData(form) {
  return {
    title:
      String(
        form?.title || ""
      ).trim(),

    category:
      String(
        form?.category || ""
      ),

    priority:
      String(
        form?.priority ||
        "Medium"
      ),

    status:
      String(
        form?.status ||
        "Open"
      ),

    description:
      String(
        form?.description || ""
      ).trim()
  };
}

function getOwnerName(ticket) {
  return (
    ticket?.createdByUserName ||
    ticket?.createdByName ||
    ticket?.ownerName ||
    ticket?.createdByEmail ||
    (ticket?.createdByUserId
      ? `User #${ticket.createdByUserId}`
      : "Not available")
  );
}

function getAssignedStaffName(ticket) {
  return (
    ticket?.assignedToUserName ||
    ticket?.assignedStaffName ||
    ticket?.assignedToName ||
    (ticket?.assignedToUserId
      ? `User #${ticket.assignedToUserId}`
      : "Unassigned")
  );
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
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

function createClassName(value) {
  return String(
    value || "unknown"
  )
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

export default EditRequest;