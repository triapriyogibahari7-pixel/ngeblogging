import "./nara-controls-v135.css";

// Compatibility-only module. NaraAssistant.jsx is now the sole owner of small,
// medium and full-screen controls. The historical v135 runtime injected another
// fullscreen button and observed the entire document, which could duplicate or
// reorder Nara controls after React renders.
export const RELEASE = "nara-controls-v135-compat-v287-20260805";
