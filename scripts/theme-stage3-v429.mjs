import {transformThemeLayout} from './theme-layout-v428.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V429: pola integrasi berubah; build dihentikan untuk mencegah perubahan salah.');return s.replace(a,b);}
export function transformThemeStage3(source,id){const prior=transformThemeLayout(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
  if(path.endsWith('/src/components/theme/ThemeLayoutMapV428.jsx')){
    code="import LayoutAreaCard from './LayoutAreaCardV429';\n"+code;
    code=once(code,'  const host=useRef(null);','  const areaTrigger=useRef(null);\n  const host=useRef(null);');
    code=once(code,'onClick={()=>setSelected(item.id)}','onClick={event=>{areaTrigger.current=event.currentTarget;setSelected(item.id);}}');
    const start=code.indexOf('{area&&<div className="tl428-area-editor">');const end=code.indexOf('</div>}</aside>',start);
    if(start<0||end<=start)throw Error('V429: kartu area belum ditemukan.');
    code=code.slice(0,start)+'{area&&editable&&<LayoutAreaCard area={area} anchor={areaTrigger.current} entries={active.filter(x=>x.area===area.id)} onClose={()=>setSelected(\'\')} onCode={openCode} onWidgets={()=>onOpenWidgets?.()}/>}'+code.slice(end+'</div>}'.length);
    return {code,map:null};
  }
  if(path.endsWith('/src/PublicSiteNext.jsx')){
    code="import FeaturedImage from './components/public/FeaturedImageV429';\nimport './styles/public-layout-v429.css';\n"+code;
    code=once(code,"      if(!card.dataset.bound){", "      const postLink=card.querySelector('a');if(postLink){postLink.href=linkTo(post.slug);postLink.target='_top';postLink.textContent='Baca selengkapnya';}\n      if(!card.dataset.bound){");
    code=once(code,"        const open=()=>{window.open(linkTo(post.slug),'_top')};", "        const open=(event)=>{if(event?.target?.closest?.('a,button,input,select,textarea'))return;window.open(linkTo(post.slug),'_top')};");
    code=once(code,"new Set(['search','recent-posts','popular-posts','categories','tags'])", "new Set(['search','recent-posts','popular-posts','categories','tags','custom-html'])");
    code=once(code,'<img className="ps-featured" src={content.featured_image_path} alt={metadata.socialTitle||content.title}/>','<FeaturedImage src={content.featured_image_path} alt={metadata.socialTitle||content.title}/>');
    return {code,map:null};
  }
  return prior;
}
