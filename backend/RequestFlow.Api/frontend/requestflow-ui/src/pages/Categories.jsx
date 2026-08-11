import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertCircle,
  FolderKanban,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";
import api from "../services/api";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  name: "",
  description: "",
  isActive: true
};

function Categories() {
  const { confirm } = useConfirm();

  const {
    success,
    error: showError
  } = useToast();

  const [categories, setCategories] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [formErrors, setFormErrors] =
    useState({});

  const loadCategories = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response =
          await api.get("/Categories");

        const categoryList =
          Array.isArray(response.data)
            ? response.data
            : Array.isArray(
                  response.data?.categories
                )
              ? response.data.categories
              : [];

        setCategories(categoryList);
      } catch (requestError) {
        console.error(
          "Categories could not be loaded:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 401) {
          setError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          setError(
            "You do not have permission to view categories."
          );
        } else {
          setError(
            requestError.response?.data?.message ||
              "Categories could not be loaded. Check the backend connection."
          );
        }

        setCategories([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const statistics = useMemo(() => {
    const activeCount = categories.filter(
      category => getCategoryActive(category)
    ).length;

    return {
      total: categories.length,
      active: activeCount,
      inactive:
        categories.length - activeCount
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return [...categories]
      .filter(category => {
        if (!normalizedSearch) {
          return true;
        }

        const name =
          getCategoryName(category)
            .toLowerCase();

        const description = String(
          category.description || ""
        ).toLowerCase();

        return (
          name.includes(normalizedSearch) ||
          description.includes(
            normalizedSearch
          )
        );
      })
      .sort(
        (
          firstCategory,
          secondCategory
        ) =>
          getCategoryName(
            firstCategory
          ).localeCompare(
            getCategoryName(secondCategory)
          )
      );
  }, [categories, searchText]);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      ...emptyForm
    });
    setFormErrors({});
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = category => {
    setEditingCategory(category);

    setFormData({
      name: getCategoryName(category),
      description:
        category.description || "",
      isActive:
        getCategoryActive(category)
    });

    setFormErrors({});
    setError("");
    setIsModalOpen(true);
  };

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      ...emptyForm
    });
    setFormErrors({});
  };

  const handleCloseModal = () => {
    if (isSaving) {
      return;
    }

    resetModalState();
  };

  const handleInputChange = event => {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    setFormData(previousData => ({
      ...previousData,
      [name]:
        type === "checkbox"
          ? checked
          : value
    }));

    setFormErrors(previousErrors => ({
      ...previousErrors,
      [name]: ""
    }));
  };

  const validateForm = () => {
    const errors = {};

    const trimmedName =
      formData.name.trim();

    const trimmedDescription =
      formData.description.trim();

    if (!trimmedName) {
      errors.name =
        "Category name is required.";
    } else if (
      trimmedName.length > 100
    ) {
      errors.name =
        "Category name cannot exceed 100 characters.";
    }

    if (!trimmedDescription) {
      errors.description =
        "Category description is required.";
    } else if (
      trimmedDescription.length > 500
    ) {
      errors.description =
        "Description cannot exceed 500 characters.";
    }

    const duplicateCategory =
      categories.find(category => {
        const isEditingCurrentCategory =
          editingCategory &&
          category.id ===
            editingCategory.id;

        return (
          !isEditingCurrentCategory &&
          getCategoryName(category)
            .trim()
            .toLowerCase() ===
            trimmedName.toLowerCase()
        );
      });

    if (duplicateCategory) {
      errors.name =
        "A category with this name already exists.";
    }

    setFormErrors(errors);

    return (
      Object.keys(errors).length === 0
    );
  };

  const handleSubmitCategory =
    async event => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSaving(true);

      const payload = {
        name: formData.name.trim(),
        description:
          formData.description.trim(),
        isActive: formData.isActive
      };

      try {
        if (editingCategory) {
          await api.put(
            `/Categories/${editingCategory.id}`,
            payload
          );

          resetModalState();

          await loadCategories();

          success(
            `"${payload.name}" was updated successfully.`
          );
        } else {
          await api.post(
            "/Categories",
            payload
          );

          resetModalState();

          await loadCategories();

          success(
            `"${payload.name}" was created successfully.`
          );
        }
      } catch (requestError) {
        console.error(
          "Category could not be saved:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 400) {
          showError(
            requestError.response?.data
              ?.message ||
              "Check the category information and try again."
          );
        } else if (status === 401) {
          showError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          showError(
            "You do not have permission to manage categories."
          );
        } else if (status === 404) {
          showError(
            "The selected category could not be found."
          );
        } else if (status === 405) {
          showError(
            "The category endpoint does not accept this request method. Check CategoriesController."
          );
        } else {
          showError(
            requestError.response?.data
              ?.message ||
              "The category could not be saved."
          );
        }
      } finally {
        setIsSaving(false);
      }
    };

  const handleDeleteCategory =
    async category => {
      const categoryName =
        getCategoryName(category);

      const confirmed = await confirm({
        title: "Delete this category?",
        message: `"${categoryName}" will be permanently deleted. This action cannot be undone.`,
        confirmText: "Delete Category",
        cancelText: "Cancel",
        variant: "danger"
      });

      if (!confirmed) {
        return;
      }

      setDeletingId(category.id);

      try {
        await api.delete(
          `/Categories/${category.id}`
        );

        setCategories(
          previousCategories =>
            previousCategories.filter(
              currentCategory =>
                currentCategory.id !==
                category.id
            )
        );

        success(
          `"${categoryName}" was deleted successfully.`
        );
      } catch (requestError) {
        console.error(
          "Category could not be deleted:",
          requestError
        );

        const status =
          requestError.response?.status;

        if (status === 400) {
          showError(
            requestError.response?.data
              ?.message ||
              "This category may be used by existing requests and cannot be deleted."
          );
        } else if (status === 401) {
          showError(
            "Your session has expired. Please sign in again."
          );
        } else if (status === 403) {
          showError(
            "You do not have permission to delete categories."
          );
        } else if (status === 404) {
          showError(
            "The selected category could not be found."
          );

          setCategories(
            previousCategories =>
              previousCategories.filter(
                currentCategory =>
                  currentCategory.id !==
                  category.id
              )
          );
        } else {
          showError(
            requestError.response?.data
              ?.message ||
              "The category could not be deleted."
          );
        }
      } finally {
        setDeletingId(null);
      }
    };

  if (isLoading) {
    return (
      <div className="request-page-loading">
        <LoaderCircle
          className="login-button-spinner"
          size={30}
        />

        <span>
          Loading categories...
        </span>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="categories-header">
        <div>
          <span className="page-eyebrow">
            MANAGEMENT
          </span>

          <h1>Categories</h1>

          <p>
            Create and manage request categories
            used throughout RequestFlow.
          </p>
        </div>

        <div className="categories-header-actions">
          <button
            type="button"
            className="page-refresh-button"
            onClick={() =>
              loadCategories(true)
            }
            disabled={isRefreshing}
          >
            <RefreshCw
              size={16}
              className={
                isRefreshing
                  ? "login-button-spinner"
                  : ""
              }
            />

            <span>
              {isRefreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            className="category-new-button"
            onClick={
              handleOpenCreateModal
            }
          >
            <Plus size={16} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="request-page-error"
          role="alert"
        >
          <div className="categories-message-content">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              loadCategories(true)
            }
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      <div className="categories-stats-grid">
        <CategoryStatCard
          title="Total Categories"
          value={statistics.total}
          variant="total"
        />

        <CategoryStatCard
          title="Active Categories"
          value={statistics.active}
          variant="active"
        />

        <CategoryStatCard
          title="Inactive Categories"
          value={statistics.inactive}
          variant="inactive"
        />
      </div>

      <div className="categories-toolbar">
        <div className="categories-search-wrapper">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search categories..."
            value={searchText}
            onChange={event =>
              setSearchText(
                event.target.value
              )
            }
          />

          {searchText && (
            <button
              type="button"
              className="categories-search-clear"
              onClick={() =>
                setSearchText("")
              }
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <span className="categories-results-count">
          {filteredCategories.length}{" "}
          {filteredCategories.length === 1
            ? "result"
            : "results"}
        </span>
      </div>

      <div className="categories-table-card">
        {filteredCategories.length === 0 ? (
          <div className="categories-empty-state">
            <FolderKanban size={31} />

            <h2>No categories found</h2>

            <p>
              Try changing your search or create
              a new category.
            </p>

            {searchText && (
              <button
                type="button"
                onClick={() =>
                  setSearchText("")
                }
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <caption className="rf-visually-hidden">
                Request categories and their current status
              </caption>

              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map(
                  category => {
                    const isActive =
                      getCategoryActive(
                        category
                      );

                    const isDeleting =
                      deletingId ===
                      category.id;

                    return (
                      <tr key={category.id}>
                        <td data-label="Category">
                          <div className="category-name-cell">
                            <div className="category-name-icon">
                              <FolderKanban
                                size={18}
                              />
                            </div>

                            <div>
                              <strong>
                                {getCategoryName(
                                  category
                                )}
                              </strong>

                              <span>
                                Category #
                                {category.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td data-label="Description">
                          <div className="category-description-cell">
                            {category.description ||
                              "No description provided."}
                          </div>
                        </td>

                        <td data-label="Status">
                          <span
                            className={`category-status-badge ${
                              isActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td data-label="Created">
                          {formatDate(
                            category.createdAt
                          )}
                        </td>

                        <td data-label="Updated">
                          {formatDate(
                            category.updatedAt
                          )}
                        </td>

                        <td data-label="Actions">
                          <div className="category-actions">
                            <button
                              type="button"
                              className="category-edit-button"
                              onClick={() =>
                                handleOpenEditModal(
                                  category
                                )
                              }
                              disabled={
                                isDeleting
                              }
                              aria-label={`Edit ${getCategoryName(
                                category
                              )}`}
                            >
                              <Pencil
                                size={14}
                              />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="category-delete-button"
                              onClick={() =>
                                handleDeleteCategory(
                                  category
                                )
                              }
                              aria-label={`Delete ${getCategoryName(
                                category
                              )}`}
                              disabled={
                                isDeleting
                              }
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  className="login-button-spinner"
                                  size={14}
                                />
                              ) : (
                                <Trash2
                                  size={14}
                                />
                              )}

                              <span>
                                {isDeleting
                                  ? "Deleting..."
                                  : "Delete"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="category-modal-overlay"
          role="presentation"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="category-modal-header">
              <div>
                <h2 id="category-modal-title">
                  {editingCategory
                    ? "Edit Category"
                    : "New Category"}
                </h2>

                <p>
                  {editingCategory
                    ? "Update the selected request category."
                    : "Create a new request category."}
                </p>
              </div>

              <button
                type="button"
                className="category-modal-close"
                onClick={
                  handleCloseModal
                }
                disabled={isSaving}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmitCategory
              }
              noValidate
            >
              <div className="category-modal-body">
                <div className="category-form-group">
                  <label htmlFor="category-name">
                    Category Name
                    <span>*</span>
                  </label>

                  <input
                    id="category-name"
                    name="name"
                    type="text"
                    maxLength={100}
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={
                      handleInputChange
                    }
                    className={
                      formErrors.name
                        ? "category-input-error"
                        : ""
                    }
                  />

                  <div className="category-field-footer">
                    <span className="category-field-error">
                      {formErrors.name}
                    </span>

                    <small>
                      {formData.name.length}
                      /100
                    </small>
                  </div>
                </div>

                <div className="category-form-group">
                  <label htmlFor="category-description">
                    Description
                    <span>*</span>
                  </label>

                  <textarea
                    id="category-description"
                    name="description"
                    maxLength={500}
                    placeholder="Describe the purpose of this category"
                    value={
                      formData.description
                    }
                    onChange={
                      handleInputChange
                    }
                    className={
                      formErrors.description
                        ? "category-input-error"
                        : ""
                    }
                  />

                  <div className="category-field-footer">
                    <span className="category-field-error">
                      {
                        formErrors.description
                      }
                    </span>

                    <small>
                      {
                        formData.description
                          .length
                      }
                      /500
                    </small>
                  </div>
                </div>

                <label className="category-active-control">
                  <input
                    name="isActive"
                    type="checkbox"
                    checked={
                      formData.isActive
                    }
                    onChange={
                      handleInputChange
                    }
                  />

                  <span>
                    <strong>
                      Active Category
                    </strong>

                    <small>
                      Active categories can be
                      selected when creating
                      requests.
                    </small>
                  </span>
                </label>
              </div>

              <div className="category-modal-actions">
                <button
                  type="button"
                  className="category-modal-cancel"
                  onClick={
                    handleCloseModal
                  }
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="category-modal-submit"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <LoaderCircle
                      className="login-button-spinner"
                      size={15}
                    />
                  )}

                  <span>
                    {isSaving
                      ? "Saving..."
                      : editingCategory
                        ? "Save Changes"
                        : "Create Category"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryStatCard({
  title,
  value,
  variant
}) {
  return (
    <article
      className={`category-stat-card ${variant}`}
    >
      <div className="category-stat-icon">
        <FolderKanban size={22} />
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function getCategoryName(category) {
  return (
    category?.name ||
    category?.categoryName ||
    category?.title ||
    "Unnamed Category"
  );
}

function getCategoryActive(category) {
  if (
    typeof category?.isActive ===
    "boolean"
  ) {
    return category.isActive;
  }

  if (
    typeof category?.active ===
    "boolean"
  ) {
    return category.active;
  }

  const status = String(
    category?.status || ""
  )
    .trim()
    .toLowerCase();

  return status !== "inactive";
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

export default Categories;
