import React, { useEffect, useRef, useState } from "react";
import { ArchiveRestore, Check, Download, FileArchive, FileText, HardDriveDownload, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import { supabaseConfigured } from "./lib/supabase.js";
import { getOrCreatePrimarySite } from "./lib/studio-data.js";
import {
  downloadJsonBackup, downloadReadableArchive, exportCloudBackup, exportLocalBackup,
  finalizeLocalBackup, parseBackupFile, recordBackupEvent, restoreCloudBackup,
} from "./lib/backup-data.js";
import "./backup-center.css";

const LOCAL_STORE = "ngeblogging-studio-v3";

function readLocalDocuments() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_STORE) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function localRestoreDocuments(contents) {
  return contents.map((item) => ({
    id: crypto.randomUUID(),
    type: item.kind === "page" ? "page" : "article",
    title: item.title,
    slug: item.slug,
    status: "draft",
    visibility: item.visibility || "public",
    content: item.body_html || "",
    excerpt: item.excerpt || "",
    featuredImagePath: item.featured_image_path || "",
    metadata: item.metadata || {},
    seo: item.seo || {},
    scheduledAt: "",
    publishedAt: "",
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updated: Date.now(),
    hydrated: true,
  }));
}

export default function BackupCenter({ user }) {
  const inputRef = useRef(null);
  const [site,setSite] = useState(null);
  const [busy,setBusy] = useState("");
  const [message,setMessage] = useState("");
  const [preserveStatuses,setPreserveStatuses] = useState(false);
  const [lastBackup,setLastBackup] = useState(null);
  const cloudMode = Boolean(user?.id && supabaseConfigured);

  useEffect(() => {
    if (!cloudMode) return;
    getOrCreatePrimarySite(user).then(setSite).catch((error) => setMessage(error.message || "Situs aktif belum dapat dimuat."));
  }, [cloudMode,user?.id]);

  const buildBackup = async () => {
    if (cloudMode) {
      if (!site?.id) throw new Error("Situs aktif belum tersedia.");
      const backup = await exportCloudBackup({ siteId:site.id,userId:user.id });
      await recordBackupEvent({ siteId:site.id,userId:user.id,action:"export",documentCount:backup.contents.length,metadata:{ mediaReferences:backup.media.length } });
      return backup;
    }
    return finalizeLocalBackup(exportLocalBackup(readLocalDocuments()));
  };

  const download = async (format) => {
    setBusy(format); setMessage("");
    try {
      const backup = lastBackup || await buildBackup();
      setLastBackup(backup);
      if (format === "json") downloadJsonBackup(backup);
      else downloadReadableArchive(backup);
      setMessage(format === "json" ? "Cadangan pemulihan lengkap berhasil diunduh." : "Arsip HTML yang dapat dibaca berhasil diunduh.");
    } catch(error){ setMessage(error.message || "Cadangan belum dapat dibuat."); }
    finally { setBusy(""); }
  };

  const restore = async (file) => {
    if (!file) return;
    setBusy("restore"); setMessage("");
    try {
      const backup = await parseBackupFile(file);
      const description = `${backup.contents.length.toLocaleString("id-ID")} Posts/Pages dari ${backup.site?.name || "cadangan"}`;
      if (!window.confirm(`Pulihkan ${description}? Konten yang dipulihkan akan dibuat sebagai salinan baru${preserveStatuses ? " dengan status asli" : " dalam status draf"}.`)) return;
      if (cloudMode) {
        if (!site?.id) throw new Error("Situs aktif belum tersedia.");
        const result = await restoreCloudBackup({ backup,siteId:site.id,userId:user.id,preserveStatuses });
        setMessage(`${result.restored.toLocaleString("id-ID")} Posts/Pages berhasil dipulihkan. ${result.mediaReferences.toLocaleString("id-ID")} referensi media ikut tercatat dalam file cadangan.`);
      } else {
        localStorage.setItem(LOCAL_STORE,JSON.stringify(localRestoreDocuments(backup.contents)));
        setMessage(`${backup.contents.length.toLocaleString("id-ID")} Posts/Pages dipulihkan ke perangkat. Muat ulang Studio untuk melihatnya.`);
      }
    } catch(error){ setMessage(error.message || "Pemulihan cadangan gagal."); }
    finally { setBusy(""); if(inputRef.current)inputRef.current.value=""; }
  };

  return <section className="bc-center" aria-labelledby="backup-center-title">
    <header><div><small>KEPEMILIKAN DATA</small><h2 id="backup-center-title">Cadangan Posts, Pages, tema, dan media-manifest</h2><p>Unduh salinan portabel agar karya tetap dapat dipulihkan apabila domain, akun, atau layanan mengalami masalah.</p></div><span><ShieldCheck/> Checksum SHA-256</span></header>
    <div className="bc-summary"><article><FileText/><div><b>Seluruh Posts & Pages</b><p>HTML lengkap, status, tanggal, jadwal, lokasi, tags, kategori, metadata, SEO, dan struktur Page.</p></div></article><article><FileArchive/><div><b>Konteks situs</b><p>Identitas situs, tema aktif, widget, domain, profil, serta manifest media ikut dicatat.</p></div></article><article><ArchiveRestore/><div><b>Pemulihan aman</b><p>Default dipulihkan sebagai draf dan slug dibuat unik agar konten lama tidak tertimpa.</p></div></article></div>
    <div className="bc-actions"><button className="bc-primary" disabled={Boolean(busy)} onClick={()=>download("json")}>{busy==="json"?<LoaderCircle className="spin"/>:<HardDriveDownload/>}<span><b>Unduh cadangan lengkap</b><small>File .ngeblogging-backup.json untuk dipulihkan kembali</small></span></button><button disabled={Boolean(busy)} onClick={()=>download("html")}>{busy==="html"?<LoaderCircle className="spin"/>:<Download/>}<span><b>Unduh arsip HTML</b><small>Salinan yang mudah dibuka dan dibaca tanpa Studio</small></span></button><button disabled={Boolean(busy)} onClick={()=>inputRef.current?.click()}>{busy==="restore"?<LoaderCircle className="spin"/>:<Upload/>}<span><b>Pulihkan dari file</b><small>Impor file cadangan Ngeblogging dengan verifikasi checksum</small></span></button><input ref={inputRef} type="file" accept="application/json,.json,.ngeblogging-backup.json" hidden onChange={(event)=>restore(event.target.files?.[0])}/></div>
    <label className="bc-preserve"><input type="checkbox" checked={preserveStatuses} onChange={(event)=>setPreserveStatuses(event.target.checked)}/><span><b>Pertahankan status publikasi saat memulihkan</b><small>Nonaktif secara default agar Post/Page hasil pemulihan tidak langsung terbit.</small></span></label>
    <div className="bc-note"><Check/><p>Cadangan menyimpan seluruh teks dan metadata konten. Berkas media besar dicatat sebagai manifest URL dan metadata; unduhan biner massal tetap memerlukan pipeline arsip media terpisah agar browser tidak kehabisan memori.</p></div>
    {message&&<p className="bc-message" role="status">{message}</p>}
  </section>;
}
