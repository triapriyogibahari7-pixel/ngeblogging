import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
export async function buildStage5TransferPackage({commit}){
 assert.match(commit||'',/^[0-9a-f]{40}$/,'PACKAGE_COMMIT_REQUIRED');
 const inputs=[['docs/drafts/domain-redirect-rls-v2-prerequisite.sql','54e20d57b6168f1b1443048b09fa7ce152162328'],['docs/drafts/domain-site-transfer-v2.sql','bf3fc0bd6d59c7f298837018065c9316d8c389eb'],['docs/drafts/domain-site-transfer-integrity-v2.sql','43133316a1dd1ca347237075054dc650fbd9e498']];
 const bodies=[],blobs={};
 for(const [path,expected] of inputs){const bytes=await readFile(path),hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.equal(hash,expected,'PACKAGE_INPUT_CHANGED '+path);const source=bytes.toString('utf8');assert.equal([...source.matchAll(/^BEGIN;$/gm)].length,1,'PACKAGE_BEGIN_ANCHOR');assert.equal([...source.matchAll(/^COMMIT;$/gm)].length,1,'PACKAGE_COMMIT_ANCHOR');bodies.push('-- SOURCE '+path+' GIT_BLOB '+hash+'\n'+source.replace(/^BEGIN;\n/m,'').replace(/^COMMIT;$/m,''));blobs[path]=hash;}
 const preflight=`DO $package_preflight$
BEGIN
 IF to_regprocedure('public.move_site_domain_v2(uuid,uuid,uuid,text)') IS NOT NULL OR to_regclass('public.site_domains_one_external_per_site_v2') IS NOT NULL THEN
  RAISE EXCEPTION 'EXISTING_TRANSFER_PACKAGE_REQUIRES_REVIEW';
 END IF;
 IF EXISTS(SELECT 1 FROM public.site_domains WHERE hostname<>'ngeblogging.com' AND hostname NOT LIKE '%.ngeblogging.com' GROUP BY site_id HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_CUSTOM_SLOTS_REQUIRES_REVIEW';END IF;
 IF EXISTS(SELECT 1 FROM public.site_domains WHERE hostname<>'ngeblogging.com' AND hostname NOT LIKE '%.ngeblogging.com' AND provider IS DISTINCT FROM 'cloudflare-full-zone') THEN RAISE EXCEPTION 'EXTERNAL_PROVIDER_REQUIRES_REVIEW';END IF;
 IF EXISTS(SELECT 1 FROM public.site_domains d JOIN public.sites s ON s.id=d.site_id WHERE (d.hostname='ngeblogging.com' OR d.hostname LIKE '%.ngeblogging.com') AND (d.hostname IS DISTINCT FROM s.slug||'.ngeblogging.com' OR d.provider IS DISTINCT FROM 'cloudflare' OR d.status::text IS DISTINCT FROM 'active')) THEN RAISE EXCEPTION 'PLATFORM_TOPOLOGY_REQUIRES_REVIEW';END IF;
END;
$package_preflight$;`;
 const sql='-- INACTIVE REVIEW PACKAGE. Not executed by this build.\n-- Requires separate database/release approval. All RPC execution grants remain revoked.\n-- Historical source comments are retained; no production-readiness claim.\nBEGIN;\nSET LOCAL lock_timeout=\'2s\';\nSET LOCAL statement_timeout=\'15s\';\nLOCK TABLE public.sites,public.site_domains,public.site_domain_redirects IN SHARE ROW EXCLUSIVE MODE;\n'+preflight+'\n'+bodies.join('\n')+'\nCOMMIT;\n';
 assert.equal([...sql.matchAll(/^BEGIN;$/gm)].length,1);assert.equal([...sql.matchAll(/^COMMIT;$/gm)].length,1);assert.equal(/^\s*GRANT\s+/mi.test(sql),false,'ACTIVATION_GRANT_FORBIDDEN');
 const manifest={sourceCommit:commit,status:'INACTIVE_REVIEW_PACKAGE',inputs:blobs,sqlSha256:createHash('sha256').update(sql).digest('hex'),executedOnDatabase:false,activationIncluded:false,productionApproved:false,atomicTransaction:true,sqlPath:'/stage5-transfer/'+commit+'.sql',limits:['Preserves conservative three-table serialization; production throughput/lock scope not approved','Published package has not itself been executed against the full application schema','Does not grant RPC execution or enable routes; separate release approval remains required']};
 await mkdir('public/stage5-transfer',{recursive:true});await writeFile('public/stage5-transfer/'+commit+'.sql',sql);await writeFile('public/stage5-transfer/'+commit+'.json',JSON.stringify(manifest,null,2)+'\n');return manifest;
}
