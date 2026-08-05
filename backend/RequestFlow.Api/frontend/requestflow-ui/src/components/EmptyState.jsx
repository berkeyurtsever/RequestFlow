import { Inbox } from "lucide-react";

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction
}) {
  return (
    <div className="rf-empty-state">
      <div className="rf-empty-state-icon">
        <Icon size={30} strokeWidth={1.8} />
      </div>

      <h2>{title}</h2>

      {description && (
        <p>{description}</p>
      )}

      {(actionText || secondaryActionText) && (
        <div className="rf-empty-state-actions">
          {secondaryActionText && (
            <button
              type="button"
              className="rf-empty-state-secondary"
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </button>
          )}

          {actionText && (
            <button
              type="button"
              className="rf-empty-state-primary"
              onClick={onAction}
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;