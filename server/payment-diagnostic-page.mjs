const pagePaths = new Set(['/midtrans-isolated-v1.html','/midtrans-isolated-v1','/midtrans-isolated-v1/']);
export async function paymentDiagnosticPage(request, env) {
  const incoming = new URL(request.url);
  if (!pagePaths.has(incoming.pathname)) return null;
  const headers = {'cache-control':'no-store, max-age=0, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{...headers,allow:'GET, HEAD'}});
  if (typeof env?.ASSETS?.fetch !== 'function') return new Response('Payment diagnostic assets unavailable',{status:503,headers});
  let target = new URL('/midtrans-isolated-v1.html',incoming);
  for (let attempt=0;attempt<3;attempt++) {
    const response=await env.ASSETS.fetch(new Request(target,{method:'GET',headers:{accept:'text/html','cache-control':'no-cache'}}));
    if ([301,302,303,307,308].includes(response.status)) {
      let next;
      try { next=new URL(response.headers.get('location'),target); } catch { break; }
      if(next.origin!==incoming.origin||!pagePaths.has(next.pathname)||next.search||next.hash)break;
      target=next;continue;
    }
    if(!response.ok) return new Response('Payment diagnostic page unavailable',{status:response.status,headers});
    const html=await response.text();
    if(!html.includes('id="payment-frame"')||!html.includes('/midtrans-isolated-v1.mjs'))return new Response('Payment diagnostic page not found',{status:404,headers});
    const outgoing=new Headers(response.headers);
    for(const [name,value] of Object.entries(headers))outgoing.set(name,value);
    outgoing.set('content-type','text/html; charset=utf-8');outgoing.set('x-ngeblogging-payment-diagnostics','isolated-v1');
    outgoing.delete('content-length');outgoing.delete('content-encoding');outgoing.delete('etag');
    return new Response(request.method==='HEAD'?null:html,{status:200,headers:outgoing});
  }
  return new Response('Payment diagnostic asset redirect rejected',{status:502,headers});
}
