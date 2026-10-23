import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./editor-dialog-boundary.css";
import "./editor-media-content.css";

export default function EditorDialogBoundary({ children, onClose }) {
  const [host] = useState(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.className = "ce-app ce-dialog-host";
    node.dataset.editorDialogBoundary = "widget-pattern";
    return node;
  });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (!host) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    let frame = 0;
    let sidebar = null;
    const sizes = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    function sync() {
      frame = 0;
      const nextSidebar = document.querySelector("#ngeblogging-studio-sidebar");
      if (nextSidebar !== sidebar) {
        if (sidebar) sizes?.unobserve(sidebar);
        sidebar = nextSidebar;
        if (sidebar) sizes?.observe(sidebar);
      }
      const compact = window.innerWidth <= 760 || document.documentElement.dataset.v238Family === "small";
      const rect = sidebar?.getBoundingClientRect();
      const visible = sidebar && getComputedStyle(sidebar).visibility !== "hidden" && rect.width > 0;
      const left = !compact && visible ? Math.max(0, Math.min(Math.ceil(rect.right), window.innerWidth - 280)) : 0;
      host.style.setProperty("--ce-dialog-left", `${left}px`);
      host.dataset.compact = String(compact);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
    function keydown(event) {
      const detail = host.querySelector(".sn-media-detail-layer");
      if (detail) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const focusables = [...host.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !host.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !host.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.body.appendChild(host);
    document.body.style.overflow = "hidden";
    sync();
    const changes = new MutationObserver(schedule);
    changes.observe(document.body, { childList: true, subtree: true });
    const modes = new MutationObserver(schedule);
    modes.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-v238-family", "data-studio-device-mode"] });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    host.addEventListener("keydown", keydown);
    host.querySelector("section > header > button")?.focus({ preventScroll: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      changes.disconnect(); modes.disconnect(); sizes?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      host.removeEventListener("keydown", keydown);
      host.remove();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [host]);

  return host ? createPortal(children, host) : null;
}
