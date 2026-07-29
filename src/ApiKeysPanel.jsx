import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, Clipboard, Code2, KeyRound, LoaderCircle,
  Plus, RefreshCw, RotateCw, ShieldCheck, Trash2, X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./api-keys-studio.css";

const SCOPES = [
  ["sites:read", "Baca situs", "Daftar dan detail situs yang dapat diakses akun."],
  ["content:read", "Baca konten", "Daftar Posts dan Pages dari situs yang diizinkan."],
  ["content:write", "Tulis konten", "Akses endpoint tulis yang memerlukan konfirmasi."],
  ["media:read", "Baca media", "Metadata aset media tanpa membuka penyimpanan privat."],
  ["analytics:read", "Baca analitik", "Ringkasan analitik teragregasi."],
  ["comments:moderate", "Moderasi komentar", "Akses moderasi komentar untuk situs yang diizinkan."],
];

const configuredUrl = String(
  import.meta.env?.VITE_SUPABASE_URL || "https://polvmlrhqoiflumibfqs.supabase.co",
).replace(/\/$/, "");
const API_BASE = `${configuredUrl}/functions/v1/ngeblogging-api`;

function formatDate(value, empty = "Belum pernah") {
  if (!value) return empty;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return empty;
  }
}

function statusFor(key) {
  if (key.status === "revoked") return ["Dicabut", "revoked"];
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return ["Kedaluwarsa", "expired"];
  }
  return ["Aktif", "active"];
}

function friendlyRpcError(error, fallback) {
  const message = String(error?.message || error || "");
  if (/API_KEY_AUTH_REQUIRED|JWT|not authenticated/i.test(message)) {
    return "Sesi akun perlu disambungkan kembali sebelum mengelola API Keys.";
  }
  if (/API_KEY_LIMIT_REACHED/i.test(message)) return "Batas 20 API key aktif sudah tercapai.";
  if (/API_KEY_NAME_INVALID/i.test(message)) return "Nama API key harus berisi 1–80 karakter.";
  if (/API_KEY_EXPIRY_INVALID/i.test(message)) return "Masa berlaku API key tidak valid.";
  return message || fallback;
}

