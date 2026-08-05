import { defineConfig } from "vite";

// Build authority v302.
//
// IMPORTANT: `scripts/finalize-studio-v259-order.mjs` remains in Git as a
// historical audit/backup, but it must not execute from Vite anymore. Its v260
// contract requires v257/v259/v260 shell runtimes to be live imports in
// `Studio.jsx`; those runtimes were intentionally retired when v287-v301 moved
// sidebar, profile and Nara ownership to the newer single-owner chain.
//
// Historical diagnostics already proved this exact hook was the build breaker:
// the pre-hook control compiled, while enabling `finalizeStudioV259Order()` alone
// made the provider build fail. Re-enabling it would force obsolete shell owners
// back into production just to satisfy a stale validator.
//
// Current validation lives in source tests v289-v301 and release/service-worker
// contracts. Vite is therefore kept as a pure bundler and does not mutate or
// re-activate historical Studio authorities during build.

export default defineConfig({});
