export const DOMAIN_CATALOG_VERSION='stage6-editorial-200-v2-connected';
const groups=[['Pilihan','Identitas digital untuk nama dan tujuan pilihan Anda.','com net org info biz name pro online site website xyz me co live life space world global international today'],['Indonesia','Pilihan ekstensi Indonesia; persyaratan dan dukungan registrar perlu diperiksa.','id co.id my.id web.id biz.id or.id ac.id sch.id ponpes.id net.id go.id mil.id desa.id'],['Regional','Identitas regional; kelayakan pendaftar mengikuti kebijakan registry dan registrar.','uk co.uk org.uk me.uk us ca de fr nl eu es it ch at be se no dk fi pl cz pt ie au com.au net.au org.au nz co.nz sg com.sg my com.my in co.in jp co.jp kr co.kr cn com.cn tw com.tw hk com.hk ph com.ph th co.th vn com.vn br com.br mx com.mx'],['Bisnis','Pilihan untuk memperkenalkan usaha, layanan, dan kegiatan profesional.','store shop business company agency services solutions consulting expert experts engineering enterprises ventures partners group team work works careers jobs finance financial capital investments fund money cash credit loans loan insurance insure legal lawyer attorney law accounting accountant tax properties property realty estate realestate construction builders build contractors'],['Teknologi','Pilihan untuk produk, proyek, dan komunitas teknologi.','tech app dev io ai cloud digital software systems computer camera technology network hosting domains email link click mobi tel support tools'],['Kreator','Pilihan untuk cerita, karya, komunitas, dan kegiatan kreatif.','blog news media press report reviews studio design art photography photo photos pictures gallery graphics video film movie movies music audio band dance events community club social chat forum education academy school university courses training travel tours holiday holidays vacation vacations cafe']];
// Populer is an editorial alias, not a worldwide ranking or extra catalog entries.
export const DOMAIN_CATALOG_CATEGORIES=Object.freeze(['Semua','Populer',...groups.map(group=>group[0])]);
export const DOMAIN_CATALOG=Object.freeze(groups.flatMap(([category,description,extensions])=>extensions.split(' ').map(extension=>Object.freeze({extension,category,description,canPrepareCheck:true,providerSupport:'not_verified',registrationIdr:null,renewalIdr:null,pricingStatus:'not_configured',purchaseAllowed:false}))));
const suffixes=Object.freeze(DOMAIN_CATALOG.map(x=>x.extension).sort((a,b)=>b.length-a.length));
export function domainCatalogPage({query='',category='Semua',page=1,pageSize=20}={}){
 if(typeof query!=='string'||query.length>100||!DOMAIN_CATALOG_CATEGORIES.includes(category)||!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>50)throw new Error('INVALID_DOMAIN_CATALOG_FILTER');
 const q=query.trim().replace(/^\./,'').toLowerCase(),group=category==='Populer'?'Pilihan':category;
 const filtered=DOMAIN_CATALOG.filter(item=>(group==='Semua'||item.category===group)&&(!q||[item.extension,item.category,item.description].some(text=>text.toLowerCase().includes(q))));
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),current=Math.min(page,pages);
 return {items:filtered.slice((current-1)*pageSize,current*pageSize),total:filtered.length,page:current,pages,pageSize};
}
// Prepares an input only; this does not verify registrar support or availability.
export function prepareCatalogDomain(value,extension){
 if(typeof value!=='string'||!DOMAIN_CATALOG.some(x=>x.extension===extension))throw new Error('INVALID_DOMAIN_CATALOG_SELECTION');
 const raw=value.trim().replace(/\.$/,'');if(!raw||raw.length>253||/[\u0000-\u001f\u007f/\\:@?#%]/u.test(raw))return null;
 let name;
 try{
  if(raw.includes('.')){
   if(/\s/u.test(raw))return null;
   const canonical=new URL('https://'+raw).hostname.toLowerCase(),suffix=suffixes.find(x=>canonical.endsWith('.'+x));
   if(!suffix)return null;name=canonical.slice(0,-suffix.length-1);if(name.includes('.'))return null;
  }else{if(!/^[-\p{L}\p{M}\p{N} ]+$/u.test(raw))return null;name=raw.replace(/ +/g,'-');}
  const prepared=new URL('https://'+name+'.'+extension).hostname.toLowerCase(),ending='.'+extension,stem=prepared.slice(0,-ending.length);
  if(prepared.length>253||!prepared.endsWith(ending)||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(stem))return null;
  return prepared;
 }catch{return null;}
}
