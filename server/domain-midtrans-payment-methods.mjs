export const DOMAIN_MIDTRANS_PAYMENT_METHODS=Object.freeze(['qris','bca_va','bni_va','bri_va','permata_va','other_va','echannel','other_qris','danamon_va','seabank_va','bsi_va','cimb_va']);
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function parseDomainMidtransPaymentMethods(raw){
 if(raw===undefined||raw===null||raw==='')fail('CHECKOUT_PAYMENT_METHODS_MISSING');
 if(typeof raw!=='string'||raw.length>4096)fail('CHECKOUT_PAYMENT_METHODS_INVALID');
 let methods;try{methods=JSON.parse(raw);}catch{fail('CHECKOUT_PAYMENT_METHODS_INVALID');}
 if(!Array.isArray(methods)||methods.length<1||methods.length>DOMAIN_MIDTRANS_PAYMENT_METHODS.length||new Set(methods).size!==methods.length||methods.some(value=>typeof value!=='string'||!DOMAIN_MIDTRANS_PAYMENT_METHODS.includes(value)))fail('CHECKOUT_PAYMENT_METHODS_INVALID');
 return methods;
}
