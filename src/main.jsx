import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import MarketingLayout from "./pages/marketing/MarketingLayout.jsx";
import MarketingHome from "./pages/marketing/Home.jsx";
import MarketingPricing from "./pages/marketing/Pricing.jsx";
import MarketingEnterprise from "./pages/marketing/Enterprise.jsx";
import MarketingProduct from "./pages/marketing/Product.jsx";
import MarketingSolutions from "./pages/marketing/Solutions.jsx";
import MarketingResources from "./pages/marketing/Resources.jsx";
import MarketingChangelog from "./pages/marketing/Changelog.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public marketing site — never runs the auth/session bootstrap.
            Each page shares the Navbar/Footer via MarketingLayout. */}
        <Route path="/" element={<MarketingLayout><MarketingHome /></MarketingLayout>} />
        <Route path="/pricing" element={<MarketingLayout><MarketingPricing /></MarketingLayout>} />
        <Route path="/enterprise" element={<MarketingLayout><MarketingEnterprise /></MarketingLayout>} />
        <Route path="/product" element={<MarketingLayout><MarketingProduct /></MarketingLayout>} />
        <Route path="/solutions" element={<MarketingLayout><MarketingSolutions /></MarketingLayout>} />
        <Route path="/resources" element={<MarketingLayout><MarketingResources /></MarketingLayout>} />
        <Route path="/changelog" element={<MarketingLayout><MarketingChangelog /></MarketingLayout>} />
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
