// Pure validation and planning for customer DNS record changes. No network access.
export const EDITABLE_TYPES=['A','AAAA','CNAME','TXT','MX'];
const LABEL=/^(?:\*|[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?)$/;
const fail=(code,message)=>Object.assign(new Error(message),{code});
const ipv4=v=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v)&&v.split('.').every(n=>Number(n)<=255);
const ipv6=v=>/^[0-9a-f:]+$/i.test(v)&&v.includes(':')&&v.length<=45&&(v.match(/::/g)||[]).length<=1&&v.split(':').every(p=>p.length<=4);
const hostname=v=>typeof v==='string'&&v.length<=253&&v.split('.').every(p=>/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(p));
export function recordFqdn(zone,name){
 const raw=String(name??'').trim().toLowerCase().replace(/\.$/,'');
 if(!raw||raw==='@'||raw===zone)return zone;
 const fqdn=raw.endsWith('.'+zone)?raw:raw+'.'+zone;
 if(fqdn.length>253||!fqdn.slice(0,-zone.length-1).split('.').every(l=>LABEL.test(l)))throw fail('INVALID_RECORD_NAME','Nama record tidak valid.');
 return fqdn;
}
export function normalizeRecord(zone,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail('INVALID_RECORD','Data record tidak valid.');
 const type=String(input.type||'').toUpperCase();
 if(!EDITABLE_TYPES.includes(type))throw fail('RECORD_TYPE_NOT_EDITABLE','Jenis record ini tidak dapat diubah dari halaman ini.');
 const name=recordFqdn(zone,input.name);let content=String(input.content??'').trim();
 if(type==='A'&&!ipv4(content))throw fail('INVALID_RECORD_CONTENT','Alamat IPv4 tidak valid.');
 if(type==='AAAA'&&!ipv6(content))throw fail('INVALID_RECORD_CONTENT','Alamat IPv6 tidak valid.');
 if(type==='CNAME'||type==='MX'){content=content.toLowerCase().replace(/\.$/,'');if(!hostname(content))throw fail('INVALID_RECORD_CONTENT','Nama host tujuan tidak valid.');}
 if(type==='CNAME'&&name===zone)throw fail('CNAME_AT_APEX','CNAME tidak dapat dipasang di domain utama.');
 if(type==='CNAME'&&content===name)throw fail('CNAME_LOOP','CNAME tidak boleh mengarah ke dirinya sendiri.');
 if(type==='TXT'){if(!content||content.length>2048||/[\u0000-\u001f]/.test(content))throw fail('INVALID_RECORD_CONTENT','Isi TXT tidak valid.');}
 const ttl=input.ttl===undefined||input.ttl===null||input.ttl===''?1:Number(input.ttl);
 if(!Number.isInteger(ttl)||!(ttl===1||ttl>=60&&ttl<=86400))throw fail('INVALID_TTL','TTL harus Auto (1) atau 60–86400 detik.');
 const proxied=Boolean(input.proxied);
 if(proxied&&!['A','AAAA','CNAME'].includes(type))throw fail('PROXY_NOT_ALLOWED','Proxy hanya untuk A, AAAA, dan CNAME.');
 const out={type,name,content,ttl,proxied};
 if(type==='MX'){const p=Number(input.priority);if(!Number.isInteger(p)||p<0||p>65535)throw fail('INVALID_PRIORITY','Prioritas MX harus 0–65535.');out.priority=p;}
 if(typeof input.comment==='string')out.comment=input.comment.slice(0,100);
 return out;
}
const same=(a,b)=>['type','name','content','ttl','proxied','priority'].every(k=>(a[k]??null)===(b[k]??null));
export function publicRecord(r){return {id:String(r.id||''),type:r.type,name:r.name,content:r.content,ttl:r.ttl,proxied:Boolean(r.proxied),...(r.priority!==undefined&&r.priority!==null?{priority:r.priority}:{})};}
export function buildBackup(zone,records,now=new Date()){
 return {format:'ngeblogging-dns-backup',version:1,zone,createdAt:now.toISOString(),records:records.filter(r=>EDITABLE_TYPES.includes(r.type)).map(publicRecord)};
}
export function validateBackup(zone,backup){
 if(!backup||backup.format!=='ngeblogging-dns-backup'||backup.version!==1||backup.zone!==zone||!Array.isArray(backup.records)||backup.records.length>1000)throw fail('INVALID_BACKUP','Berkas cadangan tidak cocok dengan domain ini.');
 return backup.records.map(r=>({id:typeof r.id==='string'?r.id:'',...normalizeRecord(zone,r)}));
}
// Plan: create missing, update changed, optionally delete extras. Never touches NS/SOA/CAA/other types.
export function planRestore(zone,current,backup,{removeExtra=false}={}){
 const wanted=validateBackup(zone,backup),live=current.filter(r=>EDITABLE_TYPES.includes(r.type)),byId=new Map(live.map(r=>[r.id,r])),used=new Set();
 const plan={create:[],update:[],remove:[],unchanged:0};
 for(const w of wanted){
  let hit=w.id&&byId.get(w.id);
  if(!hit||used.has(hit.id))hit=live.find(r=>!used.has(r.id)&&same(r,w));
  if(!hit){plan.create.push(w);continue;}
  used.add(hit.id);
  if(same(hit,w))plan.unchanged++;else{const {id,...body}=w;plan.update.push({id:hit.id,record:body});}
 }
 if(removeExtra)for(const r of live)if(!used.has(r.id))plan.remove.push(publicRecord(r));
 return plan;
}
