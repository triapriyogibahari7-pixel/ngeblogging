import {readRegistrarOfferView} from './registrar-offer-view.mjs';
const invalid=()=>new Error('INVALID_OFFER_CLOCK');
export function readTimedRegistrarOfferView(data,{domain,requestStartedAt,receivedAt}={}){
 if(!Number.isFinite(requestStartedAt)||!Number.isFinite(receivedAt)||requestStartedAt<0||receivedAt<requestStartedAt)throw invalid();
 const elapsed=receivedAt-requestStartedAt;
 if(typeof data?.offer?.checkedAt!=='string')throw invalid();
 const checked=Date.parse(data.offer.checkedAt),reference=checked+elapsed;
 if(!Number.isFinite(checked)||!Number.isFinite(reference)||Math.abs(reference)>8640000000000000)throw invalid();
 const result=readRegistrarOfferView(data,{domain,now:reference});
 if(!result.expiresAt)return result;
 return {...result,clockAnchorMs:reference,monotonicAnchorMs:receivedAt};
}
export function registrarOfferClockNow(view,monotonicNow){
 if(!Number.isFinite(view?.clockAnchorMs)||!Number.isFinite(view?.monotonicAnchorMs)||!Number.isFinite(monotonicNow)||monotonicNow<view.monotonicAnchorMs)return NaN;
 return view.clockAnchorMs+(monotonicNow-view.monotonicAnchorMs);
}
