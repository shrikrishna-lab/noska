import React from "react";
import ProviderButton from "./ProviderButton";

export default function AuthProviders({ onProviderClick, loadingProvider, disabled }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <ProviderButton
        provider="github"
        isLoading={loadingProvider === "github"}
        onClick={() => onProviderClick("github")}
        disabled={disabled || (loadingProvider && loadingProvider !== "github")}
      />
      <ProviderButton
        provider="google"
        isLoading={loadingProvider === "google"}
        onClick={() => onProviderClick("google")}
        disabled={disabled || (loadingProvider && loadingProvider !== "google")}
      />
    </div>
  );
}
