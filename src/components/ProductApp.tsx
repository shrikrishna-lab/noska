import { lazy, Suspense } from "react";
import { EntitlementsProvider } from "../hooks/billing/useEntitlements";

const App = lazy(() => import("../App.jsx"));

function ProductAppFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
    </div>
  );
}

export default function ProductApp() {
  return (
    <EntitlementsProvider>
      <Suspense fallback={<ProductAppFallback />}>
        <App />
      </Suspense>
    </EntitlementsProvider>
  );
}
