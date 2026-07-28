// Compatibility module retained for the v93 sidebar authority.
// Load the final centering authority after the legacy sidebar module finishes
// registering its observer, so v93 always wins the inline !important cascade.
queueMicrotask(() => import("./sidebar-center-v93.js"));

export const COMMENTS_STUDIO_COMPAT_V93 = "comments-studio-runtime-v93";
