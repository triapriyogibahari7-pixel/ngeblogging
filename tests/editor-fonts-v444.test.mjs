import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fonts,fontUrl} from '../src/lib/editor-fonts-v444.mjs';
test('120 distinct font families',()=>{assert.equal(fonts.length,120);assert.equal(new Set(fonts).size,120);assert.ok(Object.isFrozen(fonts));});
test('font URL is allowlisted and encoded',()=>{assert.equal(fontUrl('Open Sans'),'https://fonts.googleapis.com/css2?family=Open+Sans&display=swap');assert.throws(()=>fontUrl('NotAllowed'),/FONT_NOT_ALLOWED/);assert.throws(()=>fontUrl('Roboto&text=private'),/FONT_NOT_ALLOWED/);});
test('formatting clones content and uses browser edit command',()=>{const source=readFileSync(new URL('../src/EditorTypographyV444.jsx',import.meta.url),'utf8');assert.ok(source.includes('range.cloneContents()'));assert.ok(source.includes("document.execCommand('insertHTML'"));assert.ok(!source.includes('range.extractContents()'));assert.ok(source.includes('innerHTML!==before'));});
