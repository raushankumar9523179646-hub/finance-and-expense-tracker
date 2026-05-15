import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import App from "./App.jsx";
import AuthGoogleDone from "./AuthGoogleDone.jsx";
import AuthPage from "./AuthPage.jsx";
import { getAuthToken } from "./api.js";
import "./index.css";

function RequireAuth({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!getAuthToken()) navigate("/", { replace: true });
  }, [navigate]);
  if (!getAuthToken()) return null;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />
        <Route path="/auth/google/done" element={<AuthGoogleDone />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
