import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
const PREFIX='NDR2',PURPOSE='ngeblogging/domain-review/production/registration/v2',MAX_AGE=120000;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const FIELDS=['v','reviewId','userId','siteId','environment','providerId','registrarAccountRef','operation','domain','currency','amountIdr','years','issuedAt','expiresAt'];
const bad=()=>{throw Object.assign(Error('DOMAIN_PROVIDER_REVIEW_UNVERIFIED'),{code:'DOMAIN_PROVIDER_REVIEW_UNVERIFIED'});};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function id(x){if(typeof x!=='string'||!UUID.test(x))bad();return x.toLowerCase();}
function provider(x){if(x!=='cloudflare'&&x!=='opensrs')bad();return x;}
function account(x){if(typeof x!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(x))bad();return x;}
function domain(x){if(typeof x!=='string'||x.length>253||x!==x.toLowerCase()||!x.includes('.')||/^\d+(?:\.\d+){3}$/.test(x)||x.split('.').some(p=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p)))bad();try{if(new URL('https://'+x).hostname!==x)bad();}catch{bad();}return x;}
function clock(x){if(!Number.isSafeInteger(x)||x<0||x>8640000000000000)bad();return x;}
function stamp(x){if(typeof x!=='string'||x.length>64||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x))bad();return clock(Date.parse(x));}
function decode(x,max){if(typeof x!=='string'||!x.length||x.length>max||!/^[A-Za-z0-9_-]+$/.test(x))bad();const b=Buffer.from(x,'base64url');if(b.toString('base64url')!==x)bad();return b;}
function keyBytes(x){let b;try{b=typeof x==='string'?decode(x,64):x instanceof Uint8Array?Buffer.from(x):null;}catch{}if(!b||b.length!==32)throw Object.assign(Error('DOMAIN_REVIEW_KEY_UNAVAILABLE'),{code:'DOMAIN_REVIEW_KEY_UNAVAILABLE'});return b;}
const mac=(body,key)=>createHmac('sha256',key).update(PURPOSE+'\0'+PREFIX+'.'+body,'utf8').digest();
function validate(p,now){
 if(!plain(p)||Object.keys(p).length!==FIELDS.length||FIELDS.some(k=>!Object.hasOwn(p,k))||p.v!==2)bad();
 if(p.reviewId!==id(p.reviewId)||p.userId!==id(p.userId)||p.siteId!==id(p.siteId))bad();
 provider(p.providerId);account(p.registrarAccountRef);domain(p.domain);clock(now);clock(p.issuedAt);clock(p.expiresAt);
 if(p.environment!=='production'||p.operation!=='registration'||p.currency!=='IDR'||p.years!==1||!Number.isSafeInteger(p.amountIdr)||p.amountIdr<1||p.amountIdr>1000000000000||p.issuedAt>now||p.expiresAt<=now||p.expiresAt<=p.issuedAt||p.expiresAt-p.issuedAt>MAX_AGE)bad();
 return p;
}
// Server-only. Pass only fresh server-computed checks after ownership validation.
// registrarAccountRef must be an opaque nonsecret account reference, never a credential.
// The payload is readable base64url, not encrypted. This is NOT an order, consent,
// payment proof, replay ledger, reservation, or permission to register a domain.
export function issueProviderDomainReviewReceipt(check,{key,userId,siteId,providerId,registrarAccountRef,now=Date.now(),makeId=randomUUID}={}){
 const bytes=keyBytes(key),owner=id(userId),site=id(siteId),selected=provider(providerId),ref=account(registrarAccountRef);clock(now);
 const q=check?.quoteContext,p=check?.price;
 if(!plain(q)||Object.keys(q).length!==2||q.providerId!==selected||q.registrarAccountRef!==ref||check.code!=='DOMAIN_CUSTOMER_PRICE_CHECK'||check.environment!=='production'||check.siteId!==site||check.availability!=='available'||check.indicative!==true||check.purchaseAllowed!==false||check.checkoutAvailable!==false||typeof makeId!=='function')bad();
 const at=stamp(check.checkedAt),until=stamp(check.expiresAt);
 if(at>now||now-at>30000||until<=now||until<=at||until-at>300000||p?.currency!=='IDR'||p.termYears!==1||p.indicative!==true||p.purchaseAllowed!==false||p.expiresAt!==check.expiresAt)bad();
 const claims=validate({v:2,reviewId:id(makeId()),userId:owner,siteId:site,environment:'production',providerId:selected,registrarAccountRef:ref,operation:'registration',domain:domain(check.domain),currency:'IDR',amountIdr:p.amountIdr,years:1,issuedAt:now,expiresAt:Math.min(until,now+MAX_AGE)},now);
 const body=Buffer.from(JSON.stringify(claims),'utf8').toString('base64url'),token=PREFIX+'.'+body+'.'+mac(body,bytes).toString('base64url');
 return Object.freeze({token,reviewId:claims.reviewId,siteId:site,domain:claims.domain,quoteContext:Object.freeze({providerId:selected,registrarAccountRef:ref}),price:Object.freeze({currency:'IDR',amountIdr:claims.amountIdr,termYears:1}),issuedAt:new Date(now).toISOString(),expiresAt:new Date(claims.expiresAt).toISOString(),purchaseAllowed:false,checkoutAvailable:false});
}
export function verifyProviderDomainReviewReceipt(token,{key,userId,siteId,providerId,registrarAccountRef,domain:expectedDomain,expectedAmountIdr,now=Date.now()}={}){
 const bytes=keyBytes(key),owner=id(userId),site=id(siteId),selected=provider(providerId),ref=account(registrarAccountRef),name=domain(expectedDomain);clock(now);
 if(expectedAmountIdr!==undefined&&(!Number.isSafeInteger(expectedAmountIdr)||expectedAmountIdr<1||expectedAmountIdr>1000000000000))bad();
 if(typeof token!=='string'||token.length>4096)bad();const parts=token.split('.');if(parts.length!==3||parts[0]!==PREFIX)bad();
 const raw=decode(parts[1],3072),provided=decode(parts[2],64),expected=mac(parts[1],bytes);
 if(raw.length>2048||provided.length!==expected.length||!timingSafeEqual(provided,expected))bad();
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{bad();}validate(p,now);
 if(p.userId!==owner||p.siteId!==site||p.providerId!==selected||p.registrarAccountRef!==ref||p.domain!==name||(expectedAmountIdr!==undefined&&p.amountIdr!==expectedAmountIdr))bad();
 return Object.freeze({...p,purchaseAllowed:false,checkoutAvailable:false});
}
