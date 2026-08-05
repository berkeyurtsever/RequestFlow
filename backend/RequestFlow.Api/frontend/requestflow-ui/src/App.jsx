import { LoaderCircle } from "lucide-react";
import {
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import CreateRequest from "./pages/CreateRequest";
import EditRequest from "./pages/EditRequest";
import Notifications from "./pages/Notifications";
import AssignedTasks from "./pages/AssignedTasks";
import Employees from "./pages/Employees";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";

import { useAuth } from "./context/AuthContext";

const MANAGEMENT_ROLES = [
  "admin",
  "supervisor"
];

const TASK_ROLES = [
  "admin",
  "supervisor",
  "staff"
];

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

function App() {
  return (
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
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
            >
              <Settings />
            </ProtectedRoute>
          }
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
  );
}

export default App;
