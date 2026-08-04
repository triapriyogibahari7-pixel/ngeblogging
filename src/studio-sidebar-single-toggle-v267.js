import "./studio-final-device-authority-v268.css";
import "./studio-profile-menu-v268.js";
import "./studio-nara-immediate-v268.css";
import "./studio-final-stability-v275.js";

// Compatibility bridge. The historical v267 file remains in the import graph so
// older regression contracts and Git history stay intact, but the single internal
// n interaction is now owned by the deterministic v275 runtime. This avoids the
// duplicate document/target handlers that caused open-close flicker and lockups.
export const RELEASE = "studio-sidebar-single-toggle-v267-compat-v275-20260804";
