import React from "react";
import { createRoot } from "react-dom/client";
import { Sparkles, Menu, X } from "lucide-react";
import "./styles.css";
import AuthModal from "./AuthModal";
import NaraAssistant from "./NaraAssistant";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { consumeAuthCallbackV162 } from "./lib/auth-callback-v162.js";

export const DIAGNOSTIC_RELEASE = "vite-main-static-imports-v302-20260805";

const keep = [AuthModal, NaraAssistant, supabaseConfigured, supabase, consumeAuthCallbackV162, Sparkles, Menu, X];
if (typeof document !== "undefined") {
  const node = document.getElementById("root");
  if (node) createRoot(node).render(<div data-v302-diagnostic="main-static-imports">Ngeblogging diagnostic {keep.length}</div>);
}
