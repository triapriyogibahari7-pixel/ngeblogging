import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,groups,searchCatalog} from '../src/lib/editor-catalog-v444.mjs';
test('exactly 120 unique specifications and action IDs',()=>{assert.equal(catalog.length,120);for(const field of ['id','actionId','label'])assert.equal(new Set(catalog.map(item=>item[field])).size,120);});
test('eight groups match approved allocations',()=>{assert.deepEqual(groups.map(([,count])=>count),[12,24,18,18,16,12,10,10]);assert.equal(groups.reduce((sum,[,count])=>sum+count,0),120);});
test('all entries are explicitly planned, with acceptance and verification',()=>{for(const item of catalog){assert.equal(item.status,'planned');assert.ok(item.acceptance.includes(item.label));assert.ok(item.verification.includes('Belum diuji'));assert.ok(item.stage>=3&&item.stage<=9);}});
test('searches label, group and ID without case sensitivity',()=>{assert.equal(searchCatalog('TEXT-01')[0].label,'Pilih keluarga font');assert.ok(searchCatalog('gambar').length>=4);assert.equal(searchCatalog('','table').length,16);assert.equal(searchCatalog('tidak-ada-fungsi-ini').length,0);assert.equal(searchCatalog('   ').length,120);});
test('search does not mutate frozen catalog',()=>{searchCatalog('HTML');assert.ok(Object.isFrozen(catalog));assert.ok(catalog.every(Object.isFrozen));assert.equal(catalog.length,120);});
