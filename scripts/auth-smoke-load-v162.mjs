import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AUTH_SMOKE_RELEASE = "auth-smoke-load-v162-20260730";
export const MAX_SAFE_REQUESTS = 200;
export const MAX_SAFE_CONCURRENCY = 20;
export const SAFE_PATHS = Object.freeze([
  "/",
  "/login",
  "/signup",
  "/studio",
  "/release-v162.json",
  "/release-v163.json",
  "/api/health",
]);

function integerArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} harus berupa bilangan bulat positif.`);
  return value;
}

function stringArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? String(process.argv[index + 1]) : fallback;
}

export function validateSmokePlan({ requests, concurrency, paths = SAFE_PATHS }) {
  if (!Number.isInteger(requests) || requests < 1 || requests > MAX_SAFE_REQUESTS) {
    throw new Error(`Jumlah request smoke harus 1–${MAX_SAFE_REQUESTS}.`);
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_SAFE_CONCURRENCY) {
    throw new Error(`Concurrency smoke harus 1–${MAX_SAFE_CONCURRENCY}.`);
  }
  for (const path of paths) {
    if (!SAFE_PATHS.includes(path)) throw new Error(`Path ${path} tidak diizinkan untuk smoke publik.`);
  }
  return { requests, concurrency, paths: [...paths] };
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

export async function runSmoke({ origin, requests = 20, concurrency = 4, paths = SAFE_PATHS, fetchImpl = fetch }) {
  const plan = validateSmokePlan({ requests, concurrency, paths });
  const base = new URL(origin);
  if (!/^https?:$/.test(base.protocol)) throw new Error("Origin smoke harus HTTP atau HTTPS.");

  const queue = Array.from({ length: plan.requests }, (_, index) => plan.paths[index % plan.paths.length]);
  const latencies = [];
  const failures = [];
  const statuses = {};
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const path = queue[index];
      const url = new URL(path, base);
      const started = performance.now();
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          redirect: "manual",
          cache: "no-store",
          headers: {
            accept: path.endsWith(".json") || path.startsWith("/api/")
              ? "application/json"
              : "text/html,application/xhtml+xml",
            "user-agent": `ngeblogging-${AUTH_SMOKE_RELEASE}`,
          },
        });
        const elapsed = performance.now() - started;
        latencies.push(elapsed);
        statuses[response.status] = (statuses[response.status] || 0) + 1;
        if (response.status >= 500) failures.push({ path, status: response.status, reason: "server-error" });
        await response.arrayBuffer().catch(() => null);
      } catch (error) {
        latencies.push(performance.now() - started);
        failures.push({ path, status: 0, reason: error?.message || "network-error" });
      }
    }
  }

  await Promise.all(Array.from({ length: plan.concurrency }, () => worker()));
  return {
    release: AUTH_SMOKE_RELEASE,
    proof: "public-get-smoke-only",
    origin: base.origin,
    requests: plan.requests,
    concurrency: plan.concurrency,
    statuses,
    failures,
    failureRate: plan.requests ? failures.length / plan.requests : 0,
    latencyMs: {
      min: latencies.length ? Math.round(Math.min(...latencies)) : null,
      p50: Math.round(percentile(latencies, 0.5) ?? 0),
      p95: Math.round(percentile(latencies, 0.95) ?? 0),
      max: latencies.length ? Math.round(Math.max(...latencies)) : null,
    },
    credentialsUsed: false,
    accountsCreated: false,
  };
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const origin = stringArg("--origin", "http://127.0.0.1:4173");
  const requests = integerArg("--requests", 20);
  const concurrency = integerArg("--concurrency", 4);
  runSmoke({ origin, requests, concurrency }).then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.failureRate > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
