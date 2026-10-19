import React,{useEffect,useRef} from 'react';
import {supabase} from '../../services/accountSettings';
import {mount} from '../../site-favicon-bridge.js';
export default function SiteFaviconPanel({site}){
 const ref=useRef(null);
 useEffect(()=>{const node=ref.current;let live=true;(async()=>{try{const [auth,record]=await Promise.all([supabase.auth.getUser(),supabase.from('sites').select('id,name,slug,settings').eq('id',site.id).single()]);if(auth.error)throw auth.error;if(!auth.data.user)throw Error('Silakan masuk kembali.');if(record.error)throw record.error;if(live&&node.isConnected)await mount(node,{user:auth.data.user,site:record.data});}catch(e){if(live)node.textContent=e.message;}})();return()=>{live=false;node.replaceChildren();};},[site.id]);
 return <section className="nb-section"><h2>Favicon situs aktif</h2><p>{site.name} · Upload, ganti, atau kembalikan ke logo bawaan Ngeblogging. Perubahan favicon disimpan terpisah dari draf pengaturan lainnya.</p><div ref={ref} role="region" aria-label="Pengelolaan favicon">Memuat favicon…</div></section>;
}
