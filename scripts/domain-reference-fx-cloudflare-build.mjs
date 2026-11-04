import {spawnSync} from 'node:child_process';
export function runReferenceFxCloudflareBuild(){
 const branch=process.env.WORKERS_CI_BRANCH;
 if(process.env.WORKERS_CI!=='1'||!['fix/domain-reference-fx-recovery-20261104','fix/domain-reference-fx-runtime-20261104'].includes(branch))return null;
 const env={PATH:process.env.PATH||'',CI:'true',NODE_ENV:'test',LANG:'C.UTF-8'};
 const files=['tests/domain-reference-fx.test.mjs',...(branch==='fix/domain-reference-fx-runtime-20261104'?['tests/domain-reference-fx-retry.test.mjs']:[])];
 const tests=spawnSync(process.execPath,['--test',...files],{env,stdio:'inherit',shell:false,timeout:120000});
 if(tests.error||tests.signal||tests.status!==0)throw Error('REFERENCE_FX_TESTS_FAILED_NO_DEPLOY');
 const probe=spawnSync(process.execPath,['scripts/probe-domain-reference-fx.mjs'],{env,encoding:'utf8',shell:false,timeout:12000,maxBuffer:32768});
 let result={failure:'PROBE_OUTPUT_UNAVAILABLE'};
 try{const raw=JSON.parse(probe.stdout);const safe={};
  if(raw.probe!=='domain-reference-fx')throw Error();
  if(Number.isInteger(raw.httpStatus)&&raw.httpStatus>=100&&raw.httpStatus<=599)safe.httpStatus=raw.httpStatus;
  if(['HTTP_STATUS','CONTENT_TYPE','BODY_UNAVAILABLE','BODY_TOO_LARGE','TIMEOUT','JSON_OR_ENCODING_INVALID','REFERENCE_VALIDATION_REJECTED','BODY_READ_FAILED','NETWORK_FAILED'].includes(raw.failure))safe.failure=raw.failure;
  if(['array','null','object','string','number','boolean'].includes(raw.bodyShape))safe.bodyShape=raw.bodyShape;
  if(typeof raw.pairMatches==='boolean')safe.pairMatches=raw.pairMatches;
  if(['number','string','undefined','object','boolean'].includes(raw.rateType))safe.rateType=raw.rateType;
  if(typeof raw.publicReferenceRate==='number'&&Number.isFinite(raw.publicReferenceRate)&&raw.publicReferenceRate>0&&raw.publicReferenceRate<=1000000)safe.publicReferenceRate=raw.publicReferenceRate;
  if(Number.isInteger(raw.rateDecimalPlaces)&&raw.rateDecimalPlaces>=0&&raw.rateDecimalPlaces<=30)safe.rateDecimalPlaces=raw.rateDecimalPlaces;
  if(typeof raw.publicSourceDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.publicSourceDate))safe.publicSourceDate=raw.publicSourceDate;
  if(raw.validation==='accepted'&&probe.status===0&&!probe.error&&!probe.signal)safe.validation='accepted';
  if(!safe.failure&&safe.validation!=='accepted')safe.failure='PROBE_OUTPUT_UNVERIFIED';
  result=safe;
 }catch{}
 const commit=process.env.WORKERS_CI_COMMIT_SHA;
 const proof={version:1,environment:'cloudflare-build-preview',branch,commit:typeof commit==='string'&&/^[a-f0-9]{40}$/i.test(commit)?commit:null,tests:'passed',probe:result,runtimeVerified:false,productionChanged:false,quoteCreated:false,orderCreated:false,paymentCreated:false};
 console.log('REFERENCE_FX_BUILD_PROOF '+JSON.stringify(proof));
 return {name:'reference-fx-preview-proof',generateBundle(){this.emitFile({type:'asset',fileName:'diagnostics/domain-reference-fx-build.json',source:JSON.stringify(proof)});}};
}
