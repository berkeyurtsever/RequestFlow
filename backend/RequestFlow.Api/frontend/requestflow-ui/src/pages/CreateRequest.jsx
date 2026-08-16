import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  FileClock,
  Info,
  LayoutTemplate,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import RequestAttachments from "../components/RequestAttachments";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const priorityOptions = [
  "Low",
  "Medium",
  "High",
  "Urgent"
];

function createInitialFormData(
  defaultPriority = "Medium"
) {
  const priority =
    priorityOptions.includes(
      defaultPriority
    )
      ? defaultPriority
      : "Medium";

  return {
    title: "",
    category: "",
    priority,
    description: "",
    customFields: {}
  };
}

const departmentCategoryGroups = [
  {
    department: "Information Technology",
    categories: [
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
    department: "Human Resources",
    categories: [
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
    department: "Finance",
    categories: [
      "Expense Request",
      "Invoice Request",
      "Payment Request",
      "Budget Request",
      "Reimbursement Request",
      "Purchase Approval"
    ]
  },
  {
    department: "Administrative Affairs",
    categories: [
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
    department: "Operations",
    categories: [
      "Equipment Request",
      "Maintenance Request",
      "Inventory Request",
      "Logistics Request",
      "Operational Support"
    ]
  },
  {
    department: "General",
    categories: [
      "General Request",
      "Suggestion",
      "Complaint",
      "Other"
    ]
  }
];

const responseTimeInformation = {
  Low: {
    title: "Within 3–5 business days",
    description:
      "Suitable for requests that do not require immediate action.",
    className: "low"
  },
  Medium: {
    title: "Within 1–2 business days",
    description:
      "Suitable for standard requests that should be processed soon.",
    className: "medium"
  },
  High: {
    title: "Within 1 business day",
    description:
      "Suitable for important issues affecting daily work.",
    className: "high"
  },
  Urgent: {
    title: "Within 2 working hours",
    description:
      "Use only for critical issues that prevent normal business operations.",
    className: "urgent"
  }
};

const DRAFT_VERSION = 1;
const DRAFT_SAVE_DELAY = 650;

function CreateRequest() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    info,
    error: showError
  } = useToast();

  const [formData, setFormData] =
    useState(() =>
      createInitialFormData()
    );

  const [requestTemplates, setRequestTemplates] =
    useState([]);

  const [categoryFields, setCategoryFields] =
    useState([]);

  const [isRequestSetupLoading, setIsRequestSetupLoading] =
    useState(true);

  const [
    systemDefaultPriority,
    setSystemDefaultPriority
  ] = useState("Medium");

  const [
    isSystemSettingsReady,
    setIsSystemSettingsReady
  ] = useState(false);

  const [formErrors, setFormErrors] =
    useState({});

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isDraftReady, setIsDraftReady] =
    useState(false);

  const [
    isDraftSaving,
    setIsDraftSaving
  ] = useState(false);

  const [
    hasStoredDraft,
    setHasStoredDraft
  ] = useState(false);

  const [
    lastDraftSavedAt,
    setLastDraftSavedAt
  ] = useState(null);

  const [
    attachmentFiles,
    setAttachmentFiles
  ] = useState([]);

  const [
    attachmentResetKey,
    setAttachmentResetKey
  ] = useState(0);

  const submittedRef = useRef(false);

  const skipNextAutosaveRef =
    useRef(false);

  const restoredDraftKeyRef =
    useRef(null);

  const priorityTouchedRef =
    useRef(false);

  const validationSummaryRef =
    useRef(null);

  const currentUserIdentifier =
    user?.id ??
    user?.userId ??
    user?.sub ??
    user?.email ??
    null;

  const draftStorageKey = useMemo(() => {
    if (!currentUserIdentifier) {
      return null;
    }

    return `requestflow_create_request_draft_${currentUserIdentifier}`;
  }, [currentUserIdentifier]);

  const selectedResponseTime =
    useMemo(() => {
      return (
        responseTimeInformation[
          formData.priority
        ] ||
        responseTimeInformation.Medium
      );
    }, [formData.priority]);

  const selectedCategoryFields =
    useMemo(() => {
      return categoryFields.filter(field =>
        field.category === formData.category
      );
    }, [categoryFields, formData.category]);

  const hasDraftContent = useMemo(() => {
    return hasMeaningfulDraftData(
      formData
    );
  }, [formData]);

  const hasSelectedAttachments =
    attachmentFiles.length > 0;

  const hasEnteredInformation =
    hasDraftContent ||
    hasSelectedAttachments;

  const clearAttachments =
    useCallback(() => {
      setAttachmentFiles([]);

      setAttachmentResetKey(
        previousKey =>
          previousKey + 1
      );
    }, []);

  const clearDraftStorage =
    useCallback(() => {
      if (draftStorageKey) {
        try {
          localStorage.removeItem(
            draftStorageKey
          );
        } catch (storageError) {
          console.error(
            "Draft could not be removed:",
            storageError
          );
        }
      }

      setHasStoredDraft(false);
      setLastDraftSavedAt(null);
      setIsDraftSaving(false);
    }, [draftStorageKey]);

  const saveDraftToStorage =
    useCallback(
      draftData => {
        if (
          !draftStorageKey ||
          submittedRef.current
        ) {
          return false;
        }

        if (
          !hasMeaningfulDraftData(
            draftData
          )
        ) {
          clearDraftStorage();
          return false;
        }

        try {
          const savedAt =
            new Date().toISOString();

          localStorage.setItem(
            draftStorageKey,
            JSON.stringify({
              version: DRAFT_VERSION,
              formData:
                sanitizeDraftForm(
                  draftData,
                  systemDefaultPriority
                ),
              savedAt
            })
          );

          setHasStoredDraft(true);
          setLastDraftSavedAt(savedAt);
          setIsDraftSaving(false);

          return true;
        } catch (storageError) {
          console.error(
            "Draft could not be saved:",
            storageError
          );

          setIsDraftSaving(false);

          return false;
        }
      },
      [
        clearDraftStorage,
        draftStorageKey,
        systemDefaultPriority
      ]
    );

  useEffect(() => {
    let isActive = true;

    const loadSystemSettings =
      async () => {
        try {
          const response =
            await api.get(
              "/Settings"
            );

          const loadedPriority =
            priorityOptions.includes(
              response.data
                ?.defaultPriority
            )
              ? response.data
                  .defaultPriority
              : "Medium";

          if (!isActive) {
            return;
          }

          setSystemDefaultPriority(
            loadedPriority
          );
        } catch (requestError) {
          if (
            ![401, 403].includes(
              requestError.response?.status
            )
          ) {
            console.error(
              "Default request priority could not be loaded:",
              requestError
            );
          }

          if (isActive) {
            setSystemDefaultPriority(
              "Medium"
            );
          }
        } finally {
          if (isActive) {
            setIsSystemSettingsReady(
              true
            );
          }
        }
      };

    void loadSystemSettings();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadRequestSetup = async () => {
      setIsRequestSetupLoading(true);

      try {
        const [templatesResponse, fieldsResponse] =
          await Promise.all([
            api.get("/RequestTemplates"),
            api.get("/CategoryFields")
          ]);

        if (!isActive) {
          return;
        }

        setRequestTemplates(
          Array.isArray(templatesResponse.data)
            ? templatesResponse.data
            : []
        );

        setCategoryFields(
          Array.isArray(fieldsResponse.data)
            ? fieldsResponse.data
            : []
        );
      } catch (requestError) {
        console.error(
          "Request templates and category fields could not be loaded:",
          requestError
        );

        if (isActive) {
          setRequestTemplates([]);
          setCategoryFields([]);
        }
      } finally {
        if (isActive) {
          setIsRequestSetupLoading(false);
        }
      }
    };

    void loadRequestSetup();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isSystemSettingsReady) {
      return;
    }

    if (
      !draftStorageKey ||
      restoredDraftKeyRef.current ===
        draftStorageKey
    ) {
      if (!draftStorageKey) {
        setFormData(
          previousData => ({
            ...previousData,
            priority:
              priorityTouchedRef.current
                ? previousData.priority
                : systemDefaultPriority
          })
        );

        setIsDraftReady(true);
      }

      return;
    }

    restoredDraftKeyRef.current =
      draftStorageKey;

    setIsDraftReady(false);

    try {
      const storedValue =
        localStorage.getItem(
          draftStorageKey
        );

      if (!storedValue) {
        setFormData(
          previousData => ({
            ...previousData,
            priority:
              priorityTouchedRef.current
                ? previousData.priority
                : systemDefaultPriority
          })
        );

        setHasStoredDraft(false);
        setLastDraftSavedAt(null);
        setIsDraftReady(true);

        return;
      }

      const parsedDraft =
        JSON.parse(storedValue);

      const restoredForm =
        sanitizeDraftForm(
          parsedDraft?.formData,
          systemDefaultPriority
        );

      if (
        parsedDraft?.version !==
          DRAFT_VERSION ||
        !hasMeaningfulDraftData(
          restoredForm
        )
      ) {
        localStorage.removeItem(
          draftStorageKey
        );

        setFormData(
          previousData => ({
            ...previousData,
            priority:
              priorityTouchedRef.current
                ? previousData.priority
                : systemDefaultPriority
          })
        );

        setHasStoredDraft(false);
        setLastDraftSavedAt(null);
        setIsDraftReady(true);

        return;
      }

      skipNextAutosaveRef.current =
        true;

      setFormData(restoredForm);
      setHasStoredDraft(true);

      setLastDraftSavedAt(
        parsedDraft.savedAt || null
      );

      info(
        "Your unfinished request has been restored."
      );
    } catch (storageError) {
      console.error(
        "Draft could not be restored:",
        storageError
      );

      try {
        localStorage.removeItem(
          draftStorageKey
        );
      } catch {
        // Local storage is unavailable.
      }

      setFormData(
        previousData => ({
          ...previousData,
          priority:
            priorityTouchedRef.current
              ? previousData.priority
              : systemDefaultPriority
        })
      );

      setHasStoredDraft(false);
      setLastDraftSavedAt(null);
    } finally {
      setIsDraftReady(true);
    }
  }, [
    draftStorageKey,
    info,
    isSystemSettingsReady,
    systemDefaultPriority
  ]);

  useEffect(() => {
    if (
      !isDraftReady ||
      !draftStorageKey ||
      submittedRef.current
    ) {
      return;
    }

    if (
      skipNextAutosaveRef.current
    ) {
      skipNextAutosaveRef.current =
        false;

      return;
    }

    const timer =
      window.setTimeout(() => {
        saveDraftToStorage(
          formData
        );
      }, DRAFT_SAVE_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    draftStorageKey,
    formData,
    isDraftReady,
    saveDraftToStorage
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        submittedRef.current ||
        !draftStorageKey ||
        !hasMeaningfulDraftData(
          formData
        )
      ) {
        return;
      }

      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            version: DRAFT_VERSION,
            formData:
              sanitizeDraftForm(
                formData,
                systemDefaultPriority
              ),
            savedAt:
              new Date().toISOString()
          })
        );
      } catch (storageError) {
        console.error(
          "Draft could not be saved before leaving:",
          storageError
        );
      }
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
  }, [
    draftStorageKey,
    formData,
    systemDefaultPriority
  ]);

  const handleInputChange = event => {
    const {
      name,
      value
    } = event.target;

    if (name === "priority") {
      priorityTouchedRef.current =
        true;
    }

    setFormData(
      previousData => {
        const nextData = {
          ...previousData,
          [name]: value
        };

        if (name === "category") {
          nextData.customFields = {};
        }

        return nextData;
      }
    );

    setFormErrors(previousErrors => {
      if (!previousErrors[name]) {
        return previousErrors;
      }

      const nextErrors = {
        ...previousErrors
      };

      delete nextErrors[name];
      return nextErrors;
    });

    setError("");
    setIsDraftSaving(true);
  };

  const handleApplyTemplate = template => {
    if (!template) {
      return;
    }

    priorityTouchedRef.current = true;

    setFormData(previousData => ({
      ...previousData,
      title: template.title || "",
      category: template.category || "",
      priority: priorityOptions.includes(template.priority)
        ? template.priority
        : previousData.priority,
      description: template.description || "",
      customFields: {}
    }));

    setFormErrors({});
    setError("");
    setIsDraftSaving(true);

    info(
      `The "${template.name}" template was applied.`
    );
  };

  const handleCustomFieldChange = (
    fieldKey,
    value
  ) => {
    setFormData(previousData => ({
      ...previousData,
      customFields: {
        ...(previousData.customFields || {}),
        [fieldKey]: value
      }
    }));

    setFormErrors(previousErrors => {
      const errorKey = `field-${fieldKey}`;

      if (!previousErrors[errorKey]) {
        return previousErrors;
      }

      const nextErrors = {
        ...previousErrors
      };

      delete nextErrors[errorKey];
      return nextErrors;
    });

    setError("");
    setIsDraftSaving(true);
  };

  const validateForm = () => {
    const errors = {};

    const trimmedTitle =
      formData.title.trim();

    const trimmedDescription =
      formData.description.trim();

    if (!trimmedTitle) {
      errors.title =
        "Request title is required.";
    } else if (
      trimmedTitle.length < 3
    ) {
      errors.title =
        "Request title must contain at least 3 characters.";
    } else if (
      trimmedTitle.length > 150
    ) {
      errors.title =
        "Request title cannot exceed 150 characters.";
    }

    if (!formData.category) {
      errors.category =
        "Category is required.";
    }

    if (
      !priorityOptions.includes(
        formData.priority
      )
    ) {
      errors.priority =
        "Priority is required.";
    }

    if (!trimmedDescription) {
      errors.description =
        "Request description is required.";
    } else if (
      trimmedDescription.length < 10
    ) {
      errors.description =
        "Description must contain at least 10 characters.";
    } else if (
      trimmedDescription.length > 500
    ) {
      errors.description =
        "Description cannot exceed 500 characters.";
    }

    selectedCategoryFields.forEach(field => {
      const value = String(
        formData.customFields?.[field.key] || ""
      ).trim();

      if (field.isRequired && !value) {
        errors[`field-${field.key}`] =
          `${field.label} is required.`;
      }
    });

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => {
        validationSummaryRef.current?.focus();
      }, 0);
    }

    return (
      Object.keys(errors).length === 0
    );
  };

  const uploadAttachments = async (
    ticketId,
    selectedFiles
  ) => {
    const uploadedFiles = [];
    const failedFiles = [];

    for (const file of selectedFiles) {
      const attachmentFormData =
        new FormData();

      attachmentFormData.append(
        "file",
        file
      );

      try {
        await api.post(
          `/Tickets/${ticketId}/attachments`,
          attachmentFormData
        );

        uploadedFiles.push(
          file.name
        );
      } catch (uploadError) {
        console.error(
          `${file.name} could not be uploaded:`,
          uploadError
        );

        failedFiles.push({
          name: file.name,
          message:
            uploadError.response?.data
              ?.message ||
            uploadError.response?.data
              ?.detail ||
            "Upload failed."
        });
      }
    }

    return {
      uploadedFiles,
      failedFiles
    };
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!validateForm()) {
      showError(
        "Please correct the highlighted fields."
      );

      return;
    }

    setIsSubmitting(true);
    setError("");

    const selectedAttachments = [
      ...attachmentFiles
    ];

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      priority: formData.priority,
      description:
        formData.description.trim(),
      customFields:
        formData.customFields || {},
      status: "Open"
    };

    try {
      const ticketResponse =
        await api.post(
          "/Tickets",
          payload
        );

      const createdTicket =
        ticketResponse.data;

      const createdTicketId =
        createdTicket?.id;

      if (!createdTicketId) {
        throw new Error(
          "The request was created, but its ID was not returned by the server."
        );
      }

      let uploadedFileCount = 0;
      let failedFiles = [];

      if (
        selectedAttachments.length > 0
      ) {
        const uploadResult =
          await uploadAttachments(
            createdTicketId,
            selectedAttachments
          );

        uploadedFileCount =
          uploadResult
            .uploadedFiles
            .length;

        failedFiles =
          uploadResult.failedFiles;
      }

      submittedRef.current = true;

      clearDraftStorage();
      clearAttachments();

      priorityTouchedRef.current =
        false;

      setFormData(
        createInitialFormData(
          systemDefaultPriority
        )
      );

      setFormErrors({});

      if (
        selectedAttachments.length === 0
      ) {
        success(
          "Your request was submitted successfully."
        );
      } else if (
        uploadedFileCount ===
        selectedAttachments.length
      ) {
        success(
          uploadedFileCount === 1
            ? "Your request and attachment were submitted successfully."
            : `Your request and ${uploadedFileCount} attachments were submitted successfully.`
        );
      } else if (
        uploadedFileCount > 0
      ) {
        success(
          `The request was created and ${uploadedFileCount} attachment(s) were uploaded.`
        );

        showError(
          `${failedFiles.length} attachment(s) could not be uploaded: ${failedFiles
            .map(file => file.name)
            .join(", ")}`
        );
      } else {
        success(
          "Your request was created successfully."
        );

        showError(
          "The selected attachments could not be uploaded. They can be uploaded from the Edit Request page."
        );
      }

      window.setTimeout(() => {
        navigate(
          `/requests/edit/${createdTicketId}`,
          {
            replace: true
          }
        );
      }, 900);
    } catch (requestError) {
      console.error(
        "Request could not be created:",
        requestError
      );

      const status =
        requestError.response?.status;

      const message =
        requestError.response?.data
          ?.message ||
        requestError.response?.data
          ?.detail ||
        requestError.message;

      let errorMessage =
        "The request could not be submitted. Check the backend connection.";

      if (status === 400) {
        errorMessage =
          message ||
          "Check the request information and try again.";
      } else if (status === 401) {
        errorMessage =
          "Your session has expired. Please sign in again.";
      } else if (status === 403) {
        errorMessage =
          "You do not have permission to create a request.";
      } else if (message) {
        errorMessage = message;
      }

      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardDraft =
    async () => {
      const confirmed =
        await confirm({
          title:
            "Discard this draft?",
          message:
            "All information and selected attachments in this request form will be cleared.",
          confirmText:
            "Discard Draft",
          cancelText:
            "Keep Draft",
          variant: "danger"
        });

      if (!confirmed) {
        return;
      }

      clearDraftStorage();
      clearAttachments();

      skipNextAutosaveRef.current =
        true;

      priorityTouchedRef.current =
        false;

      setFormData(
        createInitialFormData(
          systemDefaultPriority
        )
      );

      setFormErrors({});
      setError("");

      info(
        "The request draft was discarded."
      );
    };

  const handleCancel =
    async () => {
      if (!hasEnteredInformation) {
        navigate("/requests");
        return;
      }

      if (hasDraftContent) {
        saveDraftToStorage(
          formData
        );
      }

      const message =
        hasSelectedAttachments
          ? "Your form information will be saved as a draft. Selected attachments cannot be stored in the browser and must be selected again when you return."
          : "Your current information has been saved as a draft and will be restored when you return.";

      const confirmed =
        await confirm({
          title:
            "Leave this page?",
          message,
          confirmText:
            "Leave Page",
          cancelText:
            "Keep Editing",
          variant: "warning"
        });

      if (!confirmed) {
        return;
      }

      navigate("/requests");
    };

  const draftStatusTitle =
    useMemo(() => {
      if (isDraftSaving) {
        return "Saving draft...";
      }

      if (
        hasStoredDraft &&
        lastDraftSavedAt
      ) {
        return `Draft saved ${formatDraftTime(
          lastDraftSavedAt
        )}`;
      }

      if (hasDraftContent) {
        return "Draft protection active";
      }

      return "Auto-save ready";
    }, [
      hasDraftContent,
      hasStoredDraft,
      isDraftSaving,
      lastDraftSavedAt
    ]);

  const validationErrors =
    Object.entries(formErrors).filter(
      ([, message]) =>
        Boolean(message)
    );

  return (
    <div className="create-request-page">
      <div className="create-request-header">
        <div>
          <span className="page-eyebrow">
            WORKSPACE
          </span>

          <h1>Create Request</h1>

          <p>
            Complete the form below to submit a new
            company request.
          </p>
        </div>

        <div className="create-request-header-actions">
          {hasEnteredInformation && (
            <button
              type="button"
              className="create-request-discard-draft-button"
              onClick={
                handleDiscardDraft
              }
              disabled={isSubmitting}
            >
              <Trash2 size={16} />

              <span>
                Discard Draft
              </span>
            </button>
          )}

          <button
            type="button"
            className="create-request-back-button"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft size={16} />

            <span>
              Back to Requests
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="request-page-error"
          role="alert"
        >
          <div className="create-request-message-content">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <section
          ref={validationSummaryRef}
          className="request-validation-summary"
          role="alert"
          aria-labelledby="request-validation-title"
          tabIndex={-1}
        >
          <AlertCircle size={20} aria-hidden="true" />

          <div>
            <h2 id="request-validation-title">
              Check the required information
            </h2>

            <ul>
              {validationErrors.map(
                ([fieldName, message]) => (
                  <li key={fieldName}>
                    <a
                      href={`#request-${fieldName}`}
                    >
                      {message}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </section>
      )}

      <section
        className="request-template-picker"
        aria-labelledby="request-template-title"
      >
        <div className="request-template-heading">
          <div className="request-template-heading-icon">
            <LayoutTemplate size={20} />
          </div>

          <div>
            <span>QUICK START</span>
            <h2 id="request-template-title">
              Start from a template
            </h2>
            <p>
              Choose a common request to prefill the form, then review the details.
            </p>
          </div>
        </div>

        {isRequestSetupLoading ? (
          <div
            className="request-template-loading"
            role="status"
          >
            <LoaderCircle
              size={18}
              className="login-button-spinner"
            />
            Loading templates...
          </div>
        ) : requestTemplates.length > 0 ? (
          <div className="request-template-list">
            {requestTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className={
                  formData.category === template.category &&
                  formData.title === template.title
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  handleApplyTemplate(template)
                }
                disabled={isSubmitting}
              >
                <span className="request-template-icon">
                  <Sparkles size={17} />
                </span>
                <span>
                  <strong>{template.name}</strong>
                  <small>{template.category}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="request-template-empty">
            No templates are available. You can still complete the form manually.
          </p>
        )}
      </section>

      <div className="create-request-layout">
        <form
          className="request-form-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="request-form-card-header">
            <div>
              <h2>
                Request Information
              </h2>

              <p>
                Provide clear information so the
                request can be processed correctly.
              </p>
            </div>

            <div
              className={`create-request-inline-draft-status ${
                isDraftSaving
                  ? "saving"
                  : hasStoredDraft
                    ? "saved"
                    : ""
              }`}
              aria-live="polite"
            >
              {isDraftSaving ? (
                <LoaderCircle
                  size={14}
                  className="login-button-spinner"
                />
              ) : (
                <FileClock size={14} />
              )}

              <span>
                {draftStatusTitle}
              </span>
            </div>
          </div>

          <div className="request-form-content">
            <div className="request-form-group">
              <label htmlFor="request-title">
                Request Title
                <span>*</span>
              </label>

              <input
                id="request-title"
                name="title"
                type="text"
                maxLength={150}
                placeholder="Enter a short request title"
                value={formData.title}
                onChange={
                  handleInputChange
                }
                disabled={isSubmitting}
                className={
                  formErrors.title
                    ? "request-input-error"
                    : ""
                }
                aria-invalid={
                  Boolean(formErrors.title)
                }
                aria-describedby={
                  formErrors.title
                    ? "request-title-error request-title-count"
                    : "request-title-count"
                }
              />

              <div className="request-field-footer">
                <span
                  id="request-title-error"
                  className="request-field-error"
                  role={
                    formErrors.title
                      ? "alert"
                      : undefined
                  }
                >
                  {formErrors.title}
                </span>

                <small id="request-title-count">
                  {formData.title.length}
                  /150
                </small>
              </div>
            </div>

            <div className="request-form-row">
              <div className="request-form-group">
                <label htmlFor="request-category">
                  Category
                  <span>*</span>
                </label>

                <select
                  id="request-category"
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={
                    handleInputChange
                  }
                  disabled={isSubmitting}
                  className={
                    formErrors.category
                      ? "request-input-error"
                      : ""
                  }
                  aria-invalid={
                    Boolean(
                      formErrors.category
                    )
                  }
                  aria-describedby={
                    formErrors.category
                      ? "request-category-error"
                      : undefined
                  }
                >
                  <option value="">
                    Select a category
                  </option>

                  {departmentCategoryGroups.map(
                    group => (
                      <optgroup
                        key={
                          group.department
                        }
                        label={
                          group.department
                        }
                      >
                        {group.categories.map(
                          category => (
                            <option
                              key={`${group.department}-${category}`}
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

                <div className="request-field-footer">
                  <span
                    id="request-category-error"
                    className="request-field-error"
                    role={
                      formErrors.category
                        ? "alert"
                        : undefined
                    }
                  >
                    {
                      formErrors.category
                    }
                  </span>
                </div>
              </div>

              <div className="request-form-group">
                <label htmlFor="request-priority">
                  Priority
                  <span>*</span>
                </label>

                <select
                  id="request-priority"
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleInputChange
                  }
                  disabled={isSubmitting}
                  className={
                    formErrors.priority
                      ? "request-input-error"
                      : ""
                  }
                  aria-invalid={
                    Boolean(
                      formErrors.priority
                    )
                  }
                  aria-describedby={
                    formErrors.priority
                      ? "request-priority-error"
                      : undefined
                  }
                >
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
                </select>

                <div className="request-field-footer">
                  <span
                    id="request-priority-error"
                    className="request-field-error"
                    role={
                      formErrors.priority
                        ? "alert"
                        : undefined
                    }
                  >
                    {
                      formErrors.priority
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="request-form-group">
              <label htmlFor="request-description">
                Description
                <span>*</span>
              </label>

              <textarea
                id="request-description"
                name="description"
                maxLength={500}
                placeholder="Describe your request in detail..."
                value={
                  formData.description
                }
                onChange={
                  handleInputChange
                }
                disabled={isSubmitting}
                className={
                  formErrors.description
                    ? "request-input-error"
                    : ""
                }
                aria-invalid={
                  Boolean(
                    formErrors.description
                  )
                }
                aria-describedby={
                  formErrors.description
                    ? "request-description-error request-description-count"
                    : "request-description-count"
                }
              />

              <div className="request-field-footer">
                <span
                  id="request-description-error"
                  className="request-field-error"
                  role={
                    formErrors.description
                      ? "alert"
                      : undefined
                  }
                >
                  {
                    formErrors.description
                  }
                </span>

                <small id="request-description-count">
                  {
                    formData.description
                      .length
                  }
                  /500
                </small>
              </div>
            </div>

            {selectedCategoryFields.length > 0 && (
              <fieldset className="request-custom-fields">
                <legend>
                  <span>Category details</span>
                  <small>
                    Information required for {formData.category}
                  </small>
                </legend>

                <div className="request-custom-fields-grid">
                  {selectedCategoryFields.map(field => (
                    <CustomFieldInput
                      key={field.id}
                      field={field}
                      value={
                        formData.customFields?.[field.key] || ""
                      }
                      errorMessage={
                        formErrors[`field-${field.key}`]
                      }
                      disabled={isSubmitting}
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

            <RequestAttachments
              key={
                attachmentResetKey
              }
              disabled={
                isSubmitting
              }
              onFilesChange={
                setAttachmentFiles
              }
            />
          </div>

          <div className="request-form-actions">
            <button
              type="button"
              className="request-cancel-button"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="request-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle
                  className="login-button-spinner"
                  size={16}
                />
              ) : (
                <Send size={16} />
              )}

              <span>
                {isSubmitting
                  ? attachmentFiles.length > 0
                    ? "Submitting and Uploading..."
                    : "Submitting..."
                  : "Submit Request"}
              </span>
            </button>
          </div>
        </form>

        <aside className="create-request-sidebar">
          <section className="create-request-draft-card">
            <div className="create-request-draft-icon">
              {isDraftSaving ? (
                <LoaderCircle
                  size={21}
                  className="login-button-spinner"
                />
              ) : (
                <FileClock size={21} />
              )}
            </div>

            <div>
              <span>
                Draft protection
              </span>

              <strong>
                {draftStatusTitle}
              </strong>

              <p>
                Your unfinished request information
                is stored only in this browser and
                restored when you return.
              </p>
            </div>
          </section>

          <section className="create-request-help-card">
            <div className="create-request-help-icon">
              <Info size={22} />
            </div>

            <h2>
              Before submitting
            </h2>

            <p>
              Provide enough detail to help the
              assigned employee understand and
              process your request.
            </p>

            <div className="create-request-tips">
              <CreateRequestTip
                title="Use a clear title"
                description="Summarize the request in a few words."
              />

              <CreateRequestTip
                title="Select the correct category"
                description="Choose the department and category related to your request."
              />

              <CreateRequestTip
                title="Choose a realistic priority"
                description="Use urgent priority only for critical issues."
              />

              <CreateRequestTip
                title="Add useful details"
                description="Include device, system, location or deadline information when relevant."
              />
            </div>
          </section>

          <section
            className={`create-request-response-card ${selectedResponseTime.className}`}
          >
            <div className="create-request-response-icon">
              <Clock3 size={21} />
            </div>

            <div>
              <span>
                Estimated response time
              </span>

              <strong>
                {
                  selectedResponseTime.title
                }
              </strong>

              <p>
                {
                  selectedResponseTime.description
                }
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CreateRequestTip({
  title,
  description
}) {
  return (
    <div className="create-request-tip">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  errorMessage,
  disabled,
  onChange
}) {
  const inputId = `request-field-${field.key}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [
    field.helpText ? helpId : null,
    errorMessage ? errorId : null
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const commonProps = {
    id: inputId,
    value,
    disabled,
    required: field.isRequired,
    "aria-invalid": Boolean(errorMessage),
    "aria-describedby": describedBy,
    className: errorMessage
      ? "request-input-error"
      : ""
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
      className={`request-form-group request-custom-field ${
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

      {errorMessage && (
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

function sanitizeDraftForm(
  value,
  defaultPriority = "Medium"
) {
  const fallbackPriority =
    priorityOptions.includes(
      defaultPriority
    )
      ? defaultPriority
      : "Medium";

  const priority =
    priorityOptions.includes(
      value?.priority
    )
      ? value.priority
      : fallbackPriority;

  return {
    title: String(
      value?.title || ""
    ).slice(0, 150),

    category: String(
      value?.category || ""
    ),

    priority,

    description: String(
      value?.description || ""
    ).slice(0, 500),

    customFields:
      value?.customFields &&
      typeof value.customFields === "object" &&
      !Array.isArray(value.customFields)
        ? Object.fromEntries(
            Object.entries(value.customFields)
              .map(([key, fieldValue]) => [
                String(key).slice(0, 80),
                String(fieldValue || "").slice(0, 1000)
              ])
          )
        : {}
  };
}

function hasMeaningfulDraftData(value) {
  return Boolean(
    String(
      value?.title || ""
    ).trim() ||
      String(
        value?.category || ""
      ).trim() ||
      String(
        value?.description || ""
      ).trim() ||
      Object.values(
        value?.customFields || {}
      ).some(fieldValue =>
        String(fieldValue || "").trim()
      )
  );
}

function formatDraftTime(dateValue) {
  if (!dateValue) {
    return "recently";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "recently";
  }

  return `at ${date.toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  )}`;
}

export default CreateRequest;
