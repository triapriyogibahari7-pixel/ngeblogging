import React, { useEffect, useMemo, useState } from "react";
import {
  Archive, BarChart3, BookOpen, CheckCircle2, Clock3, Copy, Eye, FilePlus2,
  FileText, Filter, Globe2, Image, LoaderCircle, MessageCircle, MoreHorizontal,
  RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users,
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./studio-content-v161.css";

const RELEASE = "studio-content-workflow-v161-20260730";
const STATUS_OPTIONS = [
  ["all", "Semua status"],
  ["draft", "Draf"],
  ["review", "Review"],
  ["scheduled", "Terjadwal"],
  ["published", "Terbit"],
  ["archived", "Arsip"],
];

function countWords(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function relativeTime(value) {
  const date = typeof value === "number" ? value : new Date(value || 0).getTime();
  if (!Number.isFinite(date) || date <= 0) return "Belum diketahui";
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
  return `${Math.floor(minutes / 1440)} hari lalu`;
}

function statusLabel(status) {
  return {
    draft: "Draf",
    review: "Review",
    scheduled: "Terjadwal",
    published: "Terbit",
    archived: "Arsip",
  }[status] || status || "Draf";
}

function metricValue(value, fallback = "—") {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("id-ID") : fallback;
}

function queryCount(table, siteId, extra = (request) => request) {
  if (!supabase || !siteId) return Promise.resolve(null);
  return extra(supabase.from(table).select("*", { count: "exact", head: true }).eq("site_id", siteId))
    .then(({ count, error }) => {
      if (error) throw error;
      return Number(count || 0);
    });
}

function defaultSnapshot(docs) {
  const posts = docs.filter((doc) => doc.type !== "page").length;
  const pages = docs.filter((doc) => doc.type === "page").length;
  const published = docs.filter((doc) => doc.status === "published").length;
  const drafts = docs.filter((doc) => doc.status === "draft").length;
  return {
    posts,
    pages,
    published,
    drafts,
    media: null,
    comments: null,
    members: null,
    views: null,
    uniqueHumans: null,
  };
}

async function loadSnapshot(siteId, docs) {
  const fallback = defaultSnapshot(docs);
  if (!supabase || !siteId) return fallback;
  const tasks = {
    posts: queryCount("contents", siteId, (request) => request.eq("kind", "article")),
    pages: queryCount("contents", siteId, (request) => request.eq("kind", "page")),
    published: queryCount("contents", siteId, (request) => request.eq("status", "published")),
    drafts: queryCount("contents", siteId, (request) => request.eq("status", "draft")),
    media: queryCount("media_assets", siteId),
    members: queryCount("site_members", siteId),
    comments: supabase.rpc("get_site_comment_dashboard", { target_site: siteId })
      .then(({ data, error }) => {
        if (error) throw error;
        return Number(data?.counts?.total || 0);
      }),
    analytics: supabase.rpc("get_site_analytics_dashboard", { target_site: siteId, range_days: 30 })
      .then(({ data, error }) => {
        if (error) throw error;
        return {
          views: Number(data?.totals?.views || 0),
          uniqueHumans: Number(data?.totals?.uniqueHumans || 0),
        };
      }),
  };
  const entries = await Promise.all(Object.entries(tasks).map(async ([key, task]) => {
    try { return [key, await task]; }
    catch (error) {
      console.warn(`Ringkasan ${key} belum tersedia`, error);
      return [key, null];
    }
  }));
  const result = Object.fromEntries(entries);
  return {
    posts: result.posts ?? fallback.posts,
    pages: result.pages ?? fallback.pages,
    published: result.published ?? fallback.published,
    drafts: result.drafts ?? fallback.drafts,
    media: result.media,
    comments: result.comments,
    members: result.members,
    views: result.analytics?.views ?? null,
    uniqueHumans: result.analytics?.uniqueHumans ?? null,
  };
}

function Metric({ icon: Icon, label, value, help, unavailable = false }) {
  return <article className={`sc161-metric${unavailable ? " unavailable" : ""}`}>
    <span><Icon/></span>
    <div><small>{label}</small><b>{value}</b><p>{help}</p></div>
  </article>;
}

function EmptyPanel({ icon: Icon, title, body, action }) {
  return <div className="sc161-empty"><span><Icon/></span><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export function StudioSummaryV161({ docs, displayName, site, loading, createDoc, openDoc, openNara }) {
  const [snapshot, setSnapshot] = useState(() => defaultSnapshot(docs));
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError("");
    loadSnapshot(site?.id, docs).then((next) => {
      if (!cancelled) setSnapshot(next);
    }).catch((error) => {
      if (!cancelled) {
        setSnapshot(defaultSnapshot(docs));
        setSnapshotError(error.message || "Ringkasan operasional belum dapat dimuat.");
      }
    }).finally(() => {
      if (!cancelled) setSnapshotLoading(false);
    });
    return () => { cancelled = true; };
  }, [site?.id, docs.length, refreshToken]);

  const recent = useMemo(() => [...docs]
    .sort((a, b) => Number(b.updated || new Date(b.updatedAt || 0)) - Number(a.updated || new Date(a.updatedAt || 0)))
    .slice(0, 6), [docs]);
  const drafts = useMemo(() => recent.filter((doc) => ["draft", "review", "scheduled"].includes(doc.status)).slice(0, 4), [recent]);
  const seoReady = useMemo(() => {
    if (!docs.length) return { ready: 0, total: 0 };
    const ready = docs.filter((doc) => {
      const metadata = doc.metadata || {};
      return Boolean(doc.slug && doc.excerpt && metadata.focusKeyword && metadata.schemaType);
    }).length;
    return { ready, total: docs.length };
  }, [docs]);
  const publicUrl = site?.slug ? `https://${site.slug}.ngeblogging.com` : "";
  const siteStatus = site?.status === "active" ? "Publik" : site?.status ? statusLabel(site.status) : "Belum dipilih";
  const domainStatus = site?.custom_domain
    ? (site.custom_domain_status === "active" ? "Terverifikasi" : "Menunggu verifikasi")
    : (site?.slug ? "Subdomain aktif" : "Belum tersedia");

  return <div className="sn-view-pad sc161-summary" data-content-release={RELEASE}>
    <section className="sc161-hero">
      <div><small>RINGKASAN SITUS AKTIF</small><h1>{displayName}, ruang kerja Anda siap.</h1><p>{site?.name || "Situs belum dipilih"}{publicUrl ? ` · ${publicUrl}` : ""}</p><div className="sc161-status-line"><span><Globe2/> {siteStatus}</span><span><ShieldCheck/> {domainStatus}</span></div></div>
      <div className="sc161-hero-actions">
        {publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a>}
        <button onClick={() => createDoc("page")}><BookOpen/> Buat Page</button>
        <button className="sn-primary" onClick={() => createDoc("article")}><FilePlus2/> Buat Post</button>
        <button className="sc161-refresh" onClick={() => setRefreshToken((value) => value + 1)} disabled={snapshotLoading}><RefreshCw className={snapshotLoading ? "spin" : ""}/> Muat ulang</button>
      </div>
    </section>

    {snapshotError && <div className="sc161-alert" role="alert">{snapshotError}</div>}
    <section className="sc161-metrics" aria-busy={snapshotLoading}>
      <Metric icon={FileText} label="Posts" value={metricValue(snapshot.posts, "0")} help="Konten kronologis"/>
      <Metric icon={BookOpen} label="Pages" value={metricValue(snapshot.pages, "0")} help="Halaman tetap"/>
      <Metric icon={CheckCircle2} label="Terbit" value={metricValue(snapshot.published, "0")} help="Konten publik"/>
      <Metric icon={Clock3} label="Draf" value={metricValue(snapshot.drafts, "0")} help="Belum diterbitkan"/>
      <Metric icon={Image} label="Media" value={metricValue(snapshot.media)} unavailable={snapshot.media == null} help={snapshot.media == null ? "Data belum dapat dibaca" : "Berkas situs"}/>
      <Metric icon={MessageCircle} label="Komentar" value={metricValue(snapshot.comments)} unavailable={snapshot.comments == null} help={snapshot.comments == null ? "Dashboard belum tersedia" : "Diskusi diterima"}/>
      <Metric icon={Users} label="Anggota" value={metricValue(snapshot.members)} unavailable={snapshot.members == null} help={snapshot.members == null ? "Data belum dapat dibaca" : "Tim situs"}/>
      <Metric icon={BarChart3} label="Pageviews 30 hari" value={metricValue(snapshot.views)} unavailable={snapshot.views == null} help={snapshot.views == null ? "Event belum tersedia" : `${metricValue(snapshot.uniqueHumans, "0")} manusia unik`}/>
    </section>

    <div className="sc161-dashboard-grid">
      <section className="sc161-card sc161-recent">
        <header><div><small>AKTIVITAS KONTEN</small><h2>Konten terbaru</h2></div>{loading && <LoaderCircle className="spin"/>}</header>
        {recent.length ? recent.map((doc) => <button key={doc.id} onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title || "Tanpa judul"}</b><small>{doc.type === "page" ? "Page" : "Post"} · {relativeTime(doc.updated || doc.updatedAt)}</small></div><i className={doc.status}>{statusLabel(doc.status)}</i></button>) : !loading && <EmptyPanel icon={FileText} title="Belum ada konten" body="Buat Post atau Page pertama. Nilai ringkasan akan tetap nol sampai data nyata tersedia." action={<button className="sn-primary" onClick={() => createDoc("article")}>Buat Post pertama</button>}/>} 
      </section>

      <section className="sc161-card sc161-drafts">
        <header><div><small>PEKERJAAN TERTUNDA</small><h2>Draf dan jadwal</h2></div></header>
        {drafts.length ? drafts.map((doc) => <button key={doc.id} onClick={() => openDoc(doc.id)}><div><b>{doc.title || "Tanpa judul"}</b><small>{statusLabel(doc.status)} · {countWords(doc.content)} kata</small></div><Clock3/></button>) : <EmptyPanel icon={Archive} title="Tidak ada draf" body="Draf, konten review, dan publikasi terjadwal akan tampil di sini."/>}
      </section>

      <section className="sc161-card sc161-seo">
        <header><div><small>KESIAPAN PUBLIKASI</small><h2>Status SEO</h2></div></header>
        <div className="sc161-progress" role="progressbar" aria-valuemin="0" aria-valuemax={Math.max(1, seoReady.total)} aria-valuenow={seoReady.ready}><i style={{ width: `${seoReady.total ? Math.round(seoReady.ready / seoReady.total * 100) : 0}%` }}/></div>
        <b>{seoReady.ready} dari {seoReady.total} konten siap</b>
        <p>Dihitung dari slug, excerpt, focus keyword, dan schema pada konten yang sedang dimuat. Tidak menggunakan skor buatan.</p>
      </section>

      <aside className="sc161-nara"><Sparkles/><small>NARA AI</small><h2>Bantu menyelesaikan konten.</h2><p>Minta Nara meninjau judul, struktur, SEO, atau draf tanpa mengubah tulisan sebelum Anda menyetujuinya.</p><button onClick={openNara}>Buka Nara</button></aside>
    </div>
  </div>;
}

