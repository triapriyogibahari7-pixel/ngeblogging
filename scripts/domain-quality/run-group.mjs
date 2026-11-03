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
    const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd,env,stdio:['ignore','pipe','pipe'],encoding:'utf8',maxBuffer:16777216,shell:false,timeout:600000});
    const stdout=result.stdout||'',stderr=result.stderr||'';
    if(stdout)process.stdout.write(stdout);
    if(stderr)process.stderr.write(stderr);
    if(result.error||result.signal||result.status!==0){
      const lines=stdout.split(/\r?\n/),failures=[];
      for(let i=0;i<lines.length;i++){
        if(!/^\s*not ok\b/.test(lines[i]))continue;
        const block=[lines[i]];
        for(let j=i+1;j<lines.length&&block.length<100;j++){
          if(/^\s*(?:not ok|ok)\s+\d+\b/.test(lines[j])||/^# Subtest:/.test(lines[j]))break;
          block.push(lines[j]);
          if(/^\s*\.\.\.\s*$/.test(lines[j]))break;
        }
        failures.push({name:lines[i].trim(),detail:block.join('\n')});
      }
      console.error('DOMAIN_TEST_FAILURE_DETAILS_BEGIN '+name);
      for(const failure of failures.slice(-8))console.error(failure.detail);
      if(!failures.length)console.error((stderr||stdout).slice(-12000)||'No test output was captured.');
      console.error('DOMAIN_TEST_FAILURE_DETAILS_END '+name);
      const summary=failures.slice(-8).map(f=>f.name.slice(0,240)).join(' | ');
      const reason=result.error?'PROCESS_ERROR: '+result.error.message:result.signal?'SIGNAL: '+result.signal:'EXIT: '+result.status;
      throw Error('TEST_GROUP_FAILED: '+name+' ('+reason+')'+(summary?' FAILED_CASES: '+summary:''));
    }
    console.log('TEST_GROUP_PASSED: '+name);
  }finally{rmSync(temporary,{recursive:true,force:true});}
}
