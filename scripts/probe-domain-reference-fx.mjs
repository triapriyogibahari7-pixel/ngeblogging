import {normalizeDomainReferenceFx} from '../server/domain-reference-fx.mjs';
const endpoint='https://api.frankfurter.dev/v2/rate/USD/IDR?providers=ecb';
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),6000);
const report={probe:'domain-reference-fx',endpoint,method:'GET',productionChanged:false};
let reader,stage='network';
try{
 const response=await fetch(endpoint,{method:'GET',redirect:'manual',credentials:'omit',headers:{accept:'application/json'},signal:controller.signal});
 report.httpStatus=response.status;
 if(response.status!==200){report.failure='HTTP_STATUS';}
 else if(!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||'')){report.failure='CONTENT_TYPE';}
 else{
  stage='body';reader=response.body?.getReader();
  if(!reader){report.failure='BODY_UNAVAILABLE';}
  else{
   let size=0;const chunks=[];
   for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){report.failure='BODY_TOO_LARGE';break;}chunks.push(part.value);}
   if(!report.failure){
    stage='json';const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    report.bodyShape=Array.isArray(data)?'array':data===null?'null':typeof data;
    if(data&&typeof data==='object'&&!Array.isArray(data)){
     report.pairMatches=data.base==='USD'&&data.quote==='IDR';
     report.rateType=typeof data.rate;
     if(typeof data.rate==='number'&&Number.isFinite(data.rate)&&data.rate>0&&data.rate<=1000000){report.publicReferenceRate=data.rate;report.rateDecimalPlaces=(String(data.rate).split('.')[1]||'').length;}
     if(typeof data.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.date))report.publicSourceDate=data.date;
    }
    stage='validation';const normalized=normalizeDomainReferenceFx(data);
    report.validation='accepted';report.normalizedRate=normalized.rate;report.sourceDateAgeDays=normalized.sourceDateAgeDays;
   }
  }
 }
}catch{report.failure=controller.signal.aborted?'TIMEOUT':stage==='json'?'JSON_OR_ENCODING_INVALID':stage==='validation'?'REFERENCE_VALIDATION_REJECTED':stage==='body'?'BODY_READ_FAILED':'NETWORK_FAILED';}
finally{clearTimeout(timer);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
console.log(JSON.stringify(report,null,2));
if(report.failure)process.exitCode=1;
