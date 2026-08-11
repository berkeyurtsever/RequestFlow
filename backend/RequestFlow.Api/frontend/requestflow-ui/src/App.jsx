import {
  lazy,
  Suspense
} from "react";
import { LoaderCircle } from "lucide-react";
import {
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

const MainLayout = lazy(() =>
  import("./layouts/MainLayout")
);

const Login = lazy(() =>
  import("./pages/Login")
);
const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword")
);
const ResetPassword = lazy(() =>
  import("./pages/ResetPassword")
);
const AccessDenied = lazy(() =>
  import("./pages/AccessDenied")
);
const NotFound = lazy(() =>
  import("./pages/NotFound")
);

const Dashboard = lazy(() =>
  import("./pages/Dashboard")
);
const Requests = lazy(() =>
  import("./pages/Requests")
);
const CreateRequest = lazy(() =>
  import("./pages/CreateRequest")
);
const EditRequest = lazy(() =>
  import("./pages/EditRequest")
);
const Notifications = lazy(() =>
  import("./pages/Notifications")
);
const AssignedTasks = lazy(() =>
  import("./pages/AssignedTasks")
);
const Employees = lazy(() =>
  import("./pages/Employees")
);
const Categories = lazy(() =>
  import("./pages/Categories")
);
const Reports = lazy(() =>
  import("./pages/Reports")
);
const Settings = lazy(() =>
  import("./pages/Settings")
);
const DemoSettings = lazy(() =>
  import("./pages/DemoSettings")
);
const Profile = lazy(() =>
  import("./pages/Profile")
);
const ChangePassword = lazy(() =>
  import("./pages/ChangePassword")
);

import { useAuth } from "./context/AuthContext";
import { canUseDemoSettings } from "./utils/demoMode";

const MANAGEMENT_ROLES = [
  "admin",
  "supervisor"
];

const TASK_ROLES = [
  "admin",
  "supervisor",
  "staff"
];

function RouteLoadingFallback() {
  return (
    <div
      className="request-page-loading"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="login-button-spinner"
        size={30}
        aria-hidden="true"
      />

      <span>Loading page...</span>
    </div>
  );
}

export function ProtectedRoute({
  children,
  allowedRoles
}) {
  const auth = useAuth();
  const location = useLocation();

  const user = auth?.user;

  const isAuthLoading =
    auth?.isLoading === true ||
    auth?.loading === true ||
    auth?.isAuthLoading === true;

  if (isAuthLoading) {
    return (
      <div className="request-page-loading">
        <LoaderCircle
          className="login-button-spinner"
          size={30}
        />

        <span>
          Loading your account...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0
  ) {
    const normalizedRole = String(
      user.role || "User"
    )
      .trim()
      .toLowerCase();

    const normalizedAllowedRoles =
      allowedRoles.map(role =>
        String(role)
          .trim()
          .toLowerCase()
      );

    if (
      !normalizedAllowedRoles.includes(
        normalizedRole
      )
    ) {
      return (
        <Navigate
          to="/access-denied"
          replace
          state={{
            attemptedPath:
              location.pathname
          }}
        />
      );
    }
  }

  return children;
}

export function SettingsRoute() {
  const { user } = useAuth();

  const normalizedRole = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase();

  if (normalizedRole === "admin") {
    return <Settings />;
  }

  if (canUseDemoSettings(user)) {
    return <DemoSettings />;
  }

  return (
    <Navigate
      to="/access-denied"
      replace
      state={{
        attemptedPath: "/settings"
      }}
    />
  );
}

function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="/overview"
              replace
            />
          }
        />

        <Route
          path="overview"
          element={<Dashboard />}
        />

        <Route
          path="dashboard"
          element={
            <Navigate
              to="/overview"
              replace
            />
          }
        />

        <Route
          path="requests"
          element={<Requests />}
        />

        <Route
          path="requests/create"
          element={<CreateRequest />}
        />

        <Route
          path="requests/edit/:id"
          element={<EditRequest />}
        />

        <Route
          path="notifications"
          element={<Notifications />}
        />

        <Route
          path="tasks"
          element={
            <ProtectedRoute
              allowedRoles={TASK_ROLES}
            >
              <AssignedTasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="reports"
          element={
            <ProtectedRoute
              allowedRoles={
                MANAGEMENT_ROLES
              }
            >
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="employees"
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
            >
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="categories"
          element={
            <ProtectedRoute
              allowedRoles={
                MANAGEMENT_ROLES
              }
            >
              <Categories />
            </ProtectedRoute>
          }
        />

        <Route
          path="settings"
          element={<SettingsRoute />}
        />

        <Route
          path="profile"
          element={<Profile />}
        />

        <Route
          path="change-password"
          element={<ChangePassword />}
        />

        <Route
          path="access-denied"
          element={<AccessDenied />}
        />

        <Route
          path="create-request"
          element={
            <Navigate
              to="/requests/create"
              replace
            />
          }
        />

        <Route
          path="new-request"
          element={
            <Navigate
              to="/requests/create"
              replace
            />
          }
        />

        <Route
          path="all-notifications"
          element={
            <Navigate
              to="/notifications"
              replace
            />
          }
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
