const validAmount=value=>typeof value==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value);
const invalid=()=>new Error('INVALID_INDICATIVE_OFFER_VIEW');
export function expiredRegistrarOfferView(domain){return {domain,message:'Harga sementara sudah kedaluwarsa. Periksa kembali untuk mendapatkan harga terbaru.'};}
export function readRegistrarOfferView(data,{domain,now=Date.now()}={}){
 if(typeof domain!=='string'||!domain||!Number.isFinite(now))throw invalid();
 if(data?.code!=='REGISTRAR_CHECK'||data?.domain!==domain||data?.providerId!=='cloudflare'||data?.status!=='checked'||data?.registrable!==true||data?.tier!=='standard'||data?.lookupOnly!==true||data?.purchaseAllowed!==false||data?.mustRecheckBeforePurchase!==true||data?.offerStatus!=='indicative_offer')throw invalid();
 const o=data.offer;
 if(o?.contract!=='registrar-check-indicative-v1'||o?.domain!==domain||o?.providerId!=='cloudflare'||o?.registrable!==true||o?.tier!=='standard'||o?.indicative!==true||o?.mustRecheckBeforePurchase!==true||o?.purchaseAllowed!==false||o?.ownership!=='not_acquired'||o?.connectedToSite!==false||o?.registrantEligibility!=='not_checked'||o?.taxStatus!=='unknown'||typeof o?.quoteId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(o.quoteId))throw invalid();
 if(typeof o.checkedAt!=='string'||typeof o.expiresAt!=='string'||data.checkedAt!==o.checkedAt)throw invalid();
 const checked=Date.parse(o.checkedAt),expires=Date.parse(o.expiresAt);
 if(!Number.isFinite(checked)||!Number.isFinite(expires)||checked>now||expires<=checked||expires-checked>300000)throw invalid();
 const p=o.prices,registration=p?.registration,renewal=p?.renewal;
 if(!validAmount(registration?.amount)||!validAmount(renewal?.amount)||registration.termYears!==1||renewal.termYears!==1||typeof registration.currency!=='string'||!/^[A-Z]{3}$/.test(registration.currency)||registration.currency!==renewal.currency||registration.taxIncluded!==null||renewal.taxIncluded!==null||p?.transfer?.status!=='not_quoted')throw invalid();
 if(now>=expires)return expiredRegistrarOfferView(domain);
 return {domain,message:'Domain dapat didaftarkan menurut pemeriksaan saat ini. Harga ini sementara, bukan tagihan final.',currency:registration.currency,registration:registration.amount,renewal:renewal.amount,checkedAt:o.checkedAt,expiresAt:o.expiresAt,quoteId:o.quoteId};
}
