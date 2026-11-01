import {readFile,writeFile} from 'node:fs/promises';
import {parseDomainPricingSnapshot} from '../server/domain-pricing-snapshot.mjs';
const args=process.argv.slice(2);
if(![1,3].includes(args.length)||(args.length===3&&(args[1]!=='--out'||!args[2]))){
 console.error(JSON.stringify({code:'USAGE',usage:'node scripts/validate-domain-pricing-snapshot.mjs INPUT_JSON [--out OUTPUT_JSON]'}));process.exitCode=2;
}else{
 try{
  const raw=await readFile(args[0]);if(raw.length>16384)throw Object.assign(Error(),{code:'PRICING_SNAPSHOT_TOO_LARGE'});
  const snapshot=parseDomainPricingSnapshot(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(args.length===3)await writeFile(args[2],JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({code:'PRICING_SNAPSHOT_STRUCTURALLY_VALID',environment:'sandbox',fileWritten:args.length===3,fxExpiresAt:snapshot.fx.expiresAt,policyExpiresAt:snapshot.policy.expiresAt,readyForPayments:false,evidenceAudited:false}));
 }catch(error){
  const allowed=new Set(['INVALID_PRICING_SNAPSHOT_SHAPE','SANDBOX_REQUIRED','INVALID_FX_PAIR','INVALID_FX_RATE','FX_COST_BASIS_UNVERIFIED','INVALID_PRICING_REFERENCE','INVALID_PRICING_TIME','FX_SNAPSHOT_EXPIRED','COST_POLICY_UNVERIFIED','INVALID_PRICING_VERSION','COST_POLICY_EXPIRED','INVALID_IDR_COST','MINIMUM_MARGIN_BELOW_REQUIRED','INVALID_PAYMENT_FEE','PRICING_SNAPSHOT_TOO_LARGE','INVALID_PRICING_JSON']);
  console.error(JSON.stringify({code:allowed.has(error?.code)?error.code:'PRICING_SNAPSHOT_IO_OR_ENCODING_ERROR',readyForPayments:false}));process.exitCode=1;
 }
}
