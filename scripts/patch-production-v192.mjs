import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-data-bootstrap-v192-20260801";

function replaceFunction(source, signature, replacement, label) {
  if (source.includes(`/* ${RELEASE}:${label} */`)) return source;
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V192_${label}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V192_${label}_END_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes('const STARTUP_RELEASE_V192 = "studio-data-bootstrap-v192-20260801";')) {
    const anchor = source.includes('const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";')
      ? 'const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";'
      : 'const STARTUP_RELEASE = "first-site-onboarding-v169-20260730";';
    if (!source.includes(anchor)) throw new Error("V192_ONBOARDING_RELEASE_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nconst STARTUP_RELEASE_V192 = "studio-data-bootstrap-v192-20260801";\nconst MEMBERSHIP_TIMEOUT_V192 = 8_000;\nconst AUTH_RECOVERY_TIMEOUT_V192 = 6_000;`);
  }

  const replacement = `async function loadStudioMembership(userId) {
  /* ${RELEASE}:MEMBERSHIP_FIRST */
  let lastError = null;

  const readMembership = (id) => withDeadline(
    listUserSites(id),
    MEMBERSHIP_TIMEOUT_V192,
    "Pemeriksaan situs melewati batas waktu.",
  );

  const resumeFromCache = () => {
    const cached = typeof cachedActiveSiteV186 === "function" ? cachedActiveSiteV186() : null;
    if (!cached?.id || !cached?.slug) return null;
    document.documentElement.dataset.studioStartupV192 = "cached-site-session-retained";
    return {
      verified: window.__ngebloggingVerifiedSession || {
        user: { id: userId },
        verification: "cached-app-user-v192",
        retainedDuringNetworkFailure: true,
      },
      sites: [cached],
      degraded: true,
    };
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      try {
        const directSites = await readMembership(userId);
        if (directSites.length > 0) {
          document.documentElement.dataset.studioStartupV192 = "membership-first-cloud-ready";
          void getVerifiedSession({ force: false }).catch((error) => {
            if (!isTransientStudioError(error)) console.warn("Background session verification v192 failed", error);
          });
          return {
            verified: window.__ngebloggingVerifiedSession || {
              user: { id: userId },
              verification: "membership-authorized-v192",
            },
            sites: directSites,
          };
        }
      } catch (membershipError) {
        if (isSessionReauthError(membershipError) || !isTransientStudioError(membershipError)) throw membershipError;
        lastError = membershipError;
      }

      const verified = await withDeadline(
        getVerifiedSession({ force: attempt > 0 }),
        AUTH_RECOVERY_TIMEOUT_V192,
        "Pemulihan sesi melewati batas waktu.",
      );
      if (!verified?.user?.id) {
        throw Object.assign(new Error("Sesi lokal masih dipulihkan. Coba lagi tanpa keluar dari akun."), {
          name: "DataTransportError",
          code: "AUTH_SESSION_RECOVERY_PENDING",
        });
      }

      const sites = await readMembership(verified.user.id || userId);
      document.documentElement.dataset.studioStartupV192 = sites.length
        ? "session-recovered-cloud-ready"
        : "verified-first-site-required";
      return { verified, sites };
    } catch (error) {
      if (isSessionReauthError(error)) throw error;
      if (!isTransientStudioError(error)) throw error;
      lastError = error;
      const cached = resumeFromCache();
      if (cached) return cached;
      if (attempt === 0) await sleep(650);
    }
  }

  const cached = resumeFromCache();
  if (cached) return cached;
  throw Object.assign(new Error(
    "Koneksi data Studio belum selesai, tetapi sesi login tetap disimpan. Sistem tidak akan mengeluarkan akun. Tekan Coba lagi atau tunggu jaringan kembali stabil.",
  ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: lastError });
}`;

  source = replaceFunction(source, "async function loadStudioMembership(userId) {", replacement, "MEMBERSHIP_FIRST");
  source = source.replace(
    '<main className="so75-startup" data-release={STARTUP_RELEASE} data-compatibility={RELEASE}>',
    '<main className="so75-startup" data-release={STARTUP_RELEASE_V192} data-compatibility={STARTUP_RELEASE}>',
  );
  source = source.replace(
    'Sesi akun tetap aktif. Sistem sedang mengambil situs Anda melalui jalur data aman Ngeblogging. Tidak ada situs yang dibuat otomatis dari alamat email.',
    'Sesi akun tetap aktif. Studio memeriksa keanggotaan situs terlebih dahulu dan hanya memulihkan autentikasi bila diperlukan. Tidak ada situs yang dibuat otomatis dari alamat email.',
  );

  if (/getVerifiedSession\(\{ force: true \}\)/.test(source)) {
    throw new Error("V192_BLOCKING_FORCE_TRUE_REINTRODUCED");
  }
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V192_DESTRUCTIVE_SESSION_ACTION_FOUND");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v192-data-bootstrap-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "data-bootstrap-cache-v192";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "data-bootstrap-v192";');
  if (!source.includes("DATA_BOOTSTRAP_RELEASE_V192")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const DATA_BOOTSTRAP_RELEASE_V192 = "studio-data-bootstrap-v192-20260801";\n',
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V191", "NGE_BLOGGING_UPDATE_AVAILABLE_V192");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V192_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioOnboardingGate.jsx", 'const STARTUP_RELEASE_V192 = "studio-data-bootstrap-v192-20260801";'],
    ["src/StudioOnboardingGate.jsx", "membership-first-cloud-ready"],
    ["src/StudioOnboardingGate.jsx", "session-recovered-cloud-ready"],
    ["src/StudioOnboardingGate.jsx", "cached-site-session-retained"],
    ["src/StudioOnboardingGate.jsx", "getVerifiedSession({ force: false })"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["src/lib/supabase.js", "return nativeFetch(directInput, init)"],
    ["server/data-gateway-v110.mjs", "UPSTREAM_TIMEOUT_MS_V192 = 2_500"],
    ["server/data-gateway-v110.mjs", "DATA_UPSTREAM_TIMEOUT"],
    ["server/data-gateway-v110.mjs", "DATA_GATEWAY_BOOTSTRAP_RELEASE_V192"],
    ["public/sw.js", "ngeblogging-app-v192-data-bootstrap-20260801"],
    ["public/sw.js", "data-bootstrap-cache-v192"],
    ["public/release-v192.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V192_VERIFY_FAILED:${path}:${marker}`);
  }

  const gate = await read("src/StudioOnboardingGate.jsx");
  const membershipStart = gate.indexOf("async function loadStudioMembership(userId)");
  const membershipEnd = gate.indexOf("\n}\n", membershipStart);
  const membership = gate.slice(membershipStart, membershipEnd);
  if (membership.indexOf("readMembership(userId)") > membership.indexOf("getVerifiedSession({ force:")) {
    throw new Error("V192_MEMBERSHIP_NOT_FIRST");
  }
  if (/getVerifiedSession\(\{ force: true \}\)/.test(membership)) {
    throw new Error("V192_FORCE_TRUE_REINTRODUCED");
  }
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(gate)) {
    throw new Error("V192_SESSION_DESTRUCTION_REINTRODUCED");
  }
}

await patchOnboardingGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
