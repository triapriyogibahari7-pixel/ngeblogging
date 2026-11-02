const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function purchaseDestinationContext({embedded=false,siteId=null,expectedOwnerId=null,sessionOwnerId=null,attempt=null}={}){
 const state=(target,code=null)=>Object.freeze({siteId:target,blocked:code!==null,code});
 if(!embedded)return state(null,attempt?.siteId!==undefined?'ATTEMPT_SITE_MISMATCH':null);
 if(typeof siteId!=='string'||!UUID.test(siteId))return state(null,'INVALID_SITE_ID');
 const target=siteId.toLowerCase();
 if(typeof expectedOwnerId!=='string'||!UUID.test(expectedOwnerId)||typeof sessionOwnerId!=='string'||!UUID.test(sessionOwnerId)||sessionOwnerId.toLowerCase()!==expectedOwnerId.toLowerCase())return state(target,'SESSION_CHANGED');
 if(attempt&&(attempt.siteId??null)!==target)return state(target,'ATTEMPT_SITE_MISMATCH');
 return state(target);
}
