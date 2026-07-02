import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public marketing page — never runs the auth/session bootstrap. */}
        <Route path="/" element={<LandingPage />} />
        {/* Everything else (login, onboarding, and the workspace itself) is
            handled by App, which reads the current route to decide what to
            show and keeps the URL in sync as auth/onboarding state resolves. */}
        <Route path="/login" element={<App />} />
        <Route path="/onboarding" element={<App />} />
        <Route path="/:workspaceSlug" element={<App />} />
        <Route path="/:workspaceSlug/:pageId" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
