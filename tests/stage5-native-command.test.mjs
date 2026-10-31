import assert from 'node:assert/strict';
import {command} from '../scripts/stage5-cloudflare-native-build.mjs';
const results=[];
await command(process.execPath,['-e','process.exit(0)']);results.push('success preserved');
let failure;try{await command(process.execPath,['-e',"console.error('fixture stderr marker');process.exit(7)"]);}catch(e){failure=e;}
assert.ok(failure?.message.includes('node 7'));assert.ok(failure.message.includes('fixture stderr marker'));results.push('command name, code and stderr retained');
let secret;try{await command(process.execPath,['-e',"console.error('Bearer ghp_NOT_A_REAL_TOKEN TOKEN=fixture_secret');process.exit(1)"]);}catch(e){secret=e;}
assert.ok(!secret.message.includes('ghp_NOT_A_REAL_TOKEN'));assert.ok(!secret.message.includes('fixture_secret'));results.push('error tail redacted');
let bounded;try{await command(process.execPath,['-e',"process.stderr.write('x'.repeat(10000));process.exit(1)"]);}catch(e){bounded=e;}
assert.ok(bounded.message.length<4300);results.push('tail bounded');
let missing;try{await command('/definitely-not-a-real-stage5-command',[]);}catch(e){missing=e;}
assert.ok(missing.message.includes('definitely-not-a-real-stage5-command ENOENT'));results.push('spawn error labeled');
let timeout;try{await command(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:100});}catch(e){timeout=e;}
assert.ok(timeout.message.includes('TIMEOUT'));results.push('timeout still rejects');
console.log('\nRESULT '+JSON.stringify({passed:results.length,checks:results,nativeDatabaseExecuted:false}));
