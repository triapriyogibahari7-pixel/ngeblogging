export function networkDiagnostic(error,{phase='request',httpStatus=0}={}){
 const name=['TypeError','SyntaxError','TimeoutError','AbortError','Error'].includes(error?.name)?error.name:'OtherError';
 const rawCode=String(error?.code||error?.cause?.code||'').toUpperCase();
 const message=(String(error?.message||'')+' '+String(error?.cause?.message||'')).slice(0,4096);
 let reason='NETWORK_UNCLASSIFIED';
 if(name==='TimeoutError'||name==='AbortError')reason='REQUEST_TIMEOUT_OR_ABORT';
 else if(/illegal invocation|incorrect this|incompatible receiver/i.test(message))reason='FETCH_RECEIVER_INVALID';
 else if(/(?:cache|redirect|credentials|RequestInitializerDict).*(?:not implemented|unsupported|invalid)|unsupported.*(?:cache|redirect|credentials)/i.test(message))reason='FETCH_OPTION_UNSUPPORTED';
 else if(rawCode==='1019'||/\b1019\b|loop limit|recursive worker/i.test(message))reason='WORKER_LOOP_LIMIT';
 else if(rawCode==='1042'||/\b1042\b|same.zone.*worker|worker.*same.zone/i.test(message))reason='WORKER_ROUTING_BLOCKED';
 else if(['ENOTFOUND','EAI_AGAIN','EAI_NONAME'].includes(rawCode)||/dns.*(?:lookup|resolution).*(?:fail|error)/i.test(message))reason='DNS_LOOKUP_FAILED';
 else if(/CERT_|ERR_TLS_|UNABLE_TO_VERIFY|DEPTH_ZERO_/.test(rawCode)||/certificate|tls handshake|ssl handshake/i.test(message))reason='TLS_FAILED';
 else if(phase==='response-json')reason='RESPONSE_JSON_INVALID';
 else if(httpStatus>=300&&httpStatus<400)reason='REDIRECT_REJECTED';
 else if(httpStatus>=400)reason='HTTP_ERROR';
 const code=['1019','1042','ENOTFOUND','EAI_AGAIN','EAI_NONAME','ECONNRESET','ECONNREFUSED','ETIMEDOUT'].includes(rawCode)?rawCode:null;
 return {reason,name,code,phase,httpStatus:Number.isInteger(httpStatus)&&httpStatus>=0&&httpStatus<=599?httpStatus:0};
}
