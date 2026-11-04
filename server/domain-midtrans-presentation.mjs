import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
// Returns only a public Client Key. Never expose, log, or persist Server Keys here.
export function domainMidtransPopupClientKey(env,production=true){
 const environment=production?'production':'sandbox';
 const prefix=production?'DOMAIN_MIDTRANS_PRODUCTION_':'DOMAIN_MIDTRANS_SANDBOX_';
 const valid=value=>typeof value==='string'&&value.length<=220&&/^(SB-)?Mid-client-[A-Za-z0-9_-]+$/.test(value)&&value.startsWith('SB-')===!production;
 const explicit=env?.[prefix+'CLIENT_KEY'];
 if(explicit!==undefined){const key=typeof explicit==='string'?explicit.trim():explicit;return valid(key)?key:null;}
 if(env?.MIDTRANS_ENV!==environment)return null;
 try{const domainServer=normalizeDomainMidtransServerKey(env?.[prefix+'SERVER_KEY'],{environment});const sharedServer=normalizeDomainMidtransServerKey(env?.MIDTRANS_SERVER_KEY,{environment});if(domainServer!==sharedServer)return null;}catch{return null;}
 const key=typeof env?.MIDTRANS_CLIENT_KEY==='string'?env.MIDTRANS_CLIENT_KEY.trim():null;
 return valid(key)?key:null;
}
