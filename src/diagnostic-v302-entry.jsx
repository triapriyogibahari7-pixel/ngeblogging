import React from "react";
import { createRoot } from "react-dom/client";
import NaraAssistant from "./NaraAssistant";

export const DIAGNOSTIC_RELEASE = "vite-nara-assistant-v302-20260805";
const keep = [NaraAssistant];
if (typeof document !== "undefined") {
  const node = document.getElementById("root");
  if (node) createRoot(node).render(<div data-v302-diagnostic="nara-assistant">Ngeblogging diagnostic {keep.length}</div>);
}
