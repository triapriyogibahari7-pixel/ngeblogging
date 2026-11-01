const SCALE=1000000n,MAX=1000000000000n;
const invalid=()=>new Error('INVALID_DOMAIN_CURRENCY_CONVERSION');
const ceil=(n,d)=>(n+d-1n)/d;
function decimal(value){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value))throw invalid();
 const [whole,fraction='']=value.split('.');return BigInt(whole)*SCALE+BigInt(fraction.padEnd(6,'0'));
}
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))throw invalid();const n=Date.parse(value);if(!Number.isFinite(n))throw invalid();return n;}
export function registrarCostInRupiah({amount,currency,fx}={},now=Date.now()){
 if(!Number.isFinite(now)||Math.abs(now)>8640000000000000)throw invalid();
 const value=decimal(amount);let converted,fxSource=null,fxObservedAt=null,fxExpiresAt=null;
 if(currency==='IDR')converted=ceil(value,SCALE);
 else if(currency==='USD'){
  if(fx?.base!=='USD'||fx?.quote!=='IDR'||typeof fx.source!=='string'||!fx.source.trim()||fx.source.length>200)throw invalid();
  const rate=decimal(fx.rate),observed=timestamp(fx.observedAt),expires=timestamp(fx.expiresAt);
  if(rate<=0n||rate>1000000n*SCALE||observed>now||expires<=now||expires<=observed||expires-observed>86400000)throw invalid();
  converted=ceil(value*rate,SCALE*SCALE);fxSource=fx.source;fxObservedAt=fx.observedAt;fxExpiresAt=fx.expiresAt;
 }else throw invalid();
 if(converted<=0n||converted>MAX)throw invalid();
 return Object.freeze({currency:'IDR',amountIdr:Number(converted),sourceCurrency:currency,fxSource,fxObservedAt,fxExpiresAt,costVerification:'not_performed'});
}
