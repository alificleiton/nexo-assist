import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAiFailure, fallbackExplanation, processingExpired} from '../lib/ai-runtime.ts';

test('reconhece sobrecarga 503', () => {
  assert.equal(classifyAiFailure({statusCode:503,message:'high demand'}),'unavailable');
});
test('reconhece limite 429', () => {
  assert.equal(classifyAiFailure({statusCode:429,message:'quota exceeded'}),'quota');
});
test('reconhece timeout de abort', () => {
  assert.equal(classifyAiFailure(new DOMException('Tempo limite', 'TimeoutError')),'timeout');
});
test('reconhece modelo não disponível', () => {
  assert.equal(classifyAiFailure({statusCode:404,message:'model no longer available'}),'model');
});
test('reserva recente bloqueia concorrência; reserva antiga pode ser substituída', () => {
  assert.equal(processingExpired('2026-11-04T12:00:00Z', Date.parse('2026-11-04T12:00:15Z')),false);
  assert.equal(processingExpired('2026-11-04T12:00:00Z', Date.parse('2026-11-04T12:01:00Z')),true);
});
test('fallback oferece motivo legível', () => {
  assert.match(fallbackExplanation('unavailable'), /indisponível/);
});
