import {registrarCostInRupiah} from './domain-money-conversion.mjs';
export const DOMAIN_TARGET_MARGIN_IDR=25000;
const MAX=1000000000000;
const invalid=()=>new Error('INVALID_DOMAIN_PRICE_COSTS');
function integer(value,min=0,max=MAX){if(!Number.isSafeInteger(value)||value<min||value>max)throw invalid();return BigInt(value);}
const ceil=(n,d)=>(n+d-1n)/d;
export function minimumDomainSalePriceIdr(input){
 if(!input||input.currency!=='IDR')throw invalid();
 const registrar=integer(input.registrarCostIdr,1),other=integer(input.otherDirectCostsIdr),fixed=integer(input.paymentFixedFeeIdr),rate=integer(input.paymentRateBps,0,9999),step=integer(input.roundUpToIdr,1,1000000);
 const target=BigInt(DOMAIN_TARGET_MARGIN_IDR),base=registrar+other;
 const unrounded=ceil((base+fixed+target)*10000n,10000n-rate);
 const price=ceil(unrounded,step)*step;
 if(price>BigInt(MAX))throw invalid();
 const fee=fixed+ceil(price*rate,10000n),margin=price-base-fee;
 if(margin<target)throw invalid();
 return Object.freeze({currency:'IDR',totalPriceIdr:Number(price),registrarCostIdr:Number(registrar),otherDirectCostsIdr:Number(other),paymentFeeIdr:Number(fee),transactionMarginIdr:Number(margin),targetMarginIdr:DOMAIN_TARGET_MARGIN_IDR,roundUpToIdr:Number(step),indicative:true,costVerification:'not_performed',purchaseAllowed:false});
}
export function minimumDomainSalePriceFromRegistrar(input,{now=Date.now()}={}){
 if(!input)throw invalid();
 const cost=registrarCostInRupiah({amount:input.registrarPrice?.amount,currency:input.registrarPrice?.currency,fx:input.fx},now);
 const sale=minimumDomainSalePriceIdr({currency:'IDR',registrarCostIdr:cost.amountIdr,otherDirectCostsIdr:input.otherDirectCostsIdr,paymentFixedFeeIdr:input.paymentFixedFeeIdr,paymentRateBps:input.paymentRateBps,roundUpToIdr:input.roundUpToIdr});
 return Object.freeze({...sale,sourceCurrency:cost.sourceCurrency,fxSource:cost.fxSource,fxObservedAt:cost.fxObservedAt,fxExpiresAt:cost.fxExpiresAt});
}
