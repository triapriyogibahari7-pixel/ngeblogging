import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, LoaderCircle, MapPin, Menu, Search, Share2, Tags, X } from "lucide-react";
import { buildThemeSrcDoc, createDefaultThemeState, DEFAULT_THEME_CONFIG, getTheme } from "./theme-system";
import { createDefaultWidgetState } from "./widget-system";
import { getPublishedContent, listPublishedContent, listPublishedPages, resolvePublishedSite } from "./lib/public-data";
import "./public-site-next.css";

const PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218 = "public-site-atomic-bootstrap-v218-20260802";

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
  const base=custom?site.theme.code:(theme.code||createDefaultThemeState().code);
  const normalizedPosts=posts.slice(0,12).map((post)=>({
    title:post.title,
    excerpt:post.excerpt||"Baca selengkapnya.",
    slug:post.slug,
    category:post.metadata?.categories?.[0]||"Post",
    categories:post.metadata?.categories||[],
    tags:post.metadata?.tags||[],
  }));
  const categories=[...new Set(normalizedPosts.flatMap((post)=>post.categories).filter(Boolean))].slice(0,12);
  const tags=[...new Set(normalizedPosts.flatMap((post)=>post.tags).filter(Boolean))].slice(0,20);
  const payload=JSON.stringify({
    site:{name:site.name,description:site.description||"Gagasan, karya, dan cerita dalam satu ruang digital."},
    posts:normalizedPosts,
    pages:pages.slice(0,6).map((page)=>({title:page.title,slug:page.slug})),
    categories,
    tags,
  }).replace(/</g,"\\u003c");
  const injection=`
(()=>{
  const data=${payload};
  const escapeText=(value)=>String(value||'');
  const linkTo=(slug)=>'/'+encodeURIComponent(slug);
  document.title=data.site.name;
  const brand=document.querySelector('.ng-brand');
  if(brand){brand.textContent=data.site.name;const dot=document.createElement('i');dot.textContent='.';brand.append(dot)}
  const hero=document.querySelector('.ng-hero');
  const title=hero?.querySelector('h1');
  const description=hero?.querySelector('p');
  if(title)title.textContent=data.site.name;
  if(description)description.textContent=data.site.description;
  const footerBrand=document.querySelector('.ng-theme>footer>b');
  if(footerBrand)footerBrand.textContent=data.site.name;
  const nav=document.querySelector('.ng-header nav');
  if(nav){
    nav.replaceChildren();
    const home=document.createElement('a');home.href='/';home.target='_top';home.textContent='Beranda';nav.append(home);
    data.pages.slice(0,4).forEach((page)=>{const link=document.createElement('a');link.href=linkTo(page.slug);link.target='_top';link.textContent=page.title;nav.append(link)});
  }
  const cards=[...document.querySelectorAll('.ng-cards article')];
  const renderCards=(query='',category='')=>{
    const normalizedQuery=String(query||'').trim().toLowerCase();
    cards.forEach((card,index)=>{
      const post=data.posts[index];
      if(!post){card.hidden=true;return}
      const haystack=(post.title+' '+post.excerpt+' '+post.categories.join(' ')+' '+post.tags.join(' ')).toLowerCase();
      const matchesQuery=!normalizedQuery||haystack.includes(normalizedQuery);
      const matchesCategory=!category||post.categories.includes(category);
      card.hidden=!(matchesQuery&&matchesCategory);
      card.dataset.search=haystack;
      card.dataset.category=post.category;
      card.tabIndex=0;
      card.style.cursor='pointer';
      const small=card.querySelector('small');
      const heading=card.querySelector('h3');
      const copy=card.querySelector('p');
      if(small)small.textContent=escapeText(post.category).toUpperCase();
      if(heading)heading.textContent=post.title;
      if(copy)copy.textContent=post.excerpt;
      if(!card.dataset.bound){
        const open=()=>{window.top.location.href=linkTo(post.slug)};
        card.addEventListener('click',open);
        card.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
        card.dataset.bound='true';
      }
    });
  };
  renderCards();
  const populatePostList=(selector,items)=>{
    const list=document.querySelector(selector);
    if(!list)return;
    list.replaceChildren();
    items.slice(0,6).forEach((post,index)=>{
      const item=document.createElement('li');
      const link=document.createElement('a');
      link.href=linkTo(post.slug);link.target='_top';link.textContent=(selector.includes('popular')?String(index+1).padStart(2,'0')+' · ':'')+post.title;
      item.append(link);list.append(item);
    });
    list.closest('.ng-widget').hidden=!items.length;
  };
  populatePostList('.ng-widget-recent-posts ol',data.posts);
  populatePostList('.ng-widget-popular-posts ol',data.posts.slice().reverse());
  const categoryNav=document.querySelector('.ng-widget-categories nav');
  if(categoryNav){
    categoryNav.replaceChildren();
    data.categories.forEach((category)=>{
      const link=document.createElement('a');link.href='#posts';link.textContent=category;
      link.addEventListener('click',(event)=>{event.preventDefault();renderCards('',category);document.querySelector('.ng-cards')?.scrollIntoView({behavior:'smooth',block:'start'})});
      categoryNav.append(link);
    });
    categoryNav.closest('.ng-widget').hidden=!data.categories.length;
  }
  const tagBox=document.querySelector('.ng-widget-tags>div');
  if(tagBox){tagBox.replaceChildren();data.tags.forEach((tag)=>{const span=document.createElement('span');span.textContent='#'+tag;tagBox.append(span)});tagBox.closest('.ng-widget').hidden=!data.tags.length}
  const searchForm=document.querySelector('.ng-widget-search form');
  if(searchForm){
    const input=searchForm.querySelector('input');
    searchForm.addEventListener('submit',(event)=>{event.preventDefault();renderCards(input?.value||'');document.querySelector('.ng-cards')?.scrollIntoView({behavior:'smooth',block:'start'})});
    input?.addEventListener('input',()=>renderCards(input.value||''));
  }
  const supported=new Set(['search','recent-posts','popular-posts','categories','tags']);
  document.querySelectorAll('.ng-widget').forEach((widget)=>{
    const match=[...widget.classList].find((name)=>name.startsWith('ng-widget-')&&name!=='ng-widget-area');
    const id=match?.slice('ng-widget-'.length);
    if(id&&!supported.has(id))widget.hidden=true;
  });
})();`;
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

  useEffect(()=>{
    let active=true;
    setLoading(true);
    setError("");
    setSite(null);
    setContent(null);
    setPosts([]);
    setPages([]);
    setPageInfo({cursor:null,hasMore:false});

    resolvePublishedSite(target).then(async(resolved)=>{
      if(!active)return;
      if(!resolved)throw new Error("Situs tidak ditemukan atau belum diluncurkan.");

      const [pageRows,postPage,item]=await Promise.all([
        listPublishedPages(resolved.id),
        listPublishedContent({siteId:resolved.id,kind:"article"}),
        slug?getPublishedContent(resolved.id,slug):Promise.resolve(null),
      ]);
      if(!active)return;
      if(slug&&!item)throw new Error("Post atau Page tidak ditemukan.");

      const orderedPages=pageRows.sort((a,b)=>(a.metadata?.menuOrder||0)-(b.metadata?.menuOrder||0)||a.title.localeCompare(b.title));
      setPages(orderedPages);
      setPosts(postPage.contents);
      setPageInfo({cursor:postPage.cursor,hasMore:postPage.hasMore});
      setContent(item);
      // PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218: publish site LAST so the theme iframe
      // is created once with final pages/posts/content instead of reloading srcDoc.
      setSite(resolved);
      if(typeof document!=="undefined")document.documentElement.dataset.publicSiteBootstrap=PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218;
    }).catch((loadError)=>{
      console.error("Public site load failed",loadError);
      if(active)setError(loadError.message||"Situs belum dapat dibuka.");
    }).finally(()=>{if(active)setLoading(false);});

    return()=>{active=false};
  },[target.slug,target.hostname,slug]);

  const loadMore=async()=>{if(!site?.id||!pageInfo.cursor)return;setLoading(true);try{const page=await listPublishedContent({siteId:site.id,kind:"article",cursor:pageInfo.cursor});setPosts((current)=>[...current,...page.contents]);setPageInfo({cursor:page.cursor,hasMore:page.hasMore});}catch(loadError){setError(loadError.message||"Post berikutnya belum dapat dimuat.");}finally{setLoading(false);}};
  if(loading&&!site)return <div className="ps-state"><LoaderCircle className="spin"/><b>Menyiapkan situs…</b></div>;
  if(error&&!site)return <div className="ps-state error"><span>404</span><h1>Situs belum tersedia.</h1><p>{error}</p><a href="https://ngeblogging.com">Kembali ke Ngeblogging</a></div>;
  if(!site)return null;

  const theme=getTheme(site.theme?.active_theme_id),config={...DEFAULT_THEME_CONFIG,...site.theme?.published_config},widgets=site.theme?.widgets?.length?site.theme.widgets:createDefaultWidgetState(theme.defaultWidgetIds),style={"--ps-primary":config.primary,"--ps-accent":config.accent,"--ps-surface":config.surface,"--ps-ink":config.ink,"--ps-radius":`${config.radius||12}px`,"--ps-font":config.font==="Playfair Display"?'"Playfair Display",serif':'"DM Sans",sans-serif'};

  if(!content){const code=homeCode(site,theme,posts,pages);return <main className="ps-theme-home"><h1 className="ps-visually-hidden">{site.name}</h1><iframe title={site.name} sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation" srcDoc={buildThemeSrcDoc(code,config,widgets)}/></main>;}

  const metadata=content.metadata||{},safeHtml=sanitizePublishedHtml(content.body_html),isPage=content.kind==="page",related=posts.filter((post)=>post.id!==content.id&&(!metadata.categories?.length||post.metadata?.categories?.some((category)=>metadata.categories.includes(category)))).slice(0,3);
  const filteredPosts=posts.filter((post)=>`${post.title} ${post.excerpt} ${(post.metadata?.tags||[]).join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  return <div className={`ps-site layout-${theme.layout} ${isPage?"is-page":"is-post"}`} style={style}><header className="ps-header"><a className="ps-brand" href="/">{site.name}<i>.</i></a><nav className={menu?"open":""}><a href="/">Beranda</a>{pages.slice(0,6).map((page)=><a key={page.id} href={`/${page.slug}`}>{page.title}</a>)}<a href="/#posts">Posts</a></nav><button onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?<X/>:<Menu/>}</button></header><main className="ps-content-shell"><article className="ps-content"><a className="ps-back" href="/"><ArrowLeft/> Kembali</a><div className="ps-kicker">{isPage?"PAGE":"POST"}{metadata.categories?.[0]?` · ${metadata.categories[0]}`:""}</div><h1>{content.title}</h1>{content.excerpt&&<p className="ps-lead">{content.excerpt}</p>}<div className="ps-meta">{metadata.showDate!==false&&content.published_at&&<span><CalendarDays/> {formatDate(content.published_at)}</span>}{!isPage&&<span><Clock3/> {Math.max(1,Math.ceil(String(content.body_html||"").replace(/<[^>]+>/g," ").split(/\s+/).filter(Boolean).length/220))} menit</span>}{metadata.locationName&&<span><MapPin/> {metadata.locationName}</span>} {metadata.showShare!==false&&<button onClick={()=>share(content)}><Share2/> Bagikan</button>}</div>{content.featured_image_path&&<img className="ps-featured" src={content.featured_image_path} alt={metadata.socialTitle||content.title}/>}<div className="ps-body" dangerouslySetInnerHTML={{__html:safeHtml}}/>{metadata.eventDate&&<section className="ps-event"><CalendarDays/><div><b>{formatDate(metadata.eventDate,{dateStyle:"full"})}{metadata.eventTime?` · ${metadata.eventTime}`:""}</b>{metadata.locationName&&<span>{metadata.locationName}</span>}{metadata.address&&<p>{metadata.address}</p>}</div></section>}{metadata.tags?.length>0&&<div className="ps-tags"><Tags/>{metadata.tags.map((tag)=><span key={tag}>#{tag}</span>)}</div>}{metadata.showAuthor!==false&&metadata.authorName&&<section className="ps-author"><span>{metadata.authorName.slice(0,2).toUpperCase()}</span><div><small>PENULIS</small><b>{metadata.authorName}</b>{metadata.authorUrl&&<a href={metadata.authorUrl} rel="author noopener">Lihat profil</a>}</div></section>}{!isPage&&related.length>0&&<section className="ps-related"><h2>Post terkait</h2><div>{related.map((post)=><article key={post.id}><small>{post.metadata?.categories?.[0]||"Post"}</small><h3><a href={`/${post.slug}`}>{post.title}</a></h3><p>{post.excerpt}</p></article>)}</div></section>}</article><aside className="ps-side"><label><Search/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Cari post…"/></label><section><h3>Post terbaru</h3>{filteredPosts.slice(0,6).map((post)=><a key={post.id} href={`/${post.slug}`}><b>{post.title}</b><small>{formatDate(post.published_at)}</small></a>)}</section><section><h3>Pages</h3>{pages.map((page)=><a key={page.id} href={`/${page.slug}`}>{page.title}</a>)}</section><section><h3>Discovery</h3><a href="/sitemap.xml">Sitemap XML</a><a href="/feed.xml">RSS Feed</a><a href="/llms.txt">LLMs.txt</a></section></aside></main><footer className="ps-footer"><b>{site.name}</b><span>© {new Date().getFullYear()}</span><a href="https://ngeblogging.com">Dibuat dengan Ngeblogging</a></footer></div>;
}
