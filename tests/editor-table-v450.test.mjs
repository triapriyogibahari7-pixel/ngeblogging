import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTableHtml} from '../src/lib/editor-table-v450.mjs';
import {transformEditorTableNara} from '../scripts/editor-table-nara-v450.mjs';
test('table dimensions are bounded integers up to 50 by 50',()=>{assert.equal((createTableHtml(3,4).match(/<td>/g)||[]).length,12);assert.equal((createTableHtml(50,50).match(/<td>/g)||[]).length,2500);for(const pair of [[0,2],[51,2],[2,51],[2.5,2],[50,51]])assert.throws(()=>createTableHtml(...pair));});
test('table input and merge input support 50 columns',()=>{const component=readFileSync(new URL('../src/EditorTableToolsV450.jsx',import.meta.url),'utf8');assert.ok(!component.includes('max="20"'));assert.ok(component.includes('50 × 50 sel'));assert.ok(component.includes('max="50" value={columns}'));assert.ok(component.includes('max="50" value={mergeColumns}'));});
test('table toolbar and Nara CSS are connected without changing launcher markup',()=>{const editor=readFileSync(new URL('../src/ContentEditor.jsx',import.meta.url),'utf8');assert.ok(transformEditorTableNara(editor,'/repo/src/ContentEditor.jsx').code.includes('<EditorTableToolsV450'));const nara=readFileSync(new URL('../src/NaraAssistant.jsx',import.meta.url),'utf8');const output=transformEditorTableNara(nara,'/repo/src/NaraAssistant.jsx');assert.ok(output.code.endsWith(nara));assert.ok(output.code.includes('editor-table-nara-v450.css'));assert.equal(transformEditorTableNara(output.code,'/repo/src/NaraAssistant.jsx'),null);});
