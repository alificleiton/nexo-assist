import test from 'node:test';
import assert from 'node:assert/strict';
import { isExplicitTicketRequest, isExplicitHumanRequest } from '../lib/intents.ts';

const positiveTickets = [
  'Abrir chamado',
  'Quero abrir um chamado',
  'Preciso criar um incidente',
  'Gostaria de solicitar um ticket',
  'Preciso de acesso ao SAP',
  'Solicito um monitor',
];
const informational = [
  'Explique o que é uma VPN e quando devo abrir um chamado de suporte.',
  'Quando devo abrir chamado?',
  'Como abrir um chamado?',
  'O que é uma VPN e como ela protege uma conexão?',
  'Quero saber como criar um ticket',
  'Pode explicar quando solicitar acesso?',
];
for (const sentence of positiveTickets) {
  test(`abre apenas com pedido explícito: ${sentence}`, () => {
    assert.equal(isExplicitTicketRequest(sentence), true);
  });
}
for (const sentence of informational) {
  test(`não abre com pergunta: ${sentence}`, () => {
    assert.equal(isExplicitTicketRequest(sentence), false);
  });
}
test('pedido explícito de analista', () => {
  assert.equal(isExplicitHumanRequest('Quero falar com um analista'), true);
  assert.equal(isExplicitHumanRequest('Como falar com um analista?'), false);
  assert.equal(isExplicitHumanRequest('Qual é o horário do atendente?'), false);
});
