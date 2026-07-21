import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BarChart3, Bold, BookOpen, Check, ChevronDown, FilePlus2,
  FileText, Globe2, Heading1, Heading2, Image, Italic, LayoutDashboard,
  Link, List, LogOut, MoreHorizontal, Palette, PanelLeftClose,
  PenLine, Plus, Redo2, Search, Send, Settings, Sparkles, Table2, Trash2,
  Underline, Undo2, Users, Upload, MessageSquare, ShieldCheck, Activity,
} from "lucide-react";
import NaraAssistant from "./NaraAssistant";

const STORE = "ngeblogging-studio-v1";
const starter = [
  { id: crypto.randomUUID(), type: "article", title: "Selamat datang di Ngeblogging", slug: "selamat-datang", status: "published", updated: Date.now(), content: "<h1>Selamat datang di Ngeblogging</h1><p>Ini adalah artikel pertama Anda. Studio ini menyimpan perubahan secara otomatis pada perangkat ini.</p><h2>Mulai berkarya</h2><p>Pilih teks, gunakan ribbon, lalu terbitkan ketika tulisan sudah siap.</p>" },
  { id: crypto.randomUUID(), type: "page", title: "Tentang", slug: "tentang", status: "draft", updated: Date.now() - 3600000, content: "<h1>Tentang kami</h1><p>Ceritakan tujuan, nilai, dan perjalanan Anda di halaman ini.</p>" },
];
const themes = ["Editorial", "Personal", "Business", "Newsroom", "Portfolio", "Magazine", "Minimal", "Creator", "Community", "Knowledge", "Newsletter", "Organization"];
const palette = ["#3157d5", "#7c3aed", "#0f766e", "#b45309", "#be123c", "#1f2937", "#0369a1", "#4d7c0f", "#c2410c", "#4338ca", "#0f766e", "#6b21a8"];

function loadDocs() {
  try { return JSON.parse(localStorage.getItem(STORE)) || starter; } catch { return starter; }
}
function command(name, value) { document.execCommand(name, false, value); }
function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  return `${Math.floor(minutes / 60)} jam lalu`;
}

