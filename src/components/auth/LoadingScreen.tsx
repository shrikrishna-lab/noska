import React from "react";
import FramerLoader from "./FramerLoader";

export default function LoadingScreen({ onComplete }) {
  return (
    <FramerLoader
      brandName="Noska®"
      counterDuration={3.0}
      textColor="#0f172a"
      background="#f8fafc"
      onComplete={onComplete}
    />
  );
}
