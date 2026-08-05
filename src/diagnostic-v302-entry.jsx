import React from "react";
import { createRoot } from "react-dom/client";
import { Sparkles, Menu, X } from "lucide-react";
import "./styles.css";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { consumeAuthCallbackV162 } from "./lib/auth-callback-v162.js";

export const DIAGNOSTIC_RELEASE = "vite-auth-library-v302-20260805";
const keep = [Sparkles, Menu, X, supabase, supabaseConfigured, consumeAuthCallbackV162];
if (typeof document !== "undefined") {
  const node = document.getElementById("root");
  if (node) createRoot(node).render(<div data-v302-diagnostic="auth-library">Ngeblogging diagnostic {keep.length}</div>);
}
