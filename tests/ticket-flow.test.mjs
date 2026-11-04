import test from 'node:test';
import assert from 'node:assert/strict';
import { flowTicket } from '../lib/ticket-flow.ts';

function conversation() {
  return { id: 'conv-1', userId: 'ana', state: 'agent', messages: [], updatedAt: new Date().toISOString() };
}
function prepare(c, tickets, userId='ana') {
  flowTicket('Abrir chamado', c, tickets, userId);
  flowTicket('Meu notebook não liga após atualização do Windows.', c, tickets, userId);
  flowTicket('Somente eu.', c, tickets, userId);
  return flowTicket('Não consigo trabalhar hoje.', c, tickets, userId);
}

test('pergunta informativa não inicia rascunho', () => {
  const c = conversation();
  const result = flowTicket('Quando devo abrir um chamado?', c, [], 'ana');
  assert.equal(result, null);
  assert.equal(c.pendingDraft, undefined);
});

test('abertura pede confirmação antes de gravar, depois cria', () => {
  const c = conversation(); const tickets = [];
  const draft = prepare(c, tickets);
  assert.equal(tickets.length, 0);
  assert.match(draft.text, /AGUARDANDO CONFIRMAÇÃO/);
  assert.equal(c.pendingDraft.step, 'confirmation');
  assert.equal(c.pendingDraft.priority, 'Alta');
  assert.match(flowTicket('qualquer texto', c, tickets, 'ana').text, /aguardando confirmação/);
  assert.equal(tickets.length, 0);
  const created = flowTicket('confirmar', c, tickets, 'ana');
  assert.match(created.text, /Chamado criado/);
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].userId, 'ana');
  assert.equal(c.pendingDraft, undefined);
});

test('cancelar descarta o rascunho', () => {
  const c = conversation(); const tickets = [];
  prepare(c, tickets);
  assert.match(flowTicket('cancelar', c, tickets, 'ana').text, /cancelado/);
  assert.equal(tickets.length, 0);
});

test('mesmo problema do mesmo funcionário atualiza chamado em vez de duplicar', () => {
  const c1 = conversation(); const tickets = [];
  prepare(c1, tickets); flowTicket('confirmar', c1, tickets, 'ana');
  const previousId = tickets[0].id;
  const c2 = conversation();
  const draft = prepare(c2, tickets);
  assert.match(draft.text, /Atualizar\/reabrir chamado existente/);
  flowTicket('confirmar', c2, tickets, 'ana');
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].id, previousId);
});

test('chamado de outro funcionário nunca é usado como duplicado', () => {
  const c1 = conversation(); const tickets = [];
  prepare(c1, tickets, 'ana'); flowTicket('confirmar', c1, tickets, 'ana');
  const c2 = conversation();
  const draft = prepare(c2, tickets, 'bruno');
  assert.match(draft.text, /Criar novo chamado/);
  flowTicket('confirmar', c2, tickets, 'bruno');
  assert.equal(tickets.length, 2);
  assert.deepEqual(tickets.map(t=>t.userId), ['ana', 'bruno']);
});
