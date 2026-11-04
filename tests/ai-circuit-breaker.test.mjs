import test from 'node:test';
import assert from 'node:assert/strict';
import { createCircuitBreaker } from '../lib/ai-circuit-breaker.ts';

test('permite requisições com circuito inicialmente fechado', () => {
  const c = createCircuitBreaker();
  assert.deepEqual(c.beforeRequest(), { allowed: true, state: 'closed' });
});
test('abre após três falhas consecutivas', () => {
  let t = 0;
  const c = createCircuitBreaker({ now: () => t });
  c.onFailure(); c.onFailure();
  assert.equal(c.beforeRequest().allowed, true);
  c.onFailure();
  assert.deepEqual(c.beforeRequest(), { allowed: false, state: 'open', retryAfterMs: 60_000 });
});
test('sucesso zera contagem de falhas', () => {
  const c = createCircuitBreaker();
  c.onFailure(); c.onFailure(); c.onSuccess(); c.onFailure();
  assert.equal(c.snapshot().state, 'closed');
});
test('depois do cooldown permite somente uma sondagem por vez', () => {
  let t = 0;
  const c = createCircuitBreaker({ now: () => t, cooldownMs: 100 });
  c.onFailure(); c.onFailure(); c.onFailure();
  t = 100;
  assert.deepEqual(c.beforeRequest(), { allowed: true, state: 'half-open' });
  assert.equal(c.beforeRequest().allowed, false);
});
test('sondagem bem-sucedida fecha o circuito', () => {
  let t = 0;
  const c = createCircuitBreaker({ now: () => t, cooldownMs: 100 });
  c.onFailure(); c.onFailure(); c.onFailure();
  t = 101; c.beforeRequest(); c.onSuccess();
  assert.equal(c.beforeRequest().state, 'closed');
  assert.equal(c.snapshot().failures, 0);
});
test('sondagem com falha reabre o circuito por novo cooldown', () => {
  let t = 0;
  const c = createCircuitBreaker({ now: () => t, cooldownMs: 100 });
  c.onFailure(); c.onFailure(); c.onFailure();
  t = 100; c.beforeRequest(); c.onFailure();
  assert.deepEqual(c.beforeRequest(), { allowed: false, state: 'open', retryAfterMs: 100 });
});
test('rejeita configurações inválidas', () => {
  assert.throws(() => createCircuitBreaker({ threshold: 0 }));
});
