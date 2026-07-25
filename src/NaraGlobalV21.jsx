import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import NaraAssistant from "./NaraAssistant";
import { supabase, supabaseConfigured } from "./lib/supabase";

const RELEASE = "nara-global-v21-20260725";
const HOST_ID = "ngeblogging-nara-global-v21";

function inferContext(target, explicit = null) {
  if (explicit && typeof explicit === "object") return explicit;
  const editor = target?.closest?.(".ce-app") || document.querySelector(".ce-app");
  if (editor) {
    return {
      area: "editor",
      documentTitle: document.querySelector(".ce-file input")?.value || document.title,
    };
  }
  const siteSlug = document.querySelector(".sn-welcome p")?.textContent?.trim()?.replace(/\.ngeblogging\.com.*$/i, "") || "";
  return { area: "studio", siteSlug };
}

function requestLogin() {
  const candidate = [...document.querySelectorAll("button,a")]
    .find((node) => /masuk|login/i.test(node.textContent || "") && !node.closest(".nara-assistant-layer"));
  candidate?.click?.();
}

function GlobalNara() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [context, setContext] = useState({ area: "studio" });

  useEffect(() => {
    let active = true;
    if (!supabaseConfigured || !supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null);
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const openNara = (event) => {
      setContext(inferContext(null, event.detail?.context));
      setOpen(true);
    };
    window.addEventListener("ngeblogging:nara-open", openNara);
    window.NgebloggingNara = {
      release: RELEASE,
      open: (nextContext = null) => window.dispatchEvent(new CustomEvent("ngeblogging:nara-open", { detail: { context: nextContext } })),
      close: () => setOpen(false),
    };
    return () => {
      window.removeEventListener("ngeblogging:nara-open", openNara);
      if (window.NgebloggingNara?.release === RELEASE) delete window.NgebloggingNara;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nara-dialog-open", open);
    document.documentElement.dataset.naraGlobalOpen = String(open);
    return () => document.body.classList.remove("nara-dialog-open");
  }, [open]);

  useEffect(() => {
    const intercept = (event) => {
      const target = event.target?.closest?.(".sn-top-actions .sn-nara-button, .ce-nara, [data-open-nara-v21='true']");
      if (!target || target.closest(`#${HOST_ID}`)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setContext(inferContext(target));
      setOpen(true);
    };
    document.addEventListener("click", intercept, true);
    document.addEventListener("pointerup", intercept, true);
    return () => {
      document.removeEventListener("click", intercept, true);
      document.removeEventListener("pointerup", intercept, true);
    };
  }, []);

  const assistantContext = useMemo(() => ({ ...context, globalRelease: RELEASE }), [context]);

  return (
    <NaraAssistant
      user={user}
      context={assistantContext}
      open={open}
      onOpenChange={setOpen}
      onRequestLogin={requestLogin}
    />
  );
}

function mount() {
  document.querySelectorAll(".nara-floating-proxy-v18,.nara-floating-proxy-v19,.nara-floating-proxy-v20")
    .forEach((node) => node.remove());

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.className = "nara-global-v21";
    host.dataset.release = RELEASE;
    document.body.append(host);
  }
  if (host.dataset.reactMounted === "true") return;
  host.dataset.reactMounted = "true";
  createRoot(host).render(<GlobalNara />);
  document.documentElement.dataset.naraLauncherRelease = RELEASE;
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
else mount();
