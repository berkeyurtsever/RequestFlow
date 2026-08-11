import ThemeSelector from "../components/ThemeSelector";

function DemoSettings() {
  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <span className="page-eyebrow">
            DEMO PREFERENCES
          </span>

          <h1>Settings</h1>

          <p>
            Choose how RequestFlow appears on
            this device. Administrative settings
            are unavailable in the public demo.
          </p>
        </div>
      </header>

      <ThemeSelector />
    </div>
  );
}

export default DemoSettings;
