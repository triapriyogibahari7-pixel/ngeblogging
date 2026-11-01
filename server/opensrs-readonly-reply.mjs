const MAX_BYTES=262144,MAX_NODES=4096,MAX_DEPTH=12;
const invalid=()=>{throw Object.assign(new Error('OPENSRS_XML_UNVERIFIED'),{code:'OPENSRS_XML_UNVERIFIED'});};
function xmlCharacter(code){return code===9||code===10||code===13||(code>=32&&code<=55295)||(code>=57344&&code<=65533)||(code>=65536&&code<=1114111);}
function textValue(value){
 if(value.includes(']]>')||/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/.test(value))invalid();
 return value.replace(/&(amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/g,(_,entity)=>{
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  if(Object.hasOwn(named,entity))return named[entity];
  const code=entity.startsWith('#x')?Number.parseInt(entity.slice(2),16):Number(entity.slice(1));
  if(!Number.isSafeInteger(code)||!xmlCharacter(code))invalid();
  return String.fromCodePoint(code);
 });
}
// Restricted OPS reply grammar: associative maps and scalar strings, not general XML.
export function decodeOpenSRSReply(xml){
 if(typeof xml!=='string'||!xml.length||xml.length>MAX_BYTES||new TextEncoder().encode(xml).byteLength>MAX_BYTES)invalid();
 for(const char of xml)if(!xmlCharacter(char.codePointAt(0)))invalid();
 let source=xml.replace(/^\uFEFF/,'').trim();
 if(source.startsWith('<?xml')){
  const declaration=/^<\?xml\s+version\s*=\s*(["'])1\.0\1(?:\s+encoding\s*=\s*(["'])[Uu][Tt][Ff]-8\2)?(?:\s+standalone\s*=\s*(["'])(?:yes|no)\3)?\s*\?>/.exec(source);
  if(!declaration)invalid();source=source.slice(declaration[0].length).trimStart();
 }
 if(source.startsWith('<!DOCTYPE')){
  const dtd=/^<!DOCTYPE\s+OPS_envelope\s+SYSTEM\s+(["'])ops\.dtd\1\s*>/.exec(source);
  if(!dtd)invalid();source=source.slice(dtd[0].length).trimStart();
 }
 if(source.includes('<!')||source.includes('<?'))invalid();
 let at=0,nodes=0;
 const space=()=>{while(at<source.length&&/[\t\n\r ]/.test(source[at]))at++;};
 const take=token=>{space();if(!source.startsWith(token,at))invalid();at+=token.length;};
 function assoc(depth){
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)invalid();space();
  const empty=/^<dt_assoc\s*\/>/.exec(source.slice(at));
  if(empty){at+=empty[0].length;return Object.freeze(Object.create(null));}
  take('<dt_assoc>');const values=Object.create(null);
  for(;;){
   space();if(source.startsWith('</dt_assoc>',at)){at+='</dt_assoc>'.length;return Object.freeze(values);}
   if(++nodes>MAX_NODES)invalid();
   const item=/^<item\s+key\s*=\s*(["'])([^"'<>]{1,128})\1\s*(\/?)>/.exec(source.slice(at));
   if(!item)invalid();at+=item[0].length;const key=textValue(item[2]);
   if(!/^[A-Za-z0-9_ .:-]{1,128}$/.test(key)||['__proto__','prototype','constructor'].includes(key)||Object.hasOwn(values,key))invalid();
   if(item[3]){values[key]='';continue;}
   const next=source.indexOf('<',at);if(next<0)invalid();
   if(/^[\t\n\r ]*$/.test(source.slice(at,next))&&source.startsWith('<dt_assoc',next)){at=next;values[key]=assoc(depth+1);take('</item>');}
   else{values[key]=textValue(source.slice(at,next));at=next;take('</item>');}
  }
 }
 take('<OPS_envelope>');take('<header>');take('<version>');
 const versionEnd=source.indexOf('<',at);if(versionEnd<0||source.slice(at,versionEnd).trim()!=='0.9')invalid();at=versionEnd;
 take('</version>');take('</header>');take('<body>');take('<data_block>');const reply=assoc(0);
 take('</data_block>');take('</body>');take('</OPS_envelope>');space();if(at!==source.length)invalid();
 if(reply.protocol!=='XCP'||typeof reply.action!=='string'||reply.action.toUpperCase()!=='REPLY'||typeof reply.object!=='string'||reply.object.toUpperCase()!=='DOMAIN'||!['0','1'].includes(reply.is_success)||typeof reply.response_code!=='string'||!/^\d{3}$/.test(reply.response_code))invalid();
 return reply;
}
function attributes(reply){if(reply.is_success!=='1')throw Object.assign(new Error('OPENSRS_COMMAND_REJECTED'),{code:'OPENSRS_COMMAND_REJECTED'});const value=reply.attributes;if(!value||typeof value!=='object')invalid();return value;}
export function readOpenSRSLookupReply(xml){
 const reply=decodeOpenSRSReply(xml),a=attributes(reply);
 const available=reply.response_code==='210'&&a.status==='available',taken=reply.response_code==='211'&&a.status==='taken';
 if(!available&&!taken)invalid();
 if(a.reason!==undefined&&a.reason!=='Premium Name')invalid();
 if(a.has_claim!==undefined&&!['0','1'].includes(a.has_claim))invalid();
 return Object.freeze({availability:available?'available':'unavailable',premium:a.reason==='Premium Name',claimStatus:a.has_claim==='1'?'required':a.has_claim==='0'?'none_reported':'not_reported',registrantEligibility:'not_checked',lookupOnly:true,purchaseAllowed:false});
}
export function readOpenSRSPriceReply(xml){
 const reply=decodeOpenSRSReply(xml),a=attributes(reply);
 if(reply.response_code!=='200'||typeof a.price!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(a.price)||!/[1-9]/.test(a.price))invalid();
 if(a.is_registry_premium!==undefined&&!['0','1'].includes(a.is_registry_premium))invalid();
 return Object.freeze({amount:a.price,currency:null,taxIncluded:null,registryPremium:a.is_registry_premium===undefined?null:a.is_registry_premium==='1',lookupOnly:true,purchaseAllowed:false});
}
