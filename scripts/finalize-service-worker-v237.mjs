import { finalizeServiceWorkerV237 } from "./service-worker-v237-lib.mjs";

const result = finalizeServiceWorkerV237();
console.log(`Finalized ${result.path} for ${result.release} after production tests and Vite build.`);
