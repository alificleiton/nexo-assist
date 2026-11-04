import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { readStore, mutateStore } from '@/lib/store';
import { decide } from '@/lib/agent';
import { flowTicket } from '@/lib/ticket-flow';
import { fastAnswer } from '@/lib/fast-answers';
import { isExplicitHumanRequest } from '@/lib/intents';
import { answerWithGemini } from '@/lib/mastra/nexo-agent';
import { classifyAiFailure, fallbackExplanation, processingExpired } from '@/lib/ai-runtime';
import { geminiCircuit } from '@/lib/ai-circuit-breaker';
import { addEmployeeHumanMessage } from '@/lib/analyst-flow';
import type { Conversation, Decision, Message, Store, Ticket } from '@/lib/types';

export const runtime = 'nodejs';
const askTickets = /meus chamados|meu chamado|status|andamento/i;
const AI_TIMEOUT_MS = Math.max(
  1000,
  Math.min(
    60000,
    Number(process.env.AI_TIMEOUT_MS || 30000)
  )
);

type AgentResult = {
  text: string;
  decision: Decision;
  transfer: boolean;
};

function putMessages(conversation: Conversation, text: string, result: AgentResult) {
  const now = new Date().toISOString();
  if (!result.decision.trace?.length) {
    const fallback = result.decision.reason.includes('Fallback:');
    result.decision.trace = [{
      kind: fallback ? 'fallback' : 'policy',
      title: fallback ? 'Resposta alternativa ativada' : 'Regra de negócio aplicada',
      detail: `${result.decision.action}. Origem: ${result.decision.source}.`,
      outcome: 'info'
    }];
  }
  const employee: Message = { id: crypto.randomUUID(), sender: 'employee', text, at: now };
  const agent: Message = { id: crypto.randomUUID(), sender: 'agent', text: result.text, at: now, decision: result.decision };
  conversation.messages.push(employee, agent);
  if (result.transfer) conversation.state = 'waiting_analyst';
  conversation.updatedAt = now;
}

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'employee') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const db = await readStore();
  return NextResponse.json({ conversations: db.conversations.filter(c => c.userId === user.id) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'employee') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  let body: {text?: string; conversationId?: string};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const text = body.text?.trim();
  if (!text || text.length > 2000) return NextResponse.json({ error: 'Digite uma mensagem de até 2000 caracteres.' }, { status: 400 });

  try {
    // Fase 1: operações determinísticas são transacionais. Quando é necessária IA,
    // registramos apenas uma reserva curta e LIBERAMOS a fila de gravação.
    const phase = await mutateStore((db: Store) => {
      let c = body.conversationId ? db.conversations.find(x => x.id === body.conversationId && x.userId === user.id) : undefined;
      if (body.conversationId && !c) throw new Error('Conversa não encontrada');
      if (!c) {
        c = { id: crypto.randomUUID(), userId: user.id, state: 'agent', messages: [], updatedAt: new Date().toISOString() };
        db.conversations.push(c);
      }
      // Enquanto a conversa está com o service desk, o funcionário pode enviar
      // mensagens diretamente ao humano. Não chamamos decide(), flowTicket() ou Gemini.
      if (c.state === 'waiting_analyst' || c.state === 'analyst') {
        addEmployeeHumanMessage(c, text);
        return { kind: 'immediate' as const, conversation: structuredClone(c) };
      }
      if (c.state !== 'agent') throw new Error('Conversa encerrada');
      if (c.processing && !processingExpired(c.processing.startedAt)) throw new Error('Aguarde a resposta anterior antes de enviar outra mensagem');
      delete c.processing; // reserva abandonada após reinício ou falha anterior
      if (c.messages.filter(m => m.sender === 'employee').length >= 30) throw new Error('Limite de 30 mensagens por sessão atingido');
      const owned = db.tickets.filter(t => t.userId === user.id);

      let result: AgentResult | null = flowTicket(text, c, db.tickets, user.id);
      if (!result && isExplicitHumanRequest(text)) result = decide('quero falar com um analista', owned);
      // Respostas rápidas somente para artigos aprovados e consultas inequívocas.
      // Perguntas genéricas, dados privados e pedidos ambíguos seguem para o Gemini.
      if (!result) result = fastAnswer(text);
      if (result) {
        putMessages(c, text, result);
        return { kind: 'immediate' as const, conversation: structuredClone(c) };
      }

      const token = crypto.randomUUID();
      c.processing = { token, startedAt: new Date().toISOString() };
      c.updatedAt = new Date().toISOString();
      return {
        kind: 'ai' as const,
        id: c.id,
        token,
        conversation: structuredClone(c),
        tickets: structuredClone(owned) as Ticket[]
      };
    });

    if (phase.kind === 'immediate') return NextResponse.json({ conversation: phase.conversation });

    // Fase 2: chamada externa FORA de mutateStore. Uma conversa possui somente
    // uma solicitação em voo; outras conversas podem progredir em paralelo.
    const started = Date.now();
    const permit = geminiCircuit.beforeRequest();
    let result: AgentResult;
    let failure: ReturnType<typeof classifyAiFailure> | null = null;
    let skippedCircuit = false;

    if (!permit.allowed) {
      // Circuito aberto: não chama a API externa e não retém a conversa por 18s.
      skippedCircuit = true;
      result = decide(text, phase.tickets);
      result.decision.reason += ' (Fallback: provedor temporariamente suspenso após falhas consecutivas.)';
      result.decision.trace = [
        ...(result.decision.trace ?? []),
        { kind: 'fallback', title: 'Circuit breaker aberto',
          detail: `Consulta ao Gemini ignorada. Nova tentativa em aproximadamente ${Math.ceil(permit.retryAfterMs / 1000)}s.`, outcome: 'info' }
      ];
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new DOMException('Tempo limite excedido', 'TimeoutError')), AI_TIMEOUT_MS);
      try {
        result = await answerWithGemini({ text, tickets: phase.tickets, conversation: phase.conversation, signal: controller.signal });
        geminiCircuit.onSuccess();
        if (askTickets.test(text) && !result.decision.action.includes('Consultou chamados')) {
          result = decide(text, phase.tickets);
          result.decision.reason += ' (Consulta protegida: resposta sem ferramenta de chamados.)';
        }
      } catch (error) {
        failure = controller.signal.aborted ? 'timeout' : classifyAiFailure(error);
        geminiCircuit.onFailure();
        console.warn(`[NEXO ASSIST] Falha de IA: ${failure}; ${Date.now() - started}ms; circuito=${geminiCircuit.snapshot().state}`);
        result = decide(text, phase.tickets);
        result.decision.reason += ` (Fallback: ${fallbackExplanation(failure)}.)`;
      } finally {
        clearTimeout(timeout);
      }
    }
    const elapsed = Date.now() - started;
    result.decision.trace = [
      ...(result.decision.trace ?? []),
      {
        kind: failure || skippedCircuit ? 'fallback' : 'model',
        title: skippedCircuit ? 'Consulta externa evitada' : failure ? 'Resiliência do atendimento' : 'Tempo de execução',
        detail: `Duração da etapa IA: ${elapsed}ms. ${skippedCircuit ? 'Circuit breaker aberto: resposta local.' : failure ? `Motivo: ${fallbackExplanation(failure)}.` : 'Consulta concluída.'}`,
        outcome: failure || skippedCircuit ? 'info' : 'success'
      }
    ];

    // Fase 3: resposta gravada rapidamente, com controle contra finalização
    // de uma requisição antiga depois de mudança do estado da conversa.
    const conversation = await mutateStore((db: Store) => {
      const c = db.conversations.find(x => x.id === phase.id && x.userId === user.id);
      if (!c || c.processing?.token !== phase.token || c.state !== 'agent') {
        throw new Error('Conversa alterada durante o processamento; resposta não gravada');
      }
      putMessages(c, text, result);
      delete c.processing;
      return structuredClone(c);
    });
    return NextResponse.json({ conversation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao processar' }, { status: 409 });
  }
}
