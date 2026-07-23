import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { deleteMedia, uploadMedia } from "./lib/media-data.js";
import "./site-favicon-bridge.css";

const ACTIVE_SITE_KEY = "ngeblogging-active-site-id";
const HOST_ID = "ngeblogging-site-favicon-settings";
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"]);

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function currentSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_KEY) || ""; }
  catch { return ""; }
}

async function loadActiveSite() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user?.id) throw new Error("Masuk ke akun untuk mengubah favicon situs.");

  const preferredId = currentSiteId();
  if (preferredId) {
    const { data, error } = await supabase
      .from("sites")
      .select("id,name,slug,settings")
      .eq("id", preferredId)
      .maybeSingle();
    if (error) throw error;
    if (data) return { user, site: data };
  }

  const { data: membership, error } = await supabase
    .from("site_members")
    .select("site_id,joined_at,sites(id,name,slug,settings)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!membership?.sites) throw new Error("Situs aktif belum tersedia.");
  return { user, site: membership.sites };
}

function faviconData(site) {
  return objectValue(objectValue(objectValue(site?.settings).branding).favicon);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak dapat dibaca. Gunakan PNG, JPG, WebP, AVIF, atau GIF yang valid."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Favicon tidak dapat diproses oleh browser ini.")), "image/png", 0.96);
  });
}

async function createVariants(file, siteSlug) {
  if (!file || file.size <= 0) throw new Error("Pilih gambar favicon yang valid.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Gambar favicon maksimal 5 MB.");
  if (!ACCEPTED_TYPES.has(String(file.type || "").toLowerCase())) {
    throw new Error("Format favicon harus PNG, JPG, WebP, AVIF, atau GIF.");
  }

  const { image, url } = await loadImage(file);
  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width < 32 || height < 32) throw new Error("Favicon minimal 32 × 32 piksel.");
    if (width > 8192 || height > 8192 || width * height > 40_000_000) {
      throw new Error("Dimensi gambar terlalu besar. Gunakan gambar maksimal 8192 piksel per sisi.");
    }
    const sourceSize = Math.min(width, height);
    const sourceX = Math.max(0, (width - sourceSize) / 2);
    const sourceY = Math.max(0, (height - sourceSize) / 2);
    const safeSlug = String(siteSlug || "site").replace(/[^a-z0-9-]/gi, "-").slice(0, 60) || "site";
    const variants = [];
    for (const size of [192, 512]) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Pemrosesan gambar tidak tersedia di browser ini.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, size, size);
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      const blob = await canvasBlob(canvas);
      variants.push({ size, file: new File([blob], `favicon-${safeSlug}-${size}.png`, { type: "image/png", lastModified: Date.now() }) });
    }
    return variants;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function removeAssets(assets) {
  const failures = [];
  for (const asset of Array.isArray(assets) ? assets : []) {
    if (!asset?.id || !asset?.object_path) continue;
    try { await deleteMedia(asset); }
    catch (error) { failures.push(error); }
  }
  return failures;
}

async function updateSiteSettings(siteId, settings) {
  const { data, error } = await supabase
    .from("sites")
    .update({ settings })
    .eq("id", siteId)
    .select("id,name,slug,settings")
    .single();
  if (error) throw error;
  return data;
}

function createHost(grid) {
  const host = document.createElement("section");
  host.id = HOST_ID;
  host.className = "sf-card";
  host.setAttribute("aria-labelledby", "sf-title");
  grid.insertAdjacentElement("afterend", host);
  return host;
}