export default function Studio({ onExit, user }) {
  const [docs, setDocs] = useState(loadDocs);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("article");
  const [saved, setSaved] = useState(true);
  const [sidebar, setSidebar] = useState(true);
  const [theme, setTheme] = useState("Editorial");
  const [toast, setToast] = useState("");
  const [naraOpen, setNaraOpen] = useState(false);
  const editor = useRef(null);
  const active = docs.find((d) => d.id === activeId);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "John";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(docs)); }, [docs]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2400); return () => clearTimeout(t); }, [toast]);
  const shown = useMemo(() => docs.filter((d) => d.type === kind && d.title.toLowerCase().includes(query.toLowerCase())), [docs, kind, query]);

  const patch = (values) => {
    setSaved(false);
    setDocs((all) => all.map((d) => d.id === activeId ? { ...d, ...values, updated: Date.now() } : d));
    clearTimeout(window.__ngebloggingSave);
    window.__ngebloggingSave = setTimeout(() => setSaved(true), 550);
  };
  const createDoc = (type = kind) => {
    const doc = { id: crypto.randomUUID(), type, title: type === "page" ? "Halaman tanpa judul" : "Artikel tanpa judul", slug: "tanpa-judul", status: "draft", updated: Date.now(), content: "<h1>Mulai menulis…</h1><p>Tuangkan ide Anda di sini.</p>" };
    setDocs((all) => [doc, ...all]); setActiveId(doc.id); setView("editor");
  };
  const openDoc = (id) => { setActiveId(id); setView("editor"); };
  const removeDoc = (id) => { setDocs((all) => all.filter((d) => d.id !== id)); setToast("Dokumen dipindahkan ke sampah"); };
  const publish = () => { patch({ status: active.status === "published" ? "draft" : "published" }); setToast(active.status === "published" ? "Dikembalikan menjadi draf" : "Artikel berhasil diterbitkan"); };

  if (view === "editor" && active) return <><Editor doc={active} saved={saved} patch={patch} onBack={() => setView("content")} publish={publish} editor={editor} toast={toast} setToast={setToast} onOpenNara={() => setNaraOpen(true)} /><NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "editor", documentTitle: active.title, documentContent: active.content.slice(0, 12000) }} /></>;

  return (
    <div className="studio-shell">
      {toast && <div className="studio-toast"><Check size={16}/>{toast}</div>}
      <aside className={sidebar ? "studio-side" : "studio-side collapsed"}>
        <div className="studio-logo">n<span>.</span><b>ngeblogging</b></div>
        <button className="new-doc" onClick={() => createDoc("article")}><Plus/> <span>Tulis baru</span></button>
        <nav>
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}><LayoutDashboard/><span>Ringkasan</span></button>
          <button className={view === "content" && kind === "article" ? "active" : ""} onClick={() => {setKind("article");setView("content")}}><FileText/><span>Artikel</span></button>
          <button className={view === "content" && kind === "page" ? "active" : ""} onClick={() => {setKind("page");setView("content")}}><BookOpen/><span>Halaman</span></button>
          <button onClick={() => setView("themes")} className={view === "themes" ? "active" : ""}><Palette/><span>Tampilan</span></button>
          <button onClick={() => setView("media")} className={view === "media" ? "active" : ""}><Image/><span>Media</span></button>
          <button onClick={() => setView("analytics")} className={view === "analytics" ? "active" : ""}><BarChart3/><span>Analitik</span></button><button onClick={() => setView("members")} className={view === "members" ? "active" : ""}><Users/><span>Anggota</span></button><button onClick={() => setView("domain")} className={view === "domain" ? "active" : ""}><Globe2/><span>Domain</span></button>
        </nav>
        <div className="side-bottom"><button onClick={() => setView("settings")} className={view === "settings" ? "active" : ""}><Settings/><span>Pengaturan</span></button><button onClick={onExit}><LogOut/><span>Keluar studio</span></button></div>
      </aside>
      <main className="studio-main">
        <header className="studio-top"><button className="icon-button" onClick={() => setSidebar(!sidebar)}><PanelLeftClose/></button><div className="workspace-switch"><span>NB</span><b>Ngeblogging Utama</b><ChevronDown/></div><div className="top-actions"><button><Search/></button><button className="nara-mini" onClick={() => setNaraOpen(true)}><Sparkles/> Tanya Nara</button><span className="avatar-lg" title={user?.email || displayName}>{initials}</span></div></header>
        {view === "home" && <Home docs={docs} createDoc={createDoc} openDoc={openDoc} displayName={displayName} onOpenNara={() => setNaraOpen(true)}/>} 
        {view === "content" && <Content docs={shown} kind={kind} query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc}/>} 
        {view === "themes" && <Themes active={theme} setActive={(x) => {setTheme(x);setToast(`Tema ${x} diaktifkan`)}}/>}
        {view === "media" && <Media setToast={setToast}/>} 
        {view === "analytics" && <Analytics/>}
        {view === "members" && <Members setToast={setToast}/>} 
        {view === "domain" && <Domain setToast={setToast}/>} 
        {view === "settings" && <SettingsView setToast={setToast}/>} 
      </main>
      <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "studio", documentCount: docs.length, documentTitles: docs.slice(0, 20).map((doc) => doc.title) }} />
    </div>
  );
}

