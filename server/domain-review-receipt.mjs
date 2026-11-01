import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
const PREFIX='NDR1',PURPOSE='ngeblogging/domain-review/opensrs/live/registration/v1',MAX_AGE=120000;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fields=['v','reviewId','userId','siteId','domain','currency','amountIdr','years','issuedAt','expiresAt'];
const bad=()=>{throw Object.assign(new Error('DOMAIN_REVIEW_UNVERIFIED'),{code:'DOMAIN_REVIEW_UNVERIFIED'});};
function id(value){if(typeof value!=='string'||!UUID.test(value))bad();return value.toLowerCase();}
function domain(value){if(typeof value!=='string'||value.length>253||value!==value.toLowerCase()||!value.includes('.')||/^\d+(?:\.\d+){3}$/.test(value)||value.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))bad();try{if(new URL('https://'+value).hostname!==value)bad();}catch{bad();}return value;}
function clock(value){if(!Number.isSafeInteger(value)||value<0||value>8640000000000000)bad();return value;}
function stamp(value){if(typeof value!=='string'||value.length>64||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))bad();return clock(Date.parse(value));}
function decode(value,max){if(typeof value!=='string'||!value.length||value.length>max||!/^[A-Za-z0-9_-]+$/.test(value))bad();const bytes=Buffer.from(value,'base64url');if(bytes.toString('base64url')!==value)bad();return bytes;}
function secret(value){let bytes;try{bytes=typeof value==='string'?decode(value,64):value instanceof Uint8Array?Buffer.from(value):null;}catch{}if(!bytes||bytes.length!==32)throw Object.assign(new Error('DOMAIN_REVIEW_KEY_UNAVAILABLE'),{code:'DOMAIN_REVIEW_KEY_UNAVAILABLE'});return bytes;}
const signature=(payload,key)=>createHmac('sha256',key).update(PURPOSE+'\0'+PREFIX+'.'+payload,'utf8').digest();
function validate(value,now){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key))||value.v!==1||value.reviewId!==id(value.reviewId)||value.userId!==id(value.userId)||value.siteId!==id(value.siteId))bad();
 domain(value.domain);clock(now);clock(value.issuedAt);clock(value.expiresAt);
 if(value.currency!=='IDR'||value.years!==1||!Number.isSafeInteger(value.amountIdr)||value.amountIdr<1||value.amountIdr>1000000000000||value.issuedAt>now||value.expiresAt<=now||value.expiresAt<=value.issuedAt||value.expiresAt-value.issuedAt>MAX_AGE)bad();
 return value;
}
// Server-only review receipt. Never use this as consent, payment proof, or a replay ledger.
export function issueDomainReviewReceipt(check,{key,userId,siteId,now=Date.now(),makeId=randomUUID}={}){
 const signingKey=secret(key),owner=id(userId),site=id(siteId);clock(now);
 if(check?.code!=='DOMAIN_CUSTOMER_PRICE_CHECK'||check.environment!=='production'||check.siteId!==site||check.availability!=='available'||check.indicative!==true||check.purchaseAllowed!==false||check.checkoutAvailable!==false||typeof makeId!=='function')bad();
 const checkedAt=stamp(check.checkedAt),upstreamExpiry=stamp(check.expiresAt),p=check.price;
 if(checkedAt>now||now-checkedAt>30000||upstreamExpiry<=now||upstreamExpiry<=checkedAt||upstreamExpiry-checkedAt>300000||p?.currency!=='IDR'||p.termYears!==1||p.indicative!==true||p.purchaseAllowed!==false||p.expiresAt!==check.expiresAt)bad();
 const payload=validate({v:1,reviewId:id(makeId()),userId:owner,siteId:site,domain:domain(check.domain),currency:'IDR',amountIdr:p.amountIdr,years:1,issuedAt:now,expiresAt:Math.min(upstreamExpiry,now+MAX_AGE)},now);
 const encoded=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url'),token=PREFIX+'.'+encoded+'.'+signature(encoded,signingKey).toString('base64url');
 return Object.freeze({token,reviewId:payload.reviewId,siteId:site,domain:payload.domain,price:Object.freeze({currency:'IDR',amountIdr:payload.amountIdr,termYears:1}),issuedAt:new Date(now).toISOString(),expiresAt:new Date(payload.expiresAt).toISOString(),purchaseAllowed:false,checkoutAvailable:false});
}
export function verifyDomainReviewReceipt(token,{key,userId,siteId,domain:expectedDomain,expectedAmountIdr,now=Date.now()}={}){
 const signingKey=secret(key),owner=id(userId),site=id(siteId),name=domain(expectedDomain);clock(now);
 if(typeof token!=='string'||token.length>4096)bad();const parts=token.split('.');if(parts.length!==3||parts[0]!==PREFIX)bad();
 const bytes=decode(parts[1],2048),mac=decode(parts[2],64),expected=signature(parts[1],signingKey);
 if(bytes.length>1536||mac.length!==expected.length||!timingSafeEqual(mac,expected))bad();
 let payload;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{bad();}validate(payload,now);
 if(payload.userId!==owner||payload.siteId!==site||payload.domain!==name||(expectedAmountIdr!==undefined&&payload.amountIdr!==expectedAmountIdr))bad();
 return Object.freeze({...payload,purchaseAllowed:false,checkoutAvailable:false});
}
