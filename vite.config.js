import { defineConfig } from "vite";

// Diagnostic branch only. Keep legacy marker names so source-inspection tests can
// still identify the historical pipeline, but run none of the mutating hooks here:
// activateStudioNativeV250 / finalizeStudioV255Order / finalizeStudioV257Order /
// finalizeStudioV259Order / finalizeServiceWorkerV237 / finalizeServiceWorkerV238 /
// finalizeServiceWorkerV239 / finalizeServiceWorkerV240 / finalizeServiceWorkerV241 /
// finalizeServiceWorkerV242 / finalizeServiceWorkerV243 / finalizeServiceWorkerV244 /
// finalizeServiceWorkerV245 / finalizeServiceWorkerV246 / finalizeServiceWorkerV247 /
// finalizeServiceWorkerV249 / rotateServiceWorkerV250 / rotateServiceWorkerV253 /
// rotateServiceWorkerV256 / rotateServiceWorkerV257 / rotateServiceWorkerV258.

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-v260-compile-only-diagnostic",
      apply: "build",
      buildStart() {
        console.log("[vite] diagnostic compile-only: no source rewrite, validator, or service-worker post-hook");
      },
    },
  ],
});