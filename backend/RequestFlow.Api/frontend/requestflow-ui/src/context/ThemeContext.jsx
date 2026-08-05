import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const STORAGE_KEY = "requestflow_theme";

const ALLOWED_THEMES = [
  "light",
  "dark",
  "system"
];

const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    getStoredTheme
  );

  const [systemTheme, setSystemTheme] =
    useState(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const handleSystemThemeChange = event => {
      setSystemTheme(
        event.matches ? "dark" : "light"
      );
    };

    setSystemTheme(
      mediaQuery.matches ? "dark" : "light"
    );

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    };
  }, []);

  const activeTheme =
    theme === "system"
      ? systemTheme
      : theme;

  useEffect(() => {
    const rootElement =
      document.documentElement;

    rootElement.dataset.theme =
      activeTheme;

    rootElement.dataset.themePreference =
      theme;

    rootElement.style.colorScheme =
      activeTheme;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        theme
      );
    } catch (storageError) {
      console.error(
        "Theme preference could not be saved:",
        storageError
      );
    }
  }, [
    activeTheme,
    theme
  ]);

  const setTheme = newTheme => {
    if (
      !ALLOWED_THEMES.includes(
        newTheme
      )
    ) {
      return;
    }

    setThemeState(newTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      activeTheme,
      setTheme,
      isDark:
        activeTheme === "dark"
    }),
    [
      theme,
      activeTheme
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}

function getStoredTheme() {
  try {
    const storedTheme =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (
      ALLOWED_THEMES.includes(
        storedTheme
      )
    ) {
      return storedTheme;
    }
  } catch (storageError) {
    console.error(
      "Theme preference could not be read:",
      storageError
    );
  }

  return "system";
}

function getSystemTheme() {
  if (
    typeof window === "undefined" ||
    !window.matchMedia
  ) {
    return "light";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

export {
  ThemeProvider,
  useTheme
};