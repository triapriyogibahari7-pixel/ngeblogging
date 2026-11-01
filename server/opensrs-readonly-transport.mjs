import {createHash} from 'node:crypto';
const ENDPOINTS=Object.freeze({test:'https://horizon.opensrs.net:55443/',live:'https://rr-n1-tor.opensrs.net:55443/'});
const MAX_BYTES=262144;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const md5=value=>createHash('md5').update(value,'utf8').digest('hex');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function buildOpenSRSReadOnlyRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!['lookup','get_price'].includes(input.action))fail('OPENSRS_READ_ONLY_COMMAND_REQUIRED');
 const keys=input.action==='lookup'?['action','domain']:['action','domain','period','regType'];
 if(Object.keys(input).some(key=>!keys.includes(key)))fail('OPENSRS_INVALID_COMMAND');
 if(typeof input.domain!=='string')fail('OPENSRS_INVALID_DOMAIN');
 const domain=input.domain;
 if(domain.length>253||domain!==domain.toLowerCase()||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').length<2||domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))fail('OPENSRS_INVALID_DOMAIN');
 const attributes={domain};
 if(input.action==='lookup')attributes.no_cache='1';
 else{
  const period=input.period??1,regType=input.regType??'new';
  if(!Number.isInteger(period)||period<1||period>10||!['new','renewal','transfer'].includes(regType))fail('OPENSRS_INVALID_PRICE_REQUEST');
  attributes.period=String(period);attributes.reg_type=regType;
 }
 const items=Object.entries(attributes).map(([key,value])=>'<item key="'+key+'">'+escape(value)+'</item>').join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="no"?><OPS_envelope><header><version>0.9</version></header><body><data_block><dt_assoc><item key="protocol">XCP</item><item key="action">'+input.action.toUpperCase()+'</item><item key="object">DOMAIN</item><item key="attributes"><dt_assoc>'+items+'</dt_assoc></item></dt_assoc></data_block></body></OPS_envelope>';
}
export function createOpenSRSReadOnlyTransport({environment,username,apiKey,timeoutMs=10000,fetchImpl=globalThis.fetch}={}){
 if(!Object.hasOwn(ENDPOINTS,environment)||typeof username!=='string'||!/^[A-Za-z0-9_.@-]{1,128}$/.test(username)||typeof apiKey!=='string'||!apiKey.length||apiKey.length>8192||/[\u0000-\u001f\u007f]/.test(apiKey)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||typeof fetchImpl!=='function')fail('OPENSRS_CONFIGURATION_UNAVAILABLE');
 return Object.freeze({
  async request(input,{signal}={}){
   const xml=buildOpenSRSReadOnlyRequest(input);
   if(signal?.aborted)fail('OPENSRS_REQUEST_ABORTED');
   const controller=new AbortController();let reader,stop;
   const ended=new Promise((_,reject)=>{stop=()=>reject(Object.assign(new Error('OPENSRS_REQUEST_ABORTED'),{code:'OPENSRS_REQUEST_ABORTED'}));controller.signal.addEventListener('abort',stop,{once:true});});
   const abort=()=>controller.abort(),timer=setTimeout(abort,timeoutMs),wait=promise=>Promise.race([promise,ended]);
   signal?.addEventListener('abort',abort,{once:true});
   try{
    const response=await wait(fetchImpl(ENDPOINTS[environment],{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',headers:{'content-type':'text/xml; charset=utf-8',accept:'text/xml, application/xml','x-username':username,'x-signature':md5(md5(xml+apiKey)+apiKey)},body:xml,signal:controller.signal}));
    if(response.status!==200){try{Promise.resolve(response.body?.cancel()).catch(()=>{});}catch{}fail([401,403].includes(response.status)?'OPENSRS_AUTH_REJECTED':response.status===429?'OPENSRS_RATE_LIMITED':'OPENSRS_HTTP_REJECTED');}
    reader=response.body?.getReader();
    if(!reader)fail('OPENSRS_RESPONSE_UNVERIFIED');
    if(!['text/xml','application/xml'].includes(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()))fail('OPENSRS_RESPONSE_UNVERIFIED');
    let size=0;const chunks=[];
    for(;;){const part=await wait(reader.read());if(part.done)break;if(!(part.value instanceof Uint8Array))fail('OPENSRS_RESPONSE_UNVERIFIED');size+=part.value.byteLength;if(size>MAX_BYTES)fail('OPENSRS_RESPONSE_UNVERIFIED');chunks.push(part.value);}
    const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
    let responseXml;try{responseXml=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('OPENSRS_RESPONSE_UNVERIFIED');}
    if(!responseXml.trim())fail('OPENSRS_RESPONSE_UNVERIFIED');
    if(controller.signal.aborted||signal?.aborted)fail('OPENSRS_REQUEST_ABORTED');
    return {providerId:'opensrs',environment,responseXml};
   }catch(error){
    if(controller.signal.aborted)fail('OPENSRS_REQUEST_ABORTED');
    if(['OPENSRS_AUTH_REJECTED','OPENSRS_RATE_LIMITED','OPENSRS_HTTP_REJECTED','OPENSRS_RESPONSE_UNVERIFIED'].includes(error?.code))fail(error.code);
    fail('OPENSRS_TRANSPORT_UNAVAILABLE');
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);controller.abort();
    if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
   }
  }
 });
}
