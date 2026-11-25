import {loadOrderHistory} from './domain-order-history-client.mjs';
import {parseHistoryCursor,olderHistoryCursor} from '../shared/domain-order-history-cursor.mjs';
export async function loadOrderHistoryPage(owner,token,{cursor='',signal,fetchImpl=globalThis.fetch}={}){
 const before=cursor===''?null:parseHistoryCursor(cursor);let nextCursor='';
 const data=await loadOrderHistory(owner,token,{signal,fetchImpl:async(path,options)=>{
  if(path!=='/api/commerce/domains/orders/history')throw Error('HISTORY_UNVERIFIED');
  const query=new URLSearchParams({pagination:'1'});if(before)query.set('cursor',cursor);
  const response=await fetchImpl(path+'?'+query,options);
  nextCursor=response.headers.get('x-domain-history-next-cursor')||'';return response;
 }});
 if(data.hasMore){const next=parseHistoryCursor(nextCursor);if((before&&!olderHistoryCursor(next,before))||!data.orders.some(order=>order.orderId===next.orderId))throw Error('HISTORY_UNVERIFIED');}
 else if(nextCursor)throw Error('HISTORY_UNVERIFIED');
 return {...data,nextCursor};
}