function buildInterface(host) {
  host.innerHTML = `
    <header class="sf-header">
      <div>
        <small>IDENTITAS SITUS & SEO</small>
        <h2 id="sf-title">Favicon situs</h2>
        <p>Unggah ikon khusus untuk tab browser, bookmark, hasil pencarian, layar utama, dan aplikasi web situs aktif.</p>
      </div>
      <span class="sf-state" aria-live="polite">Memuat…</span>
    </header>
    <div class="sf-layout">
      <div class="sf-preview-wrap">
        <div class="sf-browser-preview">
          <span class="sf-preview-icon"><img alt="" hidden></span>
          <div><b class="sf-site-name">Situs</b><small class="sf-site-domain">subdomain.ngeblogging.com</small></div>
        </div>
        <div class="sf-app-preview"><img alt="Pratinjau favicon" hidden><span>n.</span></div>
      </div>
      <div class="sf-controls">
        <input class="sf-file" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" hidden>
        <div class="sf-drop" tabindex="0" role="button">
          <b>Tarik gambar ke sini atau pilih berkas</b>
          <span>PNG, JPG, WebP, AVIF, atau GIF · maksimal 5 MB · otomatis dipotong persegi</span>
        </div>
        <div class="sf-actions">
          <button type="button" class="sf-upload">Unggah / ganti favicon</button>
          <button type="button" class="sf-remove">Hapus favicon</button>
          <a class="sf-open" target="_blank" rel="noreferrer">Lihat situs</a>
        </div>
        <ul class="sf-seo-list">
          <li><b>Browser</b><span>Ikon tab dan bookmark diperbarui melalui HTML edge Cloudflare.</span></li>
          <li><b>Mobile & PWA</b><span>Varian 192 × 192 dan 512 × 512 dibuat otomatis.</span></li>
          <li><b>SEO</b><span>Manifest, canonical, Open Graph, schema, robots, sitemap, dan feed tetap aktif.</span></li>
        </ul>
      </div>
    </div>`;
  return {
    state: host.querySelector(".sf-state"),
    file: host.querySelector(".sf-file"),
    drop: host.querySelector(".sf-drop"),
    upload: host.querySelector(".sf-upload"),
    remove: host.querySelector(".sf-remove"),
    open: host.querySelector(".sf-open"),
    siteName: host.querySelector(".sf-site-name"),
    domain: host.querySelector(".sf-site-domain"),
    browserImage: host.querySelector(".sf-preview-icon img"),
    appImage: host.querySelector(".sf-app-preview img"),
    appFallback: host.querySelector(".sf-app-preview span"),
  };
}

function setBusy(ui, busy, message = "") {
  ui.upload.disabled = busy;
  ui.remove.disabled = busy;
  ui.drop.setAttribute("aria-disabled", String(busy));
  ui.state.textContent = message || (busy ? "Memproses…" : "Siap");
  ui.state.classList.toggle("busy", busy);
}

function renderSite(ui, site) {
  const favicon = faviconData(site);
  const url = favicon.icon192Url || favicon.url || "";
  ui.siteName.textContent = site.name || "Situs";
  ui.domain.textContent = site.slug ? `${site.slug}.ngeblogging.com` : "Situs aktif";
  ui.open.href = site.slug ? `https://${site.slug}.ngeblogging.com` : "https://ngeblogging.com";
  ui.remove.hidden = !url;
  for (const image of [ui.browserImage, ui.appImage]) {
    image.hidden = !url;
    if (url) image.src = url;
    else image.removeAttribute("src");
  }
  ui.appFallback.hidden = Boolean(url);
  ui.state.textContent = url ? "Favicon aktif" : "Belum diatur";
  ui.state.classList.toggle("active", Boolean(url));
}