function PageTitle({title, children, action}) { return <div className="content-title"><div><h1>{title}</h1><p>{children}</p></div>{action}</div> }
function Media({setToast}) { return <div className="studio-content"><PageTitle title="Pustaka media" action={<button className="blue-button" onClick={()=>setToast("Pemilih berkas siap—penyimpanan cloud aktif setelah Supabase Storage dipasang")}><Upload/> Unggah media</button>}>Kelola gambar, video, audio, dan dokumen situs Anda.</PageTitle><div className="upload-zone"><Upload/><h3>Tarik media ke sini</h3><p>Gambar akan dioptimalkan otomatis dan alt text dapat dibuat oleh Nara.</p><button onClick={()=>setToast("Hubungkan Supabase Storage untuk mengunggah media nyata")}>Pilih berkas</button></div><div className="info-grid"><article><Image/><b>Optimasi otomatis</b><p>WebP/AVIF, ukuran responsif, dan lazy loading.</p></article><article><Sparkles/><b>Alt text cerdas</b><p>Nara membantu aksesibilitas dan SEO gambar.</p></article><article><ShieldCheck/><b>Media aman</b><p>Hak akses dan pemindaian tipe berkas.</p></article></div></div> }
function Analytics() { return <div className="studio-content"><PageTitle title="Analitik">Pahami pertumbuhan tanpa mengorbankan privasi pembaca.</PageTitle><div className="metric-grid"><article><span>Pengunjung unik</span><b>12.840</b><em>+18,4%</em></article><article><span>Tampilan halaman</span><b>31.290</b><em>+12,1%</em></article><article><span>Rata-rata membaca</span><b>4m 18d</b><em>+32 detik</em></article><article><span>Konversi pelanggan</span><b>4,8%</b><em>Baik</em></article></div><section className="chart-card"><div className="panel-title"><h2>Performa 7 hari</h2><button>7 hari <ChevronDown/></button></div><div className="bars">{[38,52,45,72,62,88,79].map((x,i)=><span key={i} style={{height:`${x}%`}}><i>{x*42}</i></span>)}</div></section></div> }
function Members({setToast}) { const people=[['JH','John Harris','Pemilik'],['NA','Nara Assistant','AI editor']]; return <div className="studio-content"><PageTitle title="Anggota & tim" action={<button className="blue-button" onClick={()=>setToast("Undangan tim dibuat; pengiriman email aktif setelah penyedia email dipasang")}><Plus/> Undang anggota</button>}>Kelola peran, akses, dan alur persetujuan editorial.</PageTitle><div className="content-card member-list">{people.map(p=><div className="member" key={p[1]}><span>{p[0]}</span><div><b>{p[1]}</b><small>{p[1]==='Nara Assistant'?'Asisten ruang kerja':'john@ngeblogging.com'}</small></div><i>{p[2]}</i><button><MoreHorizontal/></button></div>)}</div><div className="info-grid"><article><ShieldCheck/><b>Peran terkontrol</b><p>Pemilik, admin, editor, penulis, dan kontributor.</p></article><article><Activity/><b>Jejak aktivitas</b><p>Setiap perubahan penting dapat diaudit.</p></article><article><MessageSquare/><b>Alur persetujuan</b><p>Review dan komentar sebelum publikasi.</p></article></div></div> }
function Domain({setToast}) { return <div className="studio-content"><PageTitle title="Domain & publikasi">Hubungkan identitas utama situs dan periksa kesiapan produksi.</PageTitle><div className="domain-card"><span className="domain-icon"><Globe2/></span><div><small>DOMAIN UTAMA</small><h2>ngeblogging.com</h2><p>Siap diarahkan ke Netlify setelah deployment preview lolos pengujian.</p></div><i>Menunggu DNS</i></div><div className="launch-list"><h2>Daftar kesiapan peluncuran</h2>{[['Build produksi','Siap'],['HTTPS otomatis','Saat deploy'],['Database Supabase','Perlu konfigurasi'],['OAuth Google & LinkedIn','Perlu kredensial'],['Nara Qwen','Perlu server inference']].map((x,i)=><div key={x[0]}><span className={i<2?'done':''}>{i<2?<Check/>:i+1}</span><b>{x[0]}</b><em>{x[1]}</em></div>)}<button className="blue-button" onClick={()=>setToast("Gunakan preview Netlify terlebih dahulu sebelum mengubah DNS domain")}>Panduan hubungkan Netlify</button></div></div> }
function SettingsView({setToast}) { return <div className="studio-content"><PageTitle title="Pengaturan situs">Atur identitas, bahasa, publikasi, dan keamanan.</PageTitle><div className="settings-card"><label>Nama situs<input defaultValue="Ngeblogging"/></label><label>Deskripsi<textarea defaultValue="Platform membangun, menulis, dan mengembangkan situs bersama Nara AI."/></label><div className="field-row"><label>Bahasa<select defaultValue="id"><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label><label>Zona waktu<select><option>Asia/Jakarta (WIB)</option></select></label></div><label className="toggle-row"><span><b>Konfirmasi publikasi AI</b><small>Nara tidak boleh menerbitkan atau menghapus tanpa izin.</small></span><input type="checkbox" defaultChecked/></label><button className="blue-button" onClick={()=>setToast("Pengaturan berhasil disimpan")}><Check/> Simpan perubahan</button></div></div> }
function Home({ docs, createDoc, openDoc, displayName, onOpenNara }) {
  const published = docs.filter((d) => d.status === "published").length;
  return <div className="studio-content"><div className="studio-heading"><div><small>SELAMAT DATANG KEMBALI</small><h1>Selamat datang, {displayName}.</h1><p>Lanjutkan ide terbaik Anda hari ini.</p></div><button className="blue-button" onClick={() => createDoc("article")}><PenLine/> Tulis artikel</button></div><div className="metric-grid"><article><span>Pengunjung bulan ini</span><b>12.840</b><em>+18,4%</em></article><article><span>Konten terbit</span><b>{published}</b><em>{docs.length - published} draf</em></article><article><span>Pelanggan</span><b>1.284</b><em>+76 bulan ini</em></article><article><span>Skor SEO</span><b>84</b><em>Baik</em></article></div><div className="home-grid"><section className="recent"><div className="panel-title"><h2>Konten terbaru</h2><button>Lihat semua</button></div>{docs.slice(0,4).map((d)=><button className="recent-row" onClick={() => openDoc(d.id)} key={d.id}><span className="doc-icon"><FileText/></span><span><b>{d.title}</b><small>{d.type === "page" ? "Halaman" : "Artikel"} · {relativeTime(d.updated)}</small></span><i className={d.status}>{d.status === "published" ? "Terbit" : "Draf"}</i><MoreHorizontal/></button>)}</section><section className="nara-panel"><span className="nara-orb"><Sparkles/></span><small>NARA AI</small><h2>Ada 3 peluang untuk situs Anda.</h2><p>Dua artikel lama bisa diperbarui dan satu topik sedang tumbuh di pencarian.</p><button onClick={onOpenNara}><Sparkles/> Lihat rekomendasi</button></section></div></div>;
}

