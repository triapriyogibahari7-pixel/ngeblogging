import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNaraModelV227, normalizeNaraIntelligenceV227, naraModelProfileV227, naraIntelligenceProfileV227, workersAiProviderModelV227 } from '../server/nara-model-contract-v227.mjs';
test('prototype property names cannot select profiles', () => {
 for (const value of ['constructor','__proto__']) {
  assert.equal(normalizeNaraModelV227(value),'nara-mini');
  assert.equal(normalizeNaraIntelligenceV227(value),'standard');
  assert.equal(naraModelProfileV227(value).id,'nara-mini');
  assert.equal(naraIntelligenceProfileV227(value).id,'standard');
 }
});
test('Vision and Max image requests select the configured vision models', () => {
 const env={CF_AI_MODEL_VISION:'vision-specific',CF_AI_MODEL_MAX_VISION:'max-vision-specific',CF_AI_MODEL:'text-only'};
 for (const [id,expected] of [['nara-vision','vision-specific'],['nara-max','max-vision-specific']]) {
  const result=workersAiProviderModelV227(env,id,true);
  assert.equal(result.model,expected);assert.equal(result.capability,'vision');assert.equal(result.supported,true);assert.equal(result.profile.id,id);
 }
});
test('Max text and Max vision routing stay separate', () => {
 const env={CF_AI_MODEL_MAX:'max-text',CF_AI_MODEL_MAX_VISION:'max-image'};
 assert.equal(workersAiProviderModelV227(env,'nara-max',false).model,'max-text');
 assert.equal(workersAiProviderModelV227(env,'nara-max',true).model,'max-image');
});
test('missing dedicated vision model uses vision fallback rather than text model', () => {
 const result=workersAiProviderModelV227({CF_AI_MODEL:'text-only',CF_AI_VISION_MODEL:'shared-vision'},'nara-max',true);
 assert.equal(result.model,'shared-vision');assert.equal(result.capability,'vision');
});
test('Writer still rejects image requests', () => {
 const result=workersAiProviderModelV227({},'nara-writer',true);
 assert.equal(result.supported,false);assert.equal(result.model,'');
});
test('non-string model bindings are ignored rather than coerced to model IDs', () => {
 const result=workersAiProviderModelV227({CF_AI_MODEL_MAX:{invalid:true},CF_AI_FALLBACK_MODEL:'fallback'},'nara-max',false);
 assert.equal(result.model,'fallback');
});
test('existing valid model and intelligence selections remain unchanged', () => {
 assert.equal(normalizeNaraModelV227(' NARA-MAX '),'nara-max');
 assert.equal(normalizeNaraIntelligenceV227(' XHIGH '),'xhigh');
 assert.equal(naraIntelligenceProfileV227('xhigh').maxTokens,4000);
});
