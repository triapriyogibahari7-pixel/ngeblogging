import React,{useRef,useState} from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainPanelStage5Entry from './DomainPanelStage5Entry.jsx';
import DomainConnectEntry from './DomainConnectEntry.jsx';
import DomainConnectSlot from './DomainConnectSlot.jsx';
import LiveRegistrarSearch from './LiveRegistrarSearch.jsx';
import DomainQuoteLookup from './DomainQuoteLookup.mjs';
import {domainPanelSurface} from './lib/domain-panel-surface.mjs';
import './domain-registrar-check-stage6.css';
class PurchaseBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div role="alert"><p>Formulir pembelian belum dapat ditampilkan. Jika sebelumnya sudah memulai pesanan, periksa statusnya dan jangan membayar ulang.</p><button type="button" className="sv124-secondary" onClick={()=>this.setState({failed:false})}>Coba tampilkan formulir kembali</button></div>:this.props.children;}
}
function OwnedDomainCommerce({user,site}){
 const [selectedDomain,setSelectedDomain]=useState(''),[copyNotice,setCopyNotice]=useState('');
 function selectDomain(selection){
  if(selection?.siteId!==site.id||typeof selection.domain!=='string')return;
  setSelectedDomain(selection.domain);setCopyNotice('');
 }
 async function copyDomain(){
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(selectedDomain);setCopyNotice('Nama domain disalin.');}
  catch{setCopyNotice('Penyalinan otomatis tidak tersedia. Pilih dan salin nama domain yang ditampilkan.');}
 }
 return <>
  <LiveRegistrarSearch user={user} siteId={site.id} siteName={site.name} onSelect={selectDomain}/>
  <section className="sv124-card" aria-label="Formulir pembelian domain">
   <h2>Pembelian domain</h2>
   <p>Formulir pembelian meminta quote final tersendiri dari backend. Harga pencarian dan peninjauan bukan tagihan atau persetujuan pembayaran.</p>
   {selectedDomain&&<div><p>Domain terakhir yang dipilih: <code style={{overflowWrap:'anywhere'}}>{selectedDomain}</code></p><p>Nama pilihan diisikan ke pemeriksaan di bawah. Ketersediaan dan harga harus diperiksa kembali; pilihan ini tidak membuat reservasi atau pesanan.</p><button type="button" className="sv124-secondary" onClick={copyDomain}>Salin nama domain</button></div>}
   <p role="status" aria-live="polite">{copyNotice}</p>
   <PurchaseBoundary><DomainQuoteLookup userId={user.id} siteId={site.id} siteName={site.name} initialDomain={selectedDomain} onSelect={selectDomain}/></PurchaseBoundary>
  </section>
 </>;
}
export default function DomainPanelProductionEntry({user,...props}){
 const [revision,setRevision]=useState(0);
 const panelRoot=useRef(null);
 const surface=domainPanelSurface(typeof window==='undefined'?'':window.location.origin);
 if(surface==='preview')return <DomainPanelStage5Entry {...props} user={user}/>;
 if(surface!=='production')return <DomainPanelV124 {...props}/>;
 const owned=Boolean(user?.id&&props.site?.id&&props.site.owner_id===user.id),scope=JSON.stringify([user?.id,props.site?.id,props.site?.owner_id]);
 return <section className="sv124-page sv124-domain-page" data-domain-stage6-layout="compact" aria-label="Domain dan publikasi"><div ref={panelRoot} className="nd-connected-domain-manager"><DomainPanelV124 key={scope+':'+revision} {...props}/></div><DomainConnectSlot key={scope} rootRef={panelRoot}><DomainConnectEntry key={scope} siteId={props.site?.id} expectedUserId={user?.id} onRefresh={()=>setRevision(value=>value+1)}/></DomainConnectSlot>{owned&&<OwnedDomainCommerce key={scope} user={user} site={props.site}/>}</section>;
}
