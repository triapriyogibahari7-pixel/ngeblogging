import React, {useEffect, useMemo, useRef, useState} from 'react';
import {buildTransferRequest, createTransferController} from './lib/domain-transfer-confirmation.mjs';

// Standalone component. Not imported into the active panel until backend/isolation gates pass.
// onMove must use the authenticated server path; client validation is not authorization.
// snapshotKey must change only after reloading authoritative state, especially after unknown results.
export default function DomainTransferDialog({domain,source,sites=[],userId,targetStates={},snapshotKey,onMove,onReload,onClose,enabled=false}) {
  const dialog=useRef(null),transport=useRef(onMove),current=useRef(null);
  transport.current=onMove;
  const [targetId,setTargetId]=useState(''),[confirmation,setConfirmation]=useState(''),[view,setView]=useState({phase:'idle'}),[error,setError]=useState('');
  const controller=useMemo(()=>{
    const instance=createTransferController(request=>{
      if(typeof transport.current!=='function') throw new Error('TRANSFER_TRANSPORT_UNAVAILABLE');
      return transport.current(request);
    },{onState:state=>{if(current.current===instance)setView(state);}});
    return instance;
  },[domain?.id,domain?.site_id,source?.id,userId,snapshotKey]);
  current.current=controller;
  useEffect(()=>{current.current=controller;setView({phase:'idle'});setTargetId('');setConfirmation('');setError('');return ()=>{if(current.current===controller)current.current=null;};},[controller]);
  useEffect(()=>{
    const previous=document.activeElement;
    if(dialog.current&&!dialog.current.open)dialog.current.showModal();
    return ()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[]);
  const target=sites.find(site=>site.id===targetId);
  const snapshot=targetStates[targetId];
  const input={domain,source,target,userId,confirmation,targetDomains:snapshot?.domains,targetLoaded:snapshot?.loaded===true};
  let validation='';
  try{buildTransferRequest(input);}catch(problem){validation=problem.code||'INVALID_TRANSFER';}
  const blocked=view.phase!=='idle';
  async function submit(event){
    event.preventDefault();
    if(!enabled||blocked||controller.phase!=='idle'||validation||typeof onMove!=='function')return;
    setError('');
    try{await controller.submit(input);}catch(problem){if(current.current===controller)setError(problem.code||'TRANSFER_RECONCILIATION_REQUIRED');}
  }
  return <dialog ref={dialog} aria-labelledby="domain-transfer-title" aria-describedby="domain-transfer-impact" onCancel={event=>{event.preventDefault();if(view.phase!=='pending')onClose?.();}}>
    <form onSubmit={submit}>
      <h2 id="domain-transfer-title">Pindahkan domain antarsitus</h2>
      <p><strong>{domain?.hostname}</strong>: {source?.name||source?.slug} → {target?.name||target?.slug||'Pilih tujuan'}</p>
      <p id="domain-transfer-impact">Domain dan redirect terkait akan diarahkan ke situs tujuan. Subdomain gratis, konten, kepemilikan dan status publikasi kedua situs tetap dipertahankan. Ini bukan pembelian atau transfer registrar.</p>
      <label>Situs tujuan <select value={targetId} onChange={event=>{setTargetId(event.target.value);setError('');}} disabled={blocked} required>
        <option value="">Pilih situs milik Anda</option>
        {sites.filter(site=>site.id!==source?.id&&site.owner_id===userId&&site.status==='active').map(site=><option key={site.id} value={site.id}>{site.name||site.slug}</option>)}
      </select></label>
      <label>Ketik hostname domain <input value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={blocked} autoComplete="off" spellCheck={false} required/></label>
      {!enabled?<p role="status">Belum diaktifkan: backend dan isolasi pengujian harus diverifikasi dahulu.</p>:null}
      {targetId&&snapshot?.loaded!==true?<p role="status">Status domain situs tujuan belum dimuat; pemindahan diblokir.</p>:null}
      {view.phase==='unknown'?<p role="alert">Hasil belum pasti. Jangan kirim ulang; muat ulang status domain dan kedua situs untuk rekonsiliasi.</p>:null}
      {view.phase==='moved'?<p role="status">Server melaporkan pemindahan tersimpan. Routing alias, cache dan HTTPS belum dinyatakan terverifikasi.</p>:null}
      {error?<p role="alert">{error}</p>:null}
      {enabled&&validation&&view.phase==='idle'?<p role="status">Belum dapat dilanjutkan: {validation}</p>:null}
      <button type="button" onClick={()=>onClose?.()} disabled={view.phase==='pending'}>Tutup</button>
      {view.phase==='unknown'&&typeof onReload==='function'?<button type="button" onClick={()=>onReload()}>Muat ulang status</button>:null}
      <button type="submit" disabled={!enabled||blocked||Boolean(validation)||typeof onMove!=='function'}>{view.phase==='pending'?'Memproses…':'Konfirmasi pemindahan'}</button>
    </form>
  </dialog>;
}
