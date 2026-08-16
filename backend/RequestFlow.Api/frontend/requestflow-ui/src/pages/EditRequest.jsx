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

const AUTO_SAVE_DELAY = 1200;

const initialForm = {
  title: "",
  category: "",
  priority: "Medium",
  status: "Open",
  description: "",
  customFields: {}
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

  const [categoryFields, setCategoryFields] =
    useState([]);

  const [touchedFields, setTouchedFields] =
    useState({});

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

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  const [autoSaveStatus, setAutoSaveStatus] =
    useState("idle");

  const [lastSavedAt, setLastSavedAt] =
    useState(null);

  const [deleteError, setDeleteError] =
    useState("");

  const [loadError, setLoadError] =
    useState("");

  const hasUnsavedChangesRef =
    useRef(false);

  const navigationApprovedRef =
    useRef(false);

  const promptOpenRef =
    useRef(false);

  const autoSaveFailureFingerprintRef =
    useRef(null);

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

  const selectedCategoryFields = useMemo(
    () => categoryFields.filter(field =>
      field.category === formData.category
    ),
    [categoryFields, formData.category]
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
            "",

          customFields:
            loadedTicket?.customFields &&
            typeof loadedTicket.customFields === "object"
              ? loadedTicket.customFields
              : {}
        };

        setTicket(loadedTicket);
        setFormData(loadedForm);
        setSavedFormData(loadedForm);
        setAutoSaveStatus("saved");
        setLastSavedAt(null);
        setDeleteError("");
        autoSaveFailureFingerprintRef.current =
          null;
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

  useEffect(() => {
    let isActive = true;

    const loadCategoryFields = async () => {
      try {
        const response = await api.get(
          "/CategoryFields"
        );

        if (isActive) {
          setCategoryFields(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch (requestError) {
        console.error(
          "Category fields could not be loaded:",
          requestError
        );

        if (isActive) {
          setCategoryFields([]);
        }
      }
    };

    void loadCategoryFields();

    return () => {
      isActive = false;
    };
  }, []);

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

    setFormData(previousForm => {
      const nextForm = {
        ...previousForm,
        [name]: value
      };

      if (name === "category") {
        nextForm.customFields = {};
      }

      return nextForm;
    });

    setTouchedFields(previousFields => ({
      ...previousFields,
      [name]: true
    }));

    autoSaveFailureFingerprintRef.current =
      null;

    setAutoSaveStatus("pending");
  };

  const handleCustomFieldChange = (
    fieldKey,
    value
  ) => {
    setFormData(previousForm => ({
      ...previousForm,
      customFields: {
        ...(previousForm.customFields || {}),
        [fieldKey]: value
      }
    }));

    setTouchedFields(previousFields => ({
      ...previousFields,
      [`field-${fieldKey}`]: true
    }));

    autoSaveFailureFingerprintRef.current = null;
    setAutoSaveStatus("pending");
  };

  const saveChanges = useCallback(
    async (
      sourceFormData,
      {
        showSuccessToast = false
      } = {}
    ) => {
      const validationMessage =
        getFormValidationMessage(
          sourceFormData,
          selectedCategoryFields
        );

      if (validationMessage) {
        setAutoSaveStatus("waiting");

        if (showSuccessToast) {
          setTouchedFields({
            title: true,
            category: true,
            description: true,
            ...Object.fromEntries(
              selectedCategoryFields.map(field => [
                `field-${field.key}`,
                true
              ])
            )
          });

          window.setTimeout(() => {
            document
              .querySelector(
                ".edit-request-form-card [aria-invalid=\"true\"]"
              )
              ?.focus();
          }, 0);

          showError(validationMessage);
        }

        return false;
      }

      const updatePayload = {
        title:
          sourceFormData.title.trim(),

        category:
          sourceFormData.category,

        priority:
          sourceFormData.priority,

        status:
          canChangeStatus
            ? sourceFormData.status
            : sourceFormData.status ||
              "Open",

        description:
          sourceFormData.description.trim(),

        customFields:
          sourceFormData.customFields || {}
      };

      const saveFingerprint =
        JSON.stringify(
          normalizeFormData(updatePayload)
        );

      setIsSaving(true);
      setAutoSaveStatus("saving");

      try {
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

        setTicket(previousTicket => ({
          ...previousTicket,
          ...responseTicket,
          ...updatePayload,
          updatedAt
        }));

        setSavedFormData(updatePayload);
        setLastSavedAt(new Date());
        setAutoSaveStatus("saved");

        autoSaveFailureFingerprintRef.current =
          null;

        if (showSuccessToast) {
          success(
            "Request was updated successfully."
          );
        }

        await loadActivities();

        return true;
      } catch (requestError) {
        console.error(
          "Request could not be updated:",
          requestError
        );

        const errorMessage =
          getUpdateErrorMessage(
            requestError
          );

        autoSaveFailureFingerprintRef.current =
          saveFingerprint;

        setAutoSaveStatus("error");

        showError(errorMessage, {
          duration: 6000
        });

        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      canChangeStatus,
      id,
      loadActivities,
      selectedCategoryFields,
      showError,
      success
    ]
  );

  useEffect(() => {
    if (
      isLoading ||
      !ticket ||
      !savedFormData ||
      !hasUnsavedChanges ||
      isSaving ||
      isDeleting ||
      isDeleteConfirmOpen
    ) {
      return undefined;
    }

    const validationMessage =
      getFormValidationMessage(
        formData,
        selectedCategoryFields
      );

    if (validationMessage) {
      setAutoSaveStatus("waiting");
      return undefined;
    }

    const formFingerprint =
      JSON.stringify(
        normalizeFormData(formData)
      );

    if (
      autoSaveFailureFingerprintRef.current ===
      formFingerprint
    ) {
      return undefined;
    }

    setAutoSaveStatus("pending");

    const autoSaveTimer = window.setTimeout(
      () => {
        void saveChanges(formData);
      },
      AUTO_SAVE_DELAY
    );

    return () => {
      window.clearTimeout(autoSaveTimer);
    };
  }, [
    formData,
    hasUnsavedChanges,
    isDeleteConfirmOpen,
    isDeleting,
    isLoading,
    isSaving,
    savedFormData,
    saveChanges,
    selectedCategoryFields,
    ticket
  ]);

  const handleSubmit = async event => {
    event.preventDefault();

    if (!hasUnsavedChanges) {
      return;
    }

    await saveChanges(formData, {
      showSuccessToast: true
    });
  };

  const handleDelete = async () => {
    setDeleteError("");
    setIsDeleteConfirmOpen(true);

    let confirmed;

    try {
      confirmed = await confirm({
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
    } finally {
      setIsDeleteConfirmOpen(false);
    }

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

      const errorMessage =
        getDeleteErrorMessage(
          requestError
        );

      setDeleteError(errorMessage);

      showError(errorMessage, {
        duration: 7000
      });
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

  const validationErrors =
    getFormValidationErrors(
      formData,
      selectedCategoryFields
    );

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

          <AutoSaveStatus
            status={autoSaveStatus}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSavedAt={lastSavedAt}
          />
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
                isSaving ||
                isDeleteConfirmOpen
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

      {deleteError && (
        <div
          className="edit-request-delete-error"
          role="alert"
        >
          <AlertCircle size={18} />

          <span>
            {deleteError}
          </span>
        </div>
      )}

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
                  aria-invalid={
                    Boolean(
                      touchedFields.title &&
                        validationErrors.title
                    )
                  }
                  aria-describedby={
                    touchedFields.title &&
                    validationErrors.title
                      ? "edit-title-error"
                      : undefined
                  }
                />

                {touchedFields.title &&
                  validationErrors.title && (
                    <span
                      id="edit-title-error"
                      className="request-field-error"
                      role="alert"
                    >
                      {validationErrors.title}
                    </span>
                  )}
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
                  aria-invalid={
                    Boolean(
                      touchedFields.category &&
                        validationErrors.category
                    )
                  }
                  aria-describedby={
                    touchedFields.category &&
                    validationErrors.category
                      ? "edit-category-error"
                      : undefined
                  }
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

                {touchedFields.category &&
                  validationErrors.category && (
                    <span
                      id="edit-category-error"
                      className="request-field-error"
                      role="alert"
                    >
                      {validationErrors.category}
                    </span>
                  )}
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
                <label htmlFor="edit-request-id">
                  Request ID
                </label>

                <input
                  id="edit-request-id"
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
                  aria-invalid={
                    Boolean(
                      touchedFields.description &&
                        validationErrors.description
                    )
                  }
                  aria-describedby={
                    touchedFields.description &&
                    validationErrors.description
                      ? "edit-description-error"
                      : undefined
                  }
                />

                {touchedFields.description &&
                  validationErrors.description && (
                    <span
                      id="edit-description-error"
                      className="request-field-error"
                      role="alert"
                    >
                      {validationErrors.description}
                    </span>
                  )}
              </div>

              {selectedCategoryFields.length > 0 && (
                <fieldset className="request-custom-fields edit-request-custom-fields edit-request-full-width">
                  <legend>
                    <span>Category details</span>
                    <small>
                      Information required for {formData.category}
                    </small>
                  </legend>

                  <div className="request-custom-fields-grid">
                    {selectedCategoryFields.map(field => (
                      <EditCustomField
                        key={field.id}
                        field={field}
                        value={
                          formData.customFields?.[field.key] || ""
                        }
                        errorMessage={
                          validationErrors[`field-${field.key}`]
                        }
                        isTouched={
                          touchedFields[`field-${field.key}`]
                        }
                        disabled={isSaving || isDeleting}
                        onChange={value =>
                          handleCustomFieldChange(
                            field.key,
                            value
                          )
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              )}
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
                  isDeleting ||
                  isDeleteConfirmOpen
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
                  isDeleteConfirmOpen ||
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

function EditCustomField({
  field,
  value,
  errorMessage,
  isTouched,
  disabled,
  onChange
}) {
  const inputId = `edit-field-${field.key}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const showError = isTouched && errorMessage;
  const describedBy = [
    field.helpText ? helpId : null,
    showError ? errorId : null
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const commonProps = {
    id: inputId,
    value,
    disabled,
    required: field.isRequired,
    "aria-invalid": Boolean(showError),
    "aria-describedby": describedBy
  };

  let control;

  if (field.fieldType === "textarea") {
    control = (
      <textarea
        {...commonProps}
        rows={4}
        maxLength={1000}
        placeholder={field.placeholder || ""}
        onChange={event => onChange(event.target.value)}
      />
    );
  } else if (field.fieldType === "select") {
    control = (
      <select
        {...commonProps}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">
          {field.placeholder || "Select an option"}
        </option>
        {(field.options || []).map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        {...commonProps}
        type={
          field.fieldType === "date" ||
          field.fieldType === "number"
            ? field.fieldType
            : "text"
        }
        step={
          field.fieldType === "number"
            ? "0.01"
            : undefined
        }
        maxLength={
          field.fieldType === "text"
            ? 1000
            : undefined
        }
        placeholder={field.placeholder || ""}
        onChange={event => onChange(event.target.value)}
      />
    );
  }

  return (
    <div
      className={`edit-request-form-group request-custom-field ${
        field.fieldType === "textarea"
          ? "wide"
          : ""
      }`}
    >
      <label htmlFor={inputId}>
        {field.label}
        {field.isRequired && <span>*</span>}
      </label>

      {control}

      {field.helpText && (
        <small id={helpId}>
          {field.helpText}
        </small>
      )}

      {showError && (
        <span
          id={errorId}
          className="request-field-error"
          role="alert"
        >
          {errorMessage}
        </span>
      )}
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

function AutoSaveStatus({
  status,
  hasUnsavedChanges,
  lastSavedAt
}) {
  let Icon = CheckCircle2;
  let label = "All changes saved";
  let state = "saved";

  if (status === "saving") {
    Icon = LoaderCircle;
    label = "Saving changes...";
    state = "saving";
  } else if (status === "error") {
    Icon = AlertCircle;
    label =
      "Autosave failed. Use Update Request to retry.";
    state = "error";
  } else if (status === "waiting") {
    Icon = AlertCircle;
    label =
      "Complete required fields to autosave.";
    state = "waiting";
  } else if (
    status === "pending" ||
    hasUnsavedChanges
  ) {
    Icon = Clock3;
    label = "Autosave pending...";
    state = "pending";
  } else if (lastSavedAt) {
    label = `Saved at ${lastSavedAt.toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}`;
  }

  return (
    <span
      className={`edit-request-save-status ${state}`}
      role={state === "error" ? "alert" : "status"}
    >
      <Icon
        className={
          state === "saving"
            ? "edit-request-spinner"
            : undefined
        }
        size={14}
      />

      {label}
    </span>
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
      ).trim(),

    customFields: Object.fromEntries(
      Object.entries(
        form?.customFields || {}
      )
        .map(([key, value]) => [
          String(key),
          String(value || "").trim()
        ])
        .sort(([firstKey], [secondKey]) =>
          firstKey.localeCompare(secondKey)
        )
    )
  };
}

function getFormValidationMessage(
  form,
  categoryFields = []
) {
  return (
    Object.values(
      getFormValidationErrors(
        form,
        categoryFields
      )
    )[0] || ""
  );
}

function getFormValidationErrors(
  form,
  categoryFields = []
) {
  const errors = {};

  if (!String(form?.title || "").trim()) {
    errors.title = "Request title is required.";
  }

  if (!String(form?.category || "").trim()) {
    errors.category =
      "Please select a request category.";
  }

  if (!String(form?.description || "").trim()) {
    errors.description =
      "Request description is required.";
  }

  categoryFields.forEach(field => {
    const value = String(
      form?.customFields?.[field.key] || ""
    ).trim();

    if (field.isRequired && !value) {
      errors[`field-${field.key}`] =
        `${field.label} is required.`;
    }
  });

  return errors;
}

function getUpdateErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to update this request.";
  }

  if (status === 404) {
    return "This request no longer exists.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    "Request changes could not be saved. Please try again."
  );
}

function getDeleteErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to delete this request.";
  }

  if (status === 404) {
    return "This request has already been deleted.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    "Request could not be deleted. Please try again."
  );
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
