import DomainOrderActions from './DomainOrderActions.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {supabase,supabaseConfigured} from './lib/supabase';
import {loadOrderStatus,orderIdFromPath} from './domain-order-status-model.mjs';
import './domain-order-status.css';
import './domain-premium-ui.css';
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const date=x=>x?new Date(x).toLocaleString('id-ID'):'Belum dikonfirmasi';
export default function DomainOrderStatusPage(){
 const id=orderIdFromPath(window.location.pathname),epoch=useRef(0);
 const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[authError,setAuthError]=useState(''),[retry,setRetry]=useState(0),[state,setState]=useState({kind:'loading'});
 useEffect(()=>{
  document.title='Detail pesanan domain — Ngeblogging';
  if(!supabaseConfigured||!supabase){setAuthError('Koneksi akun belum tersedia. Status pesanan belum dapat diperiksa.');setAuthReady(true);return;}
  let active=true,version=0;
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(!active)return;version++;epoch.current++;setState({kind:'loading'});setSession(next);setAuthReady(true);setAuthError('');setRetry(x=>x+1);});
  const initial=version;supabase.auth.getSession().then(({data,error})=>{if(!active||initial!==version)return;if(error){setAuthError('Sesi belum dapat dibaca. Coba perbarui halaman.');setAuthReady(true);return;}setSession(data.session);setAuthReady(true);}).catch(()=>{if(active&&initial===version){setAuthError('Sesi belum dapat dibaca. Coba perbarui halaman.');setAuthReady(true);}});
  return ()=>{active=false;epoch.current++;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!authReady||authError||!id||!session?.access_token)return;
  const c=new AbortController(),version=++epoch.current;setState({kind:'loading'});
  loadOrderStatus(id,session.access_token,{signal:c.signal}).then(order=>{if(!c.signal.aborted&&version===epoch.current)setState({kind:'ready',order});}).catch(error=>{if(!c.signal.aborted&&version===epoch.current)setState({kind:'error',status:error.status});});
  return ()=>c.abort();
 },[id,authReady,authError,session?.access_token,retry]);
 const refresh=async()=>{if(!supabase)return;try{const {data,error}=await supabase.auth.getSession();if(error)throw error;epoch.current++;setState({kind:'loading'});setSession(data.session);setAuthError('');setAuthReady(true);setRetry(x=>x+1);}catch{epoch.current++;setState({kind:'error'});setAuthError('Sesi belum dapat dibaca. Coba perbarui halaman.');}};
 let content;
 if(!id)content=<p role="alert">Alamat pesanan tidak valid. Gunakan tautan pesanan dari checkout Anda.</p>;
 else if(!authReady)content=<p role="status">Memeriksa sesi akun…</p>;
 else if(authError)content=<p role="alert">{authError}</p>;
 else if(!session?.access_token)content=<section><h2>Masuk untuk melihat pesanan</h2><p>Gunakan akun Ngeblogging yang digunakan saat checkout. Tidak perlu membuat akun kedua.</p><p><a href="/?auth=signin" target="_blank" rel="noopener noreferrer">Buka halaman masuk</a></p><p>Halaman masuk dibuka di tab lain. Setelah masuk, kembali ke halaman ini lalu pilih Perbarui status.</p></section>;
 else if(state.kind==='loading')content=<p role="status">Mengambil status pesanan dari backend…</p>;
 else if(state.kind==='error')content=<section role="alert"><h2>Status belum dapat ditampilkan</h2><p>{state.status===404?'Pesanan tidak ditemukan untuk akun ini. Pastikan Anda memakai akun checkout yang benar.':state.status===401?'Sesi belum diterima backend. Masuk kembali dengan akun yang sama.':'Status belum dapat dipastikan karena layanan belum tersedia atau koneksi bermasalah.'}</p><p>Jangan melakukan pembayaran ulang hanya karena halaman ini gagal dimuat.</p>{state.status===401&&<a href="/?auth=signin" target="_blank" rel="noopener noreferrer">Buka halaman masuk</a>}</section>;
 else if(state.kind==='ready'){
  const o=state.order;
  content=<><header className="nd-order-heading"><p className="nd-eyebrow">RINGKASAN PESANAN</p><h2>{o.domain}</h2><p className="dosp-note" role="status">{o.message}</p><p className="dosp-hint">Dibuat {date(o.createdAt)}. Pembaruan terakhir {date(o.updatedAt)}.</p></header><section className="nd-order-total" aria-label="Total pesanan"><span>Total pesanan</span><strong>{money(o.amountIdr)}</strong><small>Masa pendaftaran {o.years} tahun — IDR</small></section><DomainOrderActions order={o} owner={session?.user?.id} onRefresh={refresh} detail/>{o.resolution!=='none'&&<section className="dosp-warning"><h3>Pesanan perlu penyelesaian</h3><p>Simpan ID pesanan untuk penanganan. Halaman ini tidak menjalankan pembelian ulang atau pengembalian dana.</p><p>Pengembalian dana belum dianggap selesai hanya karena pendaftaran domain gagal atau pesanan memerlukan peninjauan.</p></section>}</>;
 }
 return <div className="domain-order-status-page nd-order-screen"><div className="dosp-shell"><nav className="nd-topbar" aria-label="Navigasi detail pesanan"><a className="dosp-brand" href="/">ngeblogging.</a><a className="nd-back" href="/">Kembali ke Ngeblogging</a></nav><main className="dosp-card nd-page-card"><h1>Detail pesanan domain</h1>{id&&<details className="nd-order-id"><summary>Lihat ID pesanan</summary><code>{id}</code></details>}<p className="dosp-hint">Status diambil dari backend. Kembali dari halaman pembayaran bukan bukti pembayaran lunas atau domain terdaftar.</p><div aria-live="polite" aria-busy={authReady&&session?.access_token&&state.kind==='loading'}>{content}</div>{id&&authReady&&<button className="dosp-refresh" type="button" onClick={refresh} disabled={!supabase||(!authError&&session?.access_token&&state.kind==='loading')}>Perbarui status</button>}</main></div></div>;
}
