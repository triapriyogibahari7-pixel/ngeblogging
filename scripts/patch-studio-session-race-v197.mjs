import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-session-race-recovery-v197-20260802";
const VERSION = "ngeblogging-app-v197-session-race-20260802";
const CACHE = "studio-session-race-cache-v197";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V197_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function replaceTopLevelFunction(source, signature, replacement, label) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V197_${label}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V197_${label}_END_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

function wrapTopLevelFunctionSingleFlight(source, { signature, marker, promiseName, userName, dataset }) {
  if (source.includes(marker)) return source;
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V197_${marker}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V197_${marker}_END_MISSING`);
  const inner = source.slice(start + signature.length, end);
  const indented = inner.split("\n").map((line) => `  ${line}`).join("\n");
  const replacement = `${signature}
  if (${promiseName} && ${userName} === userId) {
    document.documentElement.dataset.${dataset} = "joined";
    return ${promiseName};
  }

  ${userName} = userId;
  document.documentElement.dataset.${dataset} = "leader";
  const operationV197 = (async () => {${indented}
  })();
  let wrappedV197;
  wrappedV197 = operationV197.finally(() => {
    if (${promiseName} === wrappedV197) {
      ${promiseName} = null;
      ${userName} = "";
    }
  });
  ${promiseName} = wrappedV197;
  return wrappedV197;
}`;
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

async function patchAuthSession() {
  const path = "src/lib/auth-session-v76.js";
  let source = await read(path);

  if (!source.includes("AUTH_SESSION_RACE_RELEASE_V197")) {
    source = source.replace(
      'export const AUTH_SESSION_RELEASE = "auth-session-authority-v108-20260728";',
      'export const AUTH_SESSION_RELEASE = "auth-session-authority-v108-20260728";\nexport const AUTH_SESSION_RACE_RELEASE_V197 = "studio-session-race-recovery-v197-20260802";',
    );
  }

  if (!source.includes("even a forced verification must join an in-flight verification")) {
    const signature = "export function getVerifiedSession({ force = false } = {}) {";
    const replacement = `export function getVerifiedSession({ force = false } = {}) {
  // v197: even a forced verification must join an in-flight verification.
  // This prevents simultaneous getUser/refresh operations from rotating a bearer token
  // while a Studio membership request still uses the previous token.
  if (verificationPromise) return verificationPromise;

  if (!force && window.__ngebloggingVerifiedSession?.session?.access_token) {
    return Promise.resolve(window.__ngebloggingVerifiedSession);
  }

  const operation = verifyInternal();
  const wrapped = operation.finally(() => {
    if (verificationPromise === wrapped) verificationPromise = null;
  });
  verificationPromise = wrapped;
  return wrapped;
}`;
    source = replaceTopLevelFunction(source, signature, replacement, "AUTH_SINGLE_FLIGHT");
  }

  await write(path, source);
}

async function patchGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes("STUDIO_SESSION_RACE_RELEASE_V197")) {
    const anchor = 'const STUDIO_BOOTSTRAP_RECOVERY_V196 = "studio-bootstrap-live-recovery-v196-20260802";';
    if (!source.includes(anchor)) throw new Error("V197_REQUIRES_V196_GATE");
    source = source.replace(
      anchor,
      `${anchor}\nconst STUDIO_SESSION_RACE_RELEASE_V197 = "${RELEASE}";\nlet studioMembershipPromiseV197 = null;\nlet studioMembershipUserV197 = "";\nlet studioRecoveryPromiseV197 = null;\nlet studioRecoveryUserV197 = "";`,
    );
  }

  if (!source.includes("rotated-local-session-v197")) {
    const signature = "async function refreshRejectedSessionV195(rejectedToken) {";
    const replacement = `async function refreshRejectedSessionV195(rejectedToken) {
  const attempt = rejectedToken ? 1 : 0;

  // v197: a 401 from an old bearer token is not automatically a failed login.
  // Supabase may already have rotated the persisted session while that request was in flight.
  try {
    const localResult = await withDeadline(
      supabase.auth.getSession(),
      LOCAL_SESSION_TIMEOUT_V195_MS,
      "Pembacaan token pengganti melewati batas waktu.",
    );
    if (localResult?.error) throw localResult.error;
    const currentSession = localResult?.data?.session || null;
    if (
      currentSession?.access_token
      && typeof rejectedToken === "string"
      && currentSession.access_token !== rejectedToken
    ) {
      const rotated = {
        session: currentSession,
        user: currentSession.user || null,
        verification: "rotated-local-session-v197",
      };
      window.__ngebloggingVerifiedSession = rotated;
      document.documentElement.dataset.studioSessionRaceV197 = "newer-local-token-reused";
      return rotated;
    }
  } catch (localError) {
    if (!isTransientStudioError(localError)) throw localError;
  }

  document.documentElement.dataset.studioSessionRaceV197 = "single-flight-remote-verification";
  return getVerifiedSession({ force: attempt > 0 });
}`;
    source = replaceTopLevelFunction(source, signature, replacement, "REJECTED_TOKEN_RECOVERY");
  }

  source = source.replace(
    'const rejectedToken = directStatus === 401 || directStatus === 403\n        || directCode === "session_reauth_required";',
    'const rejectedToken = (directStatus === 401 || directStatus === 403\n        || directCode === "session_reauth_required") ? accessToken : "";',
  );
  source = source.replace(
    'const rejected = status === 401 || status === 403 || code === "session_reauth_required";',
    'const rejected = (status === 401 || status === 403 || code === "session_reauth_required") ? token : "";',
  );
  source = source.replace('refreshRejectedSessionV195(true)', 'refreshRejectedSessionV195(rejected)');

  source = wrapTopLevelFunctionSingleFlight(source, {
    signature: "async function loadStudioMembership(userId) {",
    marker: "studioMembershipSingleFlightV197",
    promiseName: "studioMembershipPromiseV197",
    userName: "studioMembershipUserV197",
    dataset: "studioMembershipSingleFlightV197",
  });

  source = wrapTopLevelFunctionSingleFlight(source, {
    signature: "async function recoverStudioMembershipV196(userId, cause = null) {",
    marker: "studioRecoverySingleFlightV197",
    promiseName: "studioRecoveryPromiseV197",
    userName: "studioRecoveryUserV197",
    dataset: "studioRecoverySingleFlightV197",
  });

  if (!source.includes("studioSessionRaceReleaseV197")) {
    const anchor = "document.documentElement.dataset.studioBootstrapReleaseV196 = STUDIO_BOOTSTRAP_RECOVERY_V196;";
    if (!source.includes(anchor)) throw new Error("V197_RELEASE_DATASET_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `${anchor}\n  document.documentElement.dataset.studioSessionRaceReleaseV197 = STUDIO_SESSION_RACE_RELEASE_V197;`,
    );
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V197_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-session-race-v197";');

  const compatVersion = 'const STUDIO_SESSION_RACE_COMPAT_VERSION_V196 = "ngeblogging-app-v196-live-recovery-20260802";';
  const compatCache = 'const STUDIO_SESSION_RACE_COMPAT_CACHE_V196 = "studio-bootstrap-live-recovery-cache-v196";';
  for (const marker of [compatVersion, compatCache]) {
    if (!source.includes(marker)) source = source.replace(/^(const VERSION = .*;\n)/m, `$1${marker}\n`);
  }
  if (!source.includes("STUDIO_SESSION_RACE_RELEASE_V197")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_SESSION_RACE_RELEASE_V197 = "${RELEASE}";\n`);
  }

  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V196", "NGE_BLOGGING_UPDATE_AVAILABLE_V197")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V195", "NGE_BLOGGING_UPDATE_AVAILABLE_V197")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v197 never forces navigation; auth/session and drafts remain intact.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V197_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V197_SERVICE_WORKER_SESSION_DESTRUCTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/lib/auth-session-v76.js", "AUTH_SESSION_RACE_RELEASE_V197"],
    ["src/lib/auth-session-v76.js", "if (verificationPromise) return verificationPromise"],
    ["src/StudioOnboardingGate.jsx", "rotated-local-session-v197"],
    ["src/StudioOnboardingGate.jsx", "async function loadStudioMembership(userId)"],
    ["src/StudioOnboardingGate.jsx", "studioMembershipSingleFlightV197"],
    ["src/StudioOnboardingGate.jsx", "async function recoverStudioMembershipV196(userId, cause = null)"],
    ["src/StudioOnboardingGate.jsx", "studioRecoverySingleFlightV197"],
    ["src/StudioOnboardingGate.jsx", "studioSessionRaceReleaseV197"],
    ["public/sw.js", "STUDIO_SESSION_RACE_RELEASE_V197"],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/release-v197.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V197_VERIFY_FAILED:${path}:${marker}`);
  }

  const auth = await read("src/lib/auth-session-v76.js");
  const singleFlightIndex = auth.indexOf("if (verificationPromise) return verificationPromise");
  const cacheIndex = auth.indexOf("if (!force && window.__ngebloggingVerifiedSession?.session?.access_token)");
  if (singleFlightIndex < 0 || cacheIndex < 0 || singleFlightIndex > cacheIndex) throw new Error("V197_AUTH_FORCE_CAN_STILL_RACE");

  const gate = await read("src/StudioOnboardingGate.jsx");
  const loadStart = gate.indexOf("async function loadStudioMembership(userId)");
  const loadEnd = gate.indexOf("\n}\n", loadStart);
  const loadBody = gate.slice(loadStart, loadEnd + 3);
  if (!loadBody.includes("readLocalStudioSessionV195")) throw new Error("V197_BROKE_V195_LOCAL_SESSION_CONTRACT");
  if (!loadBody.includes("refreshRejectedSessionV195(rejectedToken)")) throw new Error("V197_BROKE_V195_REFRESH_CONTRACT");
  if (!/\? accessToken : ""/.test(gate)) throw new Error("V197_REJECTED_ACCESS_TOKEN_NOT_PRESERVED");
  if (!/refreshRejectedSessionV195\(rejected\)/.test(gate)) throw new Error("V197_RECOVERY_STILL_USES_BOOLEAN_TOKEN");
  if (/service_role|SUPABASE_SERVICE_ROLE/.test(gate)) throw new Error("V197_PRIVILEGED_BROWSER_KEY_FORBIDDEN");
}

await patchAuthSession();
await patchGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
