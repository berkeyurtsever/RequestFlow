import {
  BellRing,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  HeartPulse,
  LoaderCircle,
  Mail,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";

const AUTO_REFRESH_TIME = 30000;

const componentIcons = {
  api: Server,
  database: Database,
  email: Mail,
  realtime: Radio,
  monitoring: ShieldCheck,
  background: Cpu
};

function SystemHealth() {
  const { locale, t } = useLanguage();
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadHealth = useCallback(async ({
    background = false
  } = {}) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const response = await api.get(
        "/system-health"
      );

      setHealth(response.data);
    } catch (requestError) {
      console.error(
        "System health information could not be loaded:",
        requestError
      );

      setError(
        requestError.response?.status === 403
          ? t("health.onlyAdmin")
          : t("health.loadError")
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHealth();

    const intervalId = window.setInterval(() => {
      void loadHealth({ background: true });
    }, AUTO_REFRESH_TIME);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadHealth]);

  const summaryCards = useMemo(() => [
    {
      key: "users",
      label: t("health.users"),
      value: health?.summary?.users ?? 0,
      icon: UsersRound,
      tone: "blue"
    },
    {
      key: "requests",
      label: t("health.requests"),
      value: health?.summary?.requests ?? 0,
      icon: HardDrive,
      tone: "purple"
    },
    {
      key: "openRequests",
      label: t("health.openRequests"),
      value: health?.summary?.openRequests ?? 0,
      icon: Gauge,
      tone: "orange"
    },
    {
      key: "overdueRequests",
      label: t("health.overdue"),
      value: health?.summary?.overdueRequests ?? 0,
      icon: CircleAlert,
      tone: "red"
    },
    {
      key: "unreadNotifications",
      label: t("health.unread"),
      value:
        health?.summary?.unreadNotifications ?? 0,
      icon: BellRing,
      tone: "green"
    }
  ], [health, t]);

  if (isLoading) {
    return (
      <div className="system-health-page">
        <div
          className="system-health-loading"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="login-button-spinner"
            size={30}
            aria-hidden="true"
          />
          <span>{t("loading.page")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-page">
      <header className="system-health-header">
        <div>
          <span className="page-eyebrow">
            {t("health.eyebrow")}
          </span>
          <h1>{t("health.title")}</h1>
          <p>{t("health.description")}</p>
        </div>

        <button
          type="button"
          className="system-health-refresh"
          onClick={() =>
            void loadHealth({ background: true })
          }
          disabled={isRefreshing}
        >
          <RefreshCw
            size={17}
            className={
              isRefreshing
                ? "system-health-spin"
                : ""
            }
            aria-hidden="true"
          />
          <span>
            {isRefreshing
              ? t("health.refreshing")
              : t("health.refresh")}
          </span>
        </button>
      </header>

      {error ? (
        <section
          className="system-health-error"
          role="alert"
        >
          <CircleAlert size={28} aria-hidden="true" />
          <strong>{t("health.unavailable")}</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadHealth()}
          >
            {t("health.retry")}
          </button>
        </section>
      ) : (
        <>
          <section className="system-health-overview">
            <div
              className={`system-health-state ${health?.status || "degraded"}`}
            >
              <div className="system-health-state-icon">
                {health?.status === "healthy" ? (
                  <CircleCheckBig
                    size={27}
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert
                    size={27}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div>
                <span>{t("health.overall")}</span>
                <strong>
                  {getStatusLabel(
                    health?.status,
                    t
                  )}
                </strong>
              </div>
            </div>

            <HealthFact
              icon={Clock3}
              label={t("health.uptime")}
              value={formatUptime(
                health?.uptimeSeconds,
                locale
              )}
            />
            <HealthFact
              icon={Server}
              label={t("health.environment")}
              value={health?.environment || "-"}
            />
            <HealthFact
              icon={HeartPulse}
              label={t("health.version")}
              value={health?.version || "-"}
            />
            <HealthFact
              icon={Cpu}
              label={t("health.memory")}
              value={`${health?.resources?.workingSetMegabytes ?? 0} MB`}
            />
          </section>

          <div className="system-health-grid">
            <section className="system-health-card">
              <div className="system-health-card-heading">
                <div>
                  <span>{t("health.components")}</span>
                  <small>{t("health.autoRefresh")}</small>
                </div>
                <HeartPulse size={20} aria-hidden="true" />
              </div>

              <div className="system-health-components">
                {(health?.components || []).map(
                  component => (
                    <HealthComponent
                      key={component.key}
                      component={component}
                      t={t}
                    />
                  )
                )}
              </div>
            </section>

            <section className="system-health-card">
              <div className="system-health-card-heading">
                <div>
                  <span>{t("health.activity")}</span>
                  <small>
                    {t("health.lastChecked", {
                      time: formatCheckedAt(
                        health?.checkedAt,
                        locale
                      )
                    })}
                  </small>
                </div>
                <Gauge size={20} aria-hidden="true" />
              </div>

              <div className="system-health-summary">
                {summaryCards.map(card => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.key}
                      className={`system-health-summary-item ${card.tone}`}
                    >
                      <div>
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function HealthFact({ icon: Icon, label, value }) {
  return (
    <div className="system-health-fact">
      <Icon size={18} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function HealthComponent({ component, t }) {
  const Icon =
    componentIcons[component.key] || Server;

  return (
    <article className="system-health-component">
      <div
        className={`system-health-component-icon ${component.status}`}
      >
        <Icon size={19} aria-hidden="true" />
      </div>

      <div className="system-health-component-copy">
        <strong>
          {t(`health.${component.key}`)}
        </strong>
        <span>
          {t(`health.detail.${component.detailKey}`)}
        </span>
      </div>

      <div className="system-health-component-result">
        <span className={component.status}>
          {getStatusLabel(component.status, t)}
        </span>
        {Number.isFinite(component.responseTimeMs) && (
          <small>
            {t("health.responseTime", {
              milliseconds: component.responseTimeMs
            })}
          </small>
        )}
      </div>
    </article>
  );
}

function getStatusLabel(status, t) {
  const statusKey = {
    healthy: "health.healthy",
    degraded: "health.degraded",
    configured: "health.configured",
    disabled: "health.disabled"
  }[status];

  return t(statusKey || "health.unavailable");
}

function formatCheckedAt(value, locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatUptime(value, locale) {
  const seconds = Math.max(
    0,
    Number(value) || 0
  );
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(
    (seconds % 86400) / 3600
  );
  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  return new Intl.ListFormat(locale, {
    style: "short",
    type: "unit"
  }).format(
    [
      days > 0 ? `${days} d` : "",
      hours > 0 ? `${hours} h` : "",
      `${minutes} min`
    ].filter(Boolean)
  );
}

export default SystemHealth;
