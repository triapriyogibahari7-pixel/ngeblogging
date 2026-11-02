const ORDER=/^DOM-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function parseOrderSiteBinding(value,{orderId,userId,siteId}={}){
 const fail=()=>{throw Error('ORDER_SITE_BINDING_UNVERIFIED');};
 if(typeof orderId!=='string'||!ORDER.test(orderId)||typeof userId!=='string'||!UUID.test(userId)||typeof siteId!=='string'||!UUID.test(siteId))fail();
 if(!value||value.ok!==true||value.order_id!==orderId||value.user_id!==userId.toLowerCase()||value.site_id!==siteId.toLowerCase()||value.environment!=='production'||value.site_bound!==true||typeof value.binding_reused!=='boolean'||value.checkout_created!==false||value.registration_action_taken!==false)fail();
 return Object.freeze({orderId,userId:userId.toLowerCase(),siteId:siteId.toLowerCase(),siteBound:true,bindingReused:value.binding_reused,checkoutCreated:false,registrationActionTaken:false});
}
