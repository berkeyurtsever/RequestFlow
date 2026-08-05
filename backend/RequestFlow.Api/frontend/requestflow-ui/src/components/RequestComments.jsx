import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  MessageSquare,
  Send,
  Trash2
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const COMMENT_LIMIT = 1000;

function RequestComments({
  ticketId,
  canModerate = false,
  onActivityChanged
}) {
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [
    deletingCommentId,
    setDeletingCommentId
  ] = useState(null);

  const [loadError, setLoadError] = useState("");

  const currentUserId = String(
    user?.id ||
      user?.userId ||
      user?.sub ||
      ""
  );

  const currentUserName =
    user?.fullName ||
    user?.name ||
    user?.email ||
    "RequestFlow User";

  const loadComments = useCallback(async () => {
    if (!ticketId) {
      setComments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const response = await api.get(
        `/Tickets/${ticketId}/comments`
      );

      const loadedComments = Array.isArray(response.data)
        ? response.data
        : [];

      setComments(loadedComments);
    } catch (requestError) {
      console.error(
        "Comments could not be loaded:",
        requestError
      );

      const status = requestError.response?.status;

      if (status === 401) {
        setLoadError(
          "Your session has expired. Please sign in again."
        );
      } else if (status === 403) {
        setLoadError(
          "You do not have permission to view these comments."
        );
      } else if (status === 404) {
        setLoadError(
          "The request could not be found."
        );
      } else {
        setLoadError(
          requestError.response?.data?.message ||
            "Comments could not be loaded."
        );
      }

      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const sortedComments = useMemo(() => {
    return [...comments].sort(
      (firstComment, secondComment) =>
        getTimestamp(secondComment.createdAt) -
        getTimestamp(firstComment.createdAt)
    );
  }, [comments]);

  const refreshActivityTimeline = async () => {
    try {
      await onActivityChanged?.();
    } catch (activityError) {
      console.error(
        "Activity timeline could not be refreshed:",
        activityError
      );
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const trimmedComment = commentText.trim();

    if (!trimmedComment) {
      showError(
        "Write a comment before sending."
      );
      return;
    }

    if (trimmedComment.length > COMMENT_LIMIT) {
      showError(
        `Comments cannot exceed ${COMMENT_LIMIT} characters.`
      );
      return;
    }

    if (!ticketId) {
      showError(
        "The request could not be found."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(
        `/Tickets/${ticketId}/comments`,
        {
          content: trimmedComment
        }
      );

      const createdComment = response.data;

      if (!createdComment) {
        throw new Error(
          "The server did not return the created comment."
        );
      }

      setComments(previousComments => [
        createdComment,
        ...previousComments
      ]);

      setCommentText("");

      success(
        "Comment was added successfully."
      );

      await refreshActivityTimeline();
    } catch (requestError) {
      console.error(
        "Comment could not be added:",
        requestError
      );

      const status = requestError.response?.status;

      if (status === 400) {
        showError(
          requestError.response?.data?.message ||
            requestError.response?.data?.title ||
            "The comment is not valid."
        );
      } else if (status === 401) {
        showError(
          "Your session has expired. Please sign in again."
        );
      } else if (status === 403) {
        showError(
          "You do not have permission to add a comment."
        );
      } else if (status === 404) {
        showError(
          "The request could not be found."
        );
      } else {
        showError(
          requestError.response?.data?.message ||
            "Comment could not be added."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async comment => {
    const canDeleteComment =
      Boolean(comment.canDelete) ||
      canModerate;

    if (!canDeleteComment) {
      showError(
        "You can only delete your own comments."
      );
      return;
    }

    const confirmed = await confirm({
      title: "Delete this comment?",
      message:
        "This comment will be permanently removed from the request.",
      confirmText: "Delete Comment",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (!confirmed) {
      return;
    }

    setDeletingCommentId(comment.id);

    try {
      await api.delete(
        `/Tickets/${ticketId}/comments/${comment.id}`
      );

      setComments(previousComments =>
        previousComments.filter(
          currentComment =>
            currentComment.id !== comment.id
        )
      );

      success(
        "Comment was deleted successfully."
      );

      await refreshActivityTimeline();
    } catch (requestError) {
      console.error(
        "Comment could not be deleted:",
        requestError
      );

      const status = requestError.response?.status;

      if (status === 401) {
        showError(
          "Your session has expired. Please sign in again."
        );
      } else if (status === 403) {
        showError(
          "You do not have permission to delete this comment."
        );
      } else if (status === 404) {
        showError(
          "The comment could not be found."
        );

        await loadComments();
      } else {
        showError(
          requestError.response?.data?.message ||
            "Comment could not be deleted."
        );
      }
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <section className="request-comments-card">
      <div className="request-comments-header">
        <div className="request-comments-header-icon">
          <MessageSquare size={21} />
        </div>

        <div>
          <h2>Comments</h2>

          <p>
            Communicate with the request owner and
            assigned staff.
          </p>
        </div>

        <span className="request-comments-count">
          {comments.length}{" "}
          {comments.length === 1
            ? "comment"
            : "comments"}
        </span>
      </div>

      <form
        className="request-comment-form"
        onSubmit={handleSubmit}
      >
        <div className="request-comment-avatar">
          {getInitials(currentUserName)}
        </div>

        <div className="request-comment-input-area">
          <textarea
            value={commentText}
            onChange={event =>
              setCommentText(event.target.value)
            }
            placeholder="Write a comment..."
            maxLength={COMMENT_LIMIT}
            rows={4}
            disabled={isSubmitting}
            aria-label="Write a request comment"
          />

          <div className="request-comment-form-footer">
            <span>
              {commentText.length}/{COMMENT_LIMIT}
            </span>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !commentText.trim()
              }
            >
              {isSubmitting ? (
                <LoaderCircle
                  size={15}
                  className="login-button-spinner"
                />
              ) : (
                <Send size={15} />
              )}

              <span>
                {isSubmitting
                  ? "Sending..."
                  : "Send Comment"}
              </span>
            </button>
          </div>
        </div>
      </form>

      <div className="request-comments-list">
        {isLoading ? (
          <div className="request-comments-empty">
            <LoaderCircle
              size={29}
              className="login-button-spinner"
            />

            <strong>
              Loading comments...
            </strong>

            <span>
              Comments are being retrieved from the
              server.
            </span>
          </div>
        ) : loadError ? (
          <div className="request-comments-empty">
            <AlertCircle size={29} />

            <strong>
              Comments could not be loaded
            </strong>

            <span>
              {loadError}
            </span>

            <button
              type="button"
              onClick={loadComments}
            >
              Try Again
            </button>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="request-comments-empty">
            <MessageSquare size={29} />

            <strong>
              No comments yet
            </strong>

            <span>
              Start the conversation by adding the
              first comment.
            </span>
          </div>
        ) : (
          sortedComments.map(comment => {
            const isOwnComment =
              String(comment.authorUserId) ===
              currentUserId;

            const canDeleteComment =
              Boolean(comment.canDelete) ||
              canModerate;

            const isDeleting =
              deletingCommentId === comment.id;

            return (
              <article
                key={comment.id}
                className="request-comment-item"
              >
                <div className="request-comment-item-avatar">
                  {getInitials(
                    comment.authorName
                  )}
                </div>

                <div className="request-comment-item-content">
                  <div className="request-comment-item-header">
                    <div>
                      <strong>
                        {comment.authorName ||
                          "RequestFlow User"}
                      </strong>

                      {isOwnComment && (
                        <span>You</span>
                      )}

                      {comment.authorRole && (
                        <span>
                          {comment.authorRole}
                        </span>
                      )}
                    </div>

                    <time
                      dateTime={comment.createdAt}
                    >
                      {formatCommentDate(
                        comment.createdAt
                      )}
                    </time>
                  </div>

                  <p>
                    {comment.content}
                  </p>
                </div>

                {canDeleteComment && (
                  <button
                    type="button"
                    className="request-comment-delete-button"
                    onClick={() =>
                      handleDelete(comment)
                    }
                    disabled={isDeleting}
                    aria-label="Delete comment"
                    title="Delete comment"
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
          })
        )}
      </div>

      <div className="request-comments-storage-note">
        <CheckCircle2 size={14} />

        <span>
          Comments are synchronized with the
          RequestFlow server and stored in the
          database.
        </span>
      </div>
    </section>
  );
}

function getInitials(name) {
  const initials = String(name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "U";
}

function getTimestamp(dateValue) {
  const date = new Date(dateValue || 0);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
}

function formatCommentDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default RequestComments;