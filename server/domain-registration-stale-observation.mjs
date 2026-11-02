const ORDER=/^DOM-[a-f0-9]{40}$/;
const KEYS=['ok','order_id','state','stale_ignored','registration_action_taken'];
const STATES=['processing','blocked','action_required','failed','review_required','conflict'];
// Accept only the exact short acknowledgement emitted by the production RPC.
// Ignoring an older observation is never evidence of registration success.
export function isIgnoredRegistrationObservation(value,orderId){
 if(!value||typeof value!=='object'||!Object.hasOwn(value,'stale_ignored'))return false;
 if(Array.isArray(value)||typeof orderId!=='string'||!ORDER.test(orderId)||Object.keys(value).length!==KEYS.length||KEYS.some(key=>!Object.hasOwn(value,key))||value.ok!==true||value.order_id!==orderId||value.stale_ignored!==true||value.registration_action_taken!==false||!STATES.includes(value.state))throw Error('REGISTRATION_UNVERIFIED');
 return true;
}
