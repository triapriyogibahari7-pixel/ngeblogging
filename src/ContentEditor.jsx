import React, { useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Bold, CalendarDays,
  Check, Clock3, Code2, Eye, FileText, Heading1, Heading2, Highlighter, Image,
  Italic, Link, List, ListOrdered, LoaderCircle, MapPin, Monitor, Palette, Quote,
  Redo2, Save, Send, Smartphone, Sparkles, Strikethrough, Table2, Tablet,
  Tags, Trash2, Underline, Undo2, Upload, X,
} from "lucide-react";
import MediaLibrary from "./MediaLibrary";
import { slugify } from "./lib/content-data";
import "./content-editor.css";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

function command(name, value = null) {
  document.execCommand(name, false, value);
}

function csv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 50);
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Field({ label, help, children, wide = false }) {
  return <label className={wide ? "ce-field wide" : "ce-field"}><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function Toggle({ label, help, checked, onChange }) {
  return <label className="ce-toggle"><span><b>{label}</b>{help && <small>{help}</small>}</span><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)}/></label>;
}

function DeviceSwitch({ value, onChange }) {
  return <div className="ce-device-switch">{DEVICES.map(({ id, label, icon: Icon }) => <button key={id} className={value === id ? "active" : ""} onClick={() => onChange(id)} title={label}><Icon/><span>{label}</span></button>)}</div>;
}

