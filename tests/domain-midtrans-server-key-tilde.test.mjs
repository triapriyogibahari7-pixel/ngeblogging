import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDomainMidtransServerKey as normalize} from '../server/domain-midtrans-server-key.mjs';
import {diagnoseDomainMidtransKey as diagnose} from '../server/domain-midtrans-key-diagnostic.mjs';
const production='Mid-server-~~synthetic_fixture_12345';
const sandbox='SB-'+production;
test('preserves tilde characters in synthetic server keys',()=>{
 assert.equal(normalize(production),production);
 assert.equal(normalize(' '+production+' '),production);
 assert.equal(normalize(sandbox,{environment:'sandbox'}),sandbox);
 assert.equal(diagnose(production),'FORMAT_ACCEPTED');
 assert.equal(diagnose(sandbox,{environment:'sandbox'}),'FORMAT_ACCEPTED');
});
test('tilde support does not bypass environment or malformed credential checks',()=>{
 assert.throws(()=>normalize(sandbox));
 assert.throws(()=>normalize(production,{environment:'sandbox'}));
 for(const value of ['Mid-server-~~','Mid-client-~~synthetic_fixture_12345','Basic '+production,'"'+production+'"',production+':',production+'=',production+' extra',production+'\nextra',production+'\u0000','Mid-server-'+'~'.repeat(201)])assert.throws(()=>normalize(value),{code:'MIDTRANS_SERVER_KEY_INVALID'});
});
