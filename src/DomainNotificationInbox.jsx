import React,{useEffect,useRef,useState} from 'react';
import {domainNotificationLabels,requestDomainNotifications} from './domain-notifications-client.mjs';
// Parent must key this component by its order/account/session scope.
export default function DomainNotificationInbox({orderId,getSession}){
 const getter=useRef(getSession),active=useRef(null);getter.current=getSession;
 const [state,setState]=useState({kind:'loading',items:[]}),[retry,setRetry]=useState(0),[busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 async function perform(notificationId,signal){
  const a=await getter.current();if(signal.aborted)throw Error('REQUEST_ABORTED');
  const result=await requestDomainNotifications(orderId,a.session.access_token,{notificationId,signal});
  const b=await getter.current(a.user.id);
  if(signal.aborted||b.user.id!==a.user.id||b.session.access_token!==a.session.access_token)throw Error('SESSION_CHANGED');
  return result;
 }
 useEffect(()=>{
  const c=new AbortController();active.current?.abort();active.current=null;setBusy('');setNotice('');setState({kind:'loading',items:[]});
  perform(undefined,c.signal).then(items=>{if(!c.signal.aborted)setState({kind:'ready',items});}).catch(()=>{if(!c.signal.aborted)setState({kind:'error',items:[]});});
  return()=>{c.abort();active.current?.abort();active.current=null;};
 },[orderId,retry]);
 async function mark(id){
  if(active.current||busy||state.kind!=='ready'||!state.items.some(n=>n.id===id&&n.readAt===null))return;
  const c=new AbortController();active.current=c;setBusy(id);setNotice('');
  try{const receipt=await perform(id,c.signal);if(!c.signal.aborted){setState(s=>s.kind==='ready'?{...s,items:s.items.map(n=>n.id===receipt.id?{...n,readAt:receipt.readAt}:n)}:s);setNotice('Status dibaca tersimpan di server.');}}
  catch{if(!c.signal.aborted)setNotice('Pembaruan belum terkonfirmasi. Perbarui daftar untuk memeriksa status; permintaan tidak diulang otomatis.');}
  finally{if(active.current===c){active.current=null;if(!c.signal.aborted)setBusy('');}}
 }
 const unread=state.kind==='ready'?state.items.filter(n=>n.readAt===null).length:0;
 return <section className="dosp-card" aria-label="Kotak masuk notifikasi domain" aria-busy={state.kind==='loading'||Boolean(busy)}><h3>Notifikasi domain</h3>{state.kind==='loading'?<p role="status">Memuat notifikasi tersimpan…</p>:state.kind==='error'?<p role="alert">Notifikasi belum dapat dimuat. Sesi atau layanan mungkin belum tersedia; ini bukan bukti bahwa daftar kosong.</p>:<><p>{unread} belum dibaca dari {state.items.length} notifikasi terbaru.</p>{state.items.length===0?<p>Belum ada notifikasi tersimpan untuk pesanan ini.</p>:<ul>{state.items.map(n=><li key={n.id}><p>{domainNotificationLabels[n.kind]}</p><time dateTime={n.occurredAt}>{new Date(n.occurredAt).toLocaleString('id-ID')}</time><p>{n.readAt?'Sudah dibaca':'Belum dibaca'}</p>{n.readAt===null&&<button type="button" disabled={Boolean(busy)} onClick={()=>void mark(n.id)}>{busy===n.id?'Menyimpan…':'Tandai sudah dibaca'}</button>}</li>)}</ul>}</>}<p role="status" aria-live="polite">{notice}</p><button type="button" disabled={state.kind==='loading'||Boolean(busy)} onClick={()=>setRetry(n=>n+1)}>Perbarui notifikasi</button></section>;
}
