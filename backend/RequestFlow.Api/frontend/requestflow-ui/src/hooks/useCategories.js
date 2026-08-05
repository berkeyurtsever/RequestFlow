import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import api from "../services/api";

function useCategories() {
  const [categories, setCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] =
    useState(true);
  const [categoriesError, setCategoriesError] =
    useState("");

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    setCategoriesError("");

    try {
      const response = await api.get("/Categories");

      setCategories(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        "Categories could not be loaded:",
        error
      );

      setCategoriesError(
        error.response?.data?.message ||
          "Categories could not be loaded."
      );
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const activeCategories = useMemo(() => {
    return categories
      .filter(category => category.isActive)
      .sort((firstCategory, secondCategory) =>
        firstCategory.name.localeCompare(
          secondCategory.name
        )
      );
  }, [categories]);

  return {
    categories,
    activeCategories,
    isCategoriesLoading,
    categoriesError,
    reloadCategories: loadCategories
  };
}

export default useCategories;