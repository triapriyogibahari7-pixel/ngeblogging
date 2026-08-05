import StudioFastGate from "./StudioFastGate.jsx";

// Stable platform + device authority.
import "./studio-style-authority-v144.js";
import "./studio-device-mode-v140.js";

// v287 runtime pruning. These historical controllers remain in Git as backups,
// but are no longer executed because they independently owned the same Nara,
// profile, sidebar and onboarding DOM and installed document-wide observers.
// backup v287: import "./nara-size-authority-v144.js";
// backup v287: import "./studio-interface-v148.js";
// backup v287: import "./studio-recovery-v150.js";

// Content/editor guards that do not own the responsive shell remain active.
import "./studio-completion-v151.js";
import "./studio-continuity-v152.js";

// Historical visual CSS remains available so no completed page styling is lost.
import "./studio-layout-v140.css";
import "./studio-layout-hotfix-v141.css";
import "./studio-layout-hotfix-v142.css";
import "./studio-layout-authority-v144.css";
import "./studio-layout-authority-v145.css";
import "./studio-interface-authority-v147.css";
import "./studio-interface-v148.css";
import "./studio-interface-v149.css";
import "./studio-operations-v41.css";
import "./studio-recovery-v150.css";
import "./studio-completion-v151.css";
import "./studio-continuity-v152.css";

// Avatar upload is retained, but v176 itself has been reduced to profile/avatar
// only: no drawer owner, no Nara owner and no MutationObserver.
import "./studio-mobile-stability-v176.js";

// Retired mobile/screenshot shell controllers. Their CSS stays active as backup
// styling; the JS is intentionally not executed so they cannot race v287.
// backup v287: import "./studio-screenshot-stability-v177.js";
import "./studio-screenshot-stability-v177.css";
// backup v287: import "./studio-finalization-v178.js";
import "./studio-finalization-v178.css";
// backup v287: import "./studio-mobile-runtime-v179.js";
import "./studio-mobile-runtime-v179.css";
import "./studio-mobile-nara-v179.css";
// backup v287: import "./studio-production-recovery-v180.js";
import "./studio-production-recovery-v180.css";
// backup v287: import "./studio-mobile-hardening-v181.js";
import "./studio-mobile-hardening-v181.css";
// backup v287: import "./studio-production-v183.js";
import "./studio-production-v183.css";
import "./studio-production-v183-controls.css";
// backup v287: import "./studio-mobile-authority-v185.js";
import "./studio-mobile-authority-v185.css";
// backup v287: import "./studio-production-authority-v187.js";
import "./studio-production-authority-v187.css";
// backup v287: import "./studio-physical-mobile-v188.js";
import "./studio-physical-mobile-v188.css";
// backup v287: import "./studio-production-mobile-v189.js";
import "./studio-production-mobile-v189.css";
// backup v287: import "./studio-production-mobile-v189-account.js";
import "./studio-production-mobile-v189-fix.css";
// backup v287: import "./studio-real-device-v190.js";
import "./studio-real-device-v190.css";
// backup v287: import "./studio-screenshot-recovery-v191.js";
import "./studio-screenshot-recovery-v191.css";
import "./studio-screenshot-recovery-v191-hotfix.css";
// backup v287: import "./studio-screenshot-recovery-v193.js";
import "./studio-screenshot-recovery-v193.css";
import "./studio-screenshot-recovery-v193-hotfix.css";
// backup v287: import "./studio-nara-theme-v194.js";
import "./studio-nara-theme-v194.css";
// backup v287: import "./studio-current-screenshot-v199.js";
import "./studio-current-screenshot-v199.css";
// backup v287: import "./studio-mobile-flicker-v200.js";
import "./studio-mobile-flicker-v200.css";

// v201-v205 were successive shell/Nara/theme normalizers. Keeping all five active
// caused the same nodes to be rewritten after almost every React render.
// backup v287: import "./studio-production-v201.js";
import "./studio-production-v201.css";
// backup v287: import "./studio-production-v202.js";
import "./studio-production-v202.css";
// backup v287: import "./studio-production-v203.js";
import "./studio-production-v203.css";
// backup v287: import "./studio-production-v204.js";
import "./studio-production-v204.css";
// backup v287: import "./studio-production-v205.js";
import "./studio-production-v205.css";
// backup v287: import "./studio-production-v205-hotfix.js";
import "./studio-production-v205-hotfix.css";

// v206 is now auth/membership recovery only. It never reloads the page and does
// not mutate sidebar, Nara or Theme Studio.
import "./studio-production-v206.js";

// v207-v210 are kept as source/CSS history but no longer execute. In particular
// v208 previously called window.location.replace('/studio?resume=v208'), which
// could produce the double-load reported on the public Studio.
// backup v287: import "./studio-production-v207.js";
import "./studio-production-v207.css";
// backup v287: import "./studio-production-v208.js";
import "./studio-production-v208.css";
// backup v287: import "./studio-production-v209.js";
import "./studio-production-v209.css";
// backup v287: import "./studio-production-v210.js";
import "./studio-production-v210.css";

