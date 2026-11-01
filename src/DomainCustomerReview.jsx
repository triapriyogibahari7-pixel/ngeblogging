import React,{useEffect,useRef,useState} from 'react';
import {getVerifiedSession} from './lib/auth-session-v76.js';
import {fetchCustomerDomainReview,currentCustomerDomainReview} from './lib/domain-customer-review.mjs';
import {formatCustomerDomainMoney} from '../shared/domain-currency-display.mjs';
const h=React.createElement,HOSTS=new Set(['https://ngeblogging.com','https://www.ngeblogging.com']);
function errorMessage(error){if(error?.status===401)return 'Sesi perlu diverifikasi kembali. Masuk dengan akun yang sama.';if(error?.status===403)return 'Peninjauan hanya tersedia untuk pemilik situs ini.';if(error?.status===409)return 'Domain tidak lagi tersedia. Pilih hasil lain atau cari ulang.';if(error?.status===429)return 'Batas pemeriksaan tercapai. Coba kembali nanti.';if(error?.code==='DOMAIN_REVIEW_DISABLED')return 'Layanan peninjauan belum dibuka. Tidak ada pesanan atau pembayaran dibuat.';return 'Harga pilihan belum dapat diverifikasi. Tidak ada pesanan atau pembayaran dibuat.';}
export default function DomainCustomerReview({user,siteId,domain,previousAmountIdr,onClose}){
 const [state,setState]=useState({kind:'loading'}),[retry,setRetry]=useState(0),[tick,setTick]=useState(0),[currency,setCurrency]=useState('IDR'),cancel=useRef(null);
 const scope=JSON.stringify([user?.id,siteId,domain]),previous=useRef(null);
 if(previous.current?.scope!==scope)previous.current={scope,amount:previousAmountIdr};
 useEffect(()=>{setCurrency('IDR');},[scope]);
 useEffect(()=>{
  if(typeof window==='undefined'||!HOSTS.has(window.location.origin))return;
  let live=true;const c=new AbortController(),stop=()=>c.abort(),current=()=>live&&!c.signal.aborted;cancel.current=stop;setState({kind:'loading',scope});
  const timer=setTimeout(()=>{if(current()){c.abort();setState({kind:'error',scope,message:'Peninjauan melewati batas waktu. Harga belum terkonfirmasi.'});}},35000);
  (async()=>{
   try{
    const auth=await getVerifiedSession({force:true});if(!current())return;
    if(auth?.verification!=='verified'||auth?.user?.id!==user?.id||!auth?.session?.access_token)throw Error('INVALID_SESSION');
    const view=await fetchCustomerDomainReview(domain,{userId:auth.user.id,siteId,token:auth.session.access_token,signal:c.signal});if(!current())return;
    const next=await getVerifiedSession({force:true});if(!current())return;
    if(next?.verification!=='verified'||next?.user?.id!==auth.user.id)throw Error('SESSION_CHANGED');
    const now=performance.now(),fresh=currentCustomerDomainReview(view,now);setTick(now);
    setState(fresh.status==='ready'?{kind:'ready',scope,view}:{kind:'expired',scope});
   }catch(error){if(current())setState({kind:'error',scope,message:errorMessage(error)});}
   finally{clearTimeout(timer);if(cancel.current===stop)cancel.current=null;}
  })();
  return ()=>{live=false;clearTimeout(timer);c.abort();if(cancel.current===stop)cancel.current=null;};
 },[scope,retry]);
 useEffect(()=>{if(state.kind!=='ready')return;const timer=setInterval(()=>{const now=performance.now();setTick(now);if(currentCustomerDomainReview(state.view,now).status!=='ready')setState(current=>current===state?{kind:'expired',scope}:current);},1000);return ()=>clearInterval(timer);},[state,scope]);
 useEffect(()=>{if(typeof document==='undefined')return;const hide=()=>{if(document.visibilityState!=='hidden')return;cancel.current?.();setState({kind:'idle',scope});};document.addEventListener('visibilitychange',hide);return ()=>document.removeEventListener('visibilitychange',hide);},[scope]);
 if(typeof window==='undefined'||!HOSTS.has(window.location.origin))return null;
 const shown=state.scope===scope?state:{kind:'loading'},view=shown.kind==='ready'?currentCustomerDomainReview(shown.view,tick):null,ready=view?.status==='ready';
 const changed=ready&&Number.isSafeInteger(previous.current?.amount)&&previous.current.amount>0&&previous.current.amount<=1000000000000&&previous.current.amount!==view.price.amountIdr;
 const money=value=>formatCustomerDomainMoney(value,{currency,context:view?.currencyContext,now:view?.displayNowMs});
 return h('aside',{className:'dcs-selection','aria-label':'Peninjauan domain pilihan','data-domain-review':'inline'},
  h('h3',null,'Peninjauan domain: ',domain),
  h('div',{role:'status','aria-live':'polite','aria-busy':shown.kind==='loading'},shown.kind==='loading'?h('p',null,'Memeriksa ulang ketersediaan dan harga melalui server…'):null,shown.kind==='error'?h('p',{className:'dcs-warning'},shown.message):null,shown.kind==='idle'?h('p',null,'Peninjauan dibatalkan saat berpindah tab/aplikasi. Muat ulang untuk harga terbaru.'):null,shown.kind==='expired'||(view&&!ready)?h('p',{className:'dcs-warning'},'Peninjauan sudah kedaluwarsa atau masa berlakunya tidak dapat dipastikan. Perbarui sebelum melanjutkan.'):null),
  ready?h(React.Fragment,null,
   h('div',{className:'dcs-tools'},h('label',null,'Mata uang tampilan peninjauan',h('select',{value:currency,onChange:e=>{if(e.target.value==='IDR'||(e.target.value==='USD'&&view.usdDisplayAvailable))setCurrency(e.target.value);}},h('option',{value:'IDR'},'IDR · Rupiah'),h('option',{value:'USD',disabled:!view.usdDisplayAvailable},'USD · Ekuivalen')))),
   h('p',{className:'dcs-price'},money(view.price.amountIdr),h('small',null,'Pendaftaran 1 tahun · harga hasil pemeriksaan ulang'),currency==='USD'?h('small',null,'Acuan IDR: ',formatCustomerDomainMoney(view.price.amountIdr)):null),
   h('p',{className:'dcs-muted'},view.usdDisplayAvailable?'Ekuivalen USD memakai kurs dari pemeriksaan ulang ini, bukan kurs hasil pencarian. Pembulatan ke atas per sen; acuan receipt tetap IDR.':'Metadata kurs review belum tersedia. Peninjauan tetap menggunakan IDR tanpa kurs pengganti.'),
   changed?h('p',{className:'dcs-warning',role:'alert'},'Harga IDR terbaru ',formatCustomerDomainMoney(view.price.amountIdr),' berbeda dari hasil pencarian ',formatCustomerDomainMoney(previous.current.amount),'. Belum ada pembayaran dibuat.'):null,
   h('p',{className:'dcs-muted'},'Berlaku sampai ',h('time',{dateTime:view.expiresAt},new Date(view.expiresAt).toLocaleString('id-ID'))),h('p',null,'Peninjauan diterima untuk situs yang sedang dikelola. Ini bukan reservasi domain, order, atau bukti pembayaran.')):null,
  h('p',null,'Checkout belum tersedia pada alur ini. Tidak ada pesanan atau pembayaran dibuat.'),
  h('button',{type:'button',className:'sv124-secondary',onClick:()=>setRetry(value=>value+1),disabled:shown.kind==='loading'},'Perbarui peninjauan'),
  h('button',{type:'button',className:'sv124-secondary',onClick:onClose},'Tutup peninjauan'));
}
