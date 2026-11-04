const fail=code=>{throw Object.assign(new Error(code),{code});};
export function normalizeDomainMidtransServerKey(value,{environment='production'}={}){
 if(!['production','sandbox'].includes(environment))fail('MIDTRANS_KEY_ENVIRONMENT_INVALID');
 if(value===undefined||value===null||value==='')fail('MIDTRANS_SERVER_KEY_MISSING');
 if(typeof value!=='string'||value.length>512)fail('MIDTRANS_SERVER_KEY_INVALID');
 const key=value.trim();
 if(!key)fail('MIDTRANS_SERVER_KEY_MISSING');
 const pattern=environment==='production'?/^Mid-server-[A-Za-z0-9_~-]{10,200}$/:/^SB-Mid-server-[A-Za-z0-9_~-]{10,200}$/;
 if(!pattern.test(key))fail('MIDTRANS_SERVER_KEY_INVALID');
 return key;
}
