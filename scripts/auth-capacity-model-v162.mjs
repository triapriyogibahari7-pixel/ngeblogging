import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CAPACITY_RELEASE = "auth-capacity-model-v162-20260730";
export const LOGICAL_USER_TARGET = 900_000_000_000_000_000n;
export const REQUESTS_PER_LOGIN = 5n;
export const SECONDS_PER_DAY = 86_400n;
export const REFERENCE_SHARD_RPS = 5_000n;

export function ceilDiv(value, divisor) {
  if (divisor <= 0n) throw new Error("Divisor harus lebih besar dari nol.");
  return (value + divisor - 1n) / divisor;
}

export function modelDailyActivity({ numerator, denominator }) {
  const activeUsers = ceilDiv(LOGICAL_USER_TARGET * BigInt(numerator), BigInt(denominator));
  const loginAttemptsPerSecond = ceilDiv(activeUsers, SECONDS_PER_DAY);
  const authRequestsPerSecond = loginAttemptsPerSecond * REQUESTS_PER_LOGIN;
  const referenceShards = ceilDiv(authRequestsPerSecond, REFERENCE_SHARD_RPS);
  return {
    activeUsers: activeUsers.toString(),
    loginAttemptsPerSecondCeil: loginAttemptsPerSecond.toString(),
    authRequestsPerSecondCeil: authRequestsPerSecond.toString(),
    referenceShardsAt5000Rps: referenceShards.toString(),
  };
}

export function modelBurst({ virtualLogins, concurrency, latencyMs }) {
  const logins = BigInt(virtualLogins);
  const requests = logins * REQUESTS_PER_LOGIN;
  const concurrent = BigInt(concurrency);
  const latency = BigInt(latencyMs);
  const requestsPerSecond = ceilDiv(concurrent * 1_000n, latency);
  const estimatedDurationMs = ceilDiv(requests * 1_000n, requestsPerSecond);
  return {
    virtualLogins: logins.toString(),
    requests: requests.toString(),
    concurrency: concurrent.toString(),
    assumedLatencyMs: latency.toString(),
    modeledRequestsPerSecond: requestsPerSecond.toString(),
    modeledDurationMs: estimatedDurationMs.toString(),
    proof: "model-only",
  };
}

export function buildCapacityReport() {
  return {
    status: "model-only",
    release: CAPACITY_RELEASE,
    generatedAt: "2026-07-30T00:00:00.000Z",
    interpretation: {
      phrase: "900 juta miliar pengguna",
      logicalUsers: LOGICAL_USER_TARGET.toString(),
      formula: "900 × 1.000.000 × 1.000.000.000",
    },
    warning: "Model ini tidak membuktikan infrastruktur produksi mampu melayani jumlah tersebut. Kapasitas hanya boleh diklaim setelah load test bertahap pada staging dan produksi dengan observability, quota, biaya, failover, serta persetujuan penyedia.",
    authFlowAssumption: {
      requestsPerLogin: REQUESTS_PER_LOGIN.toString(),
      steps: ["authorize", "provider callback", "PKCE token exchange", "session/user verification", "Studio handoff"],
    },
    dailyActivityModels: {
      allUsersOncePerDay: modelDailyActivity({ numerator: 1, denominator: 1 }),
      onePercentDaily: modelDailyActivity({ numerator: 1, denominator: 100 }),
      zeroPointZeroOnePercentDaily: modelDailyActivity({ numerator: 1, denominator: 10_000 }),
      zeroPointZeroZeroZeroOnePercentDaily: modelDailyActivity({ numerator: 1, denominator: 1_000_000 }),
    },
    stagedValidationPlan: [
      {
        name: "contract",
        description: "Satu callback sintetis; memastikan kode hanya ditukar sekali dan session diteruskan ke Studio.",
        ...modelBurst({ virtualLogins: 1, concurrency: 1, latencyMs: 250 }),
      },
      {
        name: "preview-safe",
        description: "Simulasi lokal/preview tanpa kredensial provider dan tanpa menyerang endpoint produksi.",
        ...modelBurst({ virtualLogins: 100, concurrency: 20, latencyMs: 250 }),
      },
      {
        name: "staging-ramp",
        description: "Target staging setelah quota dan observability tersedia.",
        ...modelBurst({ virtualLogins: 10_000, concurrency: 500, latencyMs: 250 }),
      },
      {
        name: "regional-model",
        description: "Model per region; bukan pengujian yang sudah dijalankan.",
        ...modelBurst({ virtualLogins: 1_000_000, concurrency: 10_000, latencyMs: 250 }),
      },
    ],
    safetyPolicy: {
      realProviderPasswordsInCI: false,
      massAccountCreation: false,
      productionCredentialLoadTest: false,
      safePublicGetSmokeMaximumRequests: 200,
      requiresExplicitInfrastructureApprovalAbove: 200,
    },
    requiredArchitectureForExtremeScale: [
      "regional identity edge and rate limiting",
      "partitioned auth/session storage",
      "queue-based onboarding and email delivery",
      "multi-region database with tested failover",
      "per-tenant quotas and abuse prevention",
      "capacity-based autoscaling and cost controls",
      "synthetic monitoring and SLO/error-budget enforcement",
    ],
  };
}

export function writeCapacityReport(output = resolve("public/auth-capacity-v162.json")) {
  mkdirSync(dirname(output), { recursive: true });
  const report = buildCapacityReport();
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  const outputFlag = process.argv.indexOf("--output");
  const output = outputFlag >= 0 && process.argv[outputFlag + 1]
    ? resolve(process.argv[outputFlag + 1])
    : resolve("public/auth-capacity-v162.json");
  const report = writeCapacityReport(output);
  console.log(JSON.stringify({
    release: report.release,
    status: report.status,
    output,
    logicalUsers: report.interpretation.logicalUsers,
  }));
}
