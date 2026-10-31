const invalid=()=>new Error('INVALID_REGISTRAR_SEARCH_VIEW');
const amount=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v);
const reasons=new Set(['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration','domain_premium','domain_unavailable','unknown_restriction']);
export function normalizeRegistrarSearchInput(value){
 if(typeof value!=='string')throw invalid();
 const query=value.trim().replace(/ +/g,' ');
 if(!query||query.length>100||query.startsWith('.')||!/^[\p{L}\p{M}\p{N} .-]+$/u.test(query))throw invalid();
 return query;
}
export function readRegistrarSearchView(data,{query,requestStartedAt,receivedAt}={}){
 if(normalizeRegistrarSearchInput(query)!==query||!Number.isFinite(requestStartedAt)||!Number.isFinite(receivedAt)||requestStartedAt<0||receivedAt<requestStartedAt)throw invalid();
 if(data?.code!=='REGISTRAR_SEARCH'||data?.query!==query||data?.providerId!=='cloudflare'||data?.status!=='search_results'||data?.lookupOnly!==true||data?.purchaseAllowed!==false||data?.advisory!==true||data?.mustRecheckBeforePurchase!==true||data?.limit!==50||!Array.isArray(data.domains)||data.domains.length>50||data.count!==data.domains.length||typeof data.searchedAt!=='string')throw invalid();
 const checked=Date.parse(data.searchedAt),reference=checked+receivedAt-requestStartedAt;
 if(!Number.isFinite(checked)||!Number.isFinite(reference)||Math.abs(checked+60000)>8640000000000000)throw invalid();
 const candidates=data.domains.map(row=>{
  const name=row?.domain;
  if(typeof name!=='string'||name.length>253||name!==name.toLowerCase()||name.split('.').length<2||/^\d+(?:\.\d+){3}$/.test(name)||name.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||row.advisory!==true||row.mustRecheckBeforePurchase!==true||row.purchaseAllowed!==false)throw invalid();
  const available=row.searchAvailability==='appears_available',unavailable=row.searchAvailability==='appears_unavailable',unknown=row.searchAvailability==='not_confirmed';
  if(!available&&!unavailable&&!unknown||available&&(row.reason!==null||!['standard','premium'].includes(row.tier))||unavailable&&row.reason!=='domain_unavailable'||unknown&&(!reasons.has(row.reason)||row.reason==='domain_unavailable'))throw invalid();
  let prices=null;
  if(row.prices!==null){const p=row.prices;if(typeof p?.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||!amount(p.registration?.amount)||!amount(p.renewal?.amount)||p.registration.termYears!==1||p.renewal.termYears!==1||p.taxIncluded!==null)throw invalid();prices={currency:p.currency,registration:p.registration.amount,renewal:p.renewal.amount};}
  if(available&&!prices)throw invalid();
  return {domain:name,status:available?'Tampak tersedia':unavailable?'Tampak sudah terdaftar':row.reason==='extension_not_supported'||row.reason==='extension_not_supported_via_api'?'Belum didukung melalui registrar ini':'Ketersediaan belum terkonfirmasi',canCheck:available&&row.tier==='standard',premium:row.tier==='premium',prices};
 });
 if(new Set(candidates.map(row=>row.domain)).size!==candidates.length)throw invalid();
 if(!candidates.length)return {domain:query,message:'Tidak ada saran dari registrar untuk pencarian ini. Ini bukan bukti semua domain tidak tersedia.'};
 if(reference>=checked+60000)return {domain:query,message:'Hasil pencarian sementara sudah kedaluwarsa. Cari ulang untuk hasil terbaru.'};
 return {domain:query,message:candidates.length+' kandidat dari registrar. Ketersediaan dan harga masih sementara; pilih Periksa harga untuk pemeriksaan terbaru.',candidates,expiresAt:new Date(checked+60000).toISOString(),clockAnchorMs:reference,monotonicAnchorMs:receivedAt};
}
