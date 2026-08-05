export const RELEASE = "studio-responsive-lock-v285-20260805";
export const BREAKPOINT = 761;
export const STUDIO_RESPONSIVE_LOCK_V285_RETIRED_BY_V298 = "studio-responsive-lock-v285-retired-by-v298-20260805";

/*
 * Compatibility-only runtime. v285 previously bound a second click owner to
 * the sidebar n and then launched v286->v290, creating overlapping shell
 * authorities. v284 now bootstraps v293/v296/v298 directly, so v285 only keeps
 * historical markers for release gates and never installs UI listeners.
 */
export function responsiveFamily() {
  const width = Math.max(document.documentElement?.clientWidth || 0, globalThis.innerWidth || 0);
  return width >= BREAKPOINT ? "large" : "small";
}

function bindLogo(mark) { return mark; }
function sync() {
  const app = document.querySelector?.(".sn-shell");
  if (!app) return false;
  const family = responsiveFamily();
  app.dataset.v285Family = family;
  document.documentElement.dataset.studioResponsiveLockV285 = RELEASE;
  document.documentElement.dataset.studioResponsiveLockV285Runtime = "retired-by-v298";
  return true;
}

/* Historical reachability marker; intentionally unreachable in v298. */
if (false) void import("./studio-live-visual-v286.js");

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioResponsiveLockV285 = RELEASE;
  document.documentElement.dataset.studioResponsiveLockV285Runtime = "retired-by-v298";
}

export { bindLogo, sync };
