const TARGET=25000n,MAX=1000000000000n;
const fail=()=>{throw Error('INVALID_DOMAIN_MIDTRANS_COSTS');};
function integer(value,min=0,max=1000000000000){
 if(!Number.isSafeInteger(value)||value<min||value>max)fail();
 return BigInt(value);
}
const ceil=(n,d)=>(n+d-1n)/d;
// Server-side calculation only. Inputs must come from verified IDR cost records.
// This module does not verify a registrar quote, FX, taxes or gateway fees.
export function calculateDomainMidtransAmount(input){
 if(!input||input.currency!=='IDR')fail();
 const registrar=integer(input.registrarCostIdr,1),other=integer(input.otherDirectCostsIdr);
 const fixed=integer(input.paymentFixedCostIdr),rate=integer(input.paymentFeeBasisPoints,0,9999);
 const base=registrar+other+fixed+TARGET;
 const amount=ceil(base*10000n,10000n-rate);
 if(amount>MAX)fail();
 const fee=fixed+ceil(amount*rate,10000n),margin=amount-registrar-other-fee;
 if(margin<TARGET)fail();
 return Object.freeze({currency:'IDR',amountIdr:Number(amount),registrarCostIdr:Number(registrar),otherDirectCostsIdr:Number(other),paymentFeeCeilingIdr:Number(fee),minimumMarginIdr:Number(TARGET),marginAfterEstimatedCostsIdr:Number(margin),costVerification:'required_from_caller',checkoutCreated:false,paymentStarted:false,registrationStarted:false});
}
