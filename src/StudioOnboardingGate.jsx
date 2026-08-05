import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookHeart, BookOpen, BriefcaseBusiness, Building2, Check, FileText,
  Globe2, LayoutTemplate, LoaderCircle, LogOut, MessageCircle, Newspaper, PenLine,
  RefreshCw, Sparkles, Users,
} from "lucide-react";
import StudioSecure from "./StudioSecure.jsx";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";
import { MAX_SITES_PER_ACCOUNT, createUserSiteWithPolicy, getSiteQuota } from "./lib/site-policy-v169.js";
import {
  getVerifiedSession,
  isSessionReauthError,
  isTransientSessionError,
} from "./lib/auth-session-v76.js";
import {
  STUDIO_STARTUP_RELEASE_V292,
  listUserSitesStartupV292,
} from "./studio-startup-v292.js";
import "./site-onboarding-v75.css";
import "./studio-first-site-v169.css";
import "./domain-authority-v75.css";
import "./domain-authority-v75.js";

const RELEASE = "first-site-onboarding-v76-20260727";
const STARTUP_RELEASE = STUDIO_STARTUP_RELEASE_V292;
const FIRST_SITE_GUARD_RELEASE_V305 = "first-site-required-guard-v305-20260805";
const CHECK_TIMEOUT_MS = 7_000;
const STARTUP_DATA_TIMEOUT_MS = 11_000;
const RECOVERY_SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v292",
  "ngeblogging-active-site-snapshot-v209",
  "ngeblogging-active-site-snapshot-v208",
  "ngeblogging-active-site-snapshot-v205",
  "ngeblogging-active-site-snapshot-v198",
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
];
const SITE_TYPES = [
  { value: "blog", label: "Blog", description: "Tulisan, cerita, opini, dan publikasi pribadi.", icon: PenLine },
  { value: "website", label: "Website", description: "Situs profesional untuk organisasi, usaha, atau layanan.", icon: Building2 },
  { value: "news", label: "Portal berita", description: "Redaksi, kategori, berita terbaru, dan halaman khusus.", icon: Newspaper },
  { value: "forum", label: "Forum", description: "Diskusi bertopik, anggota, dan percakapan komunitas.", icon: MessageCircle },
  { value: "community", label: "Komunitas", description: "Ruang anggota, pengumuman, kegiatan, dan kolaborasi.", icon: Users },
  { value: "landing", label: "Landing page", description: "Halaman promosi, peluncuran, produk, atau kampanye.", icon: LayoutTemplate },
  { value: "diary", label: "Diary / jurnal", description: "Catatan harian, perjalanan, refleksi, dan arsip pribadi.", icon: BookHeart },
  { value: "portfolio", label: "Portofolio", description: "Karya, layanan, pengalaman, dan profil profesional.", icon: BriefcaseBusiness },
  { value: "profile", label: "Profil", description: "Identitas digital, biodata, tautan, dan halaman personal.", icon: FileText },
  { value: "knowledge", label: "Knowledge base", description: "Dokumentasi, panduan, FAQ, dan pusat bantuan.", icon: BookOpen },
  { value: "general-knowledge", label: "Pengetahuan umum", description: "Ensiklopedia, materi belajar, referensi, dan wawasan umum.", icon: Globe2 },
];
const THEME_OPTIONS = [
  ["editorial-clean", "Editorial bersih"],
  ["modern-blog", "Blog modern"],
  ["news-grid", "Portal berita"],
  ["business-pro", "Bisnis profesional"],
  ["portfolio-focus", "Portofolio fokus"],
  ["community-hub", "Komunitas"],
  ["knowledge-docs", "Dokumentasi"],
  ["landing-conversion", "Landing page"],
];
const LANGUAGE_OPTIONS = [
  ["id-ID", "Bahasa Indonesia"],
  ["en-US", "English"],
  ["ms-MY", "Bahasa Melayu"],
];
const TIMEZONE_OPTIONS = [
  ["Asia/Jakarta", "WIB — Asia/Jakarta"],
  ["Asia/Makassar", "WITA — Asia/Makassar"],
  ["Asia/Jayapura", "WIT — Asia/Jayapura"],
  ["Asia/Kuala_Lumpur", "Asia/Kuala Lumpur"],
  ["UTC", "UTC"],
];

