const BASE='/api/commerce/domains/manage/';
export async function dnsApi(orderId,token,path,{method='GET',body,signal,fetchImpl=globalThis.fetch}={}){
 const r=await fetchImpl(BASE+encodeURIComponent(orderId)+'/'+path,{method,signal,cache:'no-store',credentials:'omit',headers:{authorization:'Bearer '+token,accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data={};try{data=await r.json();}catch{}
 if(!r.ok){throw Object.assign(new Error(data.code||'DNS_REQUEST_FAILED'),{code:data.code||'DNS_REQUEST_FAILED',status:r.status});}
 return data;
}
const MESSAGES={DOMAIN_NOT_REGISTERED:'Domain belum terkonfirmasi terdaftar.',ZONE_NOT_FOUND:'Zona DNS domain ini belum ditemukan di penyedia.',DNS_PROVIDER_PERMISSION_REQUIRED:'Izin token DNS penyedia belum cukup. Tidak ada perubahan dilakukan.',DNS_PROVIDER_NOT_CONFIGURED:'Layanan DNS belum dikonfigurasi di server.',DNS_PROVIDER_REJECTED:'Penyedia menolak perubahan. Periksa isi record.',INVALID_BACKUP:'Berkas cadangan tidak cocok dengan domain ini.',DOMAIN_DNS_RESTORE_PARTIAL:'Pemulihan berhenti di tengah jalan. Gunakan cadangan pengaman yang diunduh.'};
export const dnsErrorMessage=e=>MESSAGES[e?.code]||e?.message&&/^[A-Z_]+$/.test(e.message)&&('Permintaan ditolak ('+e.message+'). Tidak ada perubahan dipastikan.')||'Permintaan gagal. Tidak ada perubahan dipastikan.';
