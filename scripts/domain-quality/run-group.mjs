import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function runGroup(name,tests){
  if(!/^[a-z]+$/.test(name)||!Array.isArray(tests)||!tests.length||tests.some(t=>!/^tests\/[a-z0-9-]+\.test\.mjs$/.test(t)))throw Error('INVALID_TEST_GROUP');
  const cwd=fileURLToPath(new URL('../../',import.meta.url));
  for(const test of tests)if(!existsSync(join(cwd,test)))throw Error('MISSING_TEST: '+test);
  const temporary=mkdtempSync(join(tmpdir(),'domain-quality-'));
  try{
    const env={PATH:process.env.PATH||'',HOME:temporary,TMPDIR:temporary,CI:'true',NODE_ENV:'test',LANG:'C.UTF-8',WRANGLER_SEND_METRICS:'false'};
    const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd,env,stdio:'inherit',shell:false,timeout:600000});
    if(result.error)throw result.error;
    if(result.signal)throw Error('TEST_PROCESS_SIGNAL: '+result.signal);
    if(result.status!==0)throw Error('TEST_GROUP_FAILED: '+name+' ('+result.status+')');
    console.log('TEST_GROUP_PASSED: '+name);
  }finally{rmSync(temporary,{recursive:true,force:true});}
}
