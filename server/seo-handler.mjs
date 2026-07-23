const SYSTEM_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com", "studio.ngeblogging.com", "api.ngeblogging.com"]);

function config(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function apiHeaders(env) {
  const { key } = config(env);
  return { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" };
}

function tenantSlug(hostname) {
  const host = String(hostname || "").toLowerCase().split(":")[0];
  if (!host.endsWith(".ngeblogging.com") || SYSTEM_HOSTS.has(host)) return "";
  return host.slice(0, -".ngeblogging.com".length);
}

async function rest(env, path) {
  const { url, key } = config(env);
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, { headers: apiHeaders(env) });
  if (!response.ok) return null;
  return response.json();
}

export async function resolveSeoSite(hostname, env) {
  const slug = tenantSlug(hostname);
  if (slug) {
    const rows = await rest(env, `sites?select=id,name,slug,description,locale,timezone,blueprint,published_at,updated_at&slug=eq.${encodeURIComponent(slug)}&status=eq.active&is_public=eq.true&limit=1`);
    return rows?.[0] || null;
  }
  if (SYSTEM_HOSTS.has(String(hostname).toLowerCase())) return null;
  const domains = await rest(env, `site_domains?select=site_id&hostname=eq.${encodeURIComponent(String(hostname).toLowerCase())}&status=eq.active&limit=1`);
  if (!domains?.[0]?.site_id) return null;
  const sites = await rest(env, `sites?select=id,name,slug,description,locale,timezone,blueprint,published_at,updated_at&id=eq.${domains[0].site_id}&status=eq.active&is_public=eq.true&limit=1`);
  return sites?.[0] || null;
}

async function publishedContent(siteId, env, limit = 1000) {
  return await rest(env, `contents?select=id,kind,title,slug,excerpt,metadata,seo,featured_image_path,published_at,updated_at&site_id=eq.${siteId}&status=eq.published&visibility=eq.public&order=published_at.desc&limit=${Math.min(5000, limit)}`) || [];
}

async function contentBySlug(siteId, slug, env) {
  const rows = await rest(env, `contents?select=id,kind,title,slug,excerpt,body_html,metadata,seo,featured_image_path,published_at,updated_at&site_id=eq.${siteId}&slug=eq.${encodeURIComponent(slug)}&status=eq.published&visibility=eq.public&limit=1`);
  return rows?.[0] || null;
}

function escapeXml(value) {
  return String(value || "").replace(/[<>&"']/g, (character) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&apos;" }[character]));
}

function escapeHtml(value) {
  return String(value || "").replace(/[<>&"']/g, (character) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&#39;" }[character]));
}

function absolute(base, value) {
  if (!value) return "";
  try { return new URL(value, base).href; } catch { return ""; }
}

function response(body, contentType, status = 200, cache = "public, max-age=300, s-maxage=900") {
  return new Response(body, { status, headers: { "content-type": contentType, "cache-control": cache, "x-content-type-options":"nosniff" } });
}

export async function seoEndpoint(request, env) {
  const url = new URL(request.url);
  const site = await resolveSeoSite(url.hostname, env);
  if (!site) return null;
  const base = `${url.protocol}//${url.host}`;

  if (url.pathname === "/robots.txt") {
    return response(`User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/sitemap-posts.xml\n`, "text/plain; charset=utf-8");
  }

  if (url.pathname === "/sitemap.xml" || url.pathname === "/sitemap-posts.xml") {
    const items = await publishedContent(site.id, env, 5000);
    const filtered = url.pathname === "/sitemap-posts.xml" ? items.filter((item) => item.kind !== "page") : items;
    const urls = [{ loc:`${base}/`, lastmod:site.updated_at || site.published_at }, ...filtered.map((item) => ({ loc:`${base}/${encodeURIComponent(item.slug)}`, lastmod:item.updated_at || item.published_at, image:absolute(base,item.metadata?.socialImage || item.featured_image_path) }))];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.map((item) => `<url><loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `<lastmod>${escapeXml(new Date(item.lastmod).toISOString())}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>${item.loc===`${base}/`?"1.0":"0.8"}</priority>${item.image ? `<image:image><image:loc>${escapeXml(item.image)}</image:loc></image:image>` : ""}</url>`).join("")}</urlset>`;
    return response(xml, "application/xml; charset=utf-8");
  }

  if (["/feed.xml","/rss.xml","/atom.xml"].includes(url.pathname)) {
    const items = (await publishedContent(site.id, env, 100)).filter((item) => item.kind !== "page");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(site.name)}</title><link>${escapeXml(base)}</link><description>${escapeXml(site.description || site.name)}</description><language>${escapeXml(site.locale || "id-ID")}</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map((item) => `<item><guid isPermaLink="true">${escapeXml(`${base}/${item.slug}`)}</guid><title>${escapeXml(item.title)}</title><link>${escapeXml(`${base}/${item.slug}`)}</link><description>${escapeXml(item.excerpt || "")}</description>${item.published_at ? `<pubDate>${new Date(item.published_at).toUTCString()}</pubDate>` : ""}</item>`).join("")}</channel></rss>`;
    return response(xml, "application/rss+xml; charset=utf-8");
  }

  if (url.pathname === "/llms.txt") {
    const items = await publishedContent(site.id, env, 100);
    const body = `# ${site.name}\n\n> ${site.description || "Situs publik yang diterbitkan dengan Ngeblogging."}\n\nCanonical: ${base}/\nLanguage: ${site.locale || "id-ID"}\nSitemap: ${base}/sitemap.xml\nFeed: ${base}/feed.xml\n\n## Public content\n${items.map((item) => `- [${item.title}](${base}/${item.slug}): ${item.excerpt || item.kind}`).join("\n")}\n`;
    return response(body, "text/plain; charset=utf-8");
  }

  if (url.pathname === "/manifest.webmanifest") {
    return response(JSON.stringify({ name:site.name, short_name:site.name.slice(0,30), description:site.description, start_url:"/", display:"standalone", background_color:"#ffffff", theme_color:"#2869df", lang:site.locale || "id-ID", icons:[] }), "application/manifest+json; charset=utf-8");
  }

  return null;
}

