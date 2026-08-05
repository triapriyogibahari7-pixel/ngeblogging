import React from "react";
import { createRoot } from "react-dom/client";
import AuthModal from "./AuthModal";

export const DIAGNOSTIC_RELEASE = "vite-auth-modal-v302-20260805";
const keep = [AuthModal];
if (typeof document !== "undefined") {
  const node = document.getElementById("root");
  if (node) createRoot(node).render(<div data-v302-diagnostic="auth-modal">Ngeblogging diagnostic {keep.length}</div>);
}
