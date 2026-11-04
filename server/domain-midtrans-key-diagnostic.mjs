import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
export const MIDTRANS_KEY_DIAGNOSTIC_VERSION='midtrans-key-diagnostics-v1';
export function diagnoseDomainMidtransKey(value,{environment='production'}={}){
 if(!['production','sandbox'].includes(environment))return 'ENVIRONMENT_INVALID';
 if(value===undefined||value===null||value==='')return 'MISSING';
 if(typeof value!=='string')return 'NOT_STRING';
 if(value.length>512)return 'INPUT_TOO_LARGE';
 const key=value.trim();if(!key)return 'MISSING';
 if(key.startsWith('Basic '))return 'AUTH_HEADER_INSTEAD_OF_KEY';
 if(key.startsWith('"')||key.startsWith("'")||key.endsWith('"')||key.endsWith("'"))return 'QUOTED_VALUE';
 if(/^(?:SB-)?Mid-client-/.test(key))return 'CLIENT_KEY_INSTEAD_OF_SERVER_KEY';
 if(environment==='production'&&key.startsWith('SB-Mid-server-'))return 'SANDBOX_KEY_IN_PRODUCTION';
 if(environment==='sandbox'&&key.startsWith('Mid-server-'))return 'PRODUCTION_KEY_IN_SANDBOX';
 if(/[\s\u0000-\u001f\u007f]/.test(key))return 'INTERNAL_WHITESPACE_OR_CONTROL';
 try{normalizeDomainMidtransServerKey(value,{environment});return 'FORMAT_ACCEPTED';}catch{return 'FORMAT_NOT_ACCEPTED';}
}
