export function httpsEvidence(payload,{siteId,hostname}){
 const no=reason=>({httpsVerified:false,siteContentVerified:false,live:false,reason});
 if(payload?.site?.id!==siteId)return no('SITE_MISMATCH');
 const rows=Array.isArray(payload.results)?payload.results:[];
 const matches=rows.filter(r=>r?.hostname===hostname);
 if(matches.length!==1)return no('HOST_EVIDENCE_MISSING');
 const r=matches[0];let final;try{final=new URL(r.finalUrl);}catch{return no('FINAL_URL_INVALID');}
 if(r.https!==true||r.httpStatus!==200||r.reachable!==true||r.auditStatus!=='passed'||final.protocol!=='https:'||final.hostname!==hostname||final.username||final.password||(final.port&&final.port!=='443'))return no('HTTPS_NOT_VERIFIED');
 const checked=Date.parse(payload.checkedAt||'');
 if(!Number.isFinite(checked)||Math.abs(Date.now()-checked)>60000)return no('EVIDENCE_STALE');
 return {httpsVerified:true,siteContentVerified:false,live:false,reason:'HTTPS_200_ONLY',checkedAt:payload.checkedAt};
}
export function abortable(value,signal){
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(Object.assign(Error('MONITOR_ABORTED'),{name:'AbortError'}));
  if(signal.aborted){abort();return;}
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(value).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}
export function startActivationMonitor({run,onResult=()=>{},onError=()=>{},onExhausted=()=>{},delays=[1500,20000,40000,80000,160000],timeoutMs=25000,jitter=Math.random,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(typeof run!=='function'||!Array.isArray(delays)||!delays.length||delays.length>10||delays.some(n=>!Number.isFinite(n)||n<0)||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('MONITOR_OPTIONS_INVALID');
 let stopped=false,timer=null,controller=null,index=0;
 const stop=()=>{stopped=true;if(timer!==null)clearTimer(timer);controller?.abort();};
 const schedule=()=>{const delay=delays[index];timer=setTimer(tick,delay+Math.floor(Math.max(0,Math.min(1,Number(jitter())||0))*Math.min(delay*.2,10000)));};
 async function tick(){
  if(stopped)return;
  controller=new AbortController();const signal=controller.signal,deadline=setTimer(()=>controller?.abort(),timeoutMs);let done=false;
  try{const result=await abortable(run(signal),signal);if(!stopped){onResult(result);done=result?.done===true;}}
  catch(error){if(!stopped)onError(error);}
  finally{clearTimer(deadline);controller?.abort();controller=null;if(!stopped){index++;if(done)stop();else if(index<delays.length)schedule();else{stopped=true;onExhausted();}}}
 }
 schedule();return stop;
}
