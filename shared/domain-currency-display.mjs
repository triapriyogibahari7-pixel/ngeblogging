const bad=()=>{throw Object.assign(Error('DOMAIN_CURRENCY_UNVERIFIED'),{code:'DOMAIN_CURRENCY_UNVERIFIED'});};
const fields=['base','quote','rate','observedAt','expiresAt'];
function stamp(x){if(typeof x!=='string'||x.length>64||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(x)||!Number.isSafeInteger(Date.parse(x)))bad();return Date.parse(x);}
function micros(x){if(typeof x!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(x))bad();const [a,b='']=x.split('.'),n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n||n>1000000000000n)bad();return n;}
function amount(x){if(!Number.isSafeInteger(x)||x<1||x>1000000000000)bad();return BigInt(x);}
// Public display metadata, not payment or cost-basis authorization.
export function readCustomerCurrencyContext(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(k=>!Object.hasOwn(value,k))||value.base!=='USD'||value.quote!=='IDR')bad();
 micros(value.rate);const observed=stamp(value.observedAt),expires=stamp(value.expiresAt);
 if(observed<0||expires<=observed||expires-observed>86400000)bad();
 return Object.freeze({base:'USD',quote:'IDR',rate:value.rate,observedAt:value.observedAt,expiresAt:value.expiresAt});
}
export function createCustomerCurrencyContext(snapshot,{now=Date.now()}={}){
 if(snapshot?.environment!=='production'||snapshot.fx?.costBasisVerified!==true||!Number.isSafeInteger(now))bad();
 const f=snapshot.fx,c=readCustomerCurrencyContext({base:f.base,quote:f.quote,rate:f.rate,observedAt:f.observedAt,expiresAt:f.expiresAt});
 if(Date.parse(c.observedAt)>now||Date.parse(c.expiresAt)<=now)bad();return c;
}
// Round the displayed USD equivalent up to a cent; IDR remains authoritative.
export function usdEquivalentFromIdr(amountIdr,context,{now}={}){
 const n=amount(amountIdr),c=readCustomerCurrencyContext(context),r=micros(c.rate);
 if(!Number.isFinite(now)||now<0||now>8640000000000000||Date.parse(c.observedAt)>now||Date.parse(c.expiresAt)<=now)bad();
 const cents=(n*100000000n+r-1n)/r;if(cents<1n||cents>100000000000000n)bad();
 return (cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
}
export function formatCustomerDomainMoney(amountIdr,{currency='IDR',context,now}={}){
 try{amount(amountIdr);if(currency==='IDR')return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amountIdr);if(currency!=='USD')bad();return 'USD '+usdEquivalentFromIdr(amountIdr,context,{now});}
 catch{return currency==='USD'?'USD belum tersedia':'Harga belum tersedia';}
}
