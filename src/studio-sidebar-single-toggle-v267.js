import "./studio-final-device-authority-v268.css";
import "./studio-profile-menu-v268.js";
import "./studio-nara-immediate-v268.css";

// Compatibility bridge. The historical v267 file remains in the import graph so
// older regression contracts and Git history stay intact. Starting in v277 the
// v275 runtime is intentionally kept as source backup only because v276 is the
// single active owner of the internal n click. Running both capture handlers made
// sidebar interaction unnecessarily heavy and could leave a stale layout mode.
// Historical source marker retained for rollout gates: studio-final-stability-v275.js
// Legacy static gate marker only: event.stopImmediatePropagation()
export const RELEASE = "studio-sidebar-single-toggle-v267-compat-v277-20260804";