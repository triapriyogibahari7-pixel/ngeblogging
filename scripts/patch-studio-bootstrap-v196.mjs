import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-bootstrap-live-recovery-v196-20260802";
const VERSION = "ngeblogging-app-v196-live-recovery-20260802";
const CACHE = "studio-bootstrap-live-recovery-cache-v196";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V196_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes("STUDIO_BOOTSTRAP_RECOVERY_V196")) {
    const anchor = 'const ACTIVE_SITE_SNAPSHOT_V195 = "ngeblogging-active-site-snapshot-v195";';
    if (!source.includes(anchor)) throw new Error("V196_REQUIRES_V195_GATE");
    source = source.replace(
      anchor,
      `${anchor}\nconst STUDIO_BOOTSTRAP_RECOVERY_V196 = "${RELEASE}";\nconst RECOVERY_RETRY_DELAYS_V196 = [650, 1_400, 2_800];\nconst RECOVERY_DIRECT_TIMEOUT_V196 = 12_000;\nconst RECOVERY_CLIENT_TIMEOUT_V196 = 8_000;`,
    );
  }

  if (!source.includes("async function recoverStudioMembershipV196")) {
    const anchor = "async function refreshRejectedSessionV195(rejectedToken) {";
    if (!source.includes(anchor)) throw new Error("V196_REFRESH_HELPER_ANCHOR_MISSING");
    const helper = `async function recoverStudioMembershipV196(userId, cause = null) {
  let lastError = cause;
  let localSession = await readLocalStudioSessionV195(userId);

  for (let attempt = 0; attempt <= RECOVERY_RETRY_DELAYS_V196.length; attempt += 1) {
    if (attempt > 0) await sleep(RECOVERY_RETRY_DELAYS_V196[attempt - 1]);
    const token = localSession?.session?.access_token || "";
    if (!token) break;

    try {
      const sites = await withDeadline(
        listUserSitesDirectV192(userId, token),
        RECOVERY_DIRECT_TIMEOUT_V196,
        "Pemulihan Workspace langsung melewati batas waktu.",
      );
      document.documentElement.dataset.studioMembershipTransportV196 = "direct-supabase-rls-recovery";
      return { verified: localSession, sites, recovery: "direct-supabase-rls-recovery" };
    } catch (directError) {
      lastError = directError;
      const status = Number(directError?.status || 0);
      const code = String(directError?.code || "").toLowerCase();
      const rejected = status === 401 || status === 403 || code === "session_reauth_required";

      if (rejected && attempt === 0) {
        const refreshed = await withDeadline(
          refreshRejectedSessionV195(true),
          CHECK_TIMEOUT_MS,
          "Pembaruan sesi pemulihan melewati batas waktu.",
        );
        if (!refreshed?.session?.access_token || refreshed?.user?.id !== userId) {
          throw Object.assign(new Error("Sesi sudah tidak berlaku. Silakan masuk kembali."), {
            code: "SESSION_REAUTH_REQUIRED",
            status: 401,
            requiresReauth: true,
          });
        }
        localSession = refreshed;
        continue;
      }
      if (rejected) throw directError;

      try {
        const sites = await withDeadline(
          listUserSites(userId),
          RECOVERY_CLIENT_TIMEOUT_V196,
          "Pemulihan Workspace cadangan melewati batas waktu.",
        );
        document.documentElement.dataset.studioMembershipTransportV196 = "supabase-client-recovery";
        return { verified: localSession, sites, recovery: "supabase-client-recovery" };
      } catch (clientError) {
        lastError = clientError;
        if (!isTransientStudioError(clientError) && !isTransientStudioError(directError)) throw clientError;
      }
    }
  }

  throw Object.assign(new Error(
    "Workspace belum dapat dijangkau setelah pemulihan otomatis. Sesi login tetap tersimpan; tidak ada logout otomatis.",
  ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: lastError });
}

`;
    source = source.replace(anchor, `${helper}${anchor}`);
  }

  if (!source.includes("studioBootstrapRecoveryV196")) {
    const current = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {
          const nextMessage = isTransientStudioError(nextError)
            ? "Koneksi data Studio belum stabil. Sesi akun Anda tetap tersimpan. Tekan Coba lagi setelah jaringan tersambung."
            : nextError.message || "Daftar situs belum dapat dimuat.";
          setError(nextMessage);
          setPhase("error");
        }
      }`;
    const replacement = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) {
          requestReauthentication(nextError);
          if (!cancelled) {
            setError(nextError.message || "Sesi sudah berakhir. Silakan masuk kembali.");
            setPhase("error");
          }
          return;
        }

        if (isTransientStudioError(nextError)) {
          try {
            document.documentElement.dataset.studioBootstrapRecoveryV196 = "running";
            const { verified, sites } = await recoverStudioMembershipV196(props.user.id, nextError);
            if (cancelled) return;
            const recoveredSite = preferredSite(sites);
            if (recoveredSite) {
              publishActiveSite(recoveredSite, verified?.user?.id || props.user.id);
              document.documentElement.dataset.studioBootstrapRecoveryV196 = "recovered";
              setPhase("ready");
              return;
            }
            document.documentElement.dataset.studioBootstrapRecoveryV196 = "onboarding";
            setPhase("onboarding");
            return;
          } catch (recoveryError) {
            if (isSessionReauthError(recoveryError)) requestReauthentication(recoveryError);
            nextError = recoveryError;
          }
        }

        if (!cancelled) {
          document.documentElement.dataset.studioBootstrapRecoveryV196 = "failed";
          const nextMessage = isTransientStudioError(nextError)
            ? "Workspace belum dapat dijangkau setelah pemulihan otomatis. Sesi login tetap tersimpan dan tidak ada logout otomatis. Tekan Coba lagi untuk menguji koneksi kembali."
            : nextError.message || "Daftar situs belum dapat dimuat.";
          setError(nextMessage);
          setPhase("error");
        }
      }`;
    source = replaceOnce(source, current, replacement, "RECOVERY_CATCH");
  }

  if (!source.includes("studioBootstrapReleaseV196")) {
    const anchor = 'export default function StudioOnboardingGate(props) {\n  const [phase, setPhase] = useState("checking");';
    const replacement = `export default function StudioOnboardingGate(props) {
  document.documentElement.dataset.studioBootstrapReleaseV196 = STUDIO_BOOTSTRAP_RECOVERY_V196;
  const [phase, setPhase] = useState("checking");`;
    source = replaceOnce(source, anchor, replacement, "RELEASE_DATASET");
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V196_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  if (/getVerifiedSession\(\{ force: true \}\)/.test(source)) {
    throw new Error("V196_UNCONDITIONAL_FORCE_TRUE_FOUND");
  }

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-bootstrap-live-recovery-v196";');
  if (!source.includes("STUDIO_BOOTSTRAP_LIVE_RECOVERY_RELEASE_V196")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_BOOTSTRAP_LIVE_RECOVERY_RELEASE_V196 = "${RELEASE}";\n`,
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V195", "NGE_BLOGGING_UPDATE_AVAILABLE_V196")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V194", "NGE_BLOGGING_UPDATE_AVAILABLE_V196")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v196 memberi tahu update tanpa memaksa navigasi atau menghapus sesi.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V196_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V196_SERVICE_WORKER_SESSION_DESTRUCTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioOnboardingGate.jsx", "STUDIO_BOOTSTRAP_RECOVERY_V196"],
    ["src/StudioOnboardingGate.jsx", "recoverStudioMembershipV196"],
    ["src/StudioOnboardingGate.jsx", "direct-supabase-rls-recovery"],
    ["src/StudioOnboardingGate.jsx", "supabase-client-recovery"],
    ["src/StudioOnboardingGate.jsx", "studioBootstrapRecoveryV196"],
    ["src/StudioOnboardingGate.jsx", "tidak ada logout otomatis"],
    ["public/sw.js", "STUDIO_BOOTSTRAP_LIVE_RECOVERY_RELEASE_V196"],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/release-v196.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V196_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
