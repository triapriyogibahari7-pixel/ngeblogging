import { defineConfig } from "vite";
import { activateStudioNativeV250 } from "./scripts/activate-studio-native-v250.mjs";
import { finalizeStudioV255Order } from "./scripts/finalize-studio-v255-order.mjs";
import { finalizeStudioV257Order } from "./scripts/finalize-studio-v257-order.mjs";
import { finalizeStudioV259Order } from "./scripts/finalize-studio-v259-order.mjs";
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
      name: "ngeblogging-native-studio-v260",
      apply: "build",
      async buildStart() {
        const v250 = await activateStudioNativeV250();
        console.log(`[vite] ${v250.release} activated after historical regressions and before bundling`);
        console.log(`[vite] ${v250.shellNaraRelease} remains the v253 compatibility base`);
        const v256 = await finalizeStudioV255Order();
        console.log(`[vite] ${v256.release} keeps v255 interaction authority after legacy activators`);
        const v257 = await finalizeStudioV257Order();
        console.log(`[vite] ${v257.release} keeps v257 visual authority after historical activators`);
        const v260 = await finalizeStudioV259Order();
        console.log(`[vite] ${v260.release} validates shell/auth contracts and keeps v260 final after v259 compatibility layers`);
      },
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
        console.log(`[vite] ${v241.release} compatibility finalized in ${v241.path}`);
        const v242 = finalizeServiceWorkerV242();
        console.log(`[vite] ${v242.release} compatibility finalized in ${v242.path}`);
        const v243 = finalizeServiceWorkerV243();
        console.log(`[vite] ${v243.release} compatibility finalized in ${v243.path}`);
        const v244 = finalizeServiceWorkerV244();
        console.log(`[vite] ${v244.release} compatibility finalized in ${v244.path}`);
        const v245 = finalizeServiceWorkerV245();
        console.log(`[vite] ${v245.release} compatibility finalized in ${v245.path}`);
        const v246 = finalizeServiceWorkerV246();
        console.log(`[vite] ${v246.release} compatibility finalized in ${v246.path}`);
        const v247 = finalizeServiceWorkerV247();
        console.log(`[vite] ${v247.release} compatibility finalized in ${v247.path}`);
        const v249 = finalizeServiceWorkerV249();
        console.log(`[vite] ${v249.release} compatibility finalized in ${v249.path}`);
        const v250 = rotateServiceWorkerV250();
        console.log(`[vite] ${v250.release} cache rotation finalized in ${v250.path}`);
        const v253 = rotateServiceWorkerV253();
        console.log(`[vite] ${v253.release} cache rotation finalized in ${v253.path}`);
        const v256 = rotateServiceWorkerV256();
        console.log(`[vite] ${v256.release} cache rotation finalized in ${v256.path}`);
        const v257 = rotateServiceWorkerV257();
        console.log(`[vite] ${v257.release} cache rotation finalized in ${v257.path}`);
        const v258 = rotateServiceWorkerV258();
        console.log(`[vite] ${v258.release} cache rotation finalized in ${v258.path}`);
        const v260 = rotateServiceWorkerV259();
        console.log(`[vite] ${v260.release} final cache rotation finalized in ${v260.path}`);
      },
    },
  ],
});