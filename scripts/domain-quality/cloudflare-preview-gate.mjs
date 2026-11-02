import {spawnSync,execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export function runCloudflarePreviewGate(){
  const branch='fix/domain-commerce-midtrans-20261102';
  if(process.env.WORKERS_CI!=='1'||process.env.WORKERS_CI_BRANCH!==branch)return null;
  const expected=process.env.WORKERS_CI_COMMIT_SHA;
  if(!/^[a-f0-9]{40}$/i.test(expected||''))throw Error('DOMAIN_PREVIEW_COMMIT_REQUIRED');
  const work=mkdtempSync(join(tmpdir(),'domain-preview-gate-'));
  const env={PATH:process.env.PATH||'',HOME:work,TMPDIR:work,CI:'true',NODE_ENV:'test',LANG:'C.UTF-8',WRANGLER_SEND_METRICS:'false'};
  try{
    const commit=execFileSync('git',['rev-parse','HEAD'],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim().toLowerCase();
    if(commit!==expected.toLowerCase())throw Error('DOMAIN_PREVIEW_COMMIT_MISMATCH');
    const groups=['search','quotes','checkout','payments','registration','dns','transfer','isolation'];
    for(const group of groups){
      console.log('[domain-preview-gate] START '+group);
      const result=spawnSync(process.execPath,['scripts/domain-quality/'+group+'.mjs'],{env,stdio:'inherit',shell:false,timeout:620000});
      if(result.error||result.signal||result.status!==0)throw Error('DOMAIN_PREVIEW_GROUP_FAILED: '+group);
    }
    const proof={commit,branch,runner:'cloudflare-workers-builds',completedGroups:groups,completedAt:new Date().toISOString(),scope:'Existing regression groups only; not live registrar or payment verification'};
    console.log('[domain-preview-gate] PASS '+JSON.stringify(proof));
    return {name:'domain-preview-regression-proof',apply:'build',generateBundle(){this.emitFile({type:'asset',fileName:'assets/domain-quality-'+commit+'.json',source:JSON.stringify(proof,null,2)+'\n'});}};
  }finally{rmSync(work,{recursive:true,force:true});}
}
