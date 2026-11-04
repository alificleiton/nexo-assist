import type { Decision } from './types';

type QuickAnswer = { text: string; decision: Decision; transfer: false };
type Article = { id: string; title: string; answer: string };
const CACHE_TTL_MS = 5 * 60_000;
// Somente artigos genéricos previamente aprovados. Nunca armazenar dados pessoais.
const cache = new Map<string, { article: Article; until: number }>();
const articles: Record<string, Article> = {
  'kb-vpn-809': {
    id: 'kb-vpn-809', title: 'VPN com erro 809',
    answer: 'Segundo a central de ajuda: no Windows 10, reinstale o cliente VPN pelo portal de softwares e reinicie o computador. No Windows 11, abra um chamado de TI para receber suporte.'
  },
  'kb-service-hours': {
    id: 'kb-service-hours', title: 'Atendimento do service desk',
    answer: 'Segundo a central de ajuda: o service desk atende de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.'
  }
};
function normalize(value: string) {
  return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
/** Corresponde apenas a consultas claras cobertas por artigos aprovados.
 * Não responde pedidos de ação, pedidos com histórico contextual ou questões ambíguas. */
export function fastAnswer(input: string, now = Date.now()): QuickAnswer | null {
  const q = normalize(input);
  if (q.length > 350) return null;
  // Não interferir em criação de chamados, transferência, atualizações ou consultas privadas.
  if (/\b(quero|preciso|solicito|pode|favor|gostaria|registre|crie|abra|atualize|cancele|transfira)\b.*\b(chamado|ticket|analista|atendente|acesso|equipamento|senha)\b/.test(q) ||
      /\b(meus? chamados?|status|andamento|meu ticket|minha solicitacao|me transfira)\b/.test(q)) return null;

  let key: keyof typeof articles | null = null;
  if (/\b(vpn)\b/.test(q) && /\b(809)\b/.test(q)) key = 'kb-vpn-809';
  else if (/\b(horario|horas|funcionamento|atendimento)\b/.test(q) && /\b(service desk|suporte de ti|central de suporte)\b/.test(q)) key = 'kb-service-hours';
  if (!key) return null;
  const hit = cache.get(key);
  const cached = Boolean(hit && hit.until > now);
  const article = cached ? hit!.article : articles[key];
  if (!cached) cache.set(key, {article, until: now + CACHE_TTL_MS});
  return {
    text: article.answer + '\n\nIsso resolveu seu problema?',
    decision: {
      intent: 'Consultar central de ajuda', action: `Respondeu com artigo aprovado (${article.id})`,
      reason: `Consulta específica reconhecida por regra restrita. Artigo: ${article.title}. Nenhuma chamada ao Gemini foi necessária.`,
      confidence: 0.9, source: 'knowledge',
      trace: [
        {kind: 'policy', title: 'Roteamento local', detail: 'Consulta específica atendida pela central de ajuda aprovada; sem ações de escrita.', outcome: 'success'},
        {kind: 'tool', title: cached ? 'Cache de artigo: hit' : 'Cache de artigo: miss', detail: `Artigo ${article.id}. Cache em memória com TTL de 5 minutos; sem dados de funcionários.`, outcome: 'success'}
      ]
    }, transfer: false
  };
}
/** Apenas para testes determinísticos. */
export function clearFastAnswerCache() { cache.clear(); }
