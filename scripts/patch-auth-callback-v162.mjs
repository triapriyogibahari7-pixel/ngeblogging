import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const mainPath = resolve("src/main.jsx");
const modalPath = resolve("src/AuthModal.jsx");
const bootstrapPath = resolve("src/auth-studio-bootstrap-v106.js");
const indexPath = resolve("index.html");
const authorityPath = resolve("src/auth-callback-authority-v107.js");
const callbackPath = resolve("src/lib/auth-callback-v162.js");

let main = readFileSync(mainPath, "utf8");
let modal = readFileSync(modalPath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let index = readFileSync(indexPath, "utf8");
const authority = readFileSync(authorityPath, "utf8");
const callback = readFileSync(callbackPath, "utf8");
const release = "auth-callback-singleflight-v162-20260730";
const modalHasV255Handoff = modal.includes("auth-session-handoff-v255-20260804")
  && modal.includes("settleAuthenticatedSession")
  && modal.includes("await settleAuthenticatedSession(data?.session || null)")
  && modal.includes("await settleAuthenticatedSession(data.session)");

function insertOnce(source, anchor, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(anchor)) throw new Error(`PATCH_AUTH_V162_${label}_ANCHOR_MISSING`);
  return source.replace(anchor, replacement);
}

main = insertOnce(
  main,
  'import { signOut, supabase, supabaseConfigured } from "./lib/supabase";',
  'import { signOut, supabase, supabaseConfigured } from "./lib/supabase";\nimport { consumeAuthCallbackV162 } from "./lib/auth-callback-v162.js";',
  "IMPORT",
);

const effectStart = '  useEffect(() => {\n    if (!supabaseConfigured || !supabase) return undefined;\n    let active = true;\n    const params = new URLSearchParams(window.location.search);';
const effectEnd = '  }, []);\n\n  const openAuth = () => {';
if (!main.includes("consumeAuthCallbackV162().then")) {
  const start = main.indexOf(effectStart);
  const end = main.indexOf(effectEnd, start);
  if (start < 0 || end < 0) throw new Error("PATCH_AUTH_V162_EFFECT_ANCHOR_MISSING");
  const replacement = `  useEffect(() => {\n    if (!supabaseConfigured || !supabase) return undefined;\n    let active = true;\n    const params = new URLSearchParams(window.location.search);\n    const isRecovery = params.get("auth") === "recovery";\n    let subscription = null;\n\n    const openVerifiedStudio = (nextSession) => {\n      if (!active || !nextSession?.access_token || !nextSession?.refresh_token) return;\n      setSession(nextSession);\n      setAuthMessage("");\n      setDemo(false);\n      setStudio(true);\n      document.documentElement.dataset.authStudioOpenV162 = "verified-session";\n    };\n\n    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {\n      if (!active) return;\n      setSession(nextSession);\n      if (event === "PASSWORD_RECOVERY" || isRecovery) {\n        setStudio(false);\n        setAuthMode("recovery");\n        setDemo(true);\n      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && nextSession?.access_token && nextSession?.refresh_token) {\n        clearAuthQuery();\n        openVerifiedStudio(nextSession);\n      } else if (event === "SIGNED_OUT") {\n        setStudio(false);\n      }\n    });\n    subscription = listener.subscription;\n\n    consumeAuthCallbackV162().then(async (callback) => {\n      if (!active) return;\n      if (callback.status === "error") {\n        setAuthMode("signin");\n        setAuthMessage(callback.error?.message || "Callback login belum berhasil.");\n        setDemo(true);\n        return;\n      }\n      if (callback.session?.access_token && callback.session?.refresh_token) {\n        openVerifiedStudio(callback.session);\n        return;\n      }\n      const { data, error } = await supabase.auth.getSession();\n      if (!active) return;\n      if (error) {\n        console.error("Pembacaan sesi awal gagal:", error);\n        setAuthMessage("Sesi lokal tetap dipertahankan. Verifikasi akan dicoba kembali saat koneksi stabil.");\n        return;\n      }\n      if (!data.session) return;\n      if (isRecovery) {\n        setSession(data.session);\n        setAuthMode("recovery");\n        setDemo(true);\n      } else {\n        clearAuthQuery();\n        openVerifiedStudio(data.session);\n      }\n    }).catch((error) => {\n      if (!active) return;\n      console.error("Bootstrap auth v162 gagal:", error);\n      setAuthMode("signin");\n      setAuthMessage(error?.message || "Login belum dapat diselesaikan.");\n      setDemo(true);\n    });\n\n    return () => {\n      active = false;\n      subscription?.unsubscribe();\n    };\n  }, []);\n\n  const openAuth = () => {`;
  main = `${main.slice(0, start)}${replacement}${main.slice(end + effectEnd.length)}`;
}

main = insertOnce(
  main,
  '  const finishAuth = () => {\n    clearAuthQuery();',
  '  const finishAuth = (nextSession = null) => {\n    if (nextSession?.access_token && nextSession?.refresh_token) setSession(nextSession);\n    clearAuthQuery();',
  "FINISH_AUTH",
);

if (!modalHasV255Handoff) {
  modal = insertOnce(
    modal,
    '        await signInWithPassword(email, password);\n        onAuthenticated();',
    '        const data = await signInWithPassword(email, password);\n        onAuthenticated(data.session);',
    "PASSWORD_SESSION",
  );
  modal = insertOnce(
    modal,
    '        if (data.session) {\n          onAuthenticated();',
    '        if (data.session) {\n          onAuthenticated(data.session);',
    "SIGNUP_SESSION",
  );
}

bootstrap = bootstrap
  .replace('const AUTH_HANDOFF_RELEASE = "auth-studio-route-v158-20260730";', 'const AUTH_HANDOFF_RELEASE = "auth-studio-route-v162-20260730";')
  .replace('const AUTH_SUCCESS_VALUE = "v158";', 'const AUTH_SUCCESS_VALUE = "v162";');

index = index
  .replace('/src/auth-studio-bootstrap-v106.js?v=106', '/src/auth-studio-bootstrap-v106.js?v=162')
  .replace('data-auth-studio-bootstrap="v106"', 'data-auth-studio-bootstrap="v162"');

for (const [label, source, markers] of [
  ["MAIN", main, ["consumeAuthCallbackV162", "openVerifiedStudio", "authStudioOpenV162"]],
  ["MODAL", modal, modalHasV255Handoff
    ? ["auth-session-handoff-v255-20260804", "settleAuthenticatedSession", "ngeblogging:auth-session-ready"]
    : ["onAuthenticated(data.session)"]],
  ["BOOTSTRAP", bootstrap, ["auth-studio-route-v162-20260730", 'AUTH_SUCCESS_VALUE = "v162"']],
  ["INDEX", index, ["auth-studio-bootstrap-v106.js?v=162", 'data-auth-studio-bootstrap="v162"']],
  ["AUTHORITY", authority, ["consumeAuthCallbackV162", "AUTH_CALLBACK_RELEASE"]],
  ["CALLBACK", callback, ["auth-callback-singleflight-v162-20260730", "OPERATION_KEY", "exchangeCodeForSession(code)"]],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`PATCH_AUTH_V162_${label}_INCOMPLETE_${marker}`);
  }
}

writeFileSync(mainPath, main, "utf8");
writeFileSync(modalPath, modal, "utf8");
writeFileSync(bootstrapPath, bootstrap, "utf8");
writeFileSync(indexPath, index, "utf8");
console.log(`Auth callback authority ${release} aktif; v255 session handoff ${modalHasV255Handoff ? "dipertahankan" : "belum aktif"}.`);