import {publicAuditRequest} from '../server/domain-public-audit-transport.mjs';
// Private service-binding entry only; no public route or browser credentials.
export default {fetch(request){return fetch(publicAuditRequest(request,{signal:request.signal}),{cf:{cacheTtl:0,cacheEverything:false}});}};
