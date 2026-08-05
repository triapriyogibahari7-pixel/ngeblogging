import "./studio-final-device-authority-v268.css";
// v287 owns the profile dropdown. The v268 capture listener is retained in Git
// as a backup but is no longer executed because it used stopImmediatePropagation
// and could block newer React/Studio interaction handlers.
// backup: import "./studio-profile-menu-v268.js";
import "./studio-nara-immediate-v268.css";

// Compatibility bridge. Historical markers stay readable for old rollout tests.
// Historical source marker retained for rollout gates: studio-final-stability-v275.js
// Legacy static gate marker only: event.stopImmediatePropagation()
export const RELEASE = "studio-sidebar-single-toggle-v267-compat-v287-20260805";
