import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Globe2, Menu, Search, X } from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import "./public-site.css";

export default function PublicSite({ slug }) {
  const [site, setSite] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeContent, setActiveContent] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSite() {
      if (!supabaseConfigured || !supabase) {
        setError("Backend situs belum dikonfigurasi pada deployment ini.");
        setLoading(false);
        return;
      }

      try {
        const { data: siteRow, error: siteError } = await supabase
          .from("sites")
          .select("id,name,slug,description,theme,status,layout,logo_url,settings")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (siteError) throw siteError;
        if (!siteRow) {
          setError("Situs tidak ditemukan atau belum diterbitkan.");
          setLoading(false);
          return;
        }

        const { data: contentRows, error: contentsError } = await supabase
          .from("contents")
          .select("id,title,slug,excerpt,body_html,kind,published_at,updated_at")
          .eq("site_id", siteRow.id)
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false });

        if (contentsError) throw contentsError;
        if (cancelled) return;

        setSite(siteRow);
        setContents(contentRows || []);
        const pathSlug = window.location.pathname.split("/").filter(Boolean)[0];
        if (pathSlug) {
          setActiveContent((contentRows || []).find((item) => item.slug === pathSlug) || null);
        }
      } catch (loadError) {
        console.error("Gagal memuat situs publik", loadError);
        if (!cancelled) setError("Situs belum dapat dimuat. Periksa konfigurasi database dan domain.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSite();
    return () => { cancelled = true; };
  }, [slug]);

  const accent = site?.settings?.accent || "#3157d5";
  const featured = useMemo(() => contents[0], [contents]);
  const rest = useMemo(() => contents.slice(1), [contents]);

  const openContent = (content) => {
    window.history.pushState({}, "", `/${content.slug}`);
    setActiveContent(content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onPopState = () => {
      const pathSlug = window.location.pathname.split("/").filter(Boolean)[0];
      setActiveContent(pathSlug ? contents.find((item) => item.slug === pathSlug) || null : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [contents]);

  if (loading) {
    return <div className="nbs-loading"><span /><p>Memuat situs…</p></div>;
  }

  if (error || !site) {
    return (
      <main className="nbs-error">
        <span><Globe2 /></span>
        <small>{slug}.ngeblogging.com</small>
        <h1>Situs belum tersedia</h1>
        <p>{error}</p>
        <a href="https://ngeblogging.com">Kembali ke Ngeblogging <ArrowRight /></a>
      </main>
    );
  }

  if (activeContent) {
    return (
      <div className={`nbs-site nbs-layout-${site.layout || "editorial"}`} style={{ "--site-accent": accent }}>
        <SiteHeader site={site} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onHome={() => { window.history.pushState({}, "", "/"); setActiveContent(null); }} />
        <article className="nbs-article">
          <header><button onClick={() => { window.history.pushState({}, "", "/"); setActiveContent(null); }}>← Semua tulisan</button><small>{activeContent.kind === "page" ? "HALAMAN" : "ARTIKEL"}</small><h1>{activeContent.title}</h1><p>{formatDate(activeContent.published_at || activeContent.updated_at)}</p></header>
          <div dangerouslySetInnerHTML={{ __html: activeContent.body_html }} />
        </article>
        <SiteFooter site={site} />
      </div>
    );
  }

  return (
    <div className={`nbs-site nbs-layout-${site.layout || "editorial"}`} style={{ "--site-accent": accent }}>
      <SiteHeader site={site} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onHome={() => undefined} />
      <main>
        <section className="nbs-hero">
          <div><small>DITERBITKAN DI NGEBLOGGING</small><h1>{site.name}</h1><p>{site.description || "Ide, cerita, dan karya terbaik dari ruang digital ini."}</p><a href="#terbaru">Jelajahi tulisan <ArrowRight /></a></div>
          <aside><span>{site.name.slice(0, 2).toUpperCase()}</span><i /><i /><i /></aside>
        </section>

        <section id="terbaru" className="nbs-content-section">
          <div className="nbs-section-title"><div><small>TERBARU</small><h2>Tulisan pilihan</h2></div><button><Search />Cari</button></div>
          {contents.length === 0 && <div className="nbs-empty"><FileText /><h3>Belum ada konten terbit</h3><p>Pemilik situs sedang menyiapkan tulisan pertamanya.</p></div>}
          {featured && (
            <button className="nbs-featured" onClick={() => openContent(featured)}>
              <span>{formatDate(featured.published_at || featured.updated_at)}</span><h3>{featured.title}</h3><p>{featured.excerpt || stripHtml(featured.body_html).slice(0, 180)}</p><b>Baca selengkapnya <ArrowRight /></b>
            </button>
          )}
          <div className="nbs-grid">{rest.map((content) => <button key={content.id} onClick={() => openContent(content)}><small>{content.kind === "page" ? "HALAMAN" : formatDate(content.published_at || content.updated_at)}</small><h3>{content.title}</h3><p>{content.excerpt || stripHtml(content.body_html).slice(0, 125)}</p><span>Baca <ArrowRight /></span></button>)}</div>
        </section>
      </main>
      <SiteFooter site={site} />
    </div>
  );
}

function SiteHeader({ site, menuOpen, setMenuOpen, onHome }) {
  return (
    <header className="nbs-header">
      <button className="nbs-brand" onClick={onHome}>{site.logo_url ? <img src={site.logo_url} alt={site.name} /> : <span>{site.name.slice(0, 2).toUpperCase()}</span>}<b>{site.name}</b></button>
      <nav className={menuOpen ? "open" : ""}><button onClick={onHome}>Beranda</button><a href="#terbaru">Tulisan</a><a href="https://ngeblogging.com">Buat situs gratis</a></nav>
      <button className="nbs-menu" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
    </header>
  );
}

function SiteFooter({ site }) {
  return <footer className="nbs-footer"><div><b>{site.name}</b><p>{site.description}</p></div><span>Dibuat gratis dengan <a href="https://ngeblogging.com">Ngeblogging</a></span></footer>;
}

function stripHtml(html = "") {
  return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value) {
  if (!value) return "Baru diterbitkan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
