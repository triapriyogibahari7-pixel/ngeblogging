import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, LoaderCircle, Menu, Search, X } from "lucide-react";
import { buildThemeSrcDoc, DEFAULT_THEME_CONFIG, getTheme } from "./theme-system";
import { getPublishedArticle, listPublishedContent, resolvePublishedSite } from "./lib/studio-data";
import "./public-site.css";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
}

function setMeta(selector, attribute, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

function sanitizePublishedHtml(html) {
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,link,meta").forEach((node) => node.remove());
  parsed.body.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "style" || ((name === "href" || name === "src") && value.startsWith("javascript:"))) {
        node.removeAttribute(attribute.name);
      }
    });
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  return parsed.body.innerHTML;
}

export default function PublicSite({ target }) {
  const [site, setSite] = useState(null);
  const [contents, setContents] = useState([]);
  const [article, setArticle] = useState(null);
  const [pageInfo, setPageInfo] = useState({ cursor: null, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const articleSlug = useMemo(() => {
    const part = window.location.pathname.split("/").filter(Boolean)[0] || "";
    return decodeURIComponent(part);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    resolvePublishedSite(target).then(async (resolved) => {
      if (!active) return;
      if (!resolved) throw new Error("Situs tidak ditemukan atau belum diluncurkan.");
      setSite(resolved);
      if (articleSlug) {
        const publishedArticle = await getPublishedArticle(resolved.id, articleSlug);
        if (!publishedArticle) throw new Error("Artikel tidak ditemukan.");
        if (active) setArticle(publishedArticle);
      } else {
        const page = await listPublishedContent({ siteId: resolved.id });
        if (active) {
          setContents(page.contents);
          setPageInfo({ cursor: page.cursor, hasMore: page.hasMore });
        }
      }
    }).catch((loadError) => {
      console.error("Published site load failed", loadError);
      if (active) setError(loadError.message || "Situs belum dapat dibuka.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [target.slug, target.hostname, articleSlug]);

  useEffect(() => {
    if (!site) return;
    const title = article ? article.title + " — " + site.name : site.name;
    const description = article?.excerpt || site.description || "Diterbitkan dengan Ngeblogging.";
    const canonical = window.location.href.split("?")[0].split("#")[0];
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('link[rel="canonical"]', "href", canonical);
  }, [site, article]);

  const loadMore = async () => {
    if (!site?.id || !pageInfo.cursor) return;
    setLoading(true);
    try {
      const page = await listPublishedContent({ siteId: site.id, cursor: pageInfo.cursor });
      setContents((current) => [...current, ...page.contents]);
      setPageInfo({ cursor: page.cursor, hasMore: page.hasMore });
    } catch (loadError) {
      setError(loadError.message || "Konten berikutnya belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !site) return <div className="public-state"><LoaderCircle className="spin"/><b>Menyiapkan situs…</b></div>;
  if (error && !site) return <div className="public-state error"><span>404</span><h1>Situs belum tersedia.</h1><p>{error}</p><a href="https://ngeblogging.com">Kembali ke Ngeblogging</a></div>;
  if (!site) return null;

  const theme = getTheme(site.theme?.active_theme_id);
  const config = { ...DEFAULT_THEME_CONFIG, ...site.theme?.published_config };
  const safeArticleHtml = article ? sanitizePublishedHtml(article.body_html) : "";
  const style = {
    "--site-primary": config.primary,
    "--site-accent": config.accent,
    "--site-surface": config.surface,
    "--site-ink": config.ink,
    "--site-radius": String(config.radius || 16) + "px",
    "--site-font": config.font === "Playfair Display" ? '"Playfair Display",serif' : '"DM Sans",sans-serif',
  };

  if (!article && site.theme?.code?.enabled) {
    return <main className="custom-published-site"><h1 className="visually-hidden">{site.name}</h1><iframe title={site.name} sandbox="allow-scripts allow-forms allow-popups" srcDoc={buildThemeSrcDoc(site.theme.code, config)}/><a className="powered-floating" href="https://ngeblogging.com">Dibuat dengan Ngeblogging</a></main>;
  }

  return <div className={"public-site layout-" + theme.layout + " blueprint-" + site.blueprint + " density-" + config.density} data-auto-dark={config.darkMode ? "true" : "false"} style={style}>
    {config.customCss && <style>{config.customCss}</style>}
    <header className="public-header">
      <a className="public-brand" href="/">{!config.brandName || config.brandName === "Ngeblogging Utama" ? site.name : config.brandName}<i>.</i></a>
      <nav className={menu ? "open" : ""}><a href="/">Beranda</a><a href="/#terbaru">Terbaru</a><a href="/#tentang">Tentang</a><a className="public-nav-cta" href="/#terbaru">Jelajahi</a></nav>
      <button className="public-menu" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X/> : <Menu/>}</button>
    </header>

    {article ? (
      <main className="public-article-shell">
        <a className="article-back" href="/"><ArrowLeft/> Kembali ke beranda</a>
        <article className="public-article">
          <span className="public-kicker">{site.blueprint} · {formatDate(article.published_at)}</span>
          <h1>{article.title}</h1>
          {article.excerpt && <p className="article-lead">{article.excerpt}</p>}
          <div className="article-meta"><Clock3/> Diterbitkan {formatDate(article.published_at)}</div>
          <div className="article-body" dangerouslySetInnerHTML={{__html: safeArticleHtml}}/>
        </article>
      </main>
    ) : (
      <main>
        <section className="public-hero">
          <div><span className="public-kicker">{site.blueprint} · Ngeblogging Original</span><h1>{site.name}</h1><p>{site.description || "Gagasan, karya, dan cerita dalam satu ruang digital."}</p><a href="#terbaru">Mulai membaca <ArrowRight/></a></div>
          <aside><span>EDISI TERBARU</span><b>{contents[0]?.title || "Ruang untuk ide yang layak dibagikan."}</b><small>{contents[0] ? formatDate(contents[0].published_at) : "Segera hadir"}</small></aside>
        </section>
        <section className="public-content-section" id="terbaru">
          <header><div><span>TERBITAN</span><h2>Cerita terbaru.</h2></div><Search/></header>
          {contents.length ? <div className="public-content-grid">{contents.map((content, index) => <article key={content.id} className={index === 0 ? "featured" : ""}><a className="content-cover" href={"/" + content.slug}><span>{String(index + 1).padStart(2, "0")}</span></a><div><small>{content.kind === "page" ? "HALAMAN" : "ARTIKEL"} · {formatDate(content.published_at)}</small><h3><a href={"/" + content.slug}>{content.title}</a></h3><p>{content.excerpt || "Baca tulisan selengkapnya dan temukan gagasan di dalamnya."}</p><a className="read-link" href={"/" + content.slug}>Baca selengkapnya <ArrowRight/></a></div></article>)}</div> : <div className="public-empty"><h3>Belum ada tulisan yang diterbitkan.</h3><p>Kunjungi kembali setelah penulis menerbitkan karya pertamanya.</p></div>}
          {pageInfo.hasMore && <button className="public-load-more" onClick={loadMore} disabled={loading}>{loading ? "Memuat…" : "Tampilkan lebih banyak"}</button>}
        </section>
        <section className="public-about" id="tentang"><span>TENTANG RUANG INI</span><h2>{site.name} dibangun untuk berbagi sesuatu yang berarti.</h2><p>{site.description}</p></section>
      </main>
    )}
    <footer className="public-footer"><b>{site.name}</b><span>© {new Date().getFullYear()}</span><a href="https://ngeblogging.com">Dibuat dengan Ngeblogging</a></footer>
  </div>;
}
