let monitoringClient = null;

function getSampleRate(value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, parsedValue)
  );
}

export async function initializeMonitoring() {
  const dsn = import.meta.env
    .VITE_SENTRY_DSN?.trim();

  if (!dsn) {
    return null;
  }

  try {
    const Sentry = await import(
      "@sentry/react"
    );

    Sentry.init({
      dsn,
      environment:
        import.meta.env
          .VITE_SENTRY_ENVIRONMENT ||
        import.meta.env.MODE,
      sendDefaultPii: false,
      tracesSampleRate: getSampleRate(
        import.meta.env
          .VITE_SENTRY_TRACES_SAMPLE_RATE
      )
    });

    monitoringClient = Sentry;
    return Sentry;
  } catch (error) {
    console.error(
      "Error monitoring could not be started:",
      error
    );

    return null;
  }
}

export function captureApplicationError(
  error,
  context = {}
) {
  if (!monitoringClient) {
    console.error(
      "Application error:",
      error,
      context
    );
    return;
  }

  monitoringClient.withScope(scope => {
    scope.setContext(
      "application",
      context
    );
    monitoringClient.captureException(error);
  });
}
