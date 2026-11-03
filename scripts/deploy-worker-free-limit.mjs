import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseDomainPricingSnapshot} from '../server/domain-pricing-snapshot.mjs';
import {RETIRED_COMPAT_VALUES,LEGACY_VARIABLE_REMOVALS,assertLegacyVariableRemoval} from './worker-variable-retirement-policy.mjs';

const ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const WORKER='ngeblogging';
const REMOVE=new Set(LEGACY_VARIABLE_REMOVALS);

export function variableInventoryReport(config,bindings){
  if(config?.name!==WORKER||!Array.isArray(bindings))throw Error('INVALID_TARGET_OR_INVENTORY');
  if(config.account_id&&config.account_id!==ACCOUNT)throw Error('ACCOUNT_MISMATCH');
  if(config.vars!==undefined&&(!config.vars||typeof config.vars!=='object'||Array.isArray(config.vars)))throw Error('INVALID_CONFIG_VARIABLES');
  const rows=new Map(),seen=new Set();let workerVariableCount=0;
  for(const b of bindings){
    if(typeof b?.name!=='string'||seen.has(b.name))throw Error('INVALID_OR_DUPLICATE_BINDING');
    seen.add(b.name);
    if(REMOVE.has(b.name)&&b.type!=='plain_text')throw Error('REMOVAL_TARGET_IS_NOT_PLAIN_TEXT');
    if(['plain_text','json','secret_text'].includes(b.type)){
      workerVariableCount++;
      rows.set(b.name,{name:b.name,workerType:b.type,sources:['worker'],excluded:REMOVE.has(b.name)});
    }else if(/secret|text|json/i.test(b.type||''))throw Error('UNSUPPORTED_VARIABLE_BINDING_TYPE');
  }
  const configNames=Object.keys(config.vars||{});
  for(const name of configNames){
    const row=rows.get(name);
    if(!REMOVE.has(name)&&row?.workerType==='secret_text')throw Error('CONFIG_WOULD_OVERWRITE_SECRET');
    if(row)row.sources.push('config');
    else rows.set(name,{name,workerType:null,sources:['config'],excluded:REMOVE.has(name)});
  }
  const inventory=[...rows.values()].filter(row=>!row.excluded).map(({name,workerType,sources})=>({name,workerType,sources})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  const variablesAfter=inventory.length;
  return {worker:WORKER,limit:64,target:55,workerVariableCount,configurationVariableCount:configNames.length,uniqueBeforeRemoval:rows.size,variablesAfter,overLimitBy:Math.max(0,variablesAfter-64),reductionToTarget:Math.max(0,variablesAfter-55),removedFromWorker:[...rows.values()].filter(row=>row.excluded&&row.sources.includes('worker')).map(row=>row.name).sort(),ignoredConfigDeclarations:configNames.filter(name=>REMOVE.has(name)).sort(),addedByConfig:inventory.filter(row=>row.sources.length===1&&row.sources[0]==='config').map(row=>row.name),inventory};
}

export function pricingSnapshotReport(bindings,{now=Date.now()}={}){
  if(!Array.isArray(bindings))return {status:'unavailable',reason:'INVALID_BINDING_INVENTORY'};
  const primary=bindings.filter(binding=>binding?.name==='DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON');
  const matches=primary.length?primary:bindings.filter(binding=>binding?.name==='DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT');
  if(matches.length===0)return {status:'missing',reason:'PRICING_SNAPSHOT_MISSING'};
  if(matches.length!==1)return {status:'unavailable',reason:'DUPLICATE_SNAPSHOT_BINDING'};
  const binding=matches[0];
  if(binding.type==='secret_text')return {status:'not_inspectable',reason:'PRICING_SNAPSHOT_IS_SECRET'};
  if(binding.type!=='plain_text')return {status:'invalid',reason:'PRICING_SNAPSHOT_REQUIRES_STRING_BINDING'};
  if(typeof binding.text!=='string')return {status:'invalid',reason:'PRICING_SNAPSHOT_VALUE_UNAVAILABLE'};
  try{parseDomainPricingSnapshot(binding.text,{now,environment:'production'});return {status:'schema_valid',reason:'PRICING_SNAPSHOT_VALID_AT_BUILD_TIME'};}
  catch(error){const reason=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'PRICING_SNAPSHOT_VALIDATION_FAILED';return {status:'invalid',reason};}
}

export function planVariables(config,bindings){
  if(config.name!==WORKER||!Array.isArray(bindings)) throw Error('INVALID_TARGET_OR_INVENTORY');
  if(config.account_id&&config.account_id!==ACCOUNT) throw Error('ACCOUNT_MISMATCH');
  const vars=Object.create(null),secrets=new Set(),seen=new Set();
  for(const b of bindings){
    if(typeof b.name!=='string'||seen.has(b.name)) throw Error('INVALID_OR_DUPLICATE_BINDING');
    seen.add(b.name);
    if(REMOVE.has(b.name)){assertLegacyVariableRemoval(b);continue;}
    if(b.type==='secret_text'){secrets.add(b.name);continue;}
    if(b.type==='plain_text'){
      if(typeof b.text!=='string') throw Error('INCOMPLETE_PLAIN_TEXT_INVENTORY');
      vars[b.name]=b.text;
    }else if(b.type==='json'){
      if(!Object.hasOwn(b,'json')) throw Error('INCOMPLETE_JSON_INVENTORY');
      vars[b.name]=typeof b.json==='string'?JSON.parse(b.json):b.json;
    }else if(/secret|text|json/i.test(b.type||'')){throw Error('UNSUPPORTED_VARIABLE_BINDING_TYPE');}
  }
  for(const [name,value] of Object.entries(config.vars||{})){
    if(REMOVE.has(name)){assertLegacyVariableRemoval({name,type:'plain_text',text:value});continue;}
    if(secrets.has(name)) throw Error('CONFIG_WOULD_OVERWRITE_SECRET');
    vars[name]=value;
  }
  const count=Object.keys(vars).length+secrets.size;
  if(count>64) throw Object.assign(Error('VARIABLE_LIMIT_STILL_EXCEEDED'),{variableCount:count,limit:64});
  const removed=bindings.filter(b=>REMOVE.has(b.name)).map(b=>b.name);
  return {config:{...config,account_id:ACCOUNT,vars,keep_vars:false},count,removed};
}

function selfTest(){
  const config={name:WORKER,vars:{FEATURE:'true'},keep_vars:true};
  const secret={name:'TOKEN',type:'secret_text'};
  Object.defineProperty(secret,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});
  const bindings=[{name:'DASHBOARD_ONLY',type:'plain_text',text:'preserved'},secret,
    {name:'UI_V37_WORKER_COMPAT',type:'plain_text',text:'legacy'},
    {name:'UI_V35_RELEASE_COMPAT',type:'plain_text',text:'legacy'},
    {name:'UI_V35_WORKER_COMPAT',type:'plain_text',text:'worker-v35.mjs'},
    {name:'AI',type:'ai'}];
  const plan=planVariables(config,bindings);
  assert.equal(plan.config.vars.DASHBOARD_ONLY,'preserved');
  assert.equal(plan.config.vars.FEATURE,'true');
  assert.equal(plan.count,3);
  assert.equal(plan.config.keep_vars,false);
  assert.equal(config.keep_vars,true);
  assert.equal(Object.hasOwn(plan.config.vars,'TOKEN'),false);
  assert.equal(plan.removed.length,3);
  assert.throws(()=>planVariables(config,[{name:'X',type:'plain_text'}]));
  for(const name of REMOVE)assert.throws(()=>planVariables(config,[{name,type:'secret_text'}]));
  assert.throws(()=>planVariables({name:WORKER,vars:{TOKEN:'bad'}},[secret]));
  assert.throws(()=>planVariables(config,[secret,secret]));
  assert.throws(()=>planVariables(config,Array.from({length:65},(_,i)=>({name:'V'+i,type:'plain_text',text:'x'}))));
  const json=planVariables({name:WORKER,vars:{}},[{name:'SETTINGS',type:'json',json:'{"enabled":true}'}]);
  assert.deepEqual(json.config.vars.SETTINGS,{enabled:true});
  const boundaryConfig={name:WORKER,vars:{DOMAIN_ORDER_ENV:'production',UI_V35_WORKER_COMPAT:'worker-v35.mjs'},keep_vars:true};
  const boundaryBindings=[...Array.from({length:62},(_,i)=>({name:'V'+i,type:'plain_text',text:'x'})),secret,...bindings.filter(b=>REMOVE.has(b.name))];
  const boundary=planVariables(boundaryConfig,boundaryBindings);
  assert.equal(boundary.count,64);
  assert.equal(boundary.config.vars.DOMAIN_ORDER_ENV,'production');
  assert.equal(Object.hasOwn(boundary.config.vars,'UI_V35_WORKER_COMPAT'),false);
  assert.equal(boundary.removed.length,3);
  assert.throws(()=>planVariables(boundaryConfig,[...boundaryBindings,{name:'EXTRA',type:'plain_text',text:'x'}]),error=>error.message==='VARIABLE_LIMIT_STILL_EXCEEDED'&&error.variableCount===65&&error.limit===64);
  const report=variableInventoryReport(config,bindings);
  assert.equal(report.variablesAfter,plan.count);
  assert.equal(report.uniqueBeforeRemoval,6);
  assert.equal(report.workerVariableCount,5);
  assert.equal(report.removedFromWorker.length,3);
  assert.deepEqual(report.addedByConfig,['FEATURE']);
  assert.equal(JSON.stringify(report).includes('preserved'),false);
  assert.equal(JSON.stringify(report).includes('worker-v35.mjs'),false);
  const shared=variableInventoryReport({name:WORKER,vars:{DASHBOARD_ONLY:'PRIVATE_CONFIG_VALUE'}},bindings);
  assert.deepEqual(shared.inventory.find(row=>row.name==='DASHBOARD_ONLY').sources,['worker','config']);
  assert.equal(JSON.stringify(shared).includes('PRIVATE_CONFIG_VALUE'),false);
  const hiddenVars={};Object.defineProperty(hiddenVars,'FEATURE',{enumerable:true,get(){throw Error('CONFIG_VALUE_ACCESSED');}});
  const hiddenBinding={name:'RUNTIME',type:'plain_text'};Object.defineProperty(hiddenBinding,'text',{get(){throw Error('VALUE_ACCESSED');}});
  assert.equal(variableInventoryReport({name:WORKER,vars:hiddenVars},[hiddenBinding,secret]).variablesAfter,3);
  const oversized=variableInventoryReport({name:WORKER,vars:Object.fromEntries(Array.from({length:65},(_,i)=>['V'+i,'x']))},[]);
  assert.equal(oversized.variablesAfter,65);assert.equal(oversized.overLimitBy,1);assert.equal(oversized.reductionToTarget,10);
  assert.throws(()=>variableInventoryReport(config,[secret,secret]),/INVALID_OR_DUPLICATE_BINDING/);
  assert.throws(()=>variableInventoryReport({name:WORKER,vars:{TOKEN:'bad'}},[secret]),/CONFIG_WOULD_OVERWRITE_SECRET/);
  for(const name of REMOVE)assert.throws(()=>variableInventoryReport(config,[{name,type:'secret_text'}]),/REMOVAL_TARGET_IS_NOT_PLAIN_TEXT/);
  assert.throws(()=>variableInventoryReport({name:'other'},[]),/INVALID_TARGET_OR_INVENTORY/);
  const retiredBindings=Object.entries(RETIRED_COMPAT_VALUES).map(([name,text])=>({name,type:'plain_text',text}));
  const secretNames=['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_DOMAIN_API_TOKEN','CLOUDFLARE_REGISTRAR_API_TOKEN','CLOUDFLARE_ZONE_ID','MIDTRANS_CLIENT_KEY','MIDTRANS_SERVER_KEY','SUPABASE_SERVICE_ROLE_KEY'];
  const productionSecrets=secretNames.map(name=>{const b={name,type:'secret_text'};Object.defineProperty(b,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});return b;});
  const productionBindings=[...Array.from({length:51},(_,i)=>({name:'PUBLIC_'+i,type:'plain_text',text:'mock'})),...productionSecrets,...retiredBindings];
  const productionConfig={name:WORKER,vars:{...RETIRED_COMPAT_VALUES,DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_REGISTRATION_TERMS_VERSION:'cloudflare-domain-registration-2026-08-20'}};
  const productionPlan=planVariables(productionConfig,productionBindings);
  assert.equal(productionBindings.length,64);assert.equal(productionPlan.count,61);assert.equal(productionPlan.removed.length,5);
  assert.equal(variableInventoryReport(productionConfig,productionBindings).variablesAfter,61);
  for(const name of secretNames)assert.equal(Object.hasOwn(productionPlan.config.vars,name),false);
  for(const name of Object.keys(RETIRED_COMPAT_VALUES))assert.equal(Object.hasOwn(productionPlan.config.vars,name),false);
  assert.equal(productionPlan.config.vars.DOMAIN_CUSTOMER_PRODUCTION_ENABLED,'true');
  assert.equal(productionPlan.config.vars.DOMAIN_REGISTRATION_TERMS_VERSION,'cloudflare-domain-registration-2026-08-20');
  assert.throws(()=>planVariables(productionConfig,productionBindings.map(b=>b.name==='NARA_FALLBACK_WORKER_COMPAT'?{...b,text:'changed'}:b)),/RETIREMENT_VALUE_CHANGED/);
  assert.throws(()=>planVariables({...productionConfig,vars:{...productionConfig.vars,NARA_FALLBACK_WORKER_COMPAT:'changed'}},productionBindings),/RETIREMENT_VALUE_CHANGED/);
  assert.throws(()=>assertLegacyVariableRemoval({name:'MIDTRANS_SERVER_KEY',type:'plain_text',text:'mock'}),/UNKNOWN_RETIREMENT_TARGET/);
  assert.throws(()=>planVariables(productionConfig,[...productionBindings,...Array.from({length:4},(_,i)=>({name:'EXTRA_'+i,type:'plain_text',text:'mock'}))]),error=>error.message==='VARIABLE_LIMIT_STILL_EXCEEDED'&&error.variableCount===65);
  assert.deepEqual(pricingSnapshotReport([]),{status:'missing',reason:'PRICING_SNAPSHOT_MISSING'});
  const snapshotSecret={name:'DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON',type:'secret_text'};
  Object.defineProperty(snapshotSecret,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});
  assert.deepEqual(pricingSnapshotReport([snapshotSecret]),{status:'not_inspectable',reason:'PRICING_SNAPSHOT_IS_SECRET'});
  assert.deepEqual(pricingSnapshotReport([{name:snapshotSecret.name,type:'plain_text',text:'not-json'}]),{status:'invalid',reason:'INVALID_PRICING_JSON'});
  assert.deepEqual(pricingSnapshotReport([{name:snapshotSecret.name,type:'json',json:{}}]),{status:'invalid',reason:'PRICING_SNAPSHOT_REQUIRES_STRING_BINDING'});
  assert.deepEqual(pricingSnapshotReport([{name:snapshotSecret.name,type:'plain_text',text:'{}'}]),{status:'invalid',reason:'INVALID_PRICING_SNAPSHOT_SHAPE'});
  const sharedSnapshotSecret={name:'DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT',type:'secret_text'};
  Object.defineProperty(sharedSnapshotSecret,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});
  assert.deepEqual(pricingSnapshotReport([sharedSnapshotSecret]),{status:'not_inspectable',reason:'PRICING_SNAPSHOT_IS_SECRET'});
  const invalidShared={name:sharedSnapshotSecret.name,type:'plain_text',text:'not-json'};
  assert.deepEqual(pricingSnapshotReport([invalidShared]),{status:'invalid',reason:'INVALID_PRICING_JSON'});
  assert.deepEqual(pricingSnapshotReport([sharedSnapshotSecret,sharedSnapshotSecret]),{status:'unavailable',reason:'DUPLICATE_SNAPSHOT_BINDING'});
  assert.deepEqual(pricingSnapshotReport([{name:snapshotSecret.name,type:'plain_text',text:'not-json'},sharedSnapshotSecret]),{status:'invalid',reason:'INVALID_PRICING_JSON'});
  assert.deepEqual(pricingSnapshotReport([snapshotSecret,snapshotSecret,sharedSnapshotSecret]),{status:'unavailable',reason:'DUPLICATE_SNAPSHOT_BINDING'});
  assert.deepEqual(pricingSnapshotReport([snapshotSecret,invalidShared]),{status:'not_inspectable',reason:'PRICING_SNAPSHOT_IS_SECRET'});
}

