import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, LoaderCircle, MapPin, Menu, Search, Share2, Tags, X } from "lucide-react";
import { buildThemeSrcDoc, createDefaultThemeState, DEFAULT_THEME_CONFIG, getTheme } from "./theme-system";
import { createDefaultWidgetState } from "./widget-system";
import { getPublishedContent, listPublishedContent, listPublishedPages, resolvePublishedSite } from "./lib/public-data";
import "./public-site-next.css";

function formatDate(value, options = { dateStyle:"long" }) {
  if(!value)return "";
  try{return new Intl.DateTimeFormat("id-ID",options).format(new Date(value));}catch{return "";}
}

function sanitizePublishedHtml(html) {
  const parsed=new DOMParser().parseFromString(String(html||""),"text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,link,meta,base").forEach((node)=>node.remove());
  parsed.body.querySelectorAll("*").forEach((node)=>{
    [...node.attributes].forEach((attribute)=>{
      const name=attribute.name.toLowerCase(),value=attribute.value.trim().toLowerCase();
      if(name.startsWith("on")||name==="style"||name==="srcdoc"||((name==="href"||name==="src")&&value.startsWith("javascript:")))node.removeAttribute(attribute.name);
    });
    if(node.tagName==="A"){node.setAttribute("rel","noopener noreferrer");}
    if(node.tagName==="IMG"){node.setAttribute("loading","lazy");node.setAttribute("decoding","async");}
    if(node.tagName==="VIDEO"||node.tagName==="AUDIO"){node.setAttribute("preload","metadata");}
  });
  return parsed.body.innerHTML;
}

function homeCode(site,theme,posts,pages) {
  const custom=site.theme?.code?.enabled;
  if(custom)return site.theme.code;
  const base=theme.code || createDefaultThemeState().code;
  const payload=JSON.stringify({site:{name:site.name,description:site.description||"Gagasan, karya, dan cerita dalam satu ruang digital."},posts:posts.slice(0,6).map((post)=>({title:post.title,excerpt:post.excerpt||"Baca selengkapnya.",slug:post.slug,category:post.metadata?.categories?.[0]||"Post"})),pages:pages.slice(0,6).map((page)=>({title:page.title,slug:page.slug}))}).replace(/</g,"\\u003c");
  const injection=`\n(()=>{const data=${payload};const brand=document.querySelector('.ng-brand');if(brand){brand.textContent=data.site.name;const dot=document.createElement('i');dot.textContent='.';brand.append(dot)}const hero=document.querySelector('.ng-hero');const title=hero?.querySelector('h1');const description=hero?.querySelector('p');if(title)title.textContent=data.site.name;if(description)description.textContent=data.site.description;const nav=document.querySelector('.ng-header nav');if(nav){nav.replaceChildren();const home=document.createElement('a');home.href='/';home.target='_top';home.textContent='Beranda';nav.append(home);data.pages.slice(0,4).forEach((page)=>{const link=document.createElement('a');link.href='/'+page.slug;link.target='_top';link.textContent=page.title;nav.append(link)})}const cards=[...document.querySelectorAll('.ng-cards article')];cards.forEach((card,index)=>{const post=data.posts[index];if(!post){card.hidden=true;return}card.hidden=false;card.tabIndex=0;card.style.cursor='pointer';const small=card.querySelector('small');const heading=card.querySelector('h3');const copy=card.querySelector('p');if(small)small.textContent=post.category.toUpperCase();if(heading)heading.textContent=post.title;if(copy)copy.textContent=post.excerpt;const open=()=>{window.top.location.href='/'+post.slug};card.addEventListener('click',open);card.addEventListener('keydown',(event)=>{if(event.key==='Enter')open()})})})();`;
  return {...base,javascript:`${base.javascript||""}${injection}`};
}

function share(content) {
  const data={title:content.title,text:content.excerpt||content.title,url:window.location.href};
  if(navigator.share)return navigator.share(data).catch(()=>{});
  return navigator.clipboard?.writeText(window.location.href);
}

