// UI gating only. Server authentication, ownership and SQL checks remain mandatory.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function transferPanelScope(source,config){
  return JSON.stringify([source?.id,source?.owner_id,config?.userId,config?.sessionKey]);
}
export function canUseTransferPanel(source,config){
  return Boolean(config?.enabled===true&&config.environment==='isolated-test'&&UUID.test(source?.id||'')&&UUID.test(config.userId||'')&&source.owner_id===config.userId&&typeof config.sessionKey==='string'&&config.sessionKey.length>0&&config.sourceLoaded===true&&config.sourceSiteId===source.id&&Array.isArray(config.domains)&&typeof config.onMove==='function'&&typeof config.loadState==='function');
}
export function eligibleTransferDomains(source,config){
  if(!canUseTransferPanel(source,config))return [];
  const rows=config.domains;
  if(rows.some(row=>!row||row.site_id!==source.id||!UUID.test(row.id||''))||new Set(rows.map(row=>row.id)).size!==rows.length)return [];
  return rows.filter(row=>{
    const host=row.hostname;
    return row.provider==='cloudflare-full-zone'&&['active','pending','verifying'].includes(row.status)&&!(row.is_primary===true&&row.status!=='active')&&typeof host==='string'&&host===host.toLowerCase()&&host.length<=253&&host.includes('.')&&host!=='ngeblogging.com'&&!host.endsWith('.ngeblogging.com')&&host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  });
}
