function SkeletonBlock({
  className = ""
}) {
  return (
    <span
      className={`rf-skeleton-block ${className}`}
    />
  );
}

export function StatCardsSkeleton({
  count = 4
}) {
  return (
    <div
      className="rf-skeleton-stats-grid"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map(
        (_, index) => (
          <div
            className="rf-skeleton-stat-card"
            key={index}
          >
            <SkeletonBlock className="rf-skeleton-stat-icon" />

            <div className="rf-skeleton-stat-content">
              <SkeletonBlock className="rf-skeleton-stat-label" />
              <SkeletonBlock className="rf-skeleton-stat-value" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 7,
  showToolbar = true
}) {
  return (
    <div
      className="rf-table-skeleton"
      aria-hidden="true"
    >
      {showToolbar && (
        <div className="rf-skeleton-toolbar">
          <SkeletonBlock className="rf-skeleton-search" />

          <div className="rf-skeleton-filter-group">
            <SkeletonBlock className="rf-skeleton-filter" />
            <SkeletonBlock className="rf-skeleton-filter" />
            <SkeletonBlock className="rf-skeleton-filter" />
          </div>
        </div>
      )}

      <div className="rf-skeleton-table">
        <div
          className="rf-skeleton-table-row header"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))`
          }}
        >
          {Array.from({
            length: columns
          }).map((_, index) => (
            <SkeletonBlock
              className="rf-skeleton-table-header"
              key={index}
            />
          ))}
        </div>

        {Array.from({ length: rows }).map(
          (_, rowIndex) => (
            <div
              className="rf-skeleton-table-row"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))`
              }}
              key={rowIndex}
            >
              {Array.from({
                length: columns
              }).map((_, columnIndex) => (
                <SkeletonBlock
                  className={
                    columnIndex === 1
                      ? "rf-skeleton-table-cell wide"
                      : "rf-skeleton-table-cell"
                  }
                  key={columnIndex}
                />
              ))}
            </div>
          )
        )}
      </div>

      <div className="rf-skeleton-pagination">
        <SkeletonBlock className="rf-skeleton-pagination-text" />

        <div>
          <SkeletonBlock className="rf-skeleton-page-button" />
          <SkeletonBlock className="rf-skeleton-page-button" />
          <SkeletonBlock className="rf-skeleton-page-button" />
        </div>
      </div>
    </div>
  );
}