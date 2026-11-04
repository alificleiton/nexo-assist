/** Funções sem dependências do framework, para teste e tratamento consistente de falhas. */
export type AiFailureKind = 'timeout' | 'quota' | 'unavailable' | 'authentication' | 'model' | 'unknown';

export function classifyAiFailure(error: unknown): AiFailureKind {
  const record = error && typeof error === 'object' ? error as { statusCode?: unknown; status?: unknown; name?: unknown; message?: unknown; cause?: unknown } : null;
  const status = Number(record?.statusCode ?? record?.status);
  const message = String(record?.message ?? '').toLowerCase();
  const name = String(record?.name ?? '');
  if (name === 'AbortError' || name === 'TimeoutError' || /abort|timed out|timeout/.test(message)) return 'timeout';
  if (status === 429 || /quota|resource_exhausted|rate limit/.test(message)) return 'quota';
  if (status === 503 || status === 502 || status === 504 || /high demand|unavailable/.test(message)) return 'unavailable';
  if (status === 401 || status === 403 || /api.key.invalid|permission denied/.test(message)) return 'authentication';
  if (status === 404 || /model.*not found|model.*no longer available/.test(message)) return 'model';
  if (record?.cause && record.cause !== error) return classifyAiFailure(record.cause);
  return 'unknown';
}

export function fallbackExplanation(kind: AiFailureKind): string {
  const reasons: Record<AiFailureKind,string> = {
    timeout:'Tempo máximo de resposta do modelo excedido',
    quota:'Cota ou limite da API do Google atingido',
    unavailable:'Serviço do modelo temporariamente indisponível',
    authentication:'Falha de autenticação ou permissão da API',
    model:'Modelo solicitado não disponível',
    unknown:'Falha na comunicação com o modelo'
  };
  return reasons[kind];
}

export function processingExpired(startedAt: string, now = Date.now(), maxAgeMs = 45_000): boolean {
  const start = Date.parse(startedAt);
  return !Number.isFinite(start) || now-start > maxAgeMs;
}
