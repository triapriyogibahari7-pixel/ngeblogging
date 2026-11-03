export function purchaseSelectionError({quote,input,attempt=null,normalizeDomain,now=Date.now()}={}){
 if(!quote||typeof quote.domain!=='string'||typeof quote.quoteId!=='string')return 'QUOTE_UNVERIFIED';
 if(attempt){
  if(attempt.phase!=='order'||attempt.quote?.quoteId!==quote.quoteId||attempt.quote?.domain!==quote.domain)return 'ATTEMPT_HELD';
  return null;
 }
 let domain;try{domain=normalizeDomain(input);}catch{return 'INVALID_DOMAIN';}
 if(domain!==quote.domain)return 'QUOTE_SELECTION_CHANGED';
 const expiry=Date.parse(quote.expiresAt);
 if(!Number.isFinite(now)||!Number.isFinite(expiry)||expiry<=now)return 'QUOTE_EXPIRED';
 return null;
}