async function main(){
  selfTest();
  if(process.argv.includes('--self-test')){
    console.log('[worker-vars] SELF_TEST_PASS');return;
  }
  const args=process.argv.slice(2);
  if(args.length>1||args.some(a=>!['--check','--prepare'].includes(a))) throw Error('UNSUPPORTED_ARGUMENT');
  const production=process.env.WORKERS_CI==='1'&&process.env.WORKERS_CI_BRANCH==='main';
  if(args.includes('--prepare')&&!production){
    console.log('[worker-vars] PREPARE_SKIPPED_NON_PRODUCTION');return;
  }
  if(!production) throw Error('PRODUCTION_WORKERS_BUILD_ONLY');
  if(process.env.WRANGLER_CI_OVERRIDE_NAME&&process.env.WRANGLER_CI_OVERRIDE_NAME!==WORKER){
    throw Error('WORKER_OVERRIDE_MISMATCH');
  }
  if(process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT){
    throw Error('ACCOUNT_ENV_MISMATCH');
  }
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if(!token) throw Error('BUILD_API_TOKEN_UNAVAILABLE');
  const config=JSON.parse(await readFile(resolve('wrangler.jsonc'),'utf8'));
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`,{
    headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(30000)
  });
  if(!response.ok) throw Error(`INVENTORY_HTTP_${response.status}`);
  const payload=await response.json();
  if(payload.success!==true) throw Error('INVENTORY_REJECTED');
  console.log('[worker-vars] INVENTORY '+JSON.stringify(variableInventoryReport(config,payload.result?.bindings)));
  console.log('[domain-pricing] WORKER_SNAPSHOT '+JSON.stringify(pricingSnapshotReport(payload.result?.bindings)));
  const plan=planVariables(config,payload.result?.bindings);
  console.log('[worker-vars] PLAN '+JSON.stringify({worker:WORKER,variablesAfter:plan.count,removed:plan.removed}));
  if(args.includes('--check')) return;
  if(args.includes('--prepare')){
    await writeFile(resolve('wrangler.jsonc'),JSON.stringify(plan.config,null,2)+'\n',{mode:0o600});
    console.log('[worker-vars] PREPARED_DEFAULT_CONFIG');return;
  }
  const tmp=resolve(`.wrangler-free-limit-${process.pid}.json`);
  let created=false;
  try{
    await writeFile(tmp,JSON.stringify(plan.config,null,2)+'\n',{mode:0o600,flag:'wx'});
    created=true;
    const result=spawnSync('npx',['--no-install','wrangler','deploy','--config',tmp],{
      cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:600000
    });
    if(result.error||result.status!==0) throw Error('WRANGLER_DEPLOY_FAILED');
    console.log('[worker-vars] DEPLOY_COMMAND_SUCCEEDED');
  }finally{
    if(created) await unlink(tmp).catch(()=>{});
  }
}
main().catch(error=>{
  const message=String(error?.message||'');
  if(message==='VARIABLE_LIMIT_STILL_EXCEEDED'&&Number.isSafeInteger(error.variableCount)){
    console.error('[worker-vars] LIMIT '+JSON.stringify({variablesAfter:error.variableCount,limit:64}));
  }
  console.error('[worker-vars] STOP '+(/^[A-Z][A-Z0-9_]+$/.test(message)?message:'UNEXPECTED_FAILURE'));
  process.exitCode=1;
});
