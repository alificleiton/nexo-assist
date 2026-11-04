import type { Conversation, Message } from './types';

export type AnalystAction = 'assume' | 'return' | 'close' | 'reply';
export const analystActions: readonly AnalystAction[] = ['assume', 'return', 'close', 'reply'];

/** State transitions are enforced on the server; the UI is only a convenience. */
export function applyAnalystAction(
  conversation: Conversation,
  action: AnalystAction,
  actorName: string,
  text?: string
): void {
  if (conversation.processing) {
    // An in-flight LLM result has a token guard and cannot be committed after takeover.
    delete conversation.processing;
  }
  const now = new Date().toISOString();
  if (action === 'assume') {
    if (conversation.state !== 'waiting_analyst') throw new Error('Somente conversas na fila podem ser assumidas');
    conversation.state = 'analyst';
  } else if (action === 'return') {
    if (conversation.state !== 'analyst') throw new Error('Somente conversas em atendimento podem voltar ao agente');
    conversation.state = 'agent';
  } else if (action === 'close') {
    if (conversation.state !== 'analyst') throw new Error('Somente conversas em atendimento podem ser encerradas');
    conversation.state = 'closed';
  } else {
    if (conversation.state !== 'analyst') throw new Error('Assuma a conversa antes de responder');
    const reply = text?.trim();
    if (!reply || reply.length > 2000) throw new Error('Digite uma resposta de até 2000 caracteres');
    conversation.messages.push({ id: crypto.randomUUID(), sender: 'analyst', text: reply, at: now } satisfies Message);
  }
  conversation.updatedAt = now;
}

/** A human message never triggers the agent while it is paused. */
export function addEmployeeHumanMessage(conversation: Conversation, text: string): void {
  if (conversation.state !== 'analyst' && conversation.state !== 'waiting_analyst') {
    throw new Error('Conversa não está aguardando atendimento humano');
  }
  const value = text.trim();
  if (!value || value.length > 2000) throw new Error('Digite uma mensagem de até 2000 caracteres');
  if (conversation.messages.filter(m => m.sender === 'employee').length >= 30) {
    throw new Error('Limite de 30 mensagens por sessão atingido');
  }
  const now = new Date().toISOString();
  conversation.messages.push({ id: crypto.randomUUID(), sender: 'employee', text: value, at: now });
  conversation.updatedAt = now;
}