function normalizeSlug(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

function withDeadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(Object.assign(new Error(message), { code: "ONBOARDING_TIMEOUT" })), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

function isTransientStudioError(error) {
  const code = String(error?.code || "").toLowerCase();
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  return isTransientSessionError(error)
    || name === "datatransporterror"
    || name === "typeerror"
    || name === "timeouterror"
    || code === "data_network_unavailable"
    || code === "studio_startup_timeout"
    || code === "onboarding_timeout"
    || /failed to fetch|network|jaringan|timeout|time out|sementara|unreachable|belum dapat dijangkau/.test(message);
}

function handedSession(userId) {
  const handed = typeof window === "undefined" ? null : window.__ngebloggingVerifiedSession;
  if (!handed?.session?.access_token || !handed?.session?.refresh_token) return null;
  if (!handed?.user?.id || handed.user.id !== userId) return null;
  return handed;
}

async function loadStudioMembership(userId) {
  const handed = handedSession(userId);
  const verified = handed || await withDeadline(
    getVerifiedSession(),
    CHECK_TIMEOUT_MS,
    "Verifikasi sesi melewati batas waktu.",
  );
  if (!verified?.user?.id) {
    throw Object.assign(new Error("Sesi sudah berakhir. Silakan masuk kembali."), { code: "SESSION_REAUTH_REQUIRED", status: 401 });
  }
  try {
    const sites = await withDeadline(
      listUserSitesStartupV292(verified.user.id || userId),
      STARTUP_DATA_TIMEOUT_MS,
      "Pemeriksaan situs melewati batas waktu.",
    );
    return { verified, sites };
  } catch (error) {
    if (isSessionReauthError(error) || !isTransientStudioError(error)) throw error;
    throw Object.assign(new Error(
      "Data situs belum merespons dalam batas waktu. Sesi akun tetap aktif dan tidak dihapus. Tekan Coba lagi saat jaringan stabil.",
    ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: error });
  }
}

function preferredSite(sites) {
  let preferredId = "";
  try { preferredId = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { preferredId = ""; }
  return sites.find((site) => site.id === preferredId) || sites[0] || null;
}

function recoveredActiveSite(userId) {
  const live = window.__ngebloggingActiveSite;
  if (live?.id && live?.slug && (!userId || live.__userId === userId)) return live;
  for (const key of RECOVERY_SNAPSHOT_KEYS) {
    try {
      const snapshot = JSON.parse(localStorage.getItem(key) || "null");
      if (!snapshot?.id || !snapshot?.slug) continue;
      if (userId && snapshot.__userId !== userId) continue;
      return snapshot;
    } catch {
      // A corrupt local snapshot must never log a user out.
    }
  }
  return null;
}

function clearActiveSiteRecoveryV305() {
  setActiveSiteId("");
  try { RECOVERY_SNAPSHOT_KEYS.forEach((key) => localStorage.removeItem(key)); } catch { /* private storage is optional */ }
  window.__ngebloggingActiveSite = null;
  delete document.documentElement.dataset.activeSiteId;
  delete document.documentElement.dataset.activeSiteSlug;
  document.documentElement.dataset.firstSiteGuardV305 = FIRST_SITE_GUARD_RELEASE_V305;
}

function publishActiveSite(site) {
  if (!site?.id || !site?.slug) return;
  const userId = window.__ngebloggingVerifiedSession?.user?.id || "";
  const snapshot = { ...site, __userId: userId, __savedAt: Date.now(), __release: STARTUP_RELEASE };
  setActiveSiteId(site.id);
  try { localStorage.setItem("ngeblogging-active-site-snapshot-v292", JSON.stringify(snapshot)); } catch { /* private storage is optional */ }
  window.__ngebloggingActiveSite = snapshot;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug;
  document.documentElement.dataset.studioStartupReleaseV292 = STARTUP_RELEASE;
  document.documentElement.dataset.firstSiteGuardV305 = FIRST_SITE_GUARD_RELEASE_V305;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: snapshot }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: snapshot }));
}

