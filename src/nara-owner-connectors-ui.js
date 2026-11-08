import { supabase, supabaseConfigured } from './lib/supabase.js';
import { CONNECTOR_CATALOG } from '../shared/nara-connector-registry.mjs';
import './nara-flexible-connectors.css';
const OWNER_ID='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const OWNER_EMAIL='triapriyogibahari7@gmail.com';
let visible=false,allowed=false,revision=0,scheduled=false;
let status='Memeriksa izin konektor...';
const controllers=new Set();
function clear(){for(const c of controllers)c.abort();controllers.clear();document.querySelectorAll('.nara-owner-connectors,.nara-flexible-connectors').forEach(n=>n.remove());document.querySelectorAll('[data-nara-owner-upgrade-hidden]').forEach(n=>{n.hidden=false;n.removeAttribute('data-nara-owner-upgrade-hidden');});}
function revoke(){visible=false;allowed=false;revision++;clear();}
function el(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node;}
function owner(user){return user?.id===OWNER_ID&&typeof user.email==='string'&&user.email.trim().toLowerCase()===OWNER_EMAIL&&typeof user.email_confirmed_at==='string'&&Number.isFinite(Date.parse(user.email_confirmed_at))&&user.is_anonymous!==true;}
function redraw(){clear();schedule();}
async function api(path='',method='GET',payload){
 const current=revision,controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const {data}=await supabase.auth.getSession();if(current!==revision||!data.session?.access_token)throw Error('SESSION_CHANGED');
  const response=await fetch('/api/nara/connectors'+path,{method,headers:{authorization:`Bearer ${data.session.access_token}`,accept:'application/json',...(method==='GET'?{}:{'content-type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(payload||{})}),cache:'no-store',signal:controller.signal});
  if(current!==revision)throw Error('SESSION_CHANGED');
  if([401,403].includes(response.status)){allowed=false;status=response.status===401?'Sesi belum diterima server. Coba periksa akses lagi.':'Server belum memberikan akses admin konektor.';redraw();throw Error('ADMIN_REQUIRED');}
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('ENDPOINT_UNAVAILABLE');
  const value=await response.json();if(current!==revision)throw Error('SESSION_CHANGED');
  if(!response.ok)throw Error(value.code||'CONNECTOR_UNAVAILABLE');return value;
 }finally{clearTimeout(timer);controllers.delete(controller);}
}
async function renderList(list,output){
 const current=revision;const result=await api();if(!allowed||current!==revision||!list.isConnected)return;
 list.replaceChildren();
 for(const record of result.connections||[]){
  const row=el('section');row.append(el('strong',record.label),el('small',`${record.provider}: ${record.status}`));
  for(const [action,title] of [[record.enabled?'disconnect':'connect',record.enabled?'Putuskan':'Sambungkan'],['read','Baca metadata']]){
   const button=el('button',title);button.type='button';button.disabled=action==='read'&&!record.enabled;
   button.addEventListener('click',async()=>{button.disabled=true;try{const value=await api(`/${record.id}/${action}`,'POST',{});if(!allowed||current!==revision||!output.isConnected)return;output.textContent=action==='read'?JSON.stringify(value.data,null,2):'Status diperbarui.';await renderList(list,output);}catch{if(allowed&&current===revision&&output.isConnected)output.textContent='Permintaan belum berhasil. Periksa akses atau konfigurasi server.';}finally{button.disabled=false;}});row.append(button);
  }
  list.append(row);
 }
 if(!result.connections?.length)list.append(el('p','Belum ada koneksi tersimpan.'));
}
function mount(){
 if(!visible)return;
 document.querySelectorAll('.nara-assistant-shell').forEach(shell=>{
  const header=shell.querySelector('.nara-assistant-header');if(!header||shell.querySelector('.nara-flexible-connectors'))return;
  const menu=el('details');menu.className='nara-flexible-connectors';const summary=el('summary','Konektor'),panel=el('div');panel.className='nara-connector-popover';
  menu.append(summary,panel);header.after(menu);
  if(!allowed){
   const note=el('p',status);note.setAttribute('role','status');note.setAttribute('aria-live','polite');
   const retry=el('button','Periksa akses lagi');retry.type='button';retry.addEventListener('click',()=>refresh());
   panel.append(note,retry);menu.open=true;return;
  }
  const output=el('pre');output.setAttribute('role','status');output.setAttribute('aria-live','polite');
  const list=el('div'),form=el('form'),provider=el('select'),label=el('input'),token=el('input'),targets=el('div'),save=el('button','Simpan koneksi');
  provider.setAttribute('aria-label','Provider');for(const item of CONNECTOR_CATALOG){const option=el('option',item.label);option.value=item.id;provider.append(option);}
  label.placeholder='Nama koneksi';label.setAttribute('aria-label','Nama koneksi');label.required=true;label.maxLength=80;
  token.type='password';token.autocomplete='new-password';token.placeholder='Token API khusus provider';token.setAttribute('aria-label','Token API');token.required=true;token.maxLength=8192;
  function fields(){token.value='';targets.replaceChildren();const names=provider.value==='github'?['repository']:provider.value==='supabase'?['projectRef']:provider.value==='cloudflare-one-waf'?['accountId','zoneId']:['accountId'];for(const name of names){const input=el('input');input.name=name;input.placeholder=name;input.setAttribute('aria-label',name);input.required=true;targets.append(input);}}
  provider.addEventListener('change',fields);fields();save.type='submit';form.append(provider,label,targets,token,save);
  form.addEventListener('submit',async event=>{event.preventDefault();if(!allowed)return;const current=revision;save.disabled=true;const config={provider:provider.value,label:label.value};targets.querySelectorAll('input').forEach(input=>{config[input.name]=input.value.trim();});const secret=token.value;token.value='';try{await api('','POST',{config,token:secret});if(!allowed||current!==revision||!form.isConnected)return;output.textContent='Tersimpan, belum tersambung. Gunakan Sambungkan untuk memverifikasi akses.';await renderList(list,output);}catch{if(allowed&&current===revision&&output.isConnected)output.textContent='Gagal menyimpan. Periksa token, target, dan konfigurasi server.';}finally{save.disabled=false;}});
  panel.append(el('p','Khusus admin. Akses metadata baca-saja. Supabase memerlukan token Management API; token tidak disimpan di browser.'),list,form,output);
  menu.addEventListener('toggle',()=>{if(menu.open&&allowed)renderList(list,output).catch(()=>{if(output.isConnected)output.textContent='Tidak dapat memuat koneksi.';});else{token.value='';output.textContent='';}});
 });
}
function schedule(){if(!visible||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});}
async function refresh(){
 revoke();status='Memeriksa izin konektor...';const current=revision;
 try{
  // Verified Auth identity permits only the diagnostic shell, never connector access.
  const {data,error}=await supabase.auth.getUser();if(current!==revision||error||!owner(data.user))return;
  visible=true;schedule();
  try{
   const value=await api('/access');if(current!==revision)return;
   if(value.admin!==true){status='Server belum memberikan akses admin konektor.';throw Error('ADMIN_REQUIRED');}
   allowed=true;redraw();
  }catch(error){
   if(current!==revision||!visible)return;
   allowed=false;
   if(error.message!=='ADMIN_REQUIRED')status='Pemeriksaan konektor belum berhasil. Endpoint atau konfigurasi server belum tersedia. Tekan Periksa akses lagi.';
   redraw();
  }
 }catch{if(current===revision)revoke();}
}
if(supabaseConfigured&&supabase){new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});supabase.auth.onAuthStateChange(()=>{revoke();setTimeout(refresh,0);});document.addEventListener('visibilitychange',()=>{if(document.hidden)revoke();else refresh();});refresh();}
