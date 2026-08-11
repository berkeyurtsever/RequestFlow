function isDemoModeEnabled(environment = import.meta.env) {
  return environment?.VITE_DEMO_MODE === "true";
}

function canUseDemoSettings(
  user,
  environment = import.meta.env
) {
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  return (
    isDemoModeEnabled(environment) &&
    role === "supervisor"
  );
}

export {
  canUseDemoSettings,
  isDemoModeEnabled
};
