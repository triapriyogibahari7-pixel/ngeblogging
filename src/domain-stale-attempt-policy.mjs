const HOUR=3600000;
export const PAYMENT_WINDOW_MS=2*HOUR;
export const RELEASE_GRACE_MS=15*60000;
const stamp=value=>typeof value==='string'?Date.parse(value):NaN;
export function isReleasableOrder(order,{now=Date.now()}={}){
 if(!order||!Number.isSafeInteger(now))return false;
 if(order.registrationConfirmed===true&&order.resolution==='none')return true;
 if(['failed','expired','cancelled'].includes(order.paymentState)&&order.registrationState==='not_started'&&order.resolution==='none')return true;
 if(order.paymentState==='refunded'&&order.resolution==='refunded')return true;
 return isStaleUnpaidOrder(order,{now});
}
export function isStaleUnpaidOrder(order,{now=Date.now()}={}){
 if(!order||!Number.isSafeInteger(now))return false;
 if(order.paymentState!=='pending'||order.paymentConfirmed!==false||order.paidAt!==null&&order.paidAt!==undefined)return false;
 if(order.registrationState!=='not_started'||order.registrationConfirmed!==false||order.resolution!=='none')return false;
 const created=stamp(order.createdAt),updated=stamp(order.updatedAt);
 if(!Number.isFinite(created)||!Number.isFinite(updated))return false;
 const latest=Math.max(created,updated);
 if(latest>now)return false;
 return now-latest>=PAYMENT_WINDOW_MS+RELEASE_GRACE_MS;
}
