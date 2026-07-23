import { supabase, supabaseConfigured } from "./supabase.js";

export const MEDIA_BUCKET = "site-public-media";
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MEDIA_ACCEPT = [
  "image/*","video/*","audio/*","application/pdf","text/plain","text/markdown","text/csv","application/json","application/zip",
  ".doc",".docx",".xls",".xlsx",".ppt",".pptx",".mkv",".mov",".heic",".heif",".tif",".tiff",
].join(",");

const EXTENSION_TYPES = {
  jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",svg:"image/svg+xml",heic:"image/heic",heif:"image/heif",tif:"image/tiff",tiff:"image/tiff",bmp:"image/bmp",
  mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mkv:"video/x-matroska",mpeg:"video/mpeg",mpg:"video/mpeg",ogv:"video/ogg","3gp":"video/3gpp",
  mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav",ogg:"audio/ogg",flac:"audio/flac",aac:"audio/aac",
  pdf:"application/pdf",txt:"text/plain",md:"text/markdown",csv:"text/csv",json:"application/json",zip:"application/zip",
  doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_TYPES = new Set(Object.values(EXTENSION_TYPES));

function db() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  return supabase;
}

function extension(name) {
  return String(name || "").toLowerCase().split(".").pop() || "";
}

export function detectedMime(file) {
  const declared = String(file?.type || "").toLowerCase();
  return ALLOWED_TYPES.has(declared) ? declared : EXTENSION_TYPES[extension(file?.name)] || declared;
}

export function mediaKind(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export function validateMedia(file) {
  if (!file) throw new Error("Berkas tidak ditemukan.");
  const mime = detectedMime(file);
  if (!ALLOWED_TYPES.has(mime)) throw new Error(`${file.name} belum didukung. Gunakan format gambar, video, audio, PDF, dokumen Office, teks, CSV, JSON, atau ZIP yang umum.`);
  if (file.size <= 0) throw new Error(`${file.name} kosong.`);
  if (file.size > MAX_MEDIA_BYTES) throw new Error(`${file.name} melebihi 50 MB, yaitu batas proyek gratis saat ini.`);
  return mime;
}

function safeFilename(name) {
  const cleaned = String(name || "media")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-").replace(/-{2,}/g, "-")
    .replace(/(^[-_.]+|[-_.]+$)/g, "").slice(0, 140);
  return cleaned || "media";
}

async function dimensions(file, kind) {
  if (kind === "image" && typeof createImageBitmap === "function") {
    try { const bitmap = await createImageBitmap(file); const result = { width:bitmap.width,height:bitmap.height,duration:null }; bitmap.close(); return result; } catch { return { width:null,height:null,duration:null }; }
  }
  if (["video","audio"].includes(kind) && typeof document !== "undefined") {
    const url = URL.createObjectURL(file);
    try {
      const element = document.createElement(kind === "video" ? "video" : "audio");
      element.preload = "metadata";
      await new Promise((resolve,reject) => { element.onloadedmetadata=resolve; element.onerror=reject; element.src=url; });
      return { width:kind === "video" ? element.videoWidth || null : null,height:kind === "video" ? element.videoHeight || null : null,duration:Number.isFinite(element.duration) ? element.duration : null };
    } catch { return { width:null,height:null,duration:null }; } finally { URL.revokeObjectURL(url); }
  }
  return { width:null,height:null,duration:null };
}

export function publicMediaUrl(path) {
  return db().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadMedia({ file, siteId, userId }) {
  if (!siteId || !userId) throw new Error("Situs aktif atau pengguna belum tersedia.");
  const mime = validateMedia(file);
  const kind = mediaKind(mime);
  const info = await dimensions(file, kind);
  const objectPath = `${siteId}/${userId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const client = db();
  const { error: uploadError } = await client.storage.from(MEDIA_BUCKET).upload(objectPath,file,{ cacheControl:"31536000",contentType:mime,upsert:false });
  if (uploadError) throw uploadError;
  const payload = {
    site_id:siteId,uploaded_by:userId,bucket_id:MEDIA_BUCKET,object_path:objectPath,filename:file.name,mime_type:mime,bytes:file.size,
    width:info.width,height:info.height,alt_text:"",metadata:{ kind,duration:info.duration,source:"studio-media-v2",immutable:true },
  };
  const { data,error } = await client.from("media_assets").insert(payload).select("id,site_id,bucket_id,object_path,filename,mime_type,bytes,width,height,alt_text,metadata,created_at").single();
  if (error) { await client.storage.from(MEDIA_BUCKET).remove([objectPath]); throw error; }
  return { ...data,kind,url:publicMediaUrl(objectPath) };
}

export async function listMedia({ siteId, limit = 240 }) {
  const client = db();
  const { data,error } = await client.from("media_assets").select("id,site_id,bucket_id,object_path,filename,mime_type,bytes,width,height,alt_text,metadata,created_at").eq("site_id",siteId).eq("bucket_id",MEDIA_BUCKET).order("created_at",{ascending:false}).limit(Math.min(500,limit));
  if (error) throw error;
  return (data || []).map((asset) => ({ ...asset,kind:asset.metadata?.kind || mediaKind(asset.mime_type),url:publicMediaUrl(asset.object_path) }));
}

export async function deleteMedia(asset) {
  const client = db();
  const { error:storageError } = await client.storage.from(MEDIA_BUCKET).remove([asset.object_path]);
  if (storageError) throw storageError;
  const { error } = await client.from("media_assets").delete().eq("id",asset.id);
  if (error) throw error;
}

export async function updateMediaAlt(assetId, altText) {
  const { data,error } = await db().from("media_assets").update({ alt_text:String(altText || "").slice(0,500) }).eq("id",assetId).select("id,alt_text").single();
  if (error) throw error;
  return data;
}