async function mount(host) {
  const ui = buildInterface(host);
  let context;
  try {
    context = await loadActiveSite();
    if (!host.isConnected) return;
    renderSite(ui, context.site);
  } catch (error) {
    setBusy(ui, true, error.message || "Favicon belum dapat dimuat");
    ui.state.classList.add("error");
    return;
  }

  const chooseFile = () => { if (!ui.upload.disabled) ui.file.click(); };
  ui.upload.addEventListener("click", chooseFile);
  ui.drop.addEventListener("click", chooseFile);
  ui.drop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseFile(); }
  });
  ui.drop.addEventListener("dragover", (event) => { event.preventDefault(); ui.drop.classList.add("dragging"); });
  ui.drop.addEventListener("dragleave", () => ui.drop.classList.remove("dragging"));
  ui.drop.addEventListener("drop", (event) => {
    event.preventDefault();
    ui.drop.classList.remove("dragging");
    const file = event.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  });

  async function handleUpload(file) {
    setBusy(ui, true, "Menyiapkan ikon…");
    ui.state.classList.remove("error", "active");
    const uploaded = [];
    try {
      const variants = await createVariants(file, context.site.slug);
      for (const variant of variants) {
        setBusy(ui, true, `Mengunggah ${variant.size} × ${variant.size}…`);
        const asset = await uploadMedia({ file: variant.file, siteId: context.site.id, userId: context.user.id });
        uploaded.push({ id: asset.id, object_path: asset.object_path, url: asset.url, size: variant.size, mime_type: asset.mime_type });
      }
      const latest = await supabase.from("sites").select("settings").eq("id", context.site.id).single();
      if (latest.error) throw latest.error;
      const currentSettings = objectValue(latest.data?.settings);
      const oldFavicon = faviconData({ settings: currentSettings });
      const small = uploaded.find((asset) => asset.size === 192);
      const large = uploaded.find((asset) => asset.size === 512) || small;
      const settings = {
        ...currentSettings,
        branding: {
          ...objectValue(currentSettings.branding),
          favicon: {
            url: small?.url || large?.url,
            icon192Url: small?.url || large?.url,
            icon512Url: large?.url || small?.url,
            type: "image/png",
            sourceName: String(file.name || "favicon").slice(0, 180),
            updatedAt: new Date().toISOString(),
            assets: uploaded,
          },
        },
      };
      context.site = await updateSiteSettings(context.site.id, settings);
      await removeAssets(oldFavicon.assets);
      renderSite(ui, context.site);
      ui.state.textContent = "Favicon berhasil disimpan";
      ui.state.classList.add("active");
      window.dispatchEvent(new CustomEvent("ngeblogging:site-branding-updated", { detail: { siteId: context.site.id } }));
    } catch (error) {
      await removeAssets(uploaded);
      ui.state.textContent = error.message || "Favicon belum dapat disimpan";
      ui.state.classList.add("error");
    } finally {
      ui.file.value = "";
      setBusy(ui, false, ui.state.textContent);
    }
  }

  ui.file.addEventListener("change", () => {
    const file = ui.file.files?.[0];
    if (file) handleUpload(file);
  });

  ui.remove.addEventListener("click", async () => {
    const current = faviconData(context.site);
    if (!current.url && !current.icon192Url) return;
    if (!window.confirm("Hapus favicon khusus dari situs ini? Situs akan memakai favicon bawaan Ngeblogging.")) return;
    setBusy(ui, true, "Menghapus favicon…");
    try {
      const latest = await supabase.from("sites").select("settings").eq("id", context.site.id).single();
      if (latest.error) throw latest.error;
      const settings = objectValue(latest.data?.settings);
      const branding = { ...objectValue(settings.branding) };
      const oldFavicon = objectValue(branding.favicon);
      delete branding.favicon;
      context.site = await updateSiteSettings(context.site.id, { ...settings, branding });
      await removeAssets(oldFavicon.assets);
      renderSite(ui, context.site);
      ui.state.textContent = "Favicon khusus dihapus";
      window.dispatchEvent(new CustomEvent("ngeblogging:site-branding-updated", { detail: { siteId: context.site.id } }));
    } catch (error) {
      ui.state.textContent = error.message || "Favicon belum dapat dihapus";
      ui.state.classList.add("error");
    } finally {
      setBusy(ui, false, ui.state.textContent);
    }
  });
}

function scan() {
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid || document.getElementById(HOST_ID)) return;
  const host = createHost(grid);
  mount(host);
}

const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("ngeblogging:active-site-changed", scan);
scan();
