import type { Decision, Ticket } from './types';
import { isExplicitHumanRequest } from './intents';
import { fastAnswer } from './fast-answers';

type LocalResult = { text: string; decision: Decision; transfer: boolean };

/**
 * Resposta local usada quando a IA está indisponível ou uma ação precisa
 * seguir uma regra de negócio. Não faz correspondência de artigos por palavras
 * isoladas: apenas consultas específicas aprovadas por fastAnswer().
 */
export function decide(input: string, tickets: Ticket[]): LocalResult {
  const q = input.toLocaleLowerCase('pt-BR');

  if (isExplicitHumanRequest(input)) {
    return {
      text: 'Solicitei a transferência para um analista. O agente ficará pausado até o atendimento ser devolvido.',
      decision: {
        intent: 'Solicitar humano', action: 'Transferir conversa',
        reason: 'O funcionário solicitou explicitamente atendimento humano.',
        confidence: 1, source: 'rules'
      },
      transfer: true
    };
  }

  if (/meus chamados|meu chamado|status|andamento/i.test(q)) {
    // O chamador deve sempre fornecer apenas tickets autorizados do usuário.
    const open = tickets.filter(t => t.status !== 'resolved');
    return {
      text: open.length
        ? `Seus chamados em andamento:\n${open.map(t => `• ${t.id}: ${t.title} (${t.status})`).join('\n')}`
        : 'Você não tem chamados em andamento.',
      decision: {
        intent: 'Consultar chamados', action: 'Listar chamados autorizados',
        reason: 'Consulta realizada sobre a lista autorizada fornecida pela API.',
        confidence: 0.99, source: 'tickets'
      },
      transfer: false
    };
  }

  // Compartilha a política restrita de relevância do caminho rápido.
  // Ex.: "VPN erro 809" pode usar o artigo; "o que é VPN?" não pode.
  const approvedArticle = fastAnswer(input);
  if (approvedArticle) return approvedArticle;

  return {
    text: 'Não consegui concluir a consulta inteligente neste momento e não encontrei um artigo aprovado que responda especificamente à sua pergunta. Você pode tentar novamente ou solicitar atendimento humano escrevendo "quero falar com um analista".',
    decision: {
      intent: 'Orientação não encontrada',
      action: 'Informar limitação e oferecer atendimento humano',
      reason: 'Não houve correspondência específica com artigos aprovados. Nenhuma orientação técnica não verificada foi fornecida e nenhum chamado foi alterado.',
      confidence: 0.25, source: 'rules'
    },
    transfer: false
  };
}
