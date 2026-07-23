import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, File, Image, LoaderCircle, Music, Play, Search, Trash2, Upload, X } from "lucide-react";
import { deleteMedia, listMedia, MEDIA_ACCEPT, MAX_MEDIA_BYTES, updateMediaAlt, uploadMedia } from "./lib/media-data";

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function iconFor(kind) {
  if (kind === "image") return Image;
  if (kind === "video") return Play;
  if (kind === "audio") return Music;
  return File;
}

function Preview({ asset }) {
  if (asset.kind === "image") return <img src={asset.url} alt={asset.alt_text || asset.filename} loading="lazy" decoding="async"/>;
  if (asset.kind === "video") return <video src={asset.url} preload="metadata" controls playsInline/>;
  if (asset.kind === "audio") return <div className="sn-media-audio"><Music/><audio src={asset.url} controls preload="metadata"/></div>;
  const Icon = iconFor(asset.kind);
  return <div className="sn-media-file"><Icon/><b>{asset.filename.split(".").pop()?.toUpperCase()}</b></div>;
}

export default function MediaLibrary({ site, user, setToast, onInsert }) {
  const [assets,setAssets] = useState([]);
  const [loading,setLoading] = useState(true);
  const [uploading,setUploading] = useState(false);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("all");
  const [selected,setSelected] = useState(null);
  const input = useRef(null);

  const refresh = async () => {
    if (!site?.id) { setAssets([]); setLoading(false); return; }
    setLoading(true);
    try { setAssets(await listMedia({siteId:site.id})); }
    catch(error){ console.error("Media list failed",error); setToast(error.message || "Pustaka media belum dapat dimuat"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [site?.id]);

  const shown = useMemo(() => assets.filter((asset) => (filter === "all" || asset.kind === filter) && asset.filename.toLowerCase().includes(query.toLowerCase())), [assets,filter,query]);

  const uploadFiles = async (fileList) => {
    const files = [...(fileList || [])].slice(0,30);
    if (!files.length || !site?.id || !user?.id) return;
    setUploading(true);
    let complete = 0;
    const failures = [];
    for (const file of files) {
      try { await uploadMedia({file,siteId:site.id,userId:user.id}); complete += 1; }
      catch(error){ failures.push(`${file.name}: ${error.message}`); }
    }
    await refresh();
    setUploading(false);
    if (input.current) input.current.value = "";
    if (complete) setToast(`${complete} berkas berhasil diunggah`);
    if (failures.length) setToast(failures.slice(0,2).join(" · "));
  };

  const remove = async (asset) => {
    if (!window.confirm(`Hapus ${asset.filename} dari situs ini?`)) return;
    try { await deleteMedia(asset); setSelected(null); await refresh(); setToast("Media berhasil dihapus"); }
    catch(error){ setToast(error.message || "Media belum dapat dihapus"); }
  };

  const copy = async (asset) => {
    try { await navigator.clipboard.writeText(asset.url); setToast("URL media disalin"); }
    catch { setToast("URL belum dapat disalin otomatis"); }
  };

  const saveAlt = async (asset, value) => {
    try { await updateMediaAlt(asset.id,value); setAssets((all) => all.map((item) => item.id === asset.id ? {...item,alt_text:value} : item)); setToast("Alt text disimpan"); }
    catch(error){ setToast(error.message || "Alt text belum tersimpan"); }
  };

  return <div className="sn-media-library">
    <input ref={input} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(event) => uploadFiles(event.target.files)}/>
    <header className="sn-page-title"><div><small>MEDIA CLOUD</small><h1>Pustaka media</h1><p>Gambar, video, audio, PDF, dokumen, dan arsip situs. Batas proyek gratis saat ini {MAX_MEDIA_BYTES / 1024 / 1024} MB per berkas.</p></div><button className="sn-primary" onClick={() => input.current?.click()} disabled={uploading}><Upload/>{uploading?"Mengunggah…":"Unggah media"}</button></header>
    <section className={`sn-upload-zone ${uploading?"busy":""}`} onDragOver={(event) => {event.preventDefault();event.currentTarget.classList.add("dragging");}} onDragLeave={(event) => event.currentTarget.classList.remove("dragging")} onDrop={(event) => {event.preventDefault();event.currentTarget.classList.remove("dragging");uploadFiles(event.dataTransfer.files);}}><Upload/>{uploading?<><LoaderCircle className="spin"/><h3>Memproses unggahan</h3></>:<><h3>Tarik media ke sini</h3><p>Format umum gambar, video, audio, dokumen Office, PDF, teks, CSV, JSON, dan ZIP.</p><button onClick={() => input.current?.click()}>Pilih berkas</button></>}</section>
    <div className="sn-media-tools"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama berkas…"/></label><nav>{[["all","Semua"],["image","Gambar"],["video","Video"],["audio","Audio"],["document","Dokumen"]].map(([id,label]) => <button key={id} className={filter===id?"active":""} onClick={() => setFilter(id)}>{label}</button>)}</nav><span>{shown.length} media</span></div>
    {loading ? <div className="sn-loading"><LoaderCircle className="spin"/> Memuat pustaka media…</div> : shown.length ? <div className="sn-media-grid">{shown.map((asset) => <article key={asset.id} className={selected?.id===asset.id?"selected":""}><button className="sn-media-preview" onClick={() => setSelected(asset)}><Preview asset={asset}/><span>{asset.kind}</span></button><div><b title={asset.filename}>{asset.filename}</b><small>{formatBytes(asset.bytes)}{asset.width&&asset.height?` · ${asset.width}×${asset.height}`:""}</small><nav>{onInsert && <button onClick={() => onInsert(asset)}><Check/> Sisipkan</button>}<button onClick={() => copy(asset)}><Copy/></button><button className="danger" onClick={() => remove(asset)}><Trash2/></button></nav></div></article>)}</div> : <div className="sn-empty"><Image/><h3>Belum ada media</h3><p>Unggah media pertama untuk situs ini.</p></div>}
    {selected && <div className="sn-media-detail-layer"><button className="sn-media-detail-backdrop" onClick={() => setSelected(null)} aria-label="Tutup"/><aside><header><div><small>{selected.kind.toUpperCase()}</small><h2>{selected.filename}</h2></div><button onClick={() => setSelected(null)}><X/></button></header><div className="sn-media-detail-preview"><Preview asset={selected}/></div><div className="sn-media-detail-fields"><label>URL publik<input readOnly value={selected.url}/><button onClick={() => copy(selected)}><Copy/> Salin</button></label>{selected.kind === "image" && <label>Alt text<textarea defaultValue={selected.alt_text || ""} placeholder="Jelaskan isi dan tujuan gambar" onBlur={(event) => saveAlt(selected,event.target.value)}/></label>}<dl><div><dt>Tipe</dt><dd>{selected.mime_type}</dd></div><div><dt>Ukuran</dt><dd>{formatBytes(selected.bytes)}</dd></div><div><dt>Dibuat</dt><dd>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(selected.created_at))}</dd></div></dl><div className="sn-media-detail-actions">{onInsert&&<button className="sn-primary" onClick={() => {onInsert(selected);setSelected(null);}}><Check/> Sisipkan ke editor</button>}<button onClick={() => window.open(selected.url,"_blank","noopener,noreferrer")}>Buka berkas</button><button className="danger" onClick={() => remove(selected)}><Trash2/> Hapus</button></div></div></aside></div>}
  </div>;
}
