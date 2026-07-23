import { supabase, supabaseConfigured } from "./lib/supabase";
import "./cloudflare-media-bridge.css";

const BUCKET = "site-public-media";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

let workspacePromise = null;
let savedEditorRange = null;
let enhancementQueued = false;

function safeFilename(name) {
  const normalized = String(name || "gambar")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^[-_.]+|[-_.]+$)/g, "")
    .slice(0, 120);
  return normalized || "gambar";
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function validateImage(file) {
  if (!file) throw new Error("Berkas tidak ditemukan.");
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Gunakan gambar JPEG, PNG, WebP, GIF, atau AVIF.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran gambar maksimal 15 MB.");
  }
}

async function imageDimensions(file) {
  if (typeof createImageBitmap !== "function") return { width: null, height: null };
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

async function workspace() {
  if (!supabaseConfigured || !supabase) throw new Error("Supabase belum dikonfigurasi.");
  if (workspacePromise) return workspacePromise;

  workspacePromise = (async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData.session?.user;
    if (!user) throw new Error("Silakan masuk untuk memakai media cloud.");

    const { data: memberships, error: membershipError } = await supabase
      .from("site_members")
      .select("site_id,role,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (membershipError) throw membershipError;
    const siteId = memberships?.[0]?.site_id;
    if (!siteId) throw new Error("Situs aktif belum ditemukan.");

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id,name,slug")
      .eq("id", siteId)
      .single();
    if (siteError) throw siteError;
    return { user, site };
  })().catch((error) => {
    workspacePromise = null;
    throw error;
  });

  return workspacePromise;
}

function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file) {
  validateImage(file);
  const { user, site } = await workspace();
  const filename = safeFilename(file.name);
  const objectPath = `${site.id}/${user.id}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
  const dimensions = await imageDimensions(file);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const asset = {
    site_id: site.id,
    uploaded_by: user.id,
    bucket_id: BUCKET,
    object_path: objectPath,
    filename: file.name,
    mime_type: file.type,
    bytes: file.size,
    width: dimensions.width,
    height: dimensions.height,
    alt_text: "",
    metadata: {
      source: "cloudflare-media-bridge-v1",
      cache_control: "31536000",
    },
  };

  const { data, error: metadataError } = await supabase
    .from("media_assets")
    .insert(asset)
    .select("id,site_id,bucket_id,object_path,filename,mime_type,bytes,width,height,alt_text,created_at")
    .single();

  if (metadataError) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw metadataError;
  }

  return { ...data, url: publicUrl(objectPath) };
}

async function listImages() {
  const { site } = await workspace();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id,site_id,bucket_id,object_path,filename,mime_type,bytes,width,height,alt_text,created_at")
    .eq("site_id", site.id)
    .eq("bucket_id", BUCKET)
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  return (data || []).map((asset) => ({ ...asset, url: publicUrl(asset.object_path) }));
}

async function removeImage(asset) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([asset.object_path]);
  if (storageError) throw storageError;
  const { error: metadataError } = await supabase.from("media_assets").delete().eq("id", asset.id);
  if (metadataError) throw metadataError;
}

function showToast(message, kind = "success") {
  const previous = document.querySelector(".cloud-media-toast");
  previous?.remove();
  const toast = document.createElement("div");
  toast.className = `cloud-media-toast ${kind}`;
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function button(label, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function imageCard(asset, refresh) {
  const card = document.createElement("article");
  card.className = "cloud-media-card";

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "cloud-media-preview";
  preview.title = "Buka gambar";
  const image = document.createElement("img");
  image.src = asset.url;
  image.alt = asset.alt_text || asset.filename;
  image.loading = "lazy";
  image.decoding = "async";
  preview.append(image);
  preview.addEventListener("click", () => window.open(asset.url, "_blank", "noopener,noreferrer"));

  const info = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = asset.filename;
  const meta = document.createElement("small");
  const size = [asset.width, asset.height].every(Boolean) ? `${asset.width}×${asset.height} · ` : "";
  meta.textContent = `${size}${formatBytes(asset.bytes)}`;
  info.append(title, meta);

  const actions = document.createElement("nav");
  const copy = button("Salin URL");
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(asset.url);
    showToast("URL gambar disalin");
  });
  const remove = button("Hapus", "danger");
  remove.addEventListener("click", async () => {
    if (!window.confirm(`Hapus ${asset.filename}?`)) return;
    remove.disabled = true;
    try {
      await removeImage(asset);
      showToast("Gambar berhasil dihapus");
      await refresh();
    } catch (error) {
      console.error("Media delete failed", error);
      showToast(error.message || "Gambar belum dapat dihapus", "error");
      remove.disabled = false;
    }
  });
  actions.append(copy, remove);
  card.append(preview, info, actions);
  return card;
}

function isMediaView(root) {
  return root.querySelector("h1")?.textContent?.trim() === "Pustaka media";
}

async function enhanceMediaView(root) {
  if (root.dataset.cloudMediaMounted === "true" || !isMediaView(root)) return;
  root.dataset.cloudMediaMounted = "true";

  const heading = document.createElement("div");
  heading.className = "content-title";
  const headingCopy = document.createElement("div");
  headingCopy.innerHTML = "<h1>Pustaka media</h1><p>Unggah gambar nyata ke cloud, gunakan kembali di editor, dan tampilkan pada situs publik.</p>";
  const uploadButton = button("Unggah gambar", "blue-button cloud-media-upload-button");
  heading.append(headingCopy, uploadButton);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = [...ACCEPTED_IMAGE_TYPES].join(",");
  input.multiple = true;
  input.hidden = true;

  const zone = document.createElement("section");
  zone.className = "upload-zone cloud-media-zone";
  zone.innerHTML = "<strong>☁</strong><h3>Tarik gambar ke sini</h3><p>JPEG, PNG, WebP, GIF, atau AVIF. Maksimal 15 MB per berkas.</p>";
  const choose = button("Pilih gambar");
  zone.append(choose);

  const status = document.createElement("div");
  status.className = "cloud-media-status";
  status.setAttribute("role", "status");

  const gallery = document.createElement("section");
  gallery.className = "cloud-media-gallery";

  root.replaceChildren(heading, input, zone, status, gallery);

  const setBusy = (busy, text = "") => {
    uploadButton.disabled = busy;
    choose.disabled = busy;
    status.textContent = text;
    zone.classList.toggle("busy", busy);
  };

  const refresh = async () => {
    status.textContent = "Memuat pustaka media…";
    try {
      const assets = await listImages();
      gallery.replaceChildren();
      if (!assets.length) {
        const empty = document.createElement("div");
        empty.className = "cloud-media-empty";
        empty.innerHTML = "<b>Belum ada gambar</b><p>Unggah gambar pertama untuk situs ini.</p>";
        gallery.append(empty);
      } else {
        for (const asset of assets) gallery.append(imageCard(asset, refresh));
      }
      status.textContent = `${assets.length} gambar tersedia`;
    } catch (error) {
      console.error("Media list failed", error);
      status.textContent = error.message || "Pustaka media belum dapat dimuat";
      status.classList.add("error");
    }
  };

  const uploadFiles = async (files) => {
    const selected = [...files].slice(0, 20);
    if (!selected.length) return;
    setBusy(true, `Mengunggah 0/${selected.length}…`);
    let completed = 0;
    try {
      for (const file of selected) {
        await uploadImage(file);
        completed += 1;
        status.textContent = `Mengunggah ${completed}/${selected.length}…`;
      }
      showToast(`${completed} gambar berhasil diunggah`);
      await refresh();
    } catch (error) {
      console.error("Media upload failed", error);
      showToast(error.message || "Unggahan belum berhasil", "error");
      status.textContent = error.message || "Unggahan belum berhasil";
    } finally {
      setBusy(false, status.textContent);
      input.value = "";
    }
  };

  uploadButton.addEventListener("click", () => input.click());
  choose.addEventListener("click", () => input.click());
  input.addEventListener("change", () => uploadFiles(input.files));
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    uploadFiles(event.dataTransfer?.files || []);
  });

  await refresh();
}

function rememberEditorSelection() {
  const editor = document.querySelector(".editor-app .real-page[contenteditable='true']");
  const selection = window.getSelection();
  if (!editor || !selection?.rangeCount) {
    savedEditorRange = null;
    return;
  }
  const range = selection.getRangeAt(0);
  savedEditorRange = editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

function insertImageIntoEditor(url, altText) {
  const editor = document.querySelector(".editor-app .real-page[contenteditable='true']");
  if (!editor) throw new Error("Editor tidak ditemukan.");
  editor.focus();

  const selection = window.getSelection();
  if (savedEditorRange && editor.contains(savedEditorRange.commonAncestorContainer)) {
    selection.removeAllRanges();
    selection.addRange(savedEditorRange);
  } else {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const escapedUrl = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escapedAlt = String(altText || "Gambar artikel").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  document.execCommand("insertHTML", false, `<figure><img src="${escapedUrl}" alt="${escapedAlt}" loading="lazy" decoding="async"><figcaption>${escapedAlt}</figcaption></figure><p><br></p>`);
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
  savedEditorRange = null;
}

async function localDataUrl(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Mode perangkat membatasi gambar hingga 5 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Gambar belum dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

async function handleEditorImageInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.closest(".editor-app")) return;
  const file = input.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  input.value = "";

  try {
    showToast("Mengunggah gambar ke cloud…");
    const asset = supabaseConfigured ? await uploadImage(file) : { url: await localDataUrl(file), filename: file.name };
    insertImageIntoEditor(asset.url, asset.alt_text || asset.filename);
    showToast(supabaseConfigured ? "Gambar cloud dimasukkan ke artikel" : "Gambar lokal dimasukkan ke artikel");
  } catch (error) {
    console.error("Editor media upload failed", error);
    showToast(error.message || "Gambar belum dapat dimasukkan", "error");
  }
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(() => {
    enhancementQueued = false;
    for (const root of document.querySelectorAll(".studio-content")) {
      if (isMediaView(root)) enhanceMediaView(root);
    }
  });
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.(".editor-app button[title='Gambar'], .editor-app button[aria-label='Gambar']");
  if (trigger) rememberEditorSelection();
}, true);

document.addEventListener("change", handleEditorImageInput, true);

const observer = new MutationObserver(queueEnhancement);
observer.observe(document.documentElement, { childList: true, subtree: true });
queueEnhancement();
