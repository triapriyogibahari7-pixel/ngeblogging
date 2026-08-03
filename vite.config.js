import { defineConfig } from "vite";
import { finalizeServiceWorkerV237 } from "./scripts/service-worker-v237-lib.mjs";
import { finalizeServiceWorkerV238 } from "./scripts/service-worker-v238-lib.mjs";
import { finalizeServiceWorkerV239 } from "./scripts/service-worker-v239-lib.mjs";
import { finalizeServiceWorkerV240 } from "./scripts/service-worker-v240-lib.mjs";
import { finalizeServiceWorkerV241 } from "./scripts/service-worker-v241-lib.mjs";

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-service-worker-v241",
      apply: "build",
      closeBundle() {
        const v237 = finalizeServiceWorkerV237();
        console.log(`[vite] ${v237.release} compatibility finalized in ${v237.path}`);
        const v238 = finalizeServiceWorkerV238();
        console.log(`[vite] ${v238.release} compatibility finalized in ${v238.path}`);
        const v239 = finalizeServiceWorkerV239();
        console.log(`[vite] ${v239.release} compatibility finalized in ${v239.path}`);
        const v240 = finalizeServiceWorkerV240();
        console.log(`[vite] ${v240.release} compatibility finalized in ${v240.path}`);
        const v241 = finalizeServiceWorkerV241();
        console.log(`[vite] ${v241.release} finalized in ${v241.path}`);
      },
    },
  ],
});