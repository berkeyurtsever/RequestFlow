import {
  Check,
  Monitor,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

const themeOptions = [
  {
    value: "light",
    title: "Light",
    description:
      "Use the light RequestFlow appearance.",
    icon: Sun
  },
  {
    value: "dark",
    title: "Dark",
    description:
      "Use a darker appearance for low-light environments.",
    icon: Moon
  },
  {
    value: "system",
    title: "System",
    description:
      "Automatically follow your device appearance.",
    icon: Monitor
  }
];

function ThemeSelector() {
  const {
    theme,
    activeTheme,
    setTheme
  } = useTheme();

  const { success } = useToast();

  const handleThemeChange =
    selectedTheme => {
      if (selectedTheme === theme) {
        return;
      }

      setTheme(selectedTheme);

      const selectedOption =
        themeOptions.find(
          option =>
            option.value ===
            selectedTheme
        );

      success(
        `${selectedOption?.title || "Theme"} appearance was selected.`
      );
    };

  return (
    <section className="settings-theme-section">
      <div className="settings-theme-heading">
        <div>
          <h2>Appearance</h2>

          <p>
            Choose how RequestFlow appears on
            this device.
          </p>
        </div>

        <span className="settings-active-theme-badge">
          Active:{" "}
          {capitalizeTheme(
            activeTheme
          )}
        </span>
      </div>

      <div className="settings-theme-options">
        {themeOptions.map(option => {
          const Icon = option.icon;

          const isSelected =
            theme === option.value;

          return (
            <button
              type="button"
              key={option.value}
              className={`settings-theme-option ${
                isSelected
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleThemeChange(
                  option.value
                )
              }
              aria-pressed={
                isSelected
              }
            >
              <span className="settings-theme-option-icon">
                <Icon size={21} />
              </span>

              <span className="settings-theme-option-content">
                <strong>
                  {option.title}
                </strong>

                <small>
                  {option.description}
                </small>
              </span>

              <span className="settings-theme-check">
                {isSelected && (
                  <Check size={15} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function capitalizeTheme(value) {
  const themeValue =
    String(value || "light");

  return (
    themeValue.charAt(0).toUpperCase() +
    themeValue.slice(1)
  );
}

export default ThemeSelector;