function Content({ docs, kind, query, setQuery, createDoc, openDoc, removeDoc }) {
  const label = kind === "page" ? "Halaman" : "Artikel";
  return <div className="studio-content"><div className="content-title"><div><h1>{label}</h1><p>Kelola seluruh {label.toLowerCase()} dari satu tempat.</p></div><button className="blue-button" onClick={() => createDoc(kind)}><FilePlus2/> Buat {label.toLowerCase()}</button></div><div className="content-card"><div className="content-tools"><label><Search/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={`Cari ${label.toLowerCase()}…`}/></label><button>Semua status <ChevronDown/></button></div><div className="table-head"><span>Judul</span><span>Status</span><span>Diperbarui</span><span/></div>{docs.length === 0 && <div className="empty-state"><FileText/><h3>Belum ada hasil</h3><p>Buat dokumen pertama atau ubah pencarian Anda.</p></div>}{docs.map((d)=><div className="doc-row" key={d.id}><button className="doc-name" onClick={()=>openDoc(d.id)}><span><FileText/></span><div><b>{d.title}</b><small>/{d.slug}</small></div></button><i className={d.status}>{d.status === "published" ? "Terbit" : "Draf"}</i><time>{relativeTime(d.updated)}</time><button className="trash" title="Hapus" onClick={()=>removeDoc(d.id)}><Trash2/></button></div>)}</div></div>;
}

