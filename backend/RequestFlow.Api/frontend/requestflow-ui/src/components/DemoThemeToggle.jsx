import {
  Moon,
  Sun
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

function DemoThemeToggle() {
  const {
    activeTheme,
    setTheme
  } = useTheme();

  const isDark =
    activeTheme === "dark";

  const nextTheme =
    isDark ? "light" : "dark";

  const label = isDark
    ? "Switch to light mode"
    : "Switch to dark mode";

  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      className="rf-navbar-theme-button"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <Icon size={19} />
    </button>
  );
}

export default DemoThemeToggle;
