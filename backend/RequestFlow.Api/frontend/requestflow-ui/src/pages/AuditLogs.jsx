import {
  FileClock,
  LoaderCircle,
  Search
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState
} from "react";
import api from "../services/api";

function AuditLogs() {
  const [data, setData] = useState({
    items: [],
    page: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/audit-logs", {
        params: {
          page,
          pageSize: 25,
          search: activeSearch || undefined
        }
      });
      setData(response.data);
    } catch (requestError) {
      console.error("Audit logs could not be loaded:", requestError);
      setError("Audit logs could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSearch]);

  useEffect(() => {
    void loadLogs(1);
  }, [loadLogs]);

  const submitSearch = event => {
    event.preventDefault();
    setActiveSearch(search.trim());
  };

  return (
    <div className="audit-page">
      <header className="audit-header">
        <div>
          <span className="page-eyebrow">SECURITY</span>
          <h1>Administrative Audit Log</h1>
          <p>
            Review sensitive management changes and automated SLA events.
          </p>
        </div>
        <span className="audit-count">
          {data.totalCount} records
        </span>
      </header>

      <section className="audit-card">
        <form className="audit-search" onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search actor, action or summary..."
            aria-label="Search audit logs"
          />
          <button type="submit">Search</button>
        </form>

        {error && <div className="audit-error" role="alert">{error}</div>}

        {isLoading ? (
          <div className="audit-loading" role="status">
            <LoaderCircle className="login-button-spinner" size={28} />
            Loading audit records...
          </div>
        ) : data.items.length === 0 ? (
          <div className="audit-empty">
            <FileClock size={30} />
            <strong>No audit records found</strong>
            <span>Administrative changes will appear here.</span>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <caption className="sr-only">Administrative audit records</caption>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(log => (
                  <tr key={log.id}>
                    <td className="audit-date" data-label="When">
                      {formatDate(log.createdAt)}
                    </td>
                    <td data-label="Actor">
                      <strong className="audit-actor-name">
                        {log.actorName}
                      </strong>
                      <span className="audit-actor-role">
                        {log.actorRole}
                      </span>
                    </td>
                    <td data-label="Action">
                      <code className="audit-action">
                        {log.action}
                      </code>
                    </td>
                    <td className="audit-target" data-label="Target">
                      {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td className="audit-details" data-label="Details">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="audit-pagination">
          <button
            type="button"
            disabled={data.page <= 1 || isLoading}
            onClick={() => loadLogs(data.page - 1)}
          >
            Previous
          </button>
          <span>Page {data.page} of {Math.max(data.totalPages, 1)}</span>
          <button
            type="button"
            disabled={data.page >= data.totalPages || isLoading}
            onClick={() => loadLogs(data.page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
}

export default AuditLogs;
