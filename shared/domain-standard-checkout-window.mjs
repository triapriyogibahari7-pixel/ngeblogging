// Time validation only; never payment authorization or proof of gateway state.
export const STANDARD_CHECKOUT_POLICY='standard-2h-v1';
export const STANDARD_CHECKOUT_MINUTES=120;
export const STANDARD_CHECKOUT_MS=STANDARD_CHECKOUT_MINUTES*60000;
const fail=()=>{throw Object.assign(Error('STANDARD_CHECKOUT_WINDOW_UNVERIFIED'),{code:'STANDARD_CHECKOUT_WINDOW_UNVERIFIED'});};
export function standardOrderPaymentDeadline(createdAt){
 if(typeof createdAt!=='string')fail();
 const created=Date.parse(createdAt),deadline=created+STANDARD_CHECKOUT_MS;
 if(!Number.isSafeInteger(created)||!Number.isSafeInteger(deadline)||!Number.isFinite(new Date(deadline).getTime()))fail();
 return deadline;
}
export function validateStandardCheckoutWindow(s,now=Date.now()){
 if(!s||s.payment_window_policy!==STANDARD_CHECKOUT_POLICY||s.environment!=='production'||!['create','reuse'].includes(s.action)||!Number.isSafeInteger(now))fail();
 const created=Date.parse(s.order_created_at),deadline=standardOrderPaymentDeadline(s.order_created_at),declared=Date.parse(s.payment_window_expires_at),anchor=Date.parse(s.expiry_anchor_at),expires=Date.parse(s.expires_at);
 if(!Number.isSafeInteger(created)||created>now+5000||declared!==deadline||!Number.isSafeInteger(anchor)||!Number.isSafeInteger(expires)||anchor%1000!==0||expires%1000!==0||anchor<Math.floor(created/1000)*1000||anchor>now+5000||expires<=anchor||expires<=now||expires>deadline||expires-anchor>STANDARD_CHECKOUT_MS)fail();
 if(s.action==='create'&&(s.fixture_only!==false||!Number.isInteger(s.duration_minutes)||s.duration_minutes<1||s.duration_minutes>STANDARD_CHECKOUT_MINUTES||expires-anchor!==s.duration_minutes*60000||expires-now<30000))fail();
 return s;
}
