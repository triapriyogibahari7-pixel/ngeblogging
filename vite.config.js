import { defineConfig } from "vite";
import { finalizeStudioV259Order } from "./scripts/finalize-studio-v259-order.mjs";

// Historical regression marker names intentionally retained as comments only.
// These source-mutating Studio activators are backups, not build hooks in v260:
// activateStudioNativeV250 / finalizeStudioV255Order / finalizeStudioV257Order.
//
// These service-worker finalizers/rotations are also retained as source backups,
// but are NOT executed after Vite bundling because Netlify diagnostics proved that
// the post-bundle mutation chain is what fails an otherwise successful v260 compile:
// finalizeServiceWorkerV237(); finalizeServiceWorkerV238(); finalizeServiceWorkerV239();
// finalizeServiceWorkerV240(); finalizeServiceWorkerV241(); finalizeServiceWorkerV242();
// finalizeServiceWorkerV243(); finalizeServiceWorkerV244(); finalizeServiceWorkerV245();
// finalizeServiceWorkerV246(); finalizeServiceWorkerV247(); finalizeServiceWorkerV249();
// rotateServiceWorkerV250(); rotateServiceWorkerV253(); rotateServiceWorkerV256();
// rotateServiceWorkerV257(); rotateServiceWorkerV258();
//
// Do not add rotateServiceWorkerV259 here. v260 uses the committed public/sw.js
// source and a separate source-level cache migration instead of rewriting dist/sw.js.

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-native-studio-v260",
      apply: "build",
      async buildStart() {
        const v260 = await finalizeStudioV259Order();
        console.log(`[vite] ${v260.release} read-only Studio/auth/Nara contract validation passed`);
      },
    },
  ],
});