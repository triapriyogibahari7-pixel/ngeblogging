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

function renameTopLevelFunction(source, signature, nextSignature, label) {
  if (source.includes(nextSignature)) return source;
  if (!source.includes(signature)) throw new Error(`V197_${label}_FUNCTION_MISSING`);
  return source.replace(signature, nextSignature);
}

function topLevelFunctionEnd(source, signature, label) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V197_${label}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V197_${label}_END_MISSING`);
  return end + 3;
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

  const oldFunction = `export function getVerifiedSession({ force = false } = {}) {
  if (!force && window.__ngebloggingVerifiedSession?.session?.access_token) {
    return Promise.resolve(window.__ngebloggingVerifiedSession);
  }
  if (!force && verificationPromise) return verificationPromise;

  const operation = verifyInternal();
  const wrapped = operation.finally(() => {
    if (verificationPromise === wrapped) verificationPromise = null;
  });
  verificationPromise = wrapped;
  return wrapped;
}`;

  const newFunction = `export function getVerifiedSession({ force = false } = {}) {
  // v197: even a forced verification must join an in-flight verification.
  // Starting multiple refresh/getUser operations in parallel can rotate a token while
  // another Studio membership request is still using the previous bearer token.
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

  if (!source.includes("even a forced verification must join an in-flight verification")) {
    source = replaceOnce(source, oldFunction, newFunction, "AUTH_SINGLE_FLIGHT");
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

  const oldRefresh = `async function refreshRejectedSessionV195(rejectedToken) {
  const attempt = rejectedToken ? 1 : 0;
  return getVerifiedSession({ force: attempt > 0 });
}`;

  const newRefresh = `async function refreshRejectedSessionV195(rejectedToken) {
  const attempt = rejectedToken ? 1 : 0;

  // v197 first checks whether Supabase already rotated the local token. A request that
  // received 401 with the previous token must not start another refresh when a newer
  // persisted token already exists.
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

  if (!source.includes("rotated-local-session-v197")) {
    source = replaceOnce(source, oldRefresh, newRefresh, "REJECTED_TOKEN_RECOVERY");
  }

  source = source.replace(
    'const rejectedToken = directStatus === 401 || directStatus === 403\n        || directCode === "session_reauth_required";',
    'const rejectedToken = (directStatus === 401 || directStatus === 403\n        || directCode === "session_reauth_required") ? accessToken : "";',
  );
  source = source.replace(
    'const rejected = status === 401 || status === 403 || code === "session_reauth_required";',
    'const rejected = (status === 401 || status === 403 || code === "session_reauth_required") ? token : "";',
  );
  source = source.replace(
    'refreshRejectedSessionV195(true)',
    'refreshRejectedSessionV195(rejected)',
  );

  if (!source.includes("loadStudioMembershipAttemptV197")) {
    source = renameTopLevelFunction(
      source,
      "async function loadStudioMembership(userId) {",
      "async function loadStudioMembershipAttemptV197(userId) {",
      "MEMBERSHIP_RENAME",
    );
    const signature = "async function loadStudioMembershipAttemptV197(userId) {";
    const end = topLevelFunctionEnd(source, signature, "MEMBERSHIP_ATTEMPT");
    const wrapper = `\nasync function loadStudioMembership(userId) {
  if (studioMembershipPromiseV197 && studioMembershipUserV197 === userId) {
    document.documentElement.dataset.studioMembershipSingleFlightV197 = "joined";
    return studioMembershipPromiseV197;
  }

  studioMembershipUserV197 = userId;
  document.documentElement.dataset.studioMembershipSingleFlightV197 = "leader";
  const operation = loadStudioMembershipAttemptV197(userId);
  let wrapped;
  wrapped = operation.finally(() => {
    if (studioMembershipPromiseV197 === wrapped) {
      studioMembershipPromiseV197 = null;
      studioMembershipUserV197 = "";
    }
  });
  studioMembershipPromiseV197 = wrapped;
  return wrapped;
}
`;
    source = `${source.slice(0, end)}${wrapper}${source.slice(end)}`;
  }

  if (!source.includes("recoverStudioMembershipAttemptV197")) {
    source = renameTopLevelFunction(
      source,
      "async function recoverStudioMembershipV196(userId, cause = null) {",
      "async function recoverStudioMembershipAttemptV197(userId, cause = null) {",
      "RECOVERY_RENAME",
    );
    const signature = "async function recoverStudioMembershipAttemptV197(userId, cause = null) {";
    const end = topLevelFunctionEnd(source, signature, "RECOVERY_ATTEMPT");
    const wrapper = `\nasync function recoverStudioMembershipV196(userId, cause = null) {
  if (studioRecoveryPromiseV197 && studioRecoveryUserV197 === userId) {
    document.documentElement.dataset.studioRecoverySingleFlightV197 = "joined";
    return studioRecoveryPromiseV197;
  }

  studioRecoveryUserV197 = userId;
  document.documentElement.dataset.studioRecoverySingleFlightV197 = "leader";
  const operation = recoverStudioMembershipAttemptV197(userId, cause);
  let wrapped;
  wrapped = operation.finally(() => {
    if (studioRecoveryPromiseV197 === wrapped) {
      studioRecoveryPromiseV197 = null;
      studioRecoveryUserV197 = "";
    }
  });
  studioRecoveryPromiseV197 = wrapped;
  return wrapped;
}
`;
    source = `${source.slice(0, end)}${wrapper}${source.slice(end)}`;
  }

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
    if (!source.includes(marker)) {
      source = source.replace(/^(const VERSION = .*;\n)/m, `$1${marker}\n`);
    }
  }

  if (!source.includes("STUDIO_SESSION_RACE_RELEASE_V197")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_SESSION_RACE_RELEASE_V197 = "${RELEASE}";\n`,
    );
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
    ["src/StudioOnboardingGate.jsx", "loadStudioMembershipAttemptV197"],
    ["src/StudioOnboardingGate.jsx", "studioMembershipSingleFlightV197"],
    ["src/StudioOnboardingGate.jsx", "recoverStudioMembershipAttemptV197"],
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
  if (singleFlightIndex < 0 || cacheIndex < 0 || singleFlightIndex > cacheIndex) {
    throw new Error("V197_AUTH_FORCE_CAN_STILL_RACE");
  }

  const gate = await read("src/StudioOnboardingGate.jsx");
  if (!/\? accessToken : ""/.test(gate)) throw new Error("V197_REJECTED_ACCESS_TOKEN_NOT_PRESERVED");
  if (!/refreshRejectedSessionV195\(rejected\)/.test(gate)) throw new Error("V197_RECOVERY_STILL_USES_BOOLEAN_TOKEN");
  if (/service_role|SUPABASE_SERVICE_ROLE/.test(gate)) throw new Error("V197_PRIVILEGED_BROWSER_KEY_FORBIDDEN");
}

await patchAuthSession();
await patchGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