export default function ApiKeysPanel({ setToast }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "Integrasi produksi",
    scopes: ["sites:read", "content:read"],
    expiry: "90",
  });
  const [revealed, setRevealed] = useState(null);
  const [testState, setTestState] = useState({ state: "idle", message: "" });

  const activeCount = useMemo(
    () => keys.filter((key) => statusFor(key)[1] === "active").length,
    [keys],
  );

  const load = async () => {
    if (!supabase) {
      setLoading(false);
      setError("Koneksi Supabase belum tersedia pada perangkat ini.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("list_api_keys");
      if (rpcError) throw rpcError;
      setKeys(Array.isArray(data) ? data : []);
    } catch (nextError) {
      console.error("API Keys load failed", nextError);
      setError(friendlyRpcError(nextError, "API Keys belum dapat dimuat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleScope = (scope) => setDraft((current) => ({
    ...current,
    scopes: current.scopes.includes(scope)
      ? current.scopes.filter((item) => item !== scope)
      : [...current.scopes, scope],
  }));

  const createKey = async (event) => {
    event.preventDefault();
    if (!supabase || busy) return;
    if (!draft.name.trim()) return setError("Beri nama pada API key.");
    if (!draft.scopes.length) return setError("Pilih minimal satu scope.");
    setBusy("create");
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("create_api_key", {
        key_name: draft.name.trim(),
        requested_scopes: draft.scopes,
        expires_in_days: draft.expiry === "never" ? null : Number(draft.expiry),
      });
      if (rpcError) throw rpcError;
      setRevealed(data);
      setCreateOpen(false);
      setTestState({ state: "idle", message: "" });
      setToast?.("API key dibuat. Salin secret sekarang.");
      await load();
    } catch (nextError) {
      setError(friendlyRpcError(nextError, "API key belum dapat dibuat."));
    } finally {
      setBusy("");
    }
  };

  const revoke = async (key) => {
    if (!supabase || busy) return;
    if (!window.confirm(`Cabut API key “${key.name}”? Aplikasi yang menggunakannya akan langsung ditolak.`)) return;
    setBusy(`revoke:${key.id}`);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("revoke_api_key", {
        target_key: key.id,
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error("API key sudah tidak aktif atau tidak ditemukan.");
      setToast?.("API key dicabut");
      await load();
    } catch (nextError) {
      setError(friendlyRpcError(nextError, "API key belum dapat dicabut."));
    } finally {
      setBusy("");
    }
  };

  const rotate = async (key) => {
    if (!supabase || busy) return;
    if (!window.confirm(`Rotasi API key “${key.name}”? Kunci lama langsung dicabut dan secret baru hanya ditampilkan sekali.`)) return;
    setBusy(`rotate:${key.id}`);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("rotate_api_key", {
        target_key: key.id,
      });
      if (rpcError) throw rpcError;
      setRevealed(data);
      setTestState({ state: "idle", message: "" });
      setToast?.("API key dirotasi. Salin secret baru sekarang.");
      await load();
    } catch (nextError) {
      setError(friendlyRpcError(nextError, "API key belum dapat dirotasi."));
    } finally {
      setBusy("");
    }
  };

  const copy = async (value, message = "Disalin") => {
    try {
      await navigator.clipboard.writeText(value);
      setToast?.(message);
    } catch {
      setError("Clipboard tidak tersedia. Tekan lama teks untuk menyalin.");
    }
  };

  const testKey = async () => {
    if (!revealed?.secret || testState.state === "loading") return;
    setTestState({ state: "loading", message: "Menguji endpoint produksi…" });
    try {
      const response = await fetch(`${API_BASE}/v1/me`, {
        headers: {
          authorization: `Bearer ${revealed.secret}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setTestState({
        state: "success",
        message: `Berhasil. API v1 mengenali kunci “${payload.key?.name || revealed.name}”.`,
      });
    } catch (nextError) {
      setTestState({ state: "error", message: nextError.message || "Pengujian gagal." });
    }
  };

  const closeSecret = () => {
    if (window.confirm("Secret tidak dapat ditampilkan lagi. Pastikan sudah disalin.")) {
      setRevealed(null);
    }
  };

  const curlExample = revealed?.secret
    ? `curl -H "Authorization: Bearer ${revealed.secret}" \\\n  "${API_BASE}/v1/sites"`
    : `curl -H "Authorization: Bearer ngb_live_••••" \\\n  "${API_BASE}/v1/sites"`;

  return <div className="sn-view-pad sn-api-page">
    <header className="sn-page-title sn-api-title">
      <div>
        <small>DEVELOPER PLATFORM</small>
        <h1>API Keys</h1>
        <p>Buat kredensial terpisah untuk integrasi, otomatisasi, aplikasi, dan layanan server. Secret disimpan sebagai hash dan tidak pernah dapat dibaca ulang.</p>
      </div>
      <button type="button" className="sn-primary" onClick={() => { setCreateOpen(true); setError(""); }} disabled={activeCount >= 20}>
        <Plus/> Buat API key
      </button>
    </header>

    <div className="sn-api-metrics">
      <article><KeyRound/><span>Kunci aktif</span><b>{activeCount}</b><small>Maksimal 20</small></article>
      <article><ShieldCheck/><span>Secret tersimpan</span><b>Hash</b><small>SHA-256 server-side</small></article>
      <article><Code2/><span>API stabil</span><b>v1</b><small>Endpoint produksi</small></article>
      <article><RefreshCw/><span>Rotasi</span><b>Instan</b><small>Kunci lama dicabut</small></article>
    </div>

    <section className="sn-api-card sn-api-endpoint">
      <header>
        <span><Code2/></span>
        <div><small>BASE URL PRODUKSI</small><h2>{API_BASE}</h2><p>Endpoint aktif: <code>GET /v1/me</code>, <code>GET /v1/sites</code>, <code>GET /v1/sites/:siteId</code>, dan <code>GET /v1/sites/:siteId/content</code>.</p></div>
        <button type="button" onClick={() => copy(API_BASE, "Base URL disalin")}><Clipboard/> Salin</button>
      </header>
      <pre><code>{curlExample}</code></pre>
      <div className="sn-api-security"><ShieldCheck/><span><b>Keamanan bawaan</b><small>Scope minimum, batas kunci aktif, kedaluwarsa, rotasi, pencabutan, dan jejak pemakaian terakhir.</small></span></div>
    </section>

    {error ? <div className="sn-api-error" role="alert"><AlertTriangle/><span>{error}</span><button type="button" onClick={load}>Coba lagi</button></div> : null}

    <section className="sn-api-card sn-api-list">
      <header>
        <div><small>KREDENSIAL AKUN</small><h2>API Keys Anda</h2><p>Gunakan satu kunci per aplikasi agar dapat dicabut tanpa mengganggu integrasi lain.</p></div>
        <button type="button" className="sn-api-secondary" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/> Muat ulang</button>
      </header>
      {loading ? <div className="sn-api-loading"><LoaderCircle className="spin"/><b>Memuat API Keys…</b></div> : !keys.length ? <div className="sn-api-empty"><KeyRound/><h3>Belum ada API key</h3><p>Buat kunci pertama untuk menghubungkan aplikasi atau otomatisasi.</p><button type="button" className="sn-primary" onClick={() => setCreateOpen(true)}><Plus/> Buat API key</button></div> : <div className="sn-api-table">
        <div className="sn-api-head"><span>Nama & kunci</span><span>Scope</span><span>Terakhir dipakai</span><span>Status</span><span>Aksi</span></div>
        {keys.map((key) => {
          const [label, tone] = statusFor(key);
          return <article key={key.id}>
            <div className="sn-api-key-identity"><span><KeyRound/></span><section><b>{key.name}</b><code>{key.prefix}••••{key.lastFour}</code><small>Dibuat {formatDate(key.createdAt, "-")}{key.expiresAt ? ` · Berakhir ${formatDate(key.expiresAt, "-")}` : " · Tanpa kedaluwarsa"}</small></section></div>
            <div className="sn-api-scopes">{(key.scopes || []).map((scope) => <i key={scope}>{scope}</i>)}</div>
            <time>{formatDate(key.lastUsedAt)}</time>
            <i className={`sn-api-status ${tone}`}>{label}</i>
            <div className="sn-api-actions"><button type="button" onClick={() => rotate(key)} disabled={tone !== "active" || Boolean(busy)}><RotateCw className={busy === `rotate:${key.id}` ? "spin" : ""}/><span>Rotasi</span></button><button type="button" className="danger" onClick={() => revoke(key)} disabled={tone !== "active" || Boolean(busy)}><Trash2/><span>Cabut</span></button></div>
          </article>;
        })}
      </div>}
    </section>

    {createOpen ? <div className="sn-modal-layer sn-api-modal-layer" role="dialog" aria-modal="true" aria-labelledby="sn-create-key-title">
      <button type="button" className="sn-modal-backdrop" onClick={() => setCreateOpen(false)} aria-label="Tutup"/>
      <form className="sn-api-modal" onSubmit={createKey}>
        <header><div><small>API KEY BARU</small><h2 id="sn-create-key-title">Buat kredensial terbatas</h2><p>Pilih scope paling sedikit yang diperlukan oleh aplikasi.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Tutup"><X/></button></header>
        <label><b>Nama kunci</b><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} maxLength={80} placeholder="Contoh: Aplikasi Android produksi"/></label>
        <fieldset><legend>Scope akses</legend><div className="sn-api-scope-selector">{SCOPES.map(([scope, label, description]) => <label key={scope} className={draft.scopes.includes(scope) ? "selected" : ""}><input type="checkbox" checked={draft.scopes.includes(scope)} onChange={() => toggleScope(scope)}/><span><b>{label}</b><code>{scope}</code><small>{description}</small></span><Check/></label>)}</div></fieldset>
        <label><b>Masa berlaku</b><select value={draft.expiry} onChange={(event) => setDraft((current) => ({ ...current, expiry: event.target.value }))}><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option><option value="never">Tanpa kedaluwarsa</option></select><small>Kunci dapat dicabut atau dirotasi kapan saja.</small></label>
        <footer><button type="button" className="sn-api-secondary" onClick={() => setCreateOpen(false)}>Batal</button><button type="submit" className="sn-primary" disabled={busy === "create" || !draft.name.trim() || !draft.scopes.length}>{busy === "create" ? <LoaderCircle className="spin"/> : <KeyRound/>}{busy === "create" ? "Membuat…" : "Buat dan tampilkan secret"}</button></footer>
      </form>
    </div> : null}

    {revealed ? <div className="sn-modal-layer sn-api-modal-layer" role="dialog" aria-modal="true" aria-labelledby="sn-secret-title">
      <button type="button" className="sn-modal-backdrop" aria-label="Tutup" onClick={closeSecret}/>
      <section className="sn-api-modal sn-api-secret-modal">
        <header><div><small>SECRET HANYA SEKALI</small><h2 id="sn-secret-title">Simpan API key sekarang</h2><p>Setelah jendela ini ditutup, Ngeblogging hanya menyimpan hash dan tidak dapat menampilkan secret yang sama lagi.</p></div><button type="button" onClick={closeSecret} aria-label="Tutup"><X/></button></header>
        <div className="sn-api-secret-warning"><AlertTriangle/><span><b>Jangan kirim melalui chat atau menaruhnya di kode publik.</b><small>Simpan di secret manager atau environment variable server.</small></span></div>
        <label><span>Secret API key</span><div><code>{revealed.secret}</code><button type="button" onClick={() => copy(revealed.secret, "Secret API key disalin")}><Clipboard/> Salin secret</button></div></label>
        <div className="sn-api-secret-meta"><span><b>Nama</b>{revealed.name}</span><span><b>Scope</b>{(revealed.scopes || []).join(", ")}</span><span><b>Kedaluwarsa</b>{formatDate(revealed.expiresAt, "Tidak kedaluwarsa")}</span></div>
        <pre><code>{curlExample}</code></pre>
        {testState.message ? <div className={`sn-api-test-result ${testState.state}`}>{testState.state === "loading" ? <LoaderCircle className="spin"/> : testState.state === "success" ? <Check/> : <AlertTriangle/>}<span>{testState.message}</span></div> : null}
        <footer><button type="button" className="sn-api-secondary" onClick={testKey} disabled={testState.state === "loading"}><RefreshCw/> Uji koneksi</button><button type="button" className="sn-primary" onClick={() => copy(revealed.secret, "Secret API key disalin")}><Clipboard/> Salin secret</button><button type="button" onClick={() => setRevealed(null)}>Saya sudah menyimpan</button></footer>
      </section>
    </div> : null}
  </div>;
}

export { API_BASE };
