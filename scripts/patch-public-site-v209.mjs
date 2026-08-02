import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/PublicSiteNext.jsx", import.meta.url);
const RELEASE = "public-site-single-render-v209-20260802";
const V218_ATOMIC = "PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218";
let source = await readFile(file, "utf8");

// v218 is a stricter continuation of the v209 single-render contract. Preserve
// the historical marker for regression compatibility without replacing the new
// atomic effect with the older textual implementation.
if (source.includes(V218_ATOMIC) && !source.includes("PUBLIC_SITE_SINGLE_RENDER_V209")) {
  const anchor = 'const PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218 = "public-site-atomic-bootstrap-v218-20260802";';
  if (!source.includes(anchor)) throw new Error("V218_PUBLIC_SITE_COMPAT_ANCHOR_MISSING");
  source = source.replace(
    anchor,
    `// PUBLIC_SITE_SINGLE_RENDER_V209 compatibility: superseded by the stricter v218 atomic bootstrap.\n${anchor}`,
  );
}

if (!source.includes("PUBLIC_SITE_SINGLE_RENDER_V209")) {
  const startMarker = "  useEffect(()=>{let active=true;setLoading(true);resolvePublishedSite(target).then(async(resolved)=>{";
  const endMarker = "},[target.slug,target.hostname,slug]);";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("V209_PUBLIC_SITE_EFFECT_ANCHOR_MISSING");
  const replacement = `  // PUBLIC_SITE_SINGLE_RENDER_V209: resolve the complete initial payload before
  // publishing site state. The theme iframe is therefore not mounted once empty
  // and then replaced again when Posts/Pages arrive.
  useEffect(()=>{let active=true;setLoading(true);setError("");
    (async()=>{
      const resolved=await resolvePublishedSite(target);
      if(!active)return;
      if(!resolved)throw new Error("Situs tidak ditemukan atau belum diluncurkan.");
      const [pageRows,postPage,item]=await Promise.all([
        listPublishedPages(resolved.id),
        listPublishedContent({siteId:resolved.id,kind:"article"}),
        slug?getPublishedContent(resolved.id,slug):Promise.resolve(null),
      ]);
      if(!active)return;
      if(slug&&!item)throw new Error("Post atau Page tidak ditemukan.");
      setPages(pageRows.sort((a,b)=>(a.metadata?.menuOrder||0)-(b.metadata?.menuOrder||0)||a.title.localeCompare(b.title)));
      setPosts(postPage.contents);
      setPageInfo({cursor:postPage.cursor,hasMore:postPage.hasMore});
      setContent(item||null);
      setSite(resolved);
    })().catch((loadError)=>{console.error("Public site load failed",loadError);if(active)setError(loadError.message||"Situs belum dapat dibuka.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[target.slug,target.hostname,slug]);`;
  source = `${source.slice(0,start)}${replacement}${source.slice(end+endMarker.length)}`;
}

if (!source.includes("PUBLIC_SITE_SINGLE_RENDER_V209")) throw new Error("V209_PUBLIC_SITE_SINGLE_RENDER_MISSING");
const effectStart = source.includes(V218_ATOMIC)
  ? source.indexOf(V218_ATOMIC)
  : source.indexOf("PUBLIC_SITE_SINGLE_RENDER_V209");
const postsIndex = source.indexOf("setPosts(postPage.contents)", effectStart);
const contentIndex = source.indexOf("setContent(item", effectStart);
const siteIndex = source.indexOf("setSite(resolved)", effectStart);
if (postsIndex < 0 || contentIndex < 0 || siteIndex < postsIndex || siteIndex < contentIndex) {
  throw new Error("V209_PUBLIC_SITE_STILL_PUBLISHES_SITE_TOO_EARLY");
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}${source.includes(V218_ATOMIC) ? " with v218 atomic compatibility" : ""}`);