function replaceMeta(html, selectorPattern, replacement) {
  return selectorPattern.test(html) ? html.replace(selectorPattern, replacement) : html.replace("</head>", `${replacement}</head>`);
}

export async function injectTenantSeo(request, assetResponse, env) {
  const contentType = assetResponse.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return assetResponse;
  const url = new URL(request.url);
  const site = await resolveSeoSite(url.hostname, env);
  if (!site) return assetResponse;
  const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] || "");
  const content = slug ? await contentBySlug(site.id, slug, env) : null;
  const metadata = content?.metadata || {};
  const seo = content?.seo || {};
  const title = content ? `${content.title} — ${site.name}` : site.name;
  const description = content?.excerpt || site.description || `Situs ${site.name} diterbitkan dengan Ngeblogging.`;
  const canonical = metadata.canonicalUrl || `${url.protocol}//${url.host}${content ? `/${content.slug}` : "/"}`;
  const image = absolute(canonical, metadata.socialImage || content?.featured_image_path || "");
  const robots = `${seo.index === false ? "noindex" : "index"},${seo.follow === false ? "nofollow" : "follow"},max-image-preview:${seo.maxImagePreview || "large"},max-snippet:${Number.isFinite(seo.maxSnippet) ? seo.maxSnippet : -1},max-video-preview:${Number.isFinite(seo.maxVideoPreview) ? seo.maxVideoPreview : -1}${seo.noarchive ? ",noarchive" : ""}${seo.nosnippet ? ",nosnippet" : ""}`;
  const schemaType = metadata.schemaType || (content?.kind === "page" ? "WebPage" : "BlogPosting");
  const structured = {
    "@context":"https://schema.org",
    "@type":schemaType,
    name:title,
    headline:content?.title || site.name,
    description,
    url:canonical,
    inLanguage:metadata.language || site.locale || "id-ID",
    ...(image ? { image:[image] } : {}),
    ...(content?.published_at ? { datePublished:content.published_at } : {}),
    ...(content?.updated_at ? { dateModified:content.updated_at } : {}),
    ...(metadata.authorName ? { author:{ "@type":"Person", name:metadata.authorName, ...(metadata.authorUrl ? { url:metadata.authorUrl } : {}) } } : {}),
    isPartOf:{ "@type":"WebSite", name:site.name, url:`${url.protocol}//${url.host}/` },
  };
  let html = await assetResponse.text();
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, /<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = replaceMeta(html, /<meta name="robots"[^>]*>/i, `<meta name="robots" content="${escapeHtml(robots)}">`);
  html = replaceMeta(html, /<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(metadata.socialTitle || title)}">`);
  html = replaceMeta(html, /<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(metadata.socialDescription || description)}">`);
  html = replaceMeta(html, /<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}">`);
  html = replaceMeta(html, /<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="${content && content.kind !== "page" ? "article" : "website"}">`);
  if (image) html = replaceMeta(html, /<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(image)}">`);
  html = replaceMeta(html, /<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}">`);
  html = html.replace("</head>", `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.name)} Feed" href="/feed.xml"><link rel="manifest" href="/manifest.webmanifest"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,"\\u003c")}</script></head>`);
  const headers = new Headers(assetResponse.headers);
  headers.set("cache-control", content ? "public, max-age=60, s-maxage=300" : "public, max-age=120, s-maxage=600");
  headers.set("vary", "Accept-Encoding");
  return new Response(html, { status:assetResponse.status, headers });
}
