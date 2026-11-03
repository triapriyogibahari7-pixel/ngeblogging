import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const component=readFileSync(new URL('../src/CommentsPanelV124.jsx',import.meta.url),'utf8');
const rawCss=readFileSync(new URL('../src/comments-discussion-responsive.css',import.meta.url),'utf8');
const layoutImport='@import "./comments-discussion-layout-metrics.css";\n';
const css=rawCss.replace(layoutImport,'');
const styleImport='import "./comments-discussion-responsive.css";\n';
const scope='.sv124-comments-page .sv124-card.sv124-comment-workspace';
test('the comment component imports its dedicated stylesheet exactly once',()=>assert.equal(component.split(styleImport).length-1,1));
test('all existing React rendering and behavior are byte identical apart from the CSS import',()=>{
 const original=component.replace(styleImport,'');const data=Buffer.from(original);
 const hash=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
 assert.equal(hash,'283dcc27cf9e87358958249fd64e56a7b6d214c1');
});
test('every CSS selector is confined to the comment workspace',()=>{
 const plain=css.replace(/\/\*[\s\S]*?\*\//g,'');let count=0;
 for(const match of plain.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)){
  const header=match[1].trim();if(header.startsWith('@'))continue;
  for(const selector of header.split(',')){assert.ok(selector.trim().startsWith(scope),selector);count++;}
 }
 assert.ok(count>40);
});
test('layout follows panel width, with a narrow fallback and a wide split view',()=>{
 assert.match(css,/container:\s*comments-discussion \/ inline-size/);
 assert.match(css,/grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/);
 assert.match(css,/@container comments-discussion \(min-width: 880px\)/);
 assert.match(css,/minmax\(240px, \.85fr\) minmax\(0, 1\.6fr\)/);
});
test('touch devices and text inputs retain comfortable sizes',()=>{
 assert.match(css,/@media \(any-pointer: coarse\)/);
 assert.match(css,/min-height:\s*48px !important/);
 assert.match(css,/font-size:\s*16px !important/);
});
test('focus and disabled affordances are preserved',()=>{
 assert.match(css,/:focus-visible/);assert.match(css,/:focus-within/);
 assert.match(css,/:disabled/);assert.doesNotMatch(css,/pointer-events\s*:\s*none/);
});
test('long text and reply input can wrap without hiding comment bodies',()=>{
 assert.match(css,/overflow-wrap:\s*anywhere/);assert.match(css,/white-space:\s*pre-wrap/);
 assert.match(css,/resize:\s*vertical/);assert.doesNotMatch(css,/line-clamp|text-overflow:\s*ellipsis/);
});
test('presentation has no external assets, global UI overrides, or hidden controls',()=>{
 assert.doesNotMatch(css,/@import|url\s*\(|display\s*:\s*none|visibility\s*:\s*hidden/);
 assert.doesNotMatch(css,/sv124-settings-card|sv124-toggle|sv124-page-title|sv124-site-strip/);
 assert.match(css,/prefers-reduced-motion/);
});
test('the only added CSS import is the fixed local page-layout stylesheet',()=>{
 assert.ok(rawCss.startsWith(layoutImport));assert.equal(rawCss.split(layoutImport).length-1,1);
});
test('all existing moderation and workspace CSS remains byte-identical',()=>{
 const data=Buffer.from(css);const hash=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
 assert.equal(hash,'91add031340d8a17bde901779352b3df3d86c9e4');
});
test('new page-layout rules stay scoped and do not target moderation controls',()=>{
 const layout=readFileSync(new URL('../src/comments-discussion-layout-metrics.css',import.meta.url),'utf8');
 assert.doesNotMatch(layout,/sv124-moderation-actions/);
 const plain=layout.replace(/\/\*[\s\S]*?\*\//g,'');let count=0;
 for(const match of plain.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)){
  const header=match[1].trim();if(header.startsWith('@'))continue;
  for(const selector of header.split(',')){assert.ok(selector.trim().startsWith('.sv124-comments-page'),selector);count++;}
 }
 assert.ok(count>20);
 for(const n of [1,2,3,4])assert.ok(layout.includes('nth-child('+n+')::before'));
});
