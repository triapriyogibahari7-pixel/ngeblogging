const DAY=86400000;
export const RENEWAL_WARNING_DAYS=60;
export function formatRenewalDate(value){const t=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(t)?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(t):null;}
export function daysUntil(value,now=Date.now()){const t=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(t)&&Number.isFinite(now)?Math.ceil((t-now)/DAY):null;}
export function renewalSummary({registrar,paidAt,imported=false}={},now=Date.now()){
 if(imported)return {kind:'imported',lines:['Domain ini terdaftar di registrar lain. Tanggal habis masa berlaku dan perpanjangan diurus di registrar asal Anda, bukan di Ngeblogging.']};
 const observed=registrar?.status==='observed'&&typeof registrar.expiresAt==='string';
 const rows=[['Tanggal pembelian',formatRenewalDate(paidAt)],['Tanggal terdaftar',observed?formatRenewalDate(registrar.registeredAt):null],['Tanggal habis masa berlaku',observed?formatRenewalDate(registrar.expiresAt):null]];
 if(!observed)return {kind:'unavailable',rows,lines:['Tanggal masa berlaku belum dapat dibaca dari registrar. Muat ulang halaman nanti.']};
 const left=daysUntil(registrar.expiresAt,now),expired=registrar.registrarStatus==='expired'||left!==null&&left<=0;
 const lines=[];
 if(expired)lines.push('Masa berlaku domain sudah berakhir. Segera hubungi dukungan untuk menyelamatkan domain.');
 else{lines.push('Sisa masa berlaku: '+left+' hari.');if(left<=RENEWAL_WARNING_DAYS)lines.push('Masa berlaku kurang dari '+RENEWAL_WARNING_DAYS+' hari. Pastikan perpanjangan sudah diurus.');}
 if(registrar.autoRenew===true)lines.push('Auto-renew aktif. Registrar memperpanjang otomatis sekitar 30 hari sebelum habis.');
 else if(registrar.autoRenew===false)lines.push('Auto-renew nonaktif. Domain tidak diperpanjang otomatis.');
 return {kind:expired?'expired':left<=RENEWAL_WARNING_DAYS?'soon':'ok',rows,lines,daysLeft:left,autoRenew:registrar.autoRenew};
}
export function renderRenewalInfo(summary,{node,card}){
 const kids=[node('h3','Masa berlaku domain')];
 for(const [label,value] of summary.rows||[]){if(value)kids.push(node('p',label+': '+value));}
 for(const line of summary.lines){const p=node('p',line);if(summary.kind==='soon'||summary.kind==='expired')p.className='warn';kids.push(p);}
 return card(...kids);
}
