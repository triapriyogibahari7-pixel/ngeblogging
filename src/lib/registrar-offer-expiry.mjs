export function watchRegistrarOfferExpiry(expiresAt,{onExpire,clock=Date.now,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,windowTarget=globalThis.window,documentTarget=globalThis.document}={}){
 const deadline=typeof expiresAt==='string'?Date.parse(expiresAt):NaN;
 if(!Number.isFinite(deadline)||typeof onExpire!=='function'||typeof clock!=='function'||typeof setTimer!=='function'||typeof clearTimer!=='function')throw new Error('INVALID_OFFER_EXPIRY_WATCH');
 let finished=false,timer=null;
 const clear=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
 const detach=()=>{windowTarget?.removeEventListener?.('focus',check);documentTarget?.removeEventListener?.('visibilitychange',check);};
 function check(){
  if(finished)return;
  clear();
  const now=clock();
  if(!Number.isFinite(now)||now>=deadline){finished=true;detach();onExpire();return;}
  timer=setTimer(check,Math.min(deadline-now,2147483647));
 }
 windowTarget?.addEventListener?.('focus',check);
 documentTarget?.addEventListener?.('visibilitychange',check);
 check();
 return ()=>{finished=true;clear();detach();};
}
