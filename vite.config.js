import { defineConfig } from "vite";
import { activateStudioNativeV250 } from "./scripts/activate-studio-native-v250.mjs";
import { finalizeStudioV255Order } from "./scripts/finalize-studio-v255-order.mjs";
import { finalizeStudioV257Order } from "./scripts/finalize-studio-v257-order.mjs";
import { finalizeServiceWorkerV237 } from "./scripts/service-worker-v237-lib.mjs";
import { finalizeServiceWorkerV238 } from "./scripts/service-worker-v238-lib.mjs";
import { finalizeServiceWorkerV239 } from "./scripts/service-worker-v239-lib.mjs";
import { finalizeServiceWorkerV240 } from "./scripts/service-worker-v240-lib.mjs";
import { finalizeServiceWorkerV241 } from "./scripts/service-worker-v241-lib.mjs";
import { finalizeServiceWorkerV242 } from "./scripts/service-worker-v242-lib.mjs";
import { finalizeServiceWorkerV243 } from "./scripts/service-worker-v243-lib.mjs";
import { finalizeServiceWorkerV244 } from "./scripts/service-worker-v244-lib.mjs";
import { finalizeServiceWorkerV245 } from "./scripts/service-worker-v245-lib.mjs";
import { finalizeServiceWorkerV246 } from "./scripts/service-worker-v246-lib.mjs";
import { finalizeServiceWorkerV247 } from "./scripts/service-worker-v247-lib.mjs";
import { finalizeServiceWorkerV249 } from "./scripts/service-worker-v249-lib.mjs";
import { rotateServiceWorkerV250 } from "./scripts/service-worker-v250-rotate.mjs";
import { rotateServiceWorkerV253 } from "./scripts/service-worker-v253-rotate.mjs";
import { rotateServiceWorkerV256 } from "./scripts/service-worker-v256-rotate.mjs";
import { rotateServiceWorkerV257 } from "./scripts/service-worker-v257-rotate.mjs";
import { rotateServiceWorkerV258 } from "./scripts/service-worker-v258-rotate.mjs";
import { rotateServiceWorkerV259 } from "./scripts/service-worker-v259-rotate.mjs";

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-diagnostic-v259-rotation-only",
      apply: "build",
      async buildStart() {
        await activateStudioNativeV250();
        await finalizeStudioV255Order();
        await finalizeStudioV257Order();
      },
      closeBundle() {
        finalizeServiceWorkerV237();
        finalizeServiceWorkerV238();
        finalizeServiceWorkerV239();
        finalizeServiceWorkerV240();
        finalizeServiceWorkerV241();
        finalizeServiceWorkerV242();
        finalizeServiceWorkerV243();
        finalizeServiceWorkerV244();
        finalizeServiceWorkerV245();
        finalizeServiceWorkerV246();
        finalizeServiceWorkerV247();
        finalizeServiceWorkerV249();
        rotateServiceWorkerV250();
        rotateServiceWorkerV253();
        rotateServiceWorkerV256();
        rotateServiceWorkerV257();
        rotateServiceWorkerV258();
        rotateServiceWorkerV259();
      },
    },
  ],
});
