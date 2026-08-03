import { defineConfig } from "vite";
import { finalizeServiceWorkerV237 } from "./scripts/service-worker-v237-lib.mjs";
import { finalizeServiceWorkerV238 } from "./scripts/service-worker-v238-lib.mjs";
import { finalizeServiceWorkerV239 } from "./scripts/service-worker-v239-lib.mjs";

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-service-worker-v239",
      apply: "build",
      closeBundle() {
        const v237 = finalizeServiceWorkerV237();
        console.log(`[vite] ${v237.release} compatibility finalized in ${v237.path}`);
        const v238 = finalizeServiceWorkerV238();
        console.log(`[vite] ${v238.release} compatibility finalized in ${v238.path}`);
        const v239 = finalizeServiceWorkerV239();
        console.log(`[vite] ${v239.release} finalized in ${v239.path}`);
      },
    },
  ],
});