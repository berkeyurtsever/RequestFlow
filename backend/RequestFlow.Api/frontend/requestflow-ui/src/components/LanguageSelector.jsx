import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function LanguageSelector({ className = "" }) {
  const {
    language,
    setLanguage,
    t
  } = useLanguage();

  return (
    <label
      className={`rf-language-selector ${className}`.trim()}
      title={t("language.label")}
    >
      <Languages size={17} aria-hidden="true" />

      <span className="sr-only">
        {t("language.label")}
      </span>

      <select
        value={language}
        onChange={event =>
          setLanguage(event.target.value)
        }
        aria-label={t("language.label")}
      >
        <option value="en">
          {t("language.english")}
        </option>
        <option value="tr">
          {t("language.turkish")}
        </option>
      </select>
    </label>
  );
}

export default LanguageSelector;
