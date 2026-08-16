import {
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  FileText,
  Lightbulb,
  LoaderCircle,
  Search,
  Send,
  X
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

const FILTERS = [
  { value: "all", label: "All content" },
  { value: "Guide", label: "Guides" },
  { value: "Faq", label: "FAQs" }
];

function KnowledgeBase() {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const dialogCloseButtonRef = useRef(null);
  const [articles, setArticles] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadArticles = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.get("/KnowledgeBase");

        if (isActive) {
          setArticles(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch (requestError) {
        console.error(
          "Knowledge base could not be loaded:",
          requestError
        );

        if (isActive) {
          setError(
            requestError.response?.data?.message ||
              "Knowledge base content could not be loaded."
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadArticles();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedArticle) {
      return undefined;
    }

    const previouslyFocusedElement =
      document.activeElement;

    const focusTimer = window.setTimeout(() => {
      dialogCloseButtonRef.current?.focus();
    }, 0);

    const handleDialogKeyDown = event => {
      if (event.key === "Escape") {
        setSelectedArticle(null);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = [
        ...(dialogRef.current?.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        ) || [])
      ].filter(element => !element.disabled);

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleDialogKeyDown
    );

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener(
        "keydown",
        handleDialogKeyDown
      );
      previouslyFocusedElement?.focus();
    };
  }, [selectedArticle]);

  const categories = useMemo(() => {
    return [...new Set(
      articles.map(article => article.category)
    )].sort((first, second) =>
      first.localeCompare(second)
    );
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return articles.filter(article => {
      const matchesType =
        activeType === "all" ||
        article.articleType === activeType;

      const matchesCategory =
        activeCategory === "all" ||
        article.category === activeCategory;

      const searchableText = [
        article.title,
        article.summary,
        article.content,
        article.category,
        article.keywords
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesType &&
        matchesCategory &&
        (
          !normalizedSearch ||
          searchableText.includes(normalizedSearch)
        )
      );
    });
  }, [
    activeCategory,
    activeType,
    articles,
    searchText
  ]);

  const guides = filteredArticles.filter(
    article => article.articleType === "Guide"
  );

  const faqs = filteredArticles.filter(
    article => article.articleType === "Faq"
  );

  return (
    <div className="knowledge-page">
      <header className="knowledge-page-header">
        <div>
          <span className="knowledge-page-eyebrow">
            HELP CENTER
          </span>

          <h1>Knowledge Base</h1>

          <p>
            Find practical guides and quick answers before creating a request.
          </p>
        </div>

        <button
          type="button"
          className="knowledge-create-button"
          onClick={() => navigate("/requests/create")}
        >
          <Send size={17} aria-hidden="true" />
          Create Request
        </button>
      </header>

      <section
        className="knowledge-search-card"
        aria-label="Search knowledge base"
      >
        <BookOpenCheck size={27} aria-hidden="true" />

        <div>
          <strong>How can we help?</strong>
          <span>
            Search by topic, feature or question.
          </span>
        </div>

        <label className="knowledge-search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">
            Search the knowledge base
          </span>
          <input
            type="search"
            value={searchText}
            onChange={event =>
              setSearchText(event.target.value)
            }
            placeholder="Search guides and FAQs..."
          />

          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </label>
      </section>

      <div className="knowledge-toolbar">
        <div
          className="knowledge-type-filters"
          aria-label="Content type"
        >
          {FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              className={
                activeType === filter.value
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveType(filter.value)
              }
              aria-pressed={
                activeType === filter.value
              }
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="knowledge-category-filter">
          <span>Category</span>
          <select
            value={activeCategory}
            onChange={event =>
              setActiveCategory(event.target.value)
            }
          >
            <option value="all">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="knowledge-state" role="status">
          <LoaderCircle
            className="login-button-spinner"
            size={28}
          />
          <span>Loading help content...</span>
        </div>
      ) : error ? (
        <div className="knowledge-state error" role="alert">
          <CircleHelp size={28} />
          <strong>Help content is unavailable</strong>
          <span>{error}</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="knowledge-state">
          <Search size={28} />
          <strong>No matching content</strong>
          <span>
            Try another keyword or remove a filter.
          </span>
        </div>
      ) : (
        <div className="knowledge-content-grid">
          {(activeType === "all" || activeType === "Guide") && (
            <section
              className="knowledge-section"
              aria-labelledby="knowledge-guides-title"
            >
              <div className="knowledge-section-heading">
                <div className="knowledge-section-icon">
                  <FileText size={19} />
                </div>
                <div>
                  <h2 id="knowledge-guides-title">
                    Guides
                  </h2>
                  <p>Step-by-step request guidance.</p>
                </div>
                <span>{guides.length}</span>
              </div>

              <div className="knowledge-guide-list">
                {guides.map(article => (
                  <button
                    key={article.id}
                    type="button"
                    className="knowledge-guide-card"
                    onClick={() =>
                      setSelectedArticle(article)
                    }
                  >
                    <div>
                      <span>{article.category}</span>
                      <h3>{article.title}</h3>
                      <p>{article.summary}</p>
                    </div>
                    <strong>Read guide</strong>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeType === "all" || activeType === "Faq") && (
            <section
              className="knowledge-section"
              aria-labelledby="knowledge-faq-title"
            >
              <div className="knowledge-section-heading">
                <div className="knowledge-section-icon faq">
                  <CircleHelp size={19} />
                </div>
                <div>
                  <h2 id="knowledge-faq-title">
                    Frequently Asked Questions
                  </h2>
                  <p>Short answers to common questions.</p>
                </div>
                <span>{faqs.length}</span>
              </div>

              <div className="knowledge-faq-list">
                {faqs.map(article => (
                  <details key={article.id}>
                    <summary>
                      <span>
                        <small>{article.category}</small>
                        <strong>{article.title}</strong>
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                      />
                    </summary>
                    <p>{article.content}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <section className="knowledge-support-card">
        <div className="knowledge-support-icon">
          <Lightbulb size={22} />
        </div>
        <div>
          <strong>Still need help?</strong>
          <p>
            Create a request and choose the closest category. A template may fill in the form for you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/requests/create")}
        >
          Open request form
        </button>
      </section>

      {selectedArticle && (
        <div
          className="knowledge-dialog-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelectedArticle(null);
            }
          }}
        >
          <section
            ref={dialogRef}
            className="knowledge-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-dialog-title"
          >
            <header>
              <div>
                <span>{selectedArticle.category}</span>
                <h2 id="knowledge-dialog-title">
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                ref={dialogCloseButtonRef}
                type="button"
                onClick={() => setSelectedArticle(null)}
                aria-label="Close guide"
              >
                <X size={20} />
              </button>
            </header>
            <p>{selectedArticle.content}</p>
            <footer>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