export default function PublicSiteNext({target}) {
  const [site,setSite]=useState(null),[posts,setPosts]=useState([]),[pages,setPages]=useState([]),[content,setContent]=useState(null),[pageInfo,setPageInfo]=useState({cursor:null,hasMore:false}),[loading,setLoading]=useState(true),[error,setError]=useState(""),[menu,setMenu]=useState(false),[search,setSearch]=useState("");
  const slug=useMemo(()=>decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[0]||""),[]);

  useEffect(()=>{let active=true;setLoading(true);resolvePublishedSite(target).then(async(resolved)=>{if(!active)return;if(!resolved)throw new Error("Situs tidak ditemukan atau belum diluncurkan.");setSite(resolved);const [pageRows,postPage]=await Promise.all([listPublishedPages(resolved.id),listPublishedContent({siteId:resolved.id,kind:"article"})]);if(!active)return;setPages(pageRows.sort((a,b)=>(a.metadata?.menuOrder||0)-(b.metadata?.menuOrder||0)||a.title.localeCompare(b.title)));setPosts(postPage.contents);setPageInfo({cursor:postPage.cursor,hasMore:postPage.hasMore});if(slug){const item=await getPublishedContent(resolved.id,slug);if(!item)throw new Error("Post atau Page tidak ditemukan.");if(active)setContent(item);}}).catch((loadError)=>{console.error("Public site load failed",loadError);if(active)setError(loadError.message||"Situs belum dapat dibuka.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[target.slug,target.hostname,slug]);

  const loadMore=async()=>{if(!site?.id||!pageInfo.cursor)return;setLoading(true);try{const page=await listPublishedContent({siteId:site.id,kind:"article",cursor:pageInfo.cursor});setPosts((current)=>[...current,...page.contents]);setPageInfo({cursor:page.cursor,hasMore:page.hasMore});}catch(loadError){setError(loadError.message||"Post berikutnya belum dapat dimuat.");}finally{setLoading(false);}};
  if(loading&&!site)return <div className="ps-state"><LoaderCircle className="spin"/><b>Menyiapkan situs…</b></div>;
  if(error&&!site)return <div className="ps-state error"><span>404</span><h1>Situs belum tersedia.</h1><p>{error}</p><a href="https://ngeblogging.com">Kembali ke Ngeblogging</a></div>;
  if(!site)return null;

  const theme=getTheme(site.theme?.active_theme_id),config={...DEFAULT_THEME_CONFIG,...site.theme?.published_config},widgets=site.theme?.widgets?.length?site.theme.widgets:createDefaultWidgetState(theme.defaultWidgetIds),style={"--ps-primary":config.primary,"--ps-accent":config.accent,"--ps-surface":config.surface,"--ps-ink":config.ink,"--ps-radius":`${config.radius||12}px`,"--ps-font":config.font==="Playfair Display"?'"Playfair Display",serif':'"DM Sans",sans-serif'};

  if(!content){const code=homeCode(site,theme,posts,pages);return <main className="ps-theme-home"><h1 className="ps-visually-hidden">{site.name}</h1><iframe title={site.name} sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation" srcDoc={buildThemeSrcDoc(code,config,widgets)}/><div className="ps-theme-tools"><a href="/feed.xml">RSS</a><a href="/sitemap.xml">Sitemap</a><a href="https://ngeblogging.com">Dibuat dengan Ngeblogging</a></div></main>;}

  const metadata=content.metadata||{},safeHtml=sanitizePublishedHtml(content.body_html),isPage=content.kind==="page",related=posts.filter((post)=>post.id!==content.id&&(!metadata.categories?.length||post.metadata?.categories?.some((category)=>metadata.categories.includes(category)))).slice(0,3);
  const filteredPosts=posts.filter((post)=>`${post.title} ${post.excerpt} ${(post.metadata?.tags||[]).join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  return <div className={`ps-site layout-${theme.layout} ${isPage?"is-page":"is-post"}`} style={style}><header className="ps-header"><a className="ps-brand" href="/">{site.name}<i>.</i></a><nav className={menu?"open":""}><a href="/">Beranda</a>{pages.slice(0,6).map((page)=><a key={page.id} href={`/${page.slug}`}>{page.title}</a>)}<a href="/#posts">Posts</a></nav><button onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?<X/>:<Menu/>}</button></header><main className="ps-content-shell"><article className="ps-content"><a className="ps-back" href="/"><ArrowLeft/> Kembali</a><div className="ps-kicker">{isPage?"PAGE":"POST"}{metadata.categories?.[0]?` · ${metadata.categories[0]}`:""}</div><h1>{content.title}</h1>{content.excerpt&&<p className="ps-lead">{content.excerpt}</p>}<div className="ps-meta">{metadata.showDate!==false&&content.published_at&&<span><CalendarDays/> {formatDate(content.published_at)}</span>}{!isPage&&<span><Clock3/> {Math.max(1,Math.ceil(String(content.body_html||"").replace(/<[^>]+>/g," ").split(/\s+/).filter(Boolean).length/220))} menit</span>}{metadata.locationName&&<span><MapPin/> {metadata.locationName}</span>} {metadata.showShare!==false&&<button onClick={()=>share(content)}><Share2/> Bagikan</button>}</div>{content.featured_image_path&&<img className="ps-featured" src={content.featured_image_path} alt={metadata.socialTitle||content.title}/>}<div className="ps-body" dangerouslySetInnerHTML={{__html:safeHtml}}/>{metadata.eventDate&&<section className="ps-event"><CalendarDays/><div><b>{formatDate(metadata.eventDate,{dateStyle:"full"})}{metadata.eventTime?` · ${metadata.eventTime}`:""}</b>{metadata.locationName&&<span>{metadata.locationName}</span>}{metadata.address&&<p>{metadata.address}</p>}</div></section>}{metadata.tags?.length>0&&<div className="ps-tags"><Tags/>{metadata.tags.map((tag)=><span key={tag}>#{tag}</span>)}</div>}{metadata.showAuthor!==false&&metadata.authorName&&<section className="ps-author"><span>{metadata.authorName.slice(0,2).toUpperCase()}</span><div><small>PENULIS</small><b>{metadata.authorName}</b>{metadata.authorUrl&&<a href={metadata.authorUrl} rel="author noopener">Lihat profil</a>}</div></section>}{!isPage&&related.length>0&&<section className="ps-related"><h2>Post terkait</h2><div>{related.map((post)=><article key={post.id}><small>{post.metadata?.categories?.[0]||"Post"}</small><h3><a href={`/${post.slug}`}>{post.title}</a></h3><p>{post.excerpt}</p></article>)}</div></section>}</article><aside className="ps-side"><label><Search/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Cari post…"/></label><section><h3>Post terbaru</h3>{filteredPosts.slice(0,6).map((post)=><a key={post.id} href={`/${post.slug}`}><b>{post.title}</b><small>{formatDate(post.published_at)}</small></a>)}</section><section><h3>Pages</h3>{pages.map((page)=><a key={page.id} href={`/${page.slug}`}>{page.title}</a>)}</section><section><h3>Discovery</h3><a href="/sitemap.xml">Sitemap XML</a><a href="/feed.xml">RSS Feed</a><a href="/llms.txt">LLMs.txt</a></section></aside></main><footer className="ps-footer"><b>{site.name}</b><span>© {new Date().getFullYear()}</span><a href="https://ngeblogging.com">Dibuat dengan Ngeblogging</a></footer></div>;
}