// Old Theme/Nara shell normalizers v222-v235 are superseded by the real v264
// Theme Studio layout authority. Keep their visual CSS/history, not their global
// observers/capture handlers.
// backup v287: import "./studio-production-v222.js";
import "./studio-production-v222.css";
// backup v287: import "./studio-production-v222-code-tabs.js";
// backup v287: import "./studio-production-v231.js";
import "./studio-production-v231.css";
// backup v287: import "./studio-production-v232.js";
import "./studio-production-v232.css";
// backup v287: import "./studio-production-v234.js";
import "./studio-production-v234.css";
// backup v287: import "./studio-production-v235.js";
// backup v287: import "./studio-production-v235-widget-target.js";

// v236-v280 legacy authorities remain in Git. CSS that contains page-level visual
// work is retained, while duplicate shell controllers stay retired.
// backup: import "./studio-real-device-v236.js";
// backup: import "./studio-source-stability-v237.js";
// backup: import "./studio-source-stability-v237-ui.js";
// backup: import "./studio-desktop-sidebar-v238.js";
// backup: import "./studio-final-authority-v239.js";
// backup: import "./studio-react-safe-v240.js";
import "./studio-react-safe-v240.css";
// backup: import "./studio-visual-stability-v241.js";
import "./studio-visual-stability-v241-final.css";
// backup: import "./studio-shell-rescue-v242.js";
// compatibility marker: import "./studio-stable-shell-v244-final.css";
// backup: import "./studio-sidebar-brand-v246.js";
// compatibility marker: import "./studio-sidebar-brand-v246.css";
// compatibility marker: import "./studio-screenshot-lock-v247.css";
// compatibility marker: import "./studio-final-visual-v249.css";
// compatibility marker: import "./studio-final-visual-v249-hotfix.css";
// backup: import "./studio-native-authority-v250.js";
import "./studio-native-authority-v250.css";
// backup: import "./studio-sidebar-rescue-v251.js";
import "./studio-sidebar-rescue-v251.css";
// backup: import "./studio-source-stability-v252.js";
import "./studio-source-stability-v252.css";
// backup: import "./studio-shell-nara-v253.js";
import "./studio-shell-nara-v253.css";
// backup: import "./studio-shell-interaction-v255.js";
import "./studio-shell-interaction-v255.css";
// backup: import "./studio-visual-native-v257.js";
import "./studio-visual-native-v257.css";
// backup: import "./studio-six-mode-authority-v259.js";
import "./studio-six-mode-authority-v259.css";
import "./studio-six-mode-authority-v259-hotfix.css";
// backup: import "./studio-stability-v260.js";
import "./studio-stability-v260.css";
import "./studio-stability-v260-hotfix.css";
// backup: import "./studio-runtime-v263.js";
import "./studio-shell-v263.css";
import "./studio-shell-v263-hotfix.css";

// Product functions that remain active.
import "./studio-theme-layout-v264.js";
import "./studio-theme-layout-v264.css";
// backup: import "./studio-screenshot-authority-v265.js";
import "./studio-screenshot-authority-v265.css";
// backup: import "./studio-shell-v265.js";
import "./studio-shell-v265.css";
import "./studio-shell-v265-final-hotfix.css";
import "./studio-editor-navigation-v266.js";
import "./studio-editor-navigation-v266.css";
// backup: import "./studio-runtime-v266.js";

// Compatibility bridge: no legacy profile capture owner.
import "./studio-sidebar-single-toggle-v267.js";
// backup: import "./studio-final-authority-v269.js";
// backup: import "./studio-scroll-chrome-v270.js";
import "./studio-scroll-chrome-v270.css";
// backup: import "./studio-shell-authority-v272.js";
// backup: import "./studio-shell-content-v274.js";
import "./studio-shell-content-v274-hotfix.css";
import "./studio-final-stability-v275.css";
import "./studio-sidebar-recovery-v276.js";
import "./studio-sidebar-recovery-v276.css";
// backup: import "./studio-interaction-authority-v277.js";
import "./studio-interaction-authority-v277.css";
// backup: import "./studio-shell-precision-v278.js";
import "./studio-shell-precision-v278.css";
// backup: import "./studio-live-shell-v279.js";
import "./studio-live-shell-v279.css";
// backup: import "./studio-native-shell-v280.js";
import "./studio-native-shell-v280.css";

// Active lightweight final chain. v285 imports v286 and v286 imports v287.
import "./studio-native-controls-v281.js";
import "./studio-native-controls-v281.css";
// backup: import "./studio-native-recovery-v283.js";
import "./studio-native-recovery-v283.css";
import "./studio-native-polish-v284.js";
import "./studio-native-polish-v284.css";
import "./studio-responsive-lock-v285.js";
import "./studio-responsive-lock-v285.css";

export default StudioFastGate;
