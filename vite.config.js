import { defineConfig } from "vite";
import { finalizeServiceWorkerV237 } from "./scripts/service-worker-v237-lib.mjs";
import { finalizeServiceWorkerV238 } from "./scripts/service-worker-v238-lib.mjs";

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-service-worker-v238",
      apply: "build",
      closeBundle() {
        const previous = finalizeServiceWorkerV237();
        console.log(`[vite] ${previous.release} compatibility finalized in ${previous.path}`);
        const result = finalizeServiceWorkerV238();
        console.log(`[vite] ${result.release} finalized in ${result.path}`);
      },
    },
  ],
});