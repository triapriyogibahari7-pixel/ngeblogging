import React, {useEffect,useRef,useState} from 'react';
import DomainTransferDialog from './DomainTransferDialog.jsx';
import {moveWithReadback} from './lib/domain-transfer-completion.mjs';
import {classifyTransferSnapshot} from './lib/domain-transfer-reconciliation.mjs';

// Standalone, default-off flow. loadState must perform authenticated reads only.
// Not imported into the active DomainPanel. No endpoint or database is configured here.
export default function DomainTransferFlow(props){
  const key=JSON.stringify([props.source?.id,props.domain?.id,props.domain?.site_id,props.userId,props.sessionKey]);
  return <TransferSession key={key} {...props}/>;
}
function TransferSession({loadState,onMove,onReconciled,onClose,enabled=false,readTimeoutMs=10000,...props}){
  const mounted=useRef(false),attempt=useRef(null),readLock=useRef(null),latestRead=useRef(null);
  const [reading,setReading]=useState(false),[state,setState]=useState({phase:'idle'}),[notice,setNotice]=useState('');
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  const move=async request=>{
    const captured=Object.freeze({...request});attempt.current=captured;
    return moveWithReadback(captured,{move:onMove,read:reload,isCurrent:()=>mounted.current&&attempt.current===captured});
  };
  async function reload(){
    if(!mounted.current||readLock.current||!attempt.current||typeof loadState!=='function')return;
    const ticket={request:attempt.current};readLock.current=ticket;latestRead.current=ticket;setReading(true);setState({phase:'loading'});setNotice('');let timer;
    const limit=Number.isFinite(readTimeoutMs)&&readTimeoutMs>0&&readTimeoutMs<=30000?readTimeoutMs:10000;
    try{
      const request=ticket.request;
      const snapshot=await Promise.race([Promise.resolve().then(()=>loadState({domainId:request.p_domain_id,sourceSiteId:request.p_source_site_id,targetSiteId:request.p_target_site_id})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('READ_TIMEOUT')),limit);})]);
      if(!mounted.current||readLock.current!==ticket)return;
      const outcome=classifyTransferSnapshot(request,snapshot,props.userId);setState(outcome);
      if(outcome.phase==='at_target'&&typeof onReconciled==='function'){
        try{Promise.resolve(onReconciled({request,snapshot,...outcome,observedOnly:true})).catch(()=>{if(mounted.current&&latestRead.current===ticket)setNotice('Status domain terbaca, tetapi panel induk belum dapat diperbarui.');});}
        catch{setNotice('Status domain terbaca, tetapi panel induk belum dapat diperbarui.');}
      }
    }catch{if(mounted.current&&readLock.current===ticket)setState({phase:'needs_review',code:'READ_FAILED'});}
    finally{clearTimeout(timer);if(readLock.current===ticket)readLock.current=null;}
  }
  if(reading)return <ReadResult state={state} notice={notice} onReload={reload} onClose={onClose}/>;
  return <DomainTransferDialog {...props} enabled={enabled&&typeof loadState==='function'&&typeof onMove==='function'} onMove={move} onReload={reload} onClose={onClose}/>;
}
function ReadResult({state,notice,onReload,onClose}){
  const dialog=useRef(null),status=useRef(null),busy=state.phase==='loading';
  useEffect(()=>{const previous=document.activeElement;if(dialog.current&&!dialog.current.open)dialog.current.showModal();return ()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  useEffect(()=>{if(!busy)status.current?.focus();},[busy,state.phase]);
  return <dialog ref={dialog} aria-labelledby="transfer-read-title" onCancel={event=>{event.preventDefault();if(!busy)onClose?.();}}>
    <h2 id="transfer-read-title">Hasil pembacaan ulang domain</h2>
    <div ref={status} tabIndex={-1} role="status">
      {busy?<p>Memuat status terbaru… Tidak ada pemindahan ulang.</p>:null}
      {state.phase==='at_target'?<p>Domain sudah berada di situs tujuan dan pemetaan situs cocok dengan hasil baca. Tidak ada pemindahan ulang. DNS, HTTPS, alias dan cache belum dinyatakan terverifikasi.</p>:null}
      {state.phase==='at_source'?<p>Saat dibaca, domain masih di situs asal. Ini bukan bukti rollback; permintaan sebelumnya mungkin belum selesai. Jangan kirim ulang pemindahan.</p>:null}
      {state.phase==='needs_review'?<p>Status belum dapat dipastikan atau belum konsisten. Periksa ulang; pemindahan tidak dikirim lagi.</p>:null}
    </div>
    {notice?<p role="alert">{notice}</p>:null}
    <button type="button" disabled={busy} onClick={onReload}>Periksa status lagi</button>
    <button type="button" disabled={busy} onClick={()=>onClose?.()}>Tutup</button>
  </dialog>;
}
