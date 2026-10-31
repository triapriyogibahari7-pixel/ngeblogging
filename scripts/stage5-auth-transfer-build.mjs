import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {selected} from './stage5-cloudflare-native-build.mjs';
export async function runStage5AuthTransferBuild(){
 if(!selected(process.env))return;
 const bytes=await readFile(resolve('scripts/stage5-isolated-auth-build.mjs'));
 const expected='776d7cc7200322caaf517062748507cad0340a20';
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),expected,'AUTH_BASE_RUNNER_CHANGED');
 let source=bytes.toString('utf8');
 const nativeImport="'./stage5-cloudflare-native-build.mjs'";
 assert.equal(source.split(nativeImport).length,2,'NATIVE_IMPORT_ANCHOR');
 source=source.replace(nativeImport,JSON.stringify(pathToFileURL(resolve('scripts/stage5-cloudflare-native-build.mjs')).href));
 const marker='assert.equal(report.tests.length,10);report.passed=true;report.passedCount=10;';
 assert.equal(source.split(marker).length,2,'AUTH_SUCCESS_ANCHOR');
 const extra="report.transferIntegration=await runAuthTransferIntegration({db,http,actors:{a,b}});assert.equal(report.transferIntegration.passed,true);assert.equal(report.transferIntegration.passedCount,12);report.nativeWorkerIntegration=await runNativeWorkerIntegration({db,actors:{a,b}});assert.equal(report.nativeWorkerIntegration.passed,true);assert.equal(report.nativeWorkerIntegration.passedCount,12);assert.equal(report.nativeWorkerIntegration.workerdDisposed,true);report.applicationTransferIntegration=await runApplicationTransferIntegration({db,actors:{a,b}});assert.equal(report.applicationTransferIntegration.passed,true);assert.equal(report.applicationTransferIntegration.passedCount,8);assert.equal(report.applicationTransferIntegration.httpServerStopped,true);report.authRunnerAdapter={baseBlob:'"+expected+"',mode:'In-memory additive integration before original cleanup; original ten assertions unchanged'};";
 source="import {runAuthTransferIntegration} from "+JSON.stringify(pathToFileURL(resolve('scripts/stage5-auth-transfer-supplement.mjs')).href)+";\nimport {runNativeWorkerIntegration} from "+JSON.stringify(pathToFileURL(resolve('scripts/stage5-native-worker-supplement.mjs')).href)+";\nimport {runApplicationTransferIntegration} from "+JSON.stringify(pathToFileURL(resolve('scripts/stage5-application-transfer-supplement.mjs')).href)+";\n"+source.replace(marker,extra+marker);
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 await module.runStage5IsolatedAuthBuild();
}
