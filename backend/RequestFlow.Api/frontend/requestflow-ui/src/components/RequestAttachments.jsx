import {
  AlertCircle,
  Download,
  File,
  FileImage,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  UploadCloud
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_FILE_COUNT = 5;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "zip"
];

const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.csv,.zip";

function RequestAttachments({
  ticketId,
  canModerate = false,
  onActivityChanged,
  onFilesChange,
  disabled = false
}) {
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const inputRef = useRef(null);

  const [files, setFiles] =
    useState([]);

  const [isDragging, setIsDragging] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(Boolean(ticketId));

  const [isUploading, setIsUploading] =
    useState(false);

  const [
    deletingAttachmentId,
    setDeletingAttachmentId
  ] = useState(null);

  const [
    downloadingAttachmentId,
    setDownloadingAttachmentId
  ] = useState(null);

  const [loadError, setLoadError] =
    useState("");

  const isServerMode =
    Boolean(ticketId);

  const loadAttachments = useCallback(
    async () => {
      if (!ticketId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response = await api.get(
          `/Tickets/${ticketId}/attachments`
        );

        setFiles(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (requestError) {
        console.error(
          "Attachments could not be loaded:",
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
            "You do not have permission to view these attachments."
          );
        } else if (status === 404) {
          setLoadError(
            "The request could not be found."
          );
        } else {
          setLoadError(
            requestError.response?.data
              ?.message ||
              "Attachments could not be loaded."
          );
        }

        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const isInputDisabled =
    disabled ||
    isUploading ||
    isLoading ||
    files.length >= MAX_FILE_COUNT;

  const openFilePicker = () => {
    if (isInputDisabled) {
      return;
    }

    inputRef.current?.click();
  };

  const validateFiles = selectedFiles => {
    const incomingFiles =
      Array.from(selectedFiles || []);

    if (incomingFiles.length === 0) {
      return [];
    }

    const availableFileCount =
      MAX_FILE_COUNT - files.length;

    if (availableFileCount <= 0) {
      showError(
        `You can attach a maximum of ${MAX_FILE_COUNT} files.`
      );

      return [];
    }

    const acceptedFiles = [];
    const rejectedMessages = [];

    incomingFiles
      .slice(0, availableFileCount)
      .forEach(file => {
        const extension =
          getFileExtension(file.name);

        if (
          !ALLOWED_EXTENSIONS.includes(
            extension
          )
        ) {
          rejectedMessages.push(
            `${file.name}: unsupported file type`
          );

          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          rejectedMessages.push(
            `${file.name}: exceeds 10 MB`
          );

          return;
        }

        const isDuplicate =
          files.some(currentFile => {
            const currentFileName =
              isServerMode
                ? currentFile.originalFileName
                : currentFile.name;

            const currentFileSize =
              isServerMode
                ? currentFile.fileSize
                : currentFile.size;

            return (
              currentFileName === file.name &&
              Number(currentFileSize) ===
                Number(file.size)
            );
          }) ||
          acceptedFiles.some(currentFile =>
            currentFile.name === file.name &&
            currentFile.size === file.size
          );

        if (isDuplicate) {
          rejectedMessages.push(
            `${file.name}: already added`
          );

          return;
        }

        acceptedFiles.push(file);
      });

    if (
      incomingFiles.length >
      availableFileCount
    ) {
      rejectedMessages.push(
        `Only ${availableFileCount} more file(s) can be added`
      );
    }

    if (rejectedMessages.length > 0) {
      showError(
        rejectedMessages.join(". ")
      );
    }

    return acceptedFiles;
  };

  const uploadFiles = async selectedFiles => {
    setIsUploading(true);

    const uploadedAttachments = [];
    const uploadErrors = [];

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();

        formData.append("file", file);

        try {
          const response = await api.post(
            `/Tickets/${ticketId}/attachments`,
            formData
          );

          uploadedAttachments.push(
            response.data
          );
        } catch (requestError) {
          console.error(
            `${file.name} could not be uploaded:`,
            requestError
          );

          uploadErrors.push(
            requestError.response?.data
              ?.message ||
              `${file.name} could not be uploaded`
          );
        }
      }

      if (uploadedAttachments.length > 0) {
        setFiles(previousFiles => [
          ...uploadedAttachments,
          ...previousFiles
        ]);

        success(
          `${uploadedAttachments.length} ${
            uploadedAttachments.length === 1
              ? "file was"
              : "files were"
          } uploaded successfully.`
        );

        await onActivityChanged?.();
      }

      if (uploadErrors.length > 0) {
        showError(
          uploadErrors.join(". ")
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const addFiles = async selectedFiles => {
    if (isInputDisabled) {
      return;
    }

    const acceptedFiles =
      validateFiles(selectedFiles);

    if (acceptedFiles.length === 0) {
      return;
    }

    if (isServerMode) {
      await uploadFiles(acceptedFiles);
      return;
    }

    const updatedFiles = [
      ...files,
      ...acceptedFiles
    ];

    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);

    success(
      `${acceptedFiles.length} ${
        acceptedFiles.length === 1
          ? "file was"
          : "files were"
      } added.`
    );
  };

  const handleInputChange = event => {
    void addFiles(event.target.files);

    event.target.value = "";
  };

  const handleDragEnter = event => {
    event.preventDefault();
    event.stopPropagation();

    if (!isInputDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragOver = event => {
    event.preventDefault();
    event.stopPropagation();

    if (!isInputDisabled) {
      event.dataTransfer.dropEffect =
        "copy";

      setIsDragging(true);
    }
  };

  const handleDragLeave = event => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.currentTarget.contains(
        event.relatedTarget
      )
    ) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = event => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    if (isInputDisabled) {
      return;
    }

    void addFiles(
      event.dataTransfer.files
    );
  };

  const removeLocalFile = fileIndex => {
    const updatedFiles =
      files.filter(
        (_, index) =>
          index !== fileIndex
      );

    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const deleteServerAttachment =
    async attachment => {
      const canDelete =
        Boolean(attachment.canDelete) ||
        canModerate;

      if (!canDelete) {
        showError(
          "You do not have permission to delete this attachment."
        );
        return;
      }

      const confirmed = await confirm({
        title: "Delete this attachment?",
        message:
          `"${attachment.originalFileName}" will be permanently removed from the request.`,
        confirmText: "Delete Attachment",
        cancelText: "Cancel",
        variant: "danger"
      });

      if (!confirmed) {
        return;
      }

      setDeletingAttachmentId(
        attachment.id
      );

      try {
        await api.delete(
          `/Tickets/${ticketId}/attachments/${attachment.id}`
        );

        setFiles(previousFiles =>
          previousFiles.filter(
            currentAttachment =>
              currentAttachment.id !==
              attachment.id
          )
        );

        success(
          "Attachment was deleted successfully."
        );

        await onActivityChanged?.();
      } catch (requestError) {
        console.error(
          "Attachment could not be deleted:",
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
            "You do not have permission to delete this attachment."
          );
        } else if (status === 404) {
          showError(
            "The attachment could not be found."
          );
        } else {
          showError(
            requestError.response?.data
              ?.message ||
              "Attachment could not be deleted."
          );
        }
      } finally {
        setDeletingAttachmentId(null);
      }
    };

  const downloadAttachment =
    async attachment => {
      setDownloadingAttachmentId(
        attachment.id
      );

      try {
        const response = await api.get(
          `/Tickets/${ticketId}/attachments/${attachment.id}/download`,
          {
            responseType: "blob"
          }
        );

        const blobUrl =
          window.URL.createObjectURL(
            response.data
          );

        const downloadLink =
          document.createElement("a");

        downloadLink.href = blobUrl;
        downloadLink.download =
          attachment.originalFileName ||
          "attachment";

        document.body.appendChild(
          downloadLink
        );

        downloadLink.click();
        downloadLink.remove();

        window.URL.revokeObjectURL(
          blobUrl
        );
      } catch (requestError) {
        console.error(
          "Attachment could not be downloaded:",
          requestError
        );

        showError(
          "Attachment could not be downloaded."
        );
      } finally {
        setDownloadingAttachmentId(
          null
        );
      }
    };

  return (
    <section className="request-attachments-card">
      <div className="request-attachments-header">
        <div className="request-attachments-header-icon">
          <Paperclip size={21} />
        </div>

        <div>
          <h2>Attachments</h2>

          <p>
            Add supporting documents, screenshots
            or request files.
          </p>
        </div>

        <span className="request-attachments-count">
          {files.length}/{MAX_FILE_COUNT}
        </span>
      </div>

      <div className="request-attachments-content">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          hidden
          disabled={isInputDisabled}
          onChange={handleInputChange}
        />

        <div
          className={`request-attachment-dropzone ${
            isDragging
              ? "dragging"
              : ""
          } ${
            isInputDisabled
              ? "disabled"
              : ""
          }`}
          role="button"
          tabIndex={
            isInputDisabled ? -1 : 0
          }
          onClick={openFilePicker}
          onKeyDown={event => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-disabled={isInputDisabled}
        >
          <div className="request-attachment-upload-icon">
            {isUploading ? (
              <LoaderCircle
                size={28}
                className="login-button-spinner"
              />
            ) : (
              <UploadCloud size={28} />
            )}
          </div>

          <strong>
            {isUploading
              ? "Uploading files..."
              : "Drag and drop files here"}
          </strong>

          <span>
            {files.length >= MAX_FILE_COUNT
              ? "Maximum file count reached"
              : "or click to browse from your computer"}
          </span>

          <small>
            PDF, images, Office files, TXT, CSV or
            ZIP · Maximum 10 MB per file
          </small>
        </div>

        {isLoading ? (
          <div className="request-attachments-empty-note">
            <LoaderCircle
              size={16}
              className="login-button-spinner"
            />

            <span>
              Loading attachments...
            </span>
          </div>
        ) : loadError ? (
          <div className="request-attachments-empty-note">
            <AlertCircle size={16} />

            <span>{loadError}</span>

            <button
              type="button"
              onClick={loadAttachments}
            >
              Try Again
            </button>
          </div>
        ) : files.length > 0 ? (
          <div className="request-attachment-list">
            {files.map(
              (
                file,
                index
              ) => {
                const fileName =
                  isServerMode
                    ? file.originalFileName
                    : file.name;

                const fileSize =
                  isServerMode
                    ? file.fileSize
                    : file.size;

                const FileIcon =
                  getFileIcon(fileName);

                const canDelete =
                  !isServerMode ||
                  Boolean(file.canDelete) ||
                  canModerate;

                const isDeleting =
                  deletingAttachmentId ===
                  file.id;

                const isDownloading =
                  downloadingAttachmentId ===
                  file.id;

                return (
                  <article
                    key={
                      isServerMode
                        ? file.id
                        : `${file.name}-${file.size}-${index}`
                    }
                    className="request-attachment-item"
                  >
                    <div className="request-attachment-file-icon">
                      <FileIcon size={20} />
                    </div>

                    <div className="request-attachment-file-info">
                      <strong>
                        {fileName}
                      </strong>

                      <span>
                        {formatFileSize(
                          fileSize
                        )}

                        {isServerMode &&
                          file.uploadedByName &&
                          ` · ${file.uploadedByName}`}
                      </span>
                    </div>

                    <span className="request-attachment-ready-badge">
                      {isServerMode
                        ? "Uploaded"
                        : "Ready"}
                    </span>

                    {isServerMode && (
                      <button
                        type="button"
                        className="request-attachment-download-button"
                        onClick={() =>
                          downloadAttachment(
                            file
                          )
                        }
                        disabled={
                          isDownloading ||
                          isDeleting
                        }
                        aria-label={`Download ${fileName}`}
                        title="Download file"
                      >
                        {isDownloading ? (
                          <LoaderCircle
                            size={15}
                            className="login-button-spinner"
                          />
                        ) : (
                          <Download size={15} />
                        )}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="request-attachment-remove-button"
                        onClick={() => {
                          if (isServerMode) {
                            void deleteServerAttachment(
                              file
                            );
                          } else {
                            removeLocalFile(
                              index
                            );
                          }
                        }}
                        disabled={
                          disabled ||
                          isDeleting ||
                          isDownloading
                        }
                        aria-label={`Remove ${fileName}`}
                        title="Remove file"
                      >
                        {isDeleting ? (
                          <LoaderCircle
                            size={15}
                            className="login-button-spinner"
                          />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    )}
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="request-attachments-empty-note">
            <AlertCircle size={14} />

            <span>
              No files have been attached to this
              request.
            </span>
          </div>
        )}
      </div>

      <div className="request-attachments-storage-note">
        <File size={14} />

        <span>
          {isServerMode
            ? "Attachments are securely stored on the RequestFlow server."
            : "Selected files will be uploaded after the request is created."}
        </span>
      </div>
    </section>
  );
}

function getFileExtension(fileName) {
  const name = String(
    fileName || ""
  );

  if (!name.includes(".")) {
    return "";
  }

  return name
    .split(".")
    .pop()
    .toLowerCase();
}

function getFileIcon(fileName) {
  const extension =
    getFileExtension(fileName);

  if (
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "webp"
  ) {
    return FileImage;
  }

  if (
    extension === "pdf" ||
    extension === "doc" ||
    extension === "docx" ||
    extension === "txt"
  ) {
    return FileText;
  }

  return File;
}

function formatFileSize(fileSize) {
  const size = Number(
    fileSize || 0
  );

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default RequestAttachments;