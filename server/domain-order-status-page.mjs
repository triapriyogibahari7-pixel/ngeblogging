const ROUTE=/^\/domains\/orders\/DOM-[a-f0-9]{40}\/?$/;
export async function domainOrderStatusPageResponse(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/domains/orders/'))return null;
 const headers={'cache-control':'no-store, max-age=0','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://polvmlrhqoiflumibfqs.supabase.co; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
 const fail=(status,text)=>new Response(request.method==='HEAD'?null:text,{status,headers});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||!ROUTE.test(url.pathname))return fail(404,'Halaman pesanan tidak ditemukan.');
 if(!['GET','HEAD'].includes(request.method))return new Response('Metode tidak didukung.',{status:405,headers:{...headers,allow:'GET, HEAD'}});
 if(!env?.ASSETS?.fetch)return fail(503,'Halaman status belum tersedia. Jangan membuat pembayaran ulang.');
 try{const target=new URL('/domain-order-status',url.origin);const result=await env.ASSETS.fetch(new Request(target,{method:'GET'}));if(result.status!==200||!String(result.headers.get('content-type')).toLowerCase().includes('text/html'))return fail(503,'Halaman status belum tersedia. Jangan membuat pembayaran ulang.');const text=await result.text();if(text.length>65536||!/<meta\s+name=["']ngeblogging-domain-order-status["']\s+content=["']v1["']\s*\/?\s*>/i.test(text))return fail(503,'Halaman status belum tersedia. Jangan membuat pembayaran ulang.');return new Response(request.method==='HEAD'?null:text,{status:200,headers});}catch{return fail(503,'Halaman status belum tersedia. Jangan membuat pembayaran ulang.');}
}