function requestReauthentication(error) {
  window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", {
    detail: {
      code: "SESSION_REAUTH_REQUIRED",
      message: error?.message || "Sesi sudah berakhir. Silakan masuk kembali.",
      release: STARTUP_RELEASE,
      compatibility: RELEASE,
    },
  }));
}

function StartupState({ error, onRetry, onExit }) {
  return <main className="so75-startup" data-release={STARTUP_RELEASE} data-compatibility={RELEASE}>
    <header><a href="/" aria-label="Ngeblogging">ngeblogging<span>.</span></a><button onClick={onExit}><LogOut/>Keluar</button></header>
    <section>{error ? <><span className="so75-startup-icon error"><RefreshCw/></span><small>STUDIO MENUNGGU DATA</small><h1>Sesi Anda tetap aktif.</h1><p>{error}</p><button className="so75-primary" onClick={onRetry}><RefreshCw/>Coba lagi</button></> : <><span className="so75-startup-icon"><LoaderCircle/></span><small>MENYIAPKAN RUANG KERJA</small><h1>Membuka Studio…</h1><p>Login sudah diterima. Sistem mengambil situs aktif melalui jalur data langsung dan hanya memakai gateway cadangan bila diperlukan.</p></>}</section>
  </main>;
}

function FirstSiteOnboarding({ user, onCreated, onExit }) {
  const [draft, setDraft] = useState({
    name: "", slug: "", description: "", blueprint: "blog",
    themeKey: "editorial-clean", locale: "id-ID", timezone: "Asia/Jakarta",
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [quota, setQuota] = useState({ used: 0, limit: MAX_SITES_PER_ACCOUNT, remaining: MAX_SITES_PER_ACCOUNT, canCreate: true });
  const [availability, setAvailability] = useState({ state: "idle", message: "Pilih subdomain unik Anda." });
  const normalizedSlug = useMemo(() => normalizeSlug(draft.slug || draft.name), [draft.slug, draft.name]);

  useEffect(() => {
    let cancelled = false;
    getSiteQuota(user?.id).then((nextQuota) => { if (!cancelled) setQuota(nextQuota); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (normalizedSlug.length < 3 || !supabaseConfigured || !supabase) {
      setAvailability({ state: "idle", message: "Subdomain minimal 3 karakter." });
      return undefined;
    }
    let cancelled = false;
    setAvailability({ state: "checking", message: "Memeriksa ketersediaan…" });
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await withDeadline(
          supabase.rpc("is_site_slug_available", { candidate: normalizedSlug, excluding_site: null }),
          7_000, "Pemeriksaan subdomain melewati batas waktu.",
        );
        if (cancelled) return;
        if (error) throw error;
        setAvailability(data === true
          ? { state: "available", message: `${normalizedSlug}.ngeblogging.com tersedia.` }
          : { state: "unavailable", message: "Subdomain sudah digunakan atau termasuk nama sistem." });
      } catch (error) {
        if (!cancelled) setAvailability({ state: "error", message: error.message || "Ketersediaan belum dapat diperiksa." });
      }
    }, 420);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [normalizedSlug]);

  const updateName = (name) => setDraft((current) => ({
    ...current,
    name,
    slug: current.slug && current.slug !== normalizeSlug(current.name) ? current.slug : normalizeSlug(name),
  }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const name = draft.name.trim();
    const slug = normalizeSlug(draft.slug || draft.name);
    if (!quota.canCreate) return setMessage("Batas jumlah situs untuk akun ini sudah tercapai.");
    if (name.length < 2) return setMessage("Nama situs minimal 2 karakter.");
    if (slug.length < 3) return setMessage("Subdomain minimal 3 karakter.");
    if (availability.state !== "available") return setMessage("Pastikan subdomain tersedia sebelum melanjutkan.");
    setCreating(true);
    try {
      const verified = handedSession(user?.id) || await withDeadline(getVerifiedSession(), CHECK_TIMEOUT_MS, "Verifikasi sesi melewati batas waktu.");
      const userId = verified?.user?.id || user?.id;
      if (!userId) throw Object.assign(new Error("Sesi sudah berakhir. Silakan masuk kembali."), { code: "SESSION_REAUTH_REQUIRED", status: 401 });
      const site = await withDeadline(createUserSiteWithPolicy({
        userId, name, slug, description: draft.description, blueprint: draft.blueprint,
      }), 15_000, "Pembuatan situs melewati batas waktu. Silakan periksa koneksi lalu coba lagi.");
      const settings = {
        ...(site.settings || {}),
        onboarding: "complete-v305",
        onboarding_completed_at: new Date().toISOString(),
        initial_theme: draft.themeKey,
        locale: draft.locale,
        timezone: draft.timezone,
        site_limit: MAX_SITES_PER_ACCOUNT,
      };
      const { data: configuredSite, error: configureError } = await supabase.from("sites")
        .update({ theme_key: draft.themeKey, locale: draft.locale, settings })
        .eq("id", site.id)
        .select("id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at")
        .single();
      if (configureError) throw configureError;
      const selected = { ...configuredSite, role: "owner" };
      publishActiveSite(selected);
      onCreated(selected);
    } catch (error) {
      if (isSessionReauthError(error)) requestReauthentication(error);
      setMessage(error.message || "Situs belum dapat dibuat.");
    } finally { setCreating(false); }
  };

  return <main className="so75-shell so169-shell" data-release={STARTUP_RELEASE} data-compatibility={RELEASE}>
    <header className="so75-topbar"><a className="so75-brand" href="/">ngeblogging<span>.</span></a><div><span>LANGKAH PERTAMA · BUAT SITUS PERTAMA</span><button onClick={onExit}><LogOut/>Keluar</button></div></header>
    <section className="so75-hero">
      <div className="so75-copy"><span className="so75-kicker"><Sparkles/>BANGUN RUANG DIGITAL ANDA</span><h1>Buat situs pertama<br/><em>sebelum masuk Studio.</em></h1><p>Setelah login Google, LinkedIn, atau email, akun baru menyelesaikan identitas situs terlebih dahulu. Studio baru dibuka setelah situs nyata berhasil dibuat dan dipilih sebagai situs aktif.</p><div className="so75-promise"><Check/><span>Subdomain gratis *.ngeblogging.com</span><Check/><span>Kelola beberapa situs dalam satu akun</span><Check/><span>Situs tidak dipublikasikan tanpa persetujuan</span></div></div>
      <form className="so75-form" onSubmit={submit}>
        <div className="so75-progress"><span className="active">1</span><i/><span className="active">2</span><i/><span className="active">3</span><b>Jenis · Identitas · Preferensi awal</b></div>
        <fieldset><legend>Pilih jenis situs</legend><div className="so75-types">{SITE_TYPES.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" className={draft.blueprint === value ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, blueprint: value }))}><Icon/><span><b>{label}</b><small>{description}</small></span>{draft.blueprint === value ? <Check/> : null}</button>)}</div></fieldset>
        <div className="so75-fields">
          <label><span>Nama situs</span><input value={draft.name} onChange={(event) => updateName(event.target.value)} placeholder="Contoh: Catatan Budi" autoFocus maxLength={100}/></label>
          <label><span>Subdomain gratis</span><div className="so75-domain-input"><input value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))} placeholder="catatan-budi" maxLength={63}/><strong>.ngeblogging.com</strong></div><small className={`so75-availability ${availability.state}`}>{availability.message}</small></label>
          <label className="wide"><span>Deskripsi singkat <em>opsional</em></span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Jelaskan isi dan tujuan situs Anda." maxLength={1000}/></label>
          <label><span>Tema awal</span><select value={draft.themeKey} onChange={(event) => setDraft((current) => ({ ...current, themeKey: event.target.value }))}>{THEME_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Bahasa</span><select value={draft.locale} onChange={(event) => setDraft((current) => ({ ...current, locale: event.target.value }))}>{LANGUAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="wide"><span>Zona waktu</span><select value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}>{TIMEZONE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="so75-preview"><Globe2/><div><small>ALAMAT GRATIS DAN SITUS AKTIF</small><b>{normalizedSlug || "nama-situs"}.ngeblogging.com</b></div><i>Situs pertama</i></div>
        {message ? <p className="so75-error" role="alert">{message}</p> : null}
        <button className="so75-primary so75-submit" disabled={creating || availability.state !== "available" || !quota.canCreate} type="submit">{creating ? <><LoaderCircle/>Membuat situs nyata…</> : <>Buat situs aktif dan buka Studio<ArrowRight/></>}</button>
        <p className="so75-footnote">Situs dipilih sebagai ruang kerja aktif, tetapi tetap berstatus draf dan privat sampai Anda menekan Terbitkan.</p>
      </form>
    </section>
  </main>;
}

export default function StudioOnboardingGate(props) {
  const [phase, setPhase] = useState("checking");
  const [error, setError] = useState("");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const acceptRecoveredSite = (event) => {
      const site = event?.detail || recoveredActiveSite(props.user?.id);
      if (!site?.id || !site?.slug) return;
      setError("");
      setPhase("ready");
    };
    const requireFirstSite = () => {
      clearActiveSiteRecoveryV305();
      setError("");
      setPhase("onboarding");
    };
    const retryOnline = () => setRun((value) => value + 1);
    window.addEventListener("ngeblogging:active-site-ready", acceptRecoveredSite);
    window.addEventListener("ngeblogging:first-site-required-v305", requireFirstSite);
    window.addEventListener("online", retryOnline, { passive: true });
    const cached = recoveredActiveSite(props.user?.id);
    if (cached?.id && cached?.slug) {
      publishActiveSite(cached);
      setPhase("ready");
    }
    return () => {
      window.removeEventListener("ngeblogging:active-site-ready", acceptRecoveredSite);
      window.removeEventListener("ngeblogging:first-site-required-v305", requireFirstSite);
      window.removeEventListener("online", retryOnline);
    };
  }, [props.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const cached = recoveredActiveSite(props.user?.id);
      if (cached?.id && cached?.slug) {
        if (!cancelled) {
          publishActiveSite(cached);
          setError("");
          setPhase("ready");
        }
        return;
      }

      setPhase("checking");
      setError("");
      if (!props.user?.id) { setError("Sesi pengguna tidak ditemukan. Silakan masuk kembali."); setPhase("error"); return; }
      if (!supabaseConfigured || !supabase) { setError("Penyimpanan cloud belum dikonfigurasi. Sesi lokal tidak dihapus."); setPhase("error"); return; }
      try {
        const { sites } = await loadStudioMembership(props.user.id);
        if (cancelled) return;
        const site = preferredSite(sites);
        if (site) {
          publishActiveSite(site);
          setPhase("ready");
        } else {
          clearActiveSiteRecoveryV305();
          setPhase("onboarding");
        }
      } catch (nextError) {
        if (cancelled) return;
        const recovered = recoveredActiveSite(props.user?.id);
        if (isTransientStudioError(nextError) && recovered?.id && recovered?.slug) {
          publishActiveSite(recovered);
          setError("");
          setPhase("ready");
          return;
        }
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        const nextMessage = isTransientStudioError(nextError)
          ? "Data Studio belum merespons dalam batas waktu. Sesi akun Anda tetap aktif; tidak ada logout otomatis. Tekan Coba lagi untuk menyambungkan kembali."
          : nextError.message || "Daftar situs belum dapat dimuat.";
        setError(nextMessage);
        setPhase("error");
      }
    };
    check();
    return () => { cancelled = true; };
  }, [props.user?.id, run]);

  if (phase === "ready") return <StudioSecure {...props}/>;
  if (phase === "onboarding") return <FirstSiteOnboarding user={props.user} onExit={props.onExit} onCreated={() => setPhase("ready")}/>;
  return <StartupState error={phase === "error" ? error : ""} onRetry={() => setRun((value) => value + 1)} onExit={props.onExit}/>;
}

export { FIRST_SITE_GUARD_RELEASE_V305, STARTUP_RELEASE, loadStudioMembership, recoveredActiveSite };