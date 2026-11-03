// Merchant-approved selling-price budget. Reserves are not actual fees or assessed VAT.
export const DOMAIN_REFERENCE_SALE_POLICY=Object.freeze({version:'reference-budget-20261103-v1',mode:'public_reference_budget',registrarReserveBasisPoints:2000,paymentReserveBasisPoints:400,paymentFixedReserveIdr:5000,targetMarginIdr:25000,roundingIncrementIdr:1000,actualCostsVerified:false,netMarginGuaranteed:false,merchantAbsorbsOverrun:true});
const fail=code=>{throw Object.assign(new Error(code),{code});};
const ceil=(n,d)=>(n+d-1n)/d;
const LIMIT=1000000000000n;
// Internal arithmetic only. Caller must obtain and validate registrar and FX references.
// This function does not create a quote, persist a price, or authorize payment.
export function buildDomainReferenceSalePrice(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!Object.hasOwn(input,'referenceRegistrarCostIdr'))fail('INVALID_REFERENCE_PRICE_INPUT');
 const value=input.referenceRegistrarCostIdr;
 if(!Number.isSafeInteger(value)||value<=0||value>Number(LIMIT))fail('INVALID_REFERENCE_REGISTRAR_COST');
 const p=DOMAIN_REFERENCE_SALE_POLICY,r=BigInt(value);
 const registrarReserve=ceil(r*BigInt(p.registrarReserveBasisPoints),10000n);
 const required=ceil((r+registrarReserve+BigInt(p.targetMarginIdr)+BigInt(p.paymentFixedReserveIdr))*10000n,10000n-BigInt(p.paymentReserveBasisPoints));
 const increment=BigInt(p.roundingIncrementIdr),sale=ceil(required,increment)*increment;
 if(sale>LIMIT)fail('REFERENCE_SALE_PRICE_OUT_OF_RANGE');
 const paymentReserve=BigInt(p.paymentFixedReserveIdr)+ceil(sale*BigInt(p.paymentReserveBasisPoints),10000n);
 const modelMargin=sale-r-registrarReserve-paymentReserve;
 if(modelMargin<BigInt(p.targetMarginIdr))fail('REFERENCE_BUDGET_MARGIN_NOT_MET');
 return {mode:p.mode,policyVersion:p.version,currency:'IDR',amountIdr:Number(sale),referenceRegistrarCostIdr:value,registrarReserveIdr:Number(registrarReserve),paymentReserveIdr:Number(paymentReserve),targetMarginIdr:p.targetMarginIdr,modelMarginIdr:Number(modelMargin),roundingSurplusIdr:Number(modelMargin)-p.targetMarginIdr,taxStatus:'not_assessed',actualCostsVerified:false,netMarginGuaranteed:false,merchantAbsorbsOverrun:true,quoteCreated:false,checkoutCreated:false,registrationStarted:false};
}
