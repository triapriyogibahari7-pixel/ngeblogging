// Run only in a clean worktree of the reviewed recovery branch. Does not deploy.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const allowed='fix/domain-order-recovery-flow-20261105';
if(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!==allowed)throw Error('WRONG_BRANCH');
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('TRACKED_WORKTREE_NOT_CLEAN');
function one(source,old,value){if(source.split(old).length!==2)throw Error('SOURCE_ANCHOR_DIFFERS: '+old.slice(0,100));return source.replace(old,value);}
const writes=[];
let checkout=await readFile('server/domain-checkout-preview-handler.mjs','utf8');
checkout=one(checkout,"const HOST=", "import {validateRecoveryWindow} from '../shared/domain-recovery-policy-v2.mjs';\nconst HOST=");
checkout=one(checkout,'function snapshot(s,id,now,production){const environment=',"function snapshot(s,id,now,production){const recovery=production&&s?.payment_window_policy==='same-order-recovery-2h-v2';if(recovery)validateRecoveryWindow(s,now);const environment=");
checkout=one(checkout,'expires-anchor>900000','expires-anchor>(recovery?7200000:900000)');
checkout=one(checkout,'s.duration_minutes>15','s.duration_minutes>(recovery?120:15)');
checkout=one(checkout,"const s=await rpc(production&&env.DOMAIN_ORDER_SITE_BINDING_ENABLED==='true'?", "const s=await rpc(production&&env.DOMAIN_ORDER_RECOVERY_ENABLED==='true'?'domain_begin_recovery_checkout_v2':production&&env.DOMAIN_ORDER_SITE_BINDING_ENABLED==='true'?");
checkout=one(checkout,'SITE_OWNER_REQUIRED:403};','SITE_OWNER_REQUIRED:403,REGISTRANT_DETAILS_REQUIRED:409,QUOTE_SNAPSHOT_MISMATCH:409,CHECKOUT_SESSION_CONFLICT:409,GATEWAY_RECONCILIATION_REQUIRED:409};');
writes.push(['server/domain-checkout-preview-handler.mjs',checkout]);
let page=await readFile('src/DomainOrderStatusPage.jsx','utf8');
page=one(page,"import DomainOrderActions from './DomainOrderActions.mjs';", "import DomainOrderActions from './DomainOrderActions.mjs';\nimport DomainOrderRecoveryPanelV2 from './DomainOrderRecoveryPanelV2.jsx';");
page=one(page,'<DomainOrderActions order={o} owner={session?.user?.id} onRefresh={refresh}/>', '<DomainOrderActions order={o} owner={session?.user?.id} onRefresh={refresh}/>{o.paymentState===\'pending\'&&o.registrationState===\'not_started\'&&<DomainOrderRecoveryPanelV2 orderId={id} token={session.access_token} onRefresh={refresh}/>}');
writes.push(['src/DomainOrderStatusPage.jsx',page]);
let config=await readFile('wrangler.production.jsonc','utf8');
config=one(config,'"main": "./cloudflare/worker-v70.mjs"','"main": "./cloudflare/domain-recovery-worker-v2.mjs"');
// A separate candidate configuration only. Production configuration remains untouched.
writes.push(['wrangler.recovery-candidate.jsonc',config]);
for(const [path,content] of writes)await writeFile(path,content);
console.log('Prepared checkout, status UI and separate candidate config. No deployment; recovery flag remains unset.');
