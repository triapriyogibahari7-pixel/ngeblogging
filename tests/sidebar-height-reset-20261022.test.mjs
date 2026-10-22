import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {repairSidebarHeight} from '../scripts/sidebar-height-reset-20261022.mjs';
const source=await readFile(new URL('../src/studio-sidebar-hard-lock-v301.js',import.meta.url),'utf8');
const id='/app/src/studio-sidebar-hard-lock-v301.js';
const fixed=repairSidebarHeight(source,id).code;
function run(code,collapsed){const start=code.indexOf('function applyLarge(');const end=code.indexOf('function pinSupportingSurfaces()',start);assert.ok(start>=0&&end>start);const side={styles:{'max-height':'54px','min-height':'54px'},classList:{contains:()=>collapsed}};const content={styles:{}};const sh={dataset:{}};vm.runInNewContext(code.slice(start,end)+';applyLarge(sh,side,content)',{side,content,sh,root:()=>({dataset:{}}),show:()=>{},important:(node,key,value)=>node.styles[key]=value,exposeMenu:()=>{},collapseToRail:()=>{},syncMark:()=>{}});return {side,content};}
test('reproduces stale compact height before correction',()=>assert.equal(run(source,false).side.styles['max-height'],'54px'));
for(const collapsed of [false,true])test('resets height without changing rail width: '+collapsed,()=>{const result=run(fixed,collapsed);assert.equal(result.side.styles['max-height'],'100dvh');assert.equal(result.side.styles['min-height'],'0');assert.equal(result.side.styles.width,collapsed?'70px':'220px');assert.equal(result.content.styles['margin-left'],collapsed?'70px':'220px');});
test('does not transform other modules or duplicate correction',()=>{assert.equal(repairSidebarHeight(source,'/app/src/other.js'),null);assert.equal(repairSidebarHeight(fixed,id),null);assert.equal(repairSidebarHeight(source,id+'?v=1').code,fixed);});
test('fails closed when source anchor changes',()=>assert.throws(()=>repairSidebarHeight('',id),/ANCHOR_MISMATCH/));
