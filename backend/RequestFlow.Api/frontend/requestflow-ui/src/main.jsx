import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter
} from "react-router-dom";
import App from "./App";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { initializeMonitoring } from "./services/monitoring";

async function startApplication() {
  const monitoring =
    await initializeMonitoring();

  const rootOptions =
    typeof monitoring?.reactErrorHandler ===
    "function"
      ? {
          onUncaughtError:
            monitoring.reactErrorHandler(),
          onRecoverableError:
            monitoring.reactErrorHandler()
        }
      : undefined;

  ReactDOM.createRoot(
    document.getElementById("root"),
    rootOptions
  ).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <App />
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

void startApplication();
