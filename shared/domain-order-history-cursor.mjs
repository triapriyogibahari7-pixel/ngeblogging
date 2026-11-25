export function parseHistoryCursor(value){
 if(typeof value!=='string'||value.length>128)throw Error('INVALID_HISTORY_CURSOR');
 const m=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|\+00:00))~(DOM-[a-f0-9]{40})$/.exec(value);
 if(!m)throw Error('INVALID_HISTORY_CURSOR');
 const base=m[1].slice(0,19),ms=Date.parse(base+'Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==base)throw Error('INVALID_HISTORY_CURSOR');
 return {createdAt:m[1],orderId:m[3],stamp:BigInt(ms)*1000n+BigInt((m[2]||'').padEnd(6,'0'))};
}
export function olderHistoryCursor(a,b){return a.stamp<b.stamp||(a.stamp===b.stamp&&a.orderId<b.orderId);}
export function rowHistoryCursor(row){const value=row.created_at+'~'+row.order_id;parseHistoryCursor(value);return value;}
