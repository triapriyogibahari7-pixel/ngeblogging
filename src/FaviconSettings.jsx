import React, { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import "./favicon-settings.css";

const BUCKET = "site-public-media";
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

function readActiveSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* HTMLImageElement fallback below. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function normalizeToPng(file) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Gunakan PNG, JPG, WebP, GIF, atau AVIF.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Berkas favicon maksimal 5 MB sebelum diproses.");
  const source = await decodeImage(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error("Gambar favicon tidak dapat dibaca.");
  if (width > 12000 || height > 12000) throw new Error("Dimensi gambar terlalu besar untuk diproses aman.");

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Perangkat tidak mendukung pemrosesan favicon.");
  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const available = OUTPUT_SIZE * 0.86;
  const scale = Math.min(available / width, available / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const x = Math.round((OUTPUT_SIZE - targetWidth) / 2);
  const y = Math.round((OUTPUT_SIZE - targetHeight) / 2);
  context.drawImage(source, x, y, targetWidth, targetHeight);
  source.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Favicon PNG belum dapat dibuat.");
  return blob;
}

function storagePathFromPublicUrl(url) {
  if (!url) return "";
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = String(url).indexOf(marker);
  if (index < 0) return "";
  try { return decodeURIComponent(String(url).slice(index + marker.length)); }
  catch { return ""; }
}

async function loadActiveSite(userId) {
  const activeId = readActiveSiteId();
  let request = supabase
    .from("site_members")
    .select("site_id,joined_at,sites(id,name,slug,favicon_url)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(100);
  const { data, error } = await request;
  if (error) throw error;
  const memberships = data || [];
  const membership = memberships.find((item) => item.site_id === activeId) || memberships[0];
  return membership?.sites || null;
}

export default function FaviconSettings({ user, setToast }) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const refresh = async () => {
    if (!user?.id || !supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try { setSite(await loadActiveSite(user.id)); }
    catch (reason) { setError(reason.message || "Branding situs belum dapat dimuat."); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const updateSiteFavicon = async (faviconUrl) => {
    const { data, error: updateError } = await supabase
      .from("sites")
      .update({ favicon_url: faviconUrl, updated_at: new Date().toISOString() })
      .eq("id", site.id)
      .select("id,name,slug,favicon_url")
      .single();
    if (updateError) throw updateError;
    setSite(data);
    window.dispatchEvent(new CustomEvent("ngeblogging:site-branding-updated", { detail: data }));
    return data;
  };

  const removeStoredObject = async (url) => {
    const path = storagePathFromPublicUrl(url);
    const expectedPrefix = `${site.id}/${user.id}/branding/`;
    if (!path || !path.startsWith(expectedPrefix)) return;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeError) console.warn("Favicon lama belum dapat dihapus:", removeError);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !site?.id || !user?.id) return;
    setBusy(true);
    setError("");
    const oldUrl = site.favicon_url || "";
    try {
      const png = await normalizeToPng(file);
      const unique = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      const path = `${site.id}/${user.id}/branding/favicon-${Date.now()}-${unique}.png`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, png, {
        cacheControl: "31536000",
        contentType: "image/png",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("URL publik favicon belum dibuat.");
      await updateSiteFavicon(publicUrl);
      await removeStoredObject(oldUrl);
      setToast?.("Favicon situs disimpan dan siap tampil pada subdomain publik");
    } catch (reason) {
      console.error("Favicon upload failed", reason);
      setError(reason.message || "Favicon belum dapat diunggah.");
      setToast?.(reason.message || "Favicon belum dapat diunggah");
    } finally { setBusy(false); }
  };

  const reset = async () => {
    if (!site?.favicon_url || busy) return;
    if (!window.confirm("Gunakan kembali favicon bawaan Ngeblogging untuk situs ini?")) return;
    setBusy(true);
    setError("");
    const oldUrl = site.favicon_url;
    try {
      await updateSiteFavicon(null);
      await removeStoredObject(oldUrl);
      setToast?.("Favicon situs dikembalikan ke favicon bawaan");
    } catch (reason) {
      setError(reason.message || "Favicon belum dapat dihapus.");
    } finally { setBusy(false); }
  };

  return <section className="sf-card" aria-labelledby="site-favicon-title">
    <header>
      <div><small>BRANDING SITUS</small><h2 id="site-favicon-title">Favicon</h2><p>Ikon permanen yang tampil di tab browser, bookmark, hasil pencarian tertentu, dan manifest aplikasi situs.</p></div>
      <button className="sf-refresh" onClick={refresh} disabled={loading || busy} aria-label="Muat ulang favicon"><RefreshCw className={loading ? "spin" : ""}/></button>
    </header>
    {loading ? <div className="sf-loading"><LoaderCircle className="spin"/> Memuat branding situs…</div> : !site ? <div className="sf-error">Situs aktif belum ditemukan.</div> : <div className="sf-body">
      <div className="sf-preview"><span><img src={site.favicon_url || "/favicon.svg"} alt={`Favicon ${site.name}`} onError={(event)=>{event.currentTarget.src="/favicon.svg";}}/></span><div><b>{site.name}</b><small>{site.slug}.ngeblogging.com</small><i><Check/> PNG 512×512 siap browser</i></div></div>
      <div className="sf-actions">
        <input ref={inputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={upload}/>
        <button className="sf-upload" onClick={()=>inputRef.current?.click()} disabled={busy}><Upload/>{busy ? "Memproses…" : site.favicon_url ? "Ganti favicon" : "Upload favicon"}</button>
        {site.favicon_url && <button className="sf-reset" onClick={reset} disabled={busy}><Trash2/> Gunakan bawaan</button>}
      </div>
      <div className="sf-guidance"><ImagePlus/><p><b>Hasil konsisten di semua perangkat.</b> PNG, JPG, WebP, GIF, atau AVIF hingga 5 MB otomatis dinormalisasi menjadi PNG transparan 512×512, diberi URL versi unik, dan dikirim langsung ke Storage tanpa melewati Worker.</p></div>
      <div className="sf-security"><ShieldCheck/><span>Upload mengikuti izin situs dan RLS. Favicon situs lain tidak dapat ditimpa dari akun ini.</span></div>
      {error && <div className="sf-error">{error}</div>}
    </div>}
  </section>;
}
