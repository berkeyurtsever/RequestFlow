import {
  BookOpenCheck,
  FileText,
  LoaderCircle,
  Search,
  UserRound
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";

function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const { t } = useLanguage();
  const query = searchParams.get("query") || "";
  const [draftQuery, setDraftQuery] = useState(query);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftQuery(query);

    if (query.trim().length < 2) {
      setItems([]);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError("");

    const loadResults = async () => {
      try {
        const response = await api.get("/search", {
          params: {
            query: query.trim(),
            limit: 30
          }
        });

        if (isActive) {
          setItems(
            Array.isArray(response.data?.items)
              ? response.data.items
              : []
          );
        }
      } catch (requestError) {
        console.error(
          "Global search results could not be loaded:",
          requestError
        );

        if (isActive) {
          setItems([]);
          setError(t("search.error"));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadResults();

    return () => {
      isActive = false;
    };
  }, [query, t]);

  const groups = useMemo(() => {
    return ["request", "knowledge", "person"]
      .map(type => ({
        type,
        items: items.filter(item => item.type === type)
      }))
      .filter(group => group.items.length > 0);
  }, [items]);

  const submitSearch = event => {
    event.preventDefault();

    const normalizedQuery = draftQuery.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    setSearchParams({ query: normalizedQuery });
  };

  return (
    <div className="global-search-page">
      <header className="global-search-header">
        <span className="page-eyebrow">
          {t("search.eyebrow")}
        </span>
        <h1>{t("search.title")}</h1>
        <p>{t("search.description")}</p>
      </header>

      <form
        className="global-search-form"
        onSubmit={submitSearch}
      >
        <Search size={21} aria-hidden="true" />
        <input
          type="search"
          value={draftQuery}
          onChange={event => setDraftQuery(event.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
        />
        <button type="submit">
          {t("search.submit")}
        </button>
      </form>

      <section className="global-search-summary" aria-live="polite">
        <strong>
          {query
            ? t("search.summary", {
                count: items.length,
                query
              })
            : t("search.start")}
        </strong>
      </section>

      {isLoading ? (
        <div className="global-search-state">
          <LoaderCircle className="login-button-spinner" />
          <span>{t("search.loading")}</span>
        </div>
      ) : error ? (
        <div className="global-search-state error">
          <Search />
          <strong>{error}</strong>
        </div>
      ) : query && groups.length === 0 ? (
        <div className="global-search-state">
          <Search />
          <strong>{t("search.empty")}</strong>
          <span>{t("search.emptyHelp")}</span>
        </div>
      ) : (
        <div className="global-search-groups">
          {groups.map(group => (
            <section key={group.type} className="global-search-group">
              <div className="global-search-group-heading">
                <span>{getGroupTitle(group.type, t)}</span>
                <strong>{group.items.length}</strong>
              </div>
              <div className="global-search-list">
                {group.items.map(item => {
                  const Icon = getResultIcon(item.type);

                  return (
                    <button
                      type="button"
                      key={`${item.type}-${item.id}`}
                      className="global-search-result"
                      onClick={() => navigate(item.url)}
                    >
                      <span className={`global-search-result-icon ${item.type}`}>
                        <Icon size={19} />
                      </span>
                      <span className="global-search-result-copy">
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                      <span className="global-search-result-meta">
                        {item.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function getResultIcon(type) {
  if (type === "knowledge") {
    return BookOpenCheck;
  }

  if (type === "person") {
    return UserRound;
  }

  return FileText;
}

function getGroupTitle(type, t) {
  if (type === "knowledge") {
    return t("search.group.knowledge");
  }

  if (type === "person") {
    return t("search.group.people");
  }

  return t("search.group.requests");
}

export default SearchResults;
