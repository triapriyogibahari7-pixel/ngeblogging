import { defineConfig } from "vite";
import { finalizeServiceWorkerV237 } from "./scripts/service-worker-v237-lib.mjs";

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-service-worker-v237",
      apply: "build",
      closeBundle() {
        const result = finalizeServiceWorkerV237();
        console.log(`[vite] ${result.release} finalized in ${result.path}`);
      },
    },
  ],
});
