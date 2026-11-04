/** Circuit breaker por processo: não compartilha estado entre instâncias. */
export type CircuitState = 'closed' | 'open' | 'half-open';
export type CircuitPermit = { allowed: true; state: 'closed' | 'half-open' } | { allowed: false; state: 'open'; retryAfterMs: number };

export function createCircuitBreaker(options: { threshold?: number; cooldownMs?: number; now?: () => number } = {}) {
  const threshold = options.threshold ?? 3;
  const cooldownMs = options.cooldownMs ?? 60_000;
  const now = options.now ?? Date.now;
  if (!Number.isInteger(threshold) || threshold < 1 || !Number.isFinite(cooldownMs) || cooldownMs < 1) {
    throw new Error('Configuração inválida do circuit breaker');
  }
  let state: CircuitState = 'closed';
  let failures = 0;
  let openUntil = 0;
  let probeInFlight = false;

  return {
    beforeRequest(): CircuitPermit {
      if (state === 'open') {
        const remaining = openUntil - now();
        if (remaining > 0) return { allowed: false, state: 'open', retryAfterMs: remaining };
        state = 'half-open';
      }
      if (state === 'half-open') {
        if (probeInFlight) return { allowed: false, state: 'open', retryAfterMs: cooldownMs };
        probeInFlight = true;
        return { allowed: true, state: 'half-open' };
      }
      return { allowed: true, state: 'closed' };
    },
    onSuccess() {
      state = 'closed';
      failures = 0;
      openUntil = 0;
      probeInFlight = false;
    },
    onFailure() {
      probeInFlight = false;
      failures += 1;
      if (state === 'half-open' || failures >= threshold) {
        state = 'open';
        openUntil = now() + cooldownMs;
      }
    },
    snapshot() { return { state, failures, retryAfterMs: state === 'open' ? Math.max(0, openUntil - now()) : 0 }; }
  };
}

export const geminiCircuit = createCircuitBreaker({ threshold: 3, cooldownMs: 60_000 });
