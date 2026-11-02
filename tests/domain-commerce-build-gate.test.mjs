import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMERCE_BRANCH,BUILD_INPUTS,commerceBuildContext,verifyCommerceCommit,isolatedCommerceEnvironment,redactCommerceLog,commerceTapEvidence,domainCommerceBuildProofPlugin} from '../scripts/domain-commerce-cloudflare-build.mjs';
const SHA='a'.repeat(40),counts=n=>({tests:n,pass:n,fail:0,cancelled:0,skipped:0,todo:0});
const tap=values=>Object.entries(values).map(([k,v])=>'# '+k+' '+v).join('\n')+'\n';
test('Cloudflare gate selects commerce branch and main with required commit metadata',()=>{
 for(const branch of [COMMERCE_BRANCH,'main'])assert.equal(commerceBuildContext({WORKERS_CI:'1',WORKERS_CI_BRANCH:branch,WORKERS_CI_COMMIT_SHA:SHA}).selected,true);
 assert.equal(commerceBuildContext({WORKERS_CI:'1',WORKERS_CI_BRANCH:'another-feature'}).selected,false);
 assert.throws(()=>commerceBuildContext({WORKERS_CI:'1'}));assert.throws(()=>commerceBuildContext({WORKERS_CI:'1',WORKERS_CI_BRANCH:COMMERCE_BRANCH}));
});
test('local and GitHub contexts are not falsely labelled Cloudflare',()=>{
 assert.equal(commerceBuildContext({},COMMERCE_BRANCH).platform,'local');
 const context=commerceBuildContext({GITHUB_ACTIONS:'true',GITHUB_HEAD_REF:COMMERCE_BRANCH,GITHUB_SHA:SHA});assert.equal(context.platform,'github');assert.equal(context.selected,true);
});
test('build commit must match the checkout',()=>{
 assert.equal(verifyCommerceCommit({expectedCommit:SHA},SHA),SHA);assert.throws(()=>verifyCommerceCommit({expectedCommit:SHA},'b'.repeat(40)));assert.throws(()=>verifyCommerceCommit({},'invalid'));
});
test('test children do not inherit production credentials or HOME',()=>{
 const clean=isolatedCommerceEnvironment('/tmp/isolated',{PATH:'/usr/bin',HOME:'/private-home',SUPABASE_SERVICE_ROLE_KEY:'fixture-secret',CLOUDFLARE_API_TOKEN:'fixture-token',GITHUB_TOKEN:'fixture-token',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'fixture-key',NODE_OPTIONS:'fixture-options'});
 assert.equal(clean.HOME,'/tmp/isolated');assert.equal(clean.WRANGLER_SEND_METRICS,'false');for(const k of ['SUPABASE_SERVICE_ROLE_KEY','CLOUDFLARE_API_TOKEN','GITHUB_TOKEN','DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY','NODE_OPTIONS'])assert.equal(Object.hasOwn(clean,k),false);
});
test('TAP evidence requires executed passing tests with no skipped/cancelled/todo cases',()=>{
 assert.deepEqual(commerceTapEvidence(tap(counts(9)),9),counts(9));assert.throws(()=>commerceTapEvidence('',9));assert.throws(()=>commerceTapEvidence(tap(counts(0)),1));assert.throws(()=>commerceTapEvidence(tap(counts(8)),9));
 for(const k of ['fail','cancelled','skipped','todo'])assert.throws(()=>commerceTapEvidence(tap({...counts(9),[k]:1}),9));
});
test('public proof emits exact-commit artifacts and omits extra private metadata',()=>{
 const report={selected:true,schemaVersion:1,commit:SHA,branch:COMMERCE_BRANCH,platform:'local',buildId:null,validation:{offline:counts(40),native:counts(9)},inputs:Object.fromEntries(BUILD_INPUTS.map(file=>[file,'b'.repeat(64)])),privateValue:'must-not-publish'};
 const files=[],plugin=domainCommerceBuildProofPlugin(report);plugin.generateBundle.call({emitFile:file=>files.push(file)});
 assert.deepEqual(files.map(f=>f.fileName),['release-v20261102.json','assets/domain-commerce-build-'+SHA+'.json']);
 const proof=JSON.parse(files[0].source);assert.equal(proof.commit,SHA);assert.equal(proof.platform,'local');assert.ok(proof.doesNotVerify.includes('real-payments'));assert.ok(!files[0].source.includes('must-not-publish'));
 assert.throws(()=>domainCommerceBuildProofPlugin({...report,validation:{offline:counts(40),native:counts(0)}}));assert.throws(()=>domainCommerceBuildProofPlugin({...report,inputs:{}}));
});
test('logs redact bearer credentials and common secret formats',()=>{
 const text=redactCommerceLog('Bearer fixture-token sb_secret_fixture github_pat_fixture');assert.ok(!text.includes('fixture-token'));assert.ok(!text.includes('sb_secret_fixture'));assert.ok(!text.includes('github_pat_fixture'));
});
