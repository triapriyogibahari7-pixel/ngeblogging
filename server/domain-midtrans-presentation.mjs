// Returns only a public Client Key. Never expose, log, or persist Server Keys here.
export function domainMidtransPopupClientKey(env,production=true){
 const environment=production?'production':'sandbox';
 const prefix=production?'DOMAIN_MIDTRANS_PRODUCTION_':'DOMAIN_MIDTRANS_SANDBOX_';
 const valid=value=>typeof value==='string'&&value.length<=220&&/^(SB-)?Mid-client-[A-Za-z0-9_-]+$/.test(value)&&value.startsWith('SB-')===!production;
 const explicit=env?.[prefix+'CLIENT_KEY'];
 if(explicit!==undefined){const key=typeof explicit==='string'?explicit.trim():explicit;return valid(key)?key:null;}
 const domainServer=env?.[prefix+'SERVER_KEY'];
 const serverPattern=production?/^Mid-server-[A-Za-z0-9_-]{10,200}$/:/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/;
 if(env?.MIDTRANS_ENV!==environment||typeof domainServer!=='string'||!serverPattern.test(domainServer)||domainServer!==env?.MIDTRANS_SERVER_KEY)return null;
 const key=typeof env?.MIDTRANS_CLIENT_KEY==='string'?env.MIDTRANS_CLIENT_KEY.trim():null;
 return valid(key)?key:null;
}
