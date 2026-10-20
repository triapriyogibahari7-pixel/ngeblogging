import test from 'node:test';
import assert from 'node:assert/strict';
import {presets,getPreset} from '../src/lib/editor-presets-v444.mjs';
test('120 unique presets with unique formatting',()=>{assert.equal(presets.length,120);assert.equal(new Set(presets.map(x=>x.id)).size,120);assert.equal(new Set(presets.map(x=>JSON.stringify(x.css))).size,120);});
test('presets contain bounded values and no remote font dependency',()=>{for(const item of presets){assert.ok(Object.isFrozen(item.css));assert.match(item.css.color,/^#[a-f0-9]{6}$/);assert.ok(parseFloat(item.css.fontSize)>=14&&parseFloat(item.css.fontSize)<=36);assert.ok(!JSON.stringify(item).includes('https:'));}});
test('lookup is explicit and unknown IDs fail closed',()=>{assert.equal(getPreset('preset-1-1'),presets[0]);assert.equal(getPreset('unknown'),null);});
