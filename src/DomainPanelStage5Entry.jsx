import React,{useEffect,useRef,useState} from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Candidate from './DomainPanelStage5Candidate.jsx';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {createIsolatedPanelTransport} from './lib/domain-transfer-panel-client.mjs';
import {eligibleTransferDomains} from './lib/domain-transfer-panel-gate.mjs';
const PREVIEW='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
export default function DomainPanelStage5Entry({user,...props}){
 if(typeof window==='undefined'||window.location.origin!==PREVIEW)return <DomainPanelV124 {...props}/>;
 return <PreviewTransferPanel {...props} user={user}/>;
}
function PreviewTransferPanel({user,site,sites=[],onSiteUpdate,...props}){
 const [revision,setRevision]=useState(0),[state,setState]=useState(null);
 const scope=JSON.stringify([user?.id,site?.id,site?.owner_id,sites.map(s=>[s.id,s.owner_id,s.status]).sort(),revision]),currentScope=useRef(scope);currentScope.current=scope;
 useEffect(()=>{
  let alive=true;const current=()=>alive&&currentScope.current===scope,controller=new AbortController();
  setState({scope,loading:true,transfer:null,notice:'Memeriksa kesiapan pemindahan dari server…'});
  const timer=setTimeout(()=>{if(current()){alive=false;controller.abort();setState({scope,loading:false,transfer:null,notice:'Pemindahan belum siap. Verifikasi server belum selesai; tidak ada pemindahan dikirim.'});}},15000);
  const save=value=>{if(current()){clearTimeout(timer);setState({scope,loading:false,...value});}};
  (async()=>{
   if(!user?.id||site?.owner_id!==user.id)throw Error('OWNER_REQUIRED');
   const verified=await getVerifiedSession({force:true});
   if(!current()||verified?.verification!=='verified'||verified?.user?.id!==user.id||!verified?.session?.access_token)throw Error('VERIFIED_SESSION_REQUIRED');
   const getToken=async()=>{if(!current())throw Error('SCOPE_CHANGED');const next=await getVerifiedSession({force:true});if(!current()||next?.verification!=='verified'||next?.user?.id!==user.id||!next?.session?.access_token)throw Error('SESSION_CHANGED');return next.session.access_token;};
   const transport=createIsolatedPanelTransport({enabled:true,environment:'isolated-test',origin:PREVIEW,approvedTestOrigin:PREVIEW,getToken,isCurrent:current,fetchImpl:(url,init)=>{if(!current())throw Error('SCOPE_CHANGED');return fetch(url,init);}});
   const token=await getToken();
   const response=await fetch('/api/domains/list?siteId='+encodeURIComponent(site.id),{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,headers:{accept:'application/json',authorization:'Bearer '+token}});
   if(!response.ok)throw Error('DOMAIN_READ_UNAVAILABLE');const payload=await response.json();if(!Array.isArray(payload?.domains))throw Error('DOMAIN_ROWS_REQUIRED');
   const config={enabled:true,environment:'isolated-test',userId:user.id,sessionKey:user.id+':'+String(verified.session.expires_at||'verified'),sourceLoaded:true,sourceSiteId:site.id,domains:payload.domains,...transport};
   const eligible=eligibleTransferDomains(site,config);
   if(!eligible.length){save({transfer:null,notice:'Belum ada domain terverifikasi yang memenuhi syarat pemindahan.'});return;}
   if(eligible.length!==1)throw Error('AMBIGUOUS_CUSTOM_SLOT');
   const targets=sites.filter(s=>s.id!==site.id&&s.owner_id===user.id&&s.status==='active');
   if(!targets.length){save({transfer:null,notice:'Belum ada situs tujuan aktif milik akun ini.'});return;}
   const targetStates={},freshSites=new Map([[site.id,site]]);let sourceSite=null,index=0;
   const worker=async()=>{while(current()&&index<targets.length){const target=targets[index++];try{const snapshot=await transport.loadState({domainId:eligible[0].id,sourceSiteId:site.id,targetSiteId:target.id});if(!current())return;if(snapshot.domain.site_id!==site.id||snapshot.sourceSite.owner_id!==user.id||snapshot.targetSite.owner_id!==user.id||snapshot.sourceRole!=='owner'||snapshot.targetRole!=='owner'||snapshot.targetLoaded!==true)continue;sourceSite=snapshot.sourceSite;freshSites.set(target.id,snapshot.targetSite);targetStates[target.id]={loaded:true,domains:snapshot.targetDomains};}catch{/* A failed target read never becomes an empty/available target. */}}};
   await Promise.all(Array.from({length:Math.min(3,targets.length)},worker));
   if(!current())return;
   if(!Object.keys(targetStates).length){save({transfer:null,notice:'Pemindahan belum siap pada endpoint uji. Migrasi dan layanan transfer harus tersedia; tidak ada pemindahan dikirim.'});return;}
   freshSites.set(site.id,{...site,...sourceSite});
   save({transfer:{...config,targetStates,snapshotKey:scope},sourceSite:{...site,...sourceSite},freshSites:[...freshSites.values()],notice:'Pemindahan tersedia pada lingkungan uji. DNS, alias, dan cache tetap memerlukan verifikasi terpisah.'});
  })().catch(()=>{save({transfer:null,notice:'Pemindahan dinonaktifkan karena sesi atau state server belum terverifikasi. Domain dan publikasi yang ada tetap dapat dikelola.'});});
  return ()=>{alive=false;clearTimeout(timer);controller.abort();};
 },[scope]);
 const data=state?.scope===scope?state:null;
 const observed=next=>{setState(old=>old?.scope===scope?{...old,sourceSite:next}:old);onSiteUpdate?.(next);};
 return <>
  <DomainPanelStage5Candidate {...props} site={data?.sourceSite||site} sites={data?.freshSites||sites} onSiteUpdate={observed} transfer={data?.transfer||null}/>
  <section className="sv124-card" data-stage5-studio-transfer={data?.transfer?'ready':data?.loading?'loading':'disabled'}><p role="status">{data?.notice||'Memeriksa kesiapan pemindahan…'}</p>{data&&!data.loading&&!data.transfer?<button type="button" onClick={()=>setRevision(v=>v+1)}>Periksa kesiapan pemindahan</button>:null}</section>
 </>;
}
