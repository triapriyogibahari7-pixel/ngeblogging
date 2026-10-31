import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import DomainPanelV124 from './DomainPanelV124.jsx';
import DomainRegistrarCheckStage6 from './DomainRegistrarCheckStage6.jsx';
import {canUseTransferPanel,eligibleTransferDomains,transferPanelScope} from './lib/domain-transfer-panel-gate.mjs';
const TransferFlow=lazy(()=>import('./DomainTransferFlow.jsx'));

// Candidate composition only. Existing Studio imports remain unchanged.
// Pass only trusted, authenticated test state and caller-JWT transport callbacks.
export default function DomainPanelStage5Candidate({transfer=null,...panelProps}){
  const scope=transferPanelScope(panelProps.site,transfer),current=useRef(scope);
  const [epoch,setEpoch]=useState(0);
  current.current=scope;
  useEffect(()=>{current.current=scope;return ()=>{current.current=null;};},[scope]);
  const sourceObserved=snapshot=>{
    if(current.current!==scope||snapshot?.sourceSite?.id!==panelProps.site?.id)return;
    panelProps.onSiteUpdate?.({...panelProps.site,...snapshot.sourceSite});
    setEpoch(value=>value+1);
  };
  return <>
    <section className="sv124-page sv124-domain-page" data-domain-stage6-layout="compact" aria-label="Domain dan publikasi">
      <DomainPanelV124 {...panelProps} key={JSON.stringify([scope,epoch])}/>
      <DomainRegistrarCheckStage6 key={JSON.stringify([panelProps.site?.id,scope])}/>
    </section>
    <TransferEntry key={scope} source={panelProps.site} sites={panelProps.sites||[]} config={transfer} onSourceObserved={sourceObserved}/>
  </>;
}
function TransferEntry({source,sites,config,onSourceObserved}){
  const [selected,setSelected]=useState(null),[completed,setCompleted]=useState([]),[blocked,setBlocked]=useState([]);
  if(!canUseTransferPanel(source,config))return null;
  const eligible=eligibleTransferDomains(source,config);
  if(selected&&!completed.includes(selected.id)&&!eligible.some(row=>row.id===selected.id))return null;
  const domains=eligible.filter(row=>!completed.includes(row.id)&&!blocked.includes(row.id));
  if(!domains.length&&!selected&&!blocked.length)return null;
  async function reconciled(data){
    if(data?.phase!=='at_target'||data.observedOnly!==true||data.request?.p_source_site_id!==source.id||data.request?.p_domain_id!==selected?.id||data.snapshot?.sourceSite?.id!==source.id)throw new Error('TRANSFER_PANEL_OBSERVATION_MISMATCH');
    setCompleted(ids=>[...new Set([...ids,selected.id])]);
    onSourceObserved(data.snapshot);
    if(typeof config.onReconciled==='function')await config.onReconciled(data);
  }
  return <section className="sv124-page sv124-domain-page" aria-label="Pemindahan domain kandidat">
    <article className="sv124-card sv124-domain-list">
      <header><div><small>TAHAP 5 · LINGKUNGAN UJI</small><h2>Pindahkan domain antarsitus</h2><p>Domain berpindah, bukan konten atau status publikasi. Bukan transfer registrar.</p></div></header>
      {domains.map(domain=><div key={domain.id}><b>{domain.hostname}</b><button type="button" className="sv124-secondary" disabled={Boolean(selected)} onClick={()=>setSelected({...domain})}>Pindahkan ke situs lain</button></div>)}
      {blocked.length?<p role="alert">Konfirmasi mengalami gangguan. Jangan ulangi pemindahan; status server perlu dibaca ulang.</p>:null}
      {selected?<TransferBoundary onError={()=>setBlocked(ids=>[...new Set([...ids,selected.id])])} onClose={()=>setSelected(null)}><Suspense fallback={<p role="status">Menyiapkan konfirmasi pemindahan…</p>}>
        <TransferFlow source={source} domain={selected} sites={sites} userId={config.userId} sessionKey={config.sessionKey} snapshotKey={config.snapshotKey} targetStates={config.targetStates||{}} enabled={true} onMove={config.onMove} loadState={config.loadState} onReconciled={reconciled} onClose={()=>setSelected(null)}/>
      </Suspense></TransferBoundary>:null}
    </article>
  </section>;
}
class TransferBoundary extends React.Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){try{this.props.onError?.();}catch{}}
  render(){return this.state.failed?<div role="alert"><p>Konfirmasi belum dapat ditampilkan. Jangan kirim ulang pemindahan; penutupan ini tidak membatalkan permintaan yang sudah terkirim.</p><button type="button" onClick={this.props.onClose}>Tutup konfirmasi</button></div>:this.props.children;}
}