function Themes({ active, setActive }) { return <div className="studio-content"><div className="content-title"><div><h1>Tema situs</h1><p>12 desain profesional, responsif, dan siap dikustomisasi.</p></div></div><div className="theme-grid">{themes.map((name,i)=><article key={name} className={active===name?"selected":""}><div className="theme-preview" style={{"--theme":palette[i]}}><span/><div><b/><i/><i/><i/></div></div><div><span><b>{name}</b><small>{i%3===0?"Editorial & media":i%3===1?"Kreator & personal":"Bisnis & organisasi"}</small></span><button onClick={()=>setActive(name)}>{active===name?<><Check/> Aktif</>:"Gunakan"}</button></div></article>)}</div></div> }

function Editor({ doc, saved, patch, onBack, publish, editor, toast, onOpenNara }) {
  const format = (name, value) => { command(name,value); editor.current?.focus(); patch({content:editor.current.innerHTML}); };
  const insertTable = () => format("insertHTML", "<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th></tr><tr><td>Data</td><td>Data</td></tr></tbody></table><p><br></p>");
  return <div className="editor-app">{toast&&<div className="studio-toast"><Check size={16}/>{toast}</div>}<div className="editor-titlebar"><button className="back-button" onClick={onBack}><ArrowLeft/></button><div className="editor-file"><FileText/><label><input value={doc.title} onChange={(e)=>patch({title:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")})}/><small>{saved?"Tersimpan otomatis":"Menyimpan…"}</small></label></div><div className="editor-actions"><button>Pratinjau</button><button className="blue-button" onClick={publish}><Send/>{doc.status==="published"?"Jadikan draf":"Terbitkan"}</button></div></div><div className="editor-tabs"><b>Beranda</b><span>Sisipkan</span><span>Tata letak</span><span>Referensi</span><span>Tinjau</span><span>SEO</span></div><div className="editor-ribbon"><div><button onClick={()=>command("undo")}><Undo2/></button><button onClick={()=>command("redo")}><Redo2/></button></div><div><button onClick={()=>format("formatBlock","h1")}><Heading1/></button><button onClick={()=>format("formatBlock","h2")}><Heading2/></button></div><div><button onClick={()=>format("bold")}><Bold/></button><button onClick={()=>format("italic")}><Italic/></button><button onClick={()=>format("underline")}><Underline/></button></div><div><button onClick={()=>format("insertUnorderedList")}><List/></button><button onClick={insertTable}><Table2/></button><button onClick={()=>{const url=prompt("Alamat tautan");if(url)format("createLink",url)}}><Link/></button><button><Image/></button></div><button className="nara-ribbon" onClick={onOpenNara}><Sparkles/> Tulis dengan Nara</button></div><div className="editor-workspace"><article ref={editor} className="real-page" contentEditable suppressContentEditableWarning onInput={(e)=>patch({content:e.currentTarget.innerHTML})} dangerouslySetInnerHTML={{__html:doc.content}}/><aside><h3>Pengaturan dokumen</h3><label>Status <b className={doc.status}>{doc.status==="published"?"Terbit":"Draf"}</b></label><label>URL<input value={doc.slug} onChange={(e)=>patch({slug:e.target.value})}/></label><label>Visibilitas<select><option>Publik</option><option>Pribadi</option><option>Anggota</option></select></label><hr/><h3>Optimasi</h3><label>Skor SEO <b className="good">84/100</b></label><label>Keterbacaan <b className="good">Baik</b></label><div className="ai-tip"><Sparkles/><p>Tambahkan sumber terpercaya dan gambar dengan alt text.</p></div></aside></div></div>;
}
