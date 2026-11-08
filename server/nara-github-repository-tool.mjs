const fail = code => { throw Error(code); };
export async function readGitHubRepositoryTool(config, token, input, fetcher = fetch) {
 if (config?.provider !== 'github' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(config.repository || '') || ['.','..'].includes(config.repository.split('/')[1])) fail('CONNECTOR_INVALID_REQUEST');
 if (typeof token !== 'string' || !token || token.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(token)) fail('CONNECTOR_INVALID_REQUEST');
 if (!input || !['github.file','github.directory'].includes(input.operation) || Object.keys(input).some(key => !['operation','path','ref'].includes(key))) fail('CONNECTOR_INVALID_REQUEST');
 const path = input.path ?? '';
 if (typeof path !== 'string' || path.length > 1024 || /[\\\u0000-\u001f\u007f]/.test(path) || path.startsWith('/') || (path && path.split('/').some(part => !part || part === '.' || part === '..'))) fail('CONNECTOR_INVALID_REQUEST');
 if (input.operation === 'github.file' && !path) fail('CONNECTOR_INVALID_REQUEST');
 if (path.split('/').some(part => /^(?:\.env(?:\..*)?|\.git|\.ssh|id_rsa|id_ed25519|credentials(?:\..*)?)$/i.test(part) || /\.(?:pem|key|p12|pfx)$/i.test(part))) fail('CONNECTOR_SENSITIVE_PATH');
 const ref = input.ref;
 if (ref !== undefined && (typeof ref !== 'string' || !ref || ref.length > 200 || /[\u0000-\u001f\u007f]/.test(ref))) fail('CONNECTOR_INVALID_REQUEST');
 const target = new URL('https://api.github.com/repos/'+config.repository+'/contents/'+path.split('/').map(encodeURIComponent).join('/'));
 if (ref !== undefined) target.searchParams.set('ref',ref);
 const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),15000);
 try {
  const response = await fetcher(target.href,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','user-agent':'Ngeblogging-Nara','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:controller.signal});
  if (!response.ok) fail(response.status === 404 ? 'CONNECTOR_FILE_NOT_FOUND' : response.status === 403 || response.status === 401 ? 'CONNECTOR_ACCESS_DENIED' : response.status === 429 ? 'CONNECTOR_RATE_LIMITED' : 'CONNECTOR_READ_FAILED');
  if (!response.headers.get('content-type')?.includes('application/json') || !response.body) fail('CONNECTOR_INVALID_RESPONSE');
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try { while (true) { const next = await reader.read(); if(next.done) break; length += next.value.byteLength; if(length > 524288) { await reader.cancel(); fail('CONNECTOR_RESPONSE_TOO_LARGE'); } chunks.push(next.value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for(const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (input.operation === 'github.directory') {
   if(!Array.isArray(data)) fail('CONNECTOR_EXPECTED_DIRECTORY');
   return {provider:'github',verifiedCapability:'repository-directory:read',repository:config.repository,path,ref:ref || null,entries:data.slice(0,200).map(item=>({name:String(item.name || '').slice(0,255),path:String(item.path || '').slice(0,1024),type:['file','dir','symlink','submodule'].includes(item.type)?item.type:'unknown',sha:String(item.sha || '').slice(0,64)})),returnedCount:Math.min(data.length,200),truncated:data.length>200,recursive:false,upstreamMayLimitResults:true,untrustedProviderData:true};
  }
  if(data?.type !== 'file' || data.encoding !== 'base64' || typeof data.content !== 'string' || data.path !== path || !Number.isFinite(data.size) || data.size > 196608 || data.size < 0) fail('CONNECTOR_FILE_UNSUPPORTED');
  const binary = atob(data.content.replace(/\s/g,''));
  if(binary.length !== data.size || binary.length > 196608) fail('CONNECTOR_FILE_UNSUPPORTED');
  const raw = Uint8Array.from(binary,char=>char.charCodeAt(0));
  let content = new TextDecoder('utf-8',{fatal:true}).decode(raw);
  if(content.includes('\u0000')) fail('CONNECTOR_FILE_UNSUPPORTED');
  content = content.split(token).join('[REDACTED]').replace(/(?:gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|sk-[A-Za-z0-9_-]{16,})/g,'[REDACTED]').replace(/((?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*)["'][^"'\r\n]{8,}["']/gi,'$1"[REDACTED]"');
  return {provider:'github',verifiedCapability:'repository-file:read',repository:config.repository,path,ref:ref || null,sha:String(data.sha || '').slice(0,64),size:data.size,content,redactionApplied:true,truncated:false,untrustedProviderData:true};
 } finally { clearTimeout(timer); }
}
