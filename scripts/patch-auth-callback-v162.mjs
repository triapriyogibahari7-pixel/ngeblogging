import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const mainPath = resolve("src/main.jsx");
const modalPath = resolve("src/AuthModal.jsx");
let main = readFileSync(mainPath, "utf8");
let modal = readFileSync(modalPath, "utf8");
const release = "auth-callback-v162-20260730";

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
  const replacement = `  useEffect(() => {\n    if (!supabaseConfigured || !supabase) return undefined;\n    let active = true;\n    const params = new URLSearchParams(window.location.search);\n    const isRecovery = params.get("auth") === "recovery";\n    let subscription = null;\n\n    const openVerifiedStudio = (nextSession) => {\n      if (!active || !nextSession?.access_token) return;\n      setSession(nextSession);\n      setAuthMessage("");\n      setDemo(false);\n      setStudio(true);\n    };\n\n    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {\n      if (!active) return;\n      setSession(nextSession);\n      if (event === "PASSWORD_RECOVERY" || isRecovery) {\n        setStudio(false);\n        setAuthMode("recovery");\n        setDemo(true);\n      } else if (event === "SIGNED_IN" && nextSession?.access_token) {\n        clearAuthQuery();\n        openVerifiedStudio(nextSession);\n      } else if (event === "SIGNED_OUT") {\n        setStudio(false);\n      }\n    });\n    subscription = listener.subscription;\n\n    consumeAuthCallbackV162().then(async (callback) => {\n      if (!active) return;\n      if (callback.status === "error") {\n        setAuthMode("signin");\n        setAuthMessage(callback.error?.message || "Callback login belum berhasil.");\n        setDemo(true);\n        return;\n      }\n      if (callback.session?.access_token) {\n        openVerifiedStudio(callback.session);\n        return;\n      }\n      const { data, error } = await supabase.auth.getSession();\n      if (!active) return;\n      if (error) {\n        console.error("Pembacaan sesi awal gagal:", error);\n        setAuthMessage("Sesi lokal tetap dipertahankan. Verifikasi akan dicoba kembali saat koneksi stabil.");\n        return;\n      }\n      if (!data.session) return;\n      if (isRecovery) {\n        setSession(data.session);\n        setAuthMode("recovery");\n        setDemo(true);\n      } else {\n        clearAuthQuery();\n        openVerifiedStudio(data.session);\n      }\n    }).catch((error) => {\n      if (!active) return;\n      console.error("Bootstrap auth v162 gagal:", error);\n      setAuthMode("signin");\n      setAuthMessage(error?.message || "Login belum dapat diselesaikan.");\n      setDemo(true);\n    });\n\n    return () => {\n      active = false;\n      subscription?.unsubscribe();\n    };\n  }, []);\n\n  const openAuth = () => {`;
  main = `${main.slice(0, start)}${replacement}${main.slice(end + effectEnd.length)}`;
}

main = insertOnce(
  main,
  '  const finishAuth = () => {\n    clearAuthQuery();',
  '  const finishAuth = (nextSession = null) => {\n    if (nextSession?.access_token) setSession(nextSession);\n    clearAuthQuery();',
  "FINISH_AUTH",
);

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

if (!main.includes("consumeAuthCallbackV162") || !main.includes("openVerifiedStudio") || !modal.includes("onAuthenticated(data.session)")) {
  throw new Error("PATCH_AUTH_V162_INCOMPLETE");
}

writeFileSync(mainPath, main, "utf8");
writeFileSync(modalPath, modal, "utf8");
console.log(`Auth callback authority ${release} aktif.`);
