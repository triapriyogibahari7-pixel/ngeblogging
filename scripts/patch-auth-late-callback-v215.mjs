import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "auth-late-callback-recovery-v215-20260802";
const MAIN_MARKER = "authLateCallbackRecoveryV215";
const V162_MAIN_MARKER = "consumeAuthCallbackV162().then";
const VERSION = "ngeblogging-app-v215-auth-late-callback-20260802";
const CACHE = "auth-late-callback-cache-v215";

async function ensureV162Prerequisite() {
  let source = await read("src/main.jsx");
  if (source.includes(MAIN_MARKER) || source.includes(V162_MAIN_MARKER)) return source;
  await import("./patch-auth-callback-v162.mjs");
  source = await read("src/main.jsx");
  if (!source.includes(V162_MAIN_MARKER)) throw new Error("V215_V162_PREREQUISITE_FAILED");
  return source;
}

async function patchMain() {
  const path = "src/main.jsx";
  let source = await ensureV162Prerequisite();
  if (source.includes(MAIN_MARKER)) return;

  const anchor = `      if (callback.status === "error") {\n        setAuthMode("signin");\n        setAuthMessage(callback.error?.message || "Callback login belum berhasil.");\n        setDemo(true);\n        return;\n      }`;

  const replacement = `      if (callback.status === "error") {\n        const callbackErrorText = String(callback.error?.message || callback.error?.error_description || callback.error?.error || "");\n        const authLateCallbackRecoveryV215 = /oauth state.*(?:not found|expired)|flow state|pkce|already.*used|invalid.*code/i.test(callbackErrorText);\n        if (authLateCallbackRecoveryV215) {\n          const retained = await supabase.auth.getSession().catch(() => ({ data: { session: null }, error: null }));\n          if (!active) return;\n          const retainedSession = retained?.data?.session || null;\n          if (retainedSession?.access_token && retainedSession?.refresh_token) {\n            clearAuthQuery();\n            openVerifiedStudio(retainedSession);\n            document.documentElement.dataset.authLateCallbackRecoveryV215 = "retained-verified-session";\n            return;\n          }\n        }\n        setAuthMode("signin");\n        setAuthMessage(callback.error?.message || "Callback login belum berhasil.");\n        setDemo(true);\n        return;\n      }`;

  if (!source.includes(anchor)) throw new Error("V215_AUTH_CALLBACK_ERROR_BLOCK_MISSING");
  source = source.replace(anchor, replacement);
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "auth-late-callback-v215";');
  if (!source.includes("AUTH_LATE_CALLBACK_RELEASE_V215")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const AUTH_LATE_CALLBACK_RELEASE_V215 = "${RELEASE}";\nconst AUTH_LATE_CALLBACK_COMPAT_VERSION_V214 = "ngeblogging-app-v214-clean-screenshot-20260802";\nconst AUTH_LATE_CALLBACK_COMPAT_CACHE_V214 = "clean-screenshot-cache-v214";\n`,
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V214", "NGE_BLOGGING_UPDATE_AVAILABLE_V215");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v215 keeps callback/login pages stable and only announces the update.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V215_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const main = await read("src/main.jsx");
  const callback = await read("src/lib/auth-callback-v162.js");
  const auth = await read("src/lib/supabase.js");
  const worker = await read("public/sw.js");

  for (const marker of [
    MAIN_MARKER,
    "retained-verified-session",
    "await supabase.auth.getSession()",
    "openVerifiedStudio(retainedSession)",
  ]) {
    if (!main.includes(marker)) throw new Error(`V215_MAIN_VERIFY_FAILED:${marker}`);
  }
  for (const marker of [
    "auth-callback-singleflight-v162-20260730",
    'Symbol.for("ngeblogging.auth.callbackOperationV162")',
    "exchangeCodeForSession(code)",
  ]) {
    if (!callback.includes(marker)) throw new Error(`V215_V162_COMPAT_FAILED:${marker}`);
  }
  if ((callback.match(/exchangeCodeForSession\(code\)/g) || []).length !== 1) {
    throw new Error("V215_PKCE_EXCHANGE_OWNER_CHANGED");
  }
  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'flowType: "pkce"']) {
    if (!auth.includes(marker)) throw new Error(`V215_SESSION_CONFIG_MISSING:${marker}`);
  }
  for (const marker of [VERSION, CACHE, RELEASE]) {
    if (!worker.includes(marker)) throw new Error(`V215_WORKER_VERIFY_FAILED:${marker}`);
  }

  const recoveryStart = main.indexOf("const authLateCallbackRecoveryV215");
  const recoveryEnd = main.indexOf('setAuthMode("signin")', recoveryStart);
  const recoveryBlock = recoveryStart >= 0 && recoveryEnd > recoveryStart
    ? main.slice(recoveryStart, recoveryEnd)
    : "";
  if (!recoveryBlock) throw new Error("V215_RECOVERY_BLOCK_NOT_FOUND");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(recoveryBlock)) {
    throw new Error("V215_RECOVERY_BLOCK_DESTRUCTIVE_ACTION_FOUND");
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(callback)) {
    throw new Error("V215_CALLBACK_V162_DESTRUCTIVE_ACTION_FOUND");
  }
  if (!/const leaveStudio = async \(\) =>/.test(main) || !/await signOut\(\)/.test(main)) {
    throw new Error("V215_EXPLICIT_LOGOUT_MISSING");
  }
}

await patchMain();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}: late stale OAuth callbacks retain an already verified session.`);
