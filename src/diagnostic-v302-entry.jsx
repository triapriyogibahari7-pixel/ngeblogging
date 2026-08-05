import React from "react";
import { createRoot } from "react-dom/client";

export const DIAGNOSTIC_RELEASE = "vite-react-minimal-v302-20260805";

if (typeof document !== "undefined") {
  const node = document.getElementById("root");
  if (node) createRoot(node).render(<div data-v302-diagnostic="react-minimal">Ngeblogging build diagnostic</div>);
}
