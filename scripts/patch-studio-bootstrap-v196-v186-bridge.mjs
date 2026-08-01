import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-bootstrap-v196-v186-bridge";

const current = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {
          const transient = isTransientStudioError(nextError);
          const cached = transient ? cachedActiveSiteV186() : null;
          if (cached?.id) {
            publishActiveSite(cached);
            document.documentElement.dataset.studioStartupV186 = "degraded-session-retained";
            setError("");
            setPhase("ready");
            return;
          }
          const nextMessage = transient
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

        if (!cancelled) {
          const transient = isTransientStudioError(nextError);
          const cached = transient ? cachedActiveSiteV186() : null;
          if (cached?.id) {
            publishActiveSite(cached, props.user?.id || "");
            document.documentElement.dataset.studioStartupV186 = "degraded-session-retained";
            document.documentElement.dataset.studioBootstrapRecoveryV196 = "v186-cache-recovered";
            setError("");
            setPhase("ready");
            return;
          }

          if (transient) {
            try {
              document.documentElement.dataset.studioBootstrapRecoveryV196 = "running";
              const { verified, sites } = await recoverStudioMembershipV196(props.user.id, nextError);
              if (cancelled) return;
              const recoveredSite = preferredSite(sites);
              if (recoveredSite) {
                publishActiveSite(recoveredSite, verified?.user?.id || props.user.id);
                document.documentElement.dataset.studioBootstrapRecoveryV196 = "recovered";
                setError("");
                setPhase("ready");
                return;
              }
              document.documentElement.dataset.studioBootstrapRecoveryV196 = "onboarding";
              setError("");
              setPhase("onboarding");
              return;
            } catch (recoveryError) {
              if (isSessionReauthError(recoveryError)) requestReauthentication(recoveryError);
              nextError = recoveryError;
            }
          }

          document.documentElement.dataset.studioBootstrapRecoveryV196 = "failed";
          const nextMessage = isTransientStudioError(nextError)
            ? "Workspace belum dapat dijangkau setelah pemulihan otomatis. Sesi login tetap tersimpan dan tidak ada logout otomatis. Tekan Coba lagi untuk menguji koneksi kembali."
            : nextError.message || "Daftar situs belum dapat dimuat.";
          setError(nextMessage);
          setPhase("error");
        }
      }`;

if (!source.includes("studioBootstrapRecoveryV196")) {
  if (!source.includes(current)) throw new Error("V196_V186_FALLBACK_ANCHOR_MISSING");
  source = source.replace(current, replacement);
}

for (const marker of [
  "degraded-session-retained",
  "studioBootstrapRecoveryV196",
]) {
  if (!source.includes(marker)) throw new Error(`V196_V186_BRIDGE_MARKER_MISSING:${marker}`);
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