function categoriesFor(docs) {
  return [...new Set(docs.flatMap((doc) => doc.metadata?.categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
}

function authorsFor(docs) {
  return [...new Set(docs.map((doc) => doc.metadata?.authorName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
}

export function StudioContentListV161({ docs, type, query, setQuery, site, createDoc, openDoc, removeDoc, duplicateDoc, loading, hasMore, loadMore }) {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [author, setAuthor] = useState("all");
  const [sort, setSort] = useState("updated-desc");
  const [menuId, setMenuId] = useState("");
  const label = type === "page" ? "Pages" : "Posts";
  const single = type === "page" ? "Page" : "Post";
  const categories = useMemo(() => categoriesFor(docs), [docs]);
  const authors = useMemo(() => authorsFor(docs), [docs]);

  useEffect(() => {
    setStatus("all");
    setCategory("all");
    setAuthor("all");
    setMenuId("");
  }, [type]);

  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape" || !event.target.closest?.(".sc161-row-actions")) setMenuId("");
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const shown = useMemo(() => {
    const result = docs.filter((doc) => {
      if (doc.type !== type) return false;
      if (status !== "all" && doc.status !== status) return false;
      if (category !== "all" && !(doc.metadata?.categories || []).includes(category)) return false;
      if (author !== "all" && doc.metadata?.authorName !== author) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sort === "title-asc") return String(a.title || "").localeCompare(String(b.title || ""), "id");
      if (sort === "title-desc") return String(b.title || "").localeCompare(String(a.title || ""), "id");
      const left = new Date(a.updatedAt || a.updated || 0).getTime();
      const right = new Date(b.updatedAt || b.updated || 0).getTime();
      return sort === "updated-asc" ? left - right : right - left;
    });
    return result;
  }, [docs, type, status, category, author, sort]);

  const publicUrl = (doc) => site?.slug && doc.status === "published"
    ? `https://${site.slug}.ngeblogging.com/${doc.slug}`
    : "";

  return <div className="sn-view-pad sc161-content-page" data-content-release={RELEASE}>
    <header className="sn-page-title"><div><small>NGEBLOGGING STUDIO</small><h1>{label}</h1><p>{type === "page" ? "Kelola halaman tetap, template, navigasi, metadata, dan SEO dengan editor yang sama lengkapnya." : "Kelola tulisan kronologis, kategori, jadwal, lokasi, publikasi, dan SEO."}</p></div><button className="sn-primary" onClick={() => createDoc(type)}><FilePlus2/> Buat {single}</button></header>

    <section className="sn-content-card sc161-content-card">
      <div className="sc161-content-toolbar">
        <label className="sc161-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${label.toLowerCase()}…`}/></label>
        <label><Filter/><select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Semua kategori</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><select value={author} onChange={(event) => setAuthor(event.target.value)}><option value="all">Semua penulis</option>{authors.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated-desc">Terbaru diperbarui</option><option value="updated-asc">Terlama diperbarui</option><option value="title-asc">Judul A–Z</option><option value="title-desc">Judul Z–A</option></select></label>
        <span>{shown.length} dari {docs.filter((doc) => doc.type === type).length} hasil</span>
      </div>

      <div className="sc161-table-wrap">
        <div className="sc161-table" role="table" aria-label={`Daftar ${label}`}>
          <div className="sc161-table-head" role="row"><span>Judul</span><span>Penulis & kategori</span><span>Status</span><span>Diperbarui</span><span>Aksi</span></div>
          {shown.map((doc) => {
            const preview = publicUrl(doc);
            return <div className="sc161-doc-row" role="row" key={doc.id}>
              <button className="sc161-doc-title" onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title || "Tanpa judul"}</b><small>/{doc.slug} · {countWords(doc.content)} kata</small></div></button>
              <div className="sc161-taxonomy"><b>{doc.metadata?.authorName || "Penulis belum diatur"}</b><small>{(doc.metadata?.categories || []).join(", ") || "Tanpa kategori"}</small></div>
              <i className={`sc161-status ${doc.status}`}>{statusLabel(doc.status)}</i>
              <time dateTime={doc.updatedAt || ""}>{relativeTime(doc.updated || doc.updatedAt)}</time>
              <div className="sc161-row-actions">
                <button onClick={() => openDoc(doc.id)} aria-label={`Edit ${doc.title}`}><FileText/></button>
                {preview ? <a href={preview} target="_blank" rel="noreferrer" aria-label={`Preview ${doc.title}`}><Eye/></a> : <button disabled title="Terbitkan terlebih dahulu" aria-label="Preview belum tersedia"><Eye/></button>}
                <button onClick={(event) => { event.stopPropagation(); setMenuId((current) => current === doc.id ? "" : doc.id); }} aria-expanded={menuId === doc.id} aria-label={`Menu ${doc.title}`}><MoreHorizontal/></button>
                {menuId === doc.id && <div className="sc161-action-menu" role="menu">
                  <button role="menuitem" onClick={() => { setMenuId(""); duplicateDoc(doc.id); }}><Copy/> Duplikasi sebagai draf</button>
                  <button role="menuitem" onClick={() => { setMenuId(""); removeDoc(doc.id); }} className="danger"><Trash2/> Hapus</button>
                </div>}
              </div>
            </div>;
          })}
        </div>
      </div>

      {loading && <div className="sn-loading"><LoaderCircle className="spin"/> Memuat {label.toLowerCase()}…</div>}
      {!shown.length && !loading && <EmptyPanel icon={FileText} title={docs.some((doc) => doc.type === type) ? "Tidak ada hasil" : `Belum ada ${label}`} body={docs.some((doc) => doc.type === type) ? "Ubah pencarian atau filter untuk melihat konten lainnya." : `${single} pertama akan tersimpan sebagai draf dan dapat dilanjutkan kapan saja.`} action={<button className="sn-primary" onClick={() => createDoc(type)}>Buat {single} pertama</button>}/>} 
      {hasMore && !loading && <button className="sn-load-more" onClick={loadMore}>Muat konten berikutnya</button>}
    </section>
  </div>;
}

export { RELEASE as STUDIO_CONTENT_RELEASE_V161 };