function Preview({ doc, site, device, onClose }) {
  const metadata = doc.metadata || {};
  const date = metadata.eventDate || doc.publishedAt || doc.createdAt;
  return <div className="ce-preview-layer"><button className="ce-preview-backdrop" onClick={onClose} aria-label="Tutup preview"/><section><header><div><small>PREVIEW SITUS</small><h2>{doc.title}</h2></div><button onClick={onClose}><X/></button></header><div className={`ce-preview-canvas ${device}`}><article><nav><b>{site?.name || "Ngeblogging"}</b><span>Beranda · {doc.type === "page" ? "Pages" : "Posts"}</span></nav><main><small>{doc.type === "page" ? "PAGE" : "POST"}{date ? ` · ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(date))}` : ""}</small><h1>{doc.title}</h1>{doc.excerpt && <p className="lead">{doc.excerpt}</p>}{metadata.locationName && <p className="location"><MapPin/> {metadata.locationName}</p>}<div className="body" dangerouslySetInnerHTML={{ __html: doc.content || "" }}/>{metadata.tags?.length > 0 && <div className="tags">{metadata.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</main><footer>© {new Date().getFullYear()} {site?.name || "Ngeblogging"}</footer></article></div></section></div>;
}

export default function ContentEditor({ doc, site, user, saved, patch, publish, onBack, onOpenNara, setToast }) {
  const editor = useRef(null);
  const [tab, setTab] = useState("content");
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(doc.content || "");
  const metadata = doc.metadata || {};
  const seo = doc.seo || {};
  const isPage = doc.type === "page";

  const words = useMemo(() => String(doc.content || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length, [doc.content]);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  const seoScore = useMemo(() => {
    let score = 40;
    if (doc.title?.length >= 20 && doc.title.length <= 65) score += 15;
    if (doc.excerpt?.length >= 100 && doc.excerpt.length <= 170) score += 15;
    if (metadata.focusKeyword) score += 10;
    if (metadata.canonicalUrl || site?.slug) score += 5;
    if (metadata.socialTitle && metadata.socialDescription) score += 5;
    if (metadata.tags?.length) score += 5;
    if (words >= 300 || isPage) score += 5;
    return Math.min(100, score);
  }, [doc.title, doc.excerpt, metadata, site?.slug, words, isPage]);

  const format = (name, value = null) => {
    editor.current?.focus();
    command(name, value);
    patch({ content: editor.current?.innerHTML || doc.content });
  };

  const insertHtml = (html) => format("insertHTML", html);
  const insertLink = () => {
    const url = window.prompt("Alamat tautan HTTPS");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) throw new Error();
      format("createLink", url);
    } catch { setToast("Alamat tautan tidak valid"); }
  };
  const insertTable = () => insertHtml("<table><thead><tr><th>Kolom 1</th><th>Kolom 2</th><th>Kolom 3</th></tr></thead><tbody><tr><td>Data</td><td>Data</td><td>Data</td></tr></tbody></table><p><br></p>");
  const insertMedia = (asset) => {
    const escaped = String(asset.alt_text || asset.filename || "").replace(/["&<>]/g, "");
    if (asset.kind === "image") insertHtml(`<figure><img src="${asset.url}" alt="${escaped}" loading="lazy" decoding="async"><figcaption>${escaped}</figcaption></figure><p><br></p>`);
    else if (asset.kind === "video") insertHtml(`<figure><video src="${asset.url}" controls playsinline preload="metadata"></video><figcaption>${escaped}</figcaption></figure><p><br></p>`);
    else if (asset.kind === "audio") insertHtml(`<figure><audio src="${asset.url}" controls preload="metadata"></audio><figcaption>${escaped}</figcaption></figure><p><br></p>`);
    else insertHtml(`<p><a href="${asset.url}" target="_blank" rel="noopener noreferrer">Unduh ${escaped}</a></p>`);
    setMediaOpen(false);
  };
  const tool = (title, icon, action) => <button title={title} aria-label={title} onClick={action}>{icon}</button>;
  const updateMetadata = (values) => patch({ metadata: { ...metadata, ...values }, type: doc.type });
  const updateSeo = (values) => patch({ seo: { ...seo, ...values }, metadata, type: doc.type });

  return <div className="ce-app">
    <header className="ce-titlebar"><button className="ce-back" onClick={onBack}><ArrowLeft/></button><div className="ce-file"><FileText/><label><input value={doc.title} onChange={(event) => patch({ title: event.target.value, slug: slugify(event.target.value) })}/><small>{saved ? <><Check/> Tersimpan otomatis</> : <><LoaderCircle className="spin"/> Menyimpan…</>}</small></label></div><div className="ce-actions"><button onClick={() => setPreview(true)}><Eye/> Preview</button><button className="ce-primary" onClick={publish}><Send/>{doc.status === "published" ? "Jadikan draf" : doc.status === "scheduled" ? "Terjadwal" : "Terbitkan"}</button></div></header>
    <nav className="ce-tabs">{[["content","Konten"],["insert","Sisipkan"],["layout","Tata letak"],["metadata","Metadata"],["seo","SEO"],["source","HTML"]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); if (id === "source") { setSourceDraft(doc.content || ""); setSourceOpen(true); } }}>{label}</button>)}</nav>
    <div className="ce-ribbon">
      <section><span>Edit</span><nav>{tool("Undo",<Undo2/>,() => format("undo"))}{tool("Redo",<Redo2/>,() => format("redo"))}{tool("Hapus format",<Trash2/>,() => format("removeFormat"))}</nav></section>
      <section className="selects"><span>Tipografi</span><nav><select aria-label="Gaya" defaultValue="p" onChange={(event) => format("formatBlock",event.target.value)}><option value="p">Paragraf</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Kutipan</option><option value="pre">Kode</option></select><select aria-label="Font" defaultValue="DM Sans" onChange={(event) => format("fontName",event.target.value)}><option>DM Sans</option><option>Georgia</option><option>Arial</option><option>Courier New</option><option>Times New Roman</option></select><select aria-label="Ukuran" defaultValue="3" onChange={(event) => format("fontSize",event.target.value)}>{[[1,"12"],[2,"14"],[3,"16"],[4,"20"],[5,"28"],[6,"38"],[7,"52"]].map(([value,label]) => <option key={value} value={value}>{label}px</option>)}</select></nav></section>
      <section><span>Font</span><nav>{tool("Bold",<Bold/>,() => format("bold"))}{tool("Italic",<Italic/>,() => format("italic"))}{tool("Underline",<Underline/>,() => format("underline"))}{tool("Coret",<Strikethrough/>,() => format("strikeThrough"))}<label className="ce-color-tool" title="Warna teks"><Palette/><input type="color" defaultValue="#17253c" onChange={(event) => format("foreColor",event.target.value)}/></label><label className="ce-color-tool" title="Sorotan"><Highlighter/><input type="color" defaultValue="#fff0a8" onChange={(event) => format("hiliteColor",event.target.value)}/></label></nav></section>
      <section><span>Paragraf</span><nav>{tool("Daftar poin",<List/>,() => format("insertUnorderedList"))}{tool("Daftar nomor",<ListOrdered/>,() => format("insertOrderedList"))}{tool("Kiri",<AlignLeft/>,() => format("justifyLeft"))}{tool("Tengah",<AlignCenter/>,() => format("justifyCenter"))}{tool("Kanan",<AlignRight/>,() => format("justifyRight"))}{tool("Rata penuh",<AlignJustify/>,() => format("justifyFull"))}</nav></section>
      <section><span>Sisipkan</span><nav>{tool("Heading 1",<Heading1/>,() => format("formatBlock","h1"))}{tool("Heading 2",<Heading2/>,() => format("formatBlock","h2"))}{tool("Tabel",<Table2/>,insertTable)}{tool("Tautan",<Link/>,insertLink)}{tool("Media",<Upload/>,() => setMediaOpen(true))}{tool("Kutipan",<Quote/>,() => format("formatBlock","blockquote"))}</nav></section>
      <button className="ce-nara" onClick={onOpenNara}><Sparkles/> Tulis dengan Nara</button>
    </div>

    <div className="ce-workspace">
      <main className="ce-paper-shell"><article ref={editor} className="ce-paper" contentEditable suppressContentEditableWarning onInput={(event) => patch({ content: event.currentTarget.innerHTML })} dangerouslySetInnerHTML={{ __html: doc.content || "" }}/><div className="ce-word-status"><span>{words.toLocaleString("id-ID")} kata</span><span>± {readingMinutes} menit membaca</span><span>{String(doc.content || "").length.toLocaleString("id-ID")} karakter HTML</span></div></main>
      <aside className="ce-sidebar">
        <section><h3>Publikasi</h3><Field label="Status"><select value={doc.status || "draft"} onChange={(event) => patch({ status:event.target.value })}><option value="draft">Draf</option><option value="review">Review</option><option value="scheduled">Terjadwal</option><option value="published">Terbit</option><option value="archived">Arsip</option></select></Field><Field label="Visibilitas"><select value={doc.visibility || "public"} onChange={(event) => patch({visibility:event.target.value})}><option value="public">Publik</option><option value="members">Anggota</option><option value="private">Pribadi</option></select></Field><Field label="Jadwal terbit" help="Digunakan ketika status Terjadwal"><input type="datetime-local" value={localDateTime(doc.scheduledAt)} onChange={(event) => patch({ scheduledAt:event.target.value ? new Date(event.target.value).toISOString() : "" })}/></Field><Field label="Slug URL"><input value={doc.slug || ""} onChange={(event) => patch({slug:slugify(event.target.value)})}/></Field></section>
        <section><h3><CalendarDays/> Tanggal & waktu</h3><div className="ce-field-grid"><Field label="Tanggal acara"><input type="date" value={metadata.eventDate || ""} onChange={(event) => updateMetadata({eventDate:event.target.value})}/></Field><Field label="Waktu"><input type="time" value={metadata.eventTime || ""} onChange={(event) => updateMetadata({eventTime:event.target.value})}/></Field><Field label="Tanggal selesai"><input type="date" value={metadata.endDate || ""} onChange={(event) => updateMetadata({endDate:event.target.value})}/></Field><Field label="Waktu selesai"><input type="time" value={metadata.endTime || ""} onChange={(event) => updateMetadata({endTime:event.target.value})}/></Field></div><Field label="Zona waktu"><select value={metadata.timezone || "Asia/Jakarta"} onChange={(event) => updateMetadata({timezone:event.target.value})}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></Field></section>
        <section><h3><MapPin/> Lokasi</h3><Field label="Nama lokasi"><input value={metadata.locationName || ""} onChange={(event) => updateMetadata({locationName:event.target.value})} placeholder="Gedung, kota, atau online"/></Field><Field label="Alamat"><textarea value={metadata.address || ""} onChange={(event) => updateMetadata({address:event.target.value})} placeholder="Alamat lengkap atau URL acara online"/></Field><div className="ce-field-grid"><Field label="Latitude"><input inputMode="decimal" value={metadata.latitude ?? ""} onChange={(event) => updateMetadata({latitude:event.target.value})}/></Field><Field label="Longitude"><input inputMode="decimal" value={metadata.longitude ?? ""} onChange={(event) => updateMetadata({longitude:event.target.value})}/></Field></div></section>
        <section><h3><Tags/> Taksonomi</h3><Field label="Tags" help="Pisahkan dengan koma"><input value={(metadata.tags || []).join(", ")} onChange={(event) => updateMetadata({tags:csv(event.target.value)})} placeholder="seo, bisnis, teknologi"/></Field><Field label="Kategori" help="Pisahkan dengan koma"><input value={(metadata.categories || []).join(", ")} onChange={(event) => updateMetadata({categories:csv(event.target.value)})}/></Field><Toggle label="Sticky post" help="Tampilkan di bagian atas daftar post" checked={metadata.sticky} onChange={(value) => updateMetadata({sticky:value})}/></section>
        <section><h3>{isPage ? "Pengaturan Page" : "Pengaturan Post"}</h3><Field label="Template"><select value={metadata.template || (isPage ? "default-page" : "default-post")} onChange={(event) => updateMetadata({template:event.target.value})}>{isPage ? <><option value="default-page">Page default</option><option value="full-width">Lebar penuh</option><option value="landing">Landing page</option><option value="contact">Kontak</option><option value="portfolio">Portofolio</option></> : <><option value="default-post">Post default</option><option value="editorial">Editorial</option><option value="news">Berita</option><option value="review">Review</option><option value="event">Acara</option></>}</select></Field>{isPage && <Field label="Urutan menu"><input type="number" min="0" max="9999" value={metadata.menuOrder || 0} onChange={(event) => updateMetadata({menuOrder:Number(event.target.value)})}/></Field>}<Toggle label="Tampilkan penulis" checked={metadata.showAuthor} onChange={(value) => updateMetadata({showAuthor:value})}/><Toggle label="Tampilkan tanggal" checked={metadata.showDate} onChange={(value) => updateMetadata({showDate:value})}/><Toggle label="Tombol bagikan" checked={metadata.showShare} onChange={(value) => updateMetadata({showShare:value})}/><Toggle label="Komentar" checked={metadata.commentsEnabled} onChange={(value) => updateMetadata({commentsEnabled:value})}/></section>
        <section><h3>SEO & sosial</h3><Field label="Meta description" help={`${(doc.excerpt || "").length}/160 karakter`}><textarea maxLength={160} value={doc.excerpt || ""} onChange={(event) => patch({excerpt:event.target.value})} placeholder="Ringkasan unik 120–160 karakter"/></Field><Field label="Focus keyword"><input value={metadata.focusKeyword || ""} onChange={(event) => updateMetadata({focusKeyword:event.target.value})}/></Field><Field label="Canonical URL"><input type="url" value={metadata.canonicalUrl || ""} onChange={(event) => updateMetadata({canonicalUrl:event.target.value})} placeholder={site?.slug ? `https://${site.slug}.ngeblogging.com/${doc.slug}` : "https://..."}/></Field><Field label="Schema type"><select value={metadata.schemaType || (isPage ? "WebPage" : "BlogPosting")} onChange={(event) => updateMetadata({schemaType:event.target.value})}><option>BlogPosting</option><option>NewsArticle</option><option>Article</option><option>WebPage</option><option>AboutPage</option><option>ContactPage</option><option>Event</option><option>FAQPage</option><option>HowTo</option><option>Product</option><option>ProfilePage</option></select></Field><Toggle label="Izinkan index" checked={seo.index !== false} onChange={(value) => updateSeo({index:value})}/><Toggle label="Izinkan follow" checked={seo.follow !== false} onChange={(value) => updateSeo({follow:value})}/><div className="ce-score"><span>Skor SEO</span><b className={seoScore >= 80 ? "good" : seoScore >= 60 ? "medium" : "low"}>{seoScore}/100</b></div></section>
      </aside>
    </div>

    {preview && <Preview doc={doc} site={site} device={previewDevice} onClose={() => setPreview(false)}/>} {preview && <div className="ce-preview-devices"><DeviceSwitch value={previewDevice} onChange={setPreviewDevice}/></div>}
    {mediaOpen && <div className="ce-media-layer"><button className="ce-media-backdrop" onClick={() => setMediaOpen(false)} aria-label="Tutup"/><section><header><div><small>PUSTAKA MEDIA</small><h2>Sisipkan media</h2></div><button onClick={() => setMediaOpen(false)}><X/></button></header><MediaLibrary site={site} user={user} setToast={setToast} onInsert={insertMedia}/></section></div>}
    {sourceOpen && <div className="ce-source-layer"><button className="ce-source-backdrop" onClick={() => setSourceOpen(false)} aria-label="Tutup"/><section><header><div><small>HTML KONTEN</small><h2>Edit source post/page</h2></div><button onClick={() => setSourceOpen(false)}><X/></button></header><textarea value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} spellCheck="false"/><footer><span><Code2/> Script, iframe, object, dan event handler akan dibersihkan saat tampil publik.</span><button onClick={() => setSourceOpen(false)}>Batal</button><button className="ce-primary" onClick={() => { patch({content:sourceDraft}); setSourceOpen(false); setToast("HTML konten disimpan"); }}><Save/> Simpan HTML</button></footer></section></div>}
  </div>;
}
