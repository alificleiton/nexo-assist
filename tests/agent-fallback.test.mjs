import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../lib/agent.ts';

const noTickets = [];

test('pergunta genérica sobre VPN não recebe instrução para erro 809', () => {
  const r = decide('O que é uma VPN?', noTickets);
  assert.equal(r.decision.source, 'rules');
  assert.doesNotMatch(r.text, /809|reinstale|Windows 10|Windows 11/i);
  assert.equal(r.transfer, false);
});

test('pergunta de MFA não recebe artigo de VPN ou senha', () => {
  const r = decide('Explique autenticação multifator MFA', noTickets);
  assert.equal(r.decision.source, 'rules');
  assert.doesNotMatch(r.text, /809|redefinição de senha|reinstale/i);
});

test('consulta específica sobre erro 809 pode usar artigo aprovado', () => {
  const r = decide('Minha VPN está com erro 809 no Windows 11. O que fazer?', noTickets);
  assert.equal(r.decision.source, 'knowledge');
  assert.match(r.text, /Windows 11/);
});

test('consulta de horário continua usando artigo exato', () => {
  const r = decide('Qual o horário do service desk?', noTickets);
  assert.equal(r.decision.source, 'knowledge');
  assert.match(r.text, /8h às 18h/);
});

test('pergunta sobre como falar com analista não transfere', () => {
  const r = decide('Como falar com um analista?', noTickets);
  assert.equal(r.transfer, false);
});

test('pedido explícito de analista transfere', () => {
  const r = decide('Quero falar com um analista', noTickets);
  assert.equal(r.transfer, true);
});

test('consulta de chamados usa lista filtrada recebida da API', () => {
  const tickets = [{id:'INC-1', title:'Notebook não liga', status:'open'}];
  const r = decide('Quais são meus chamados?', tickets);
  assert.equal(r.decision.source, 'tickets');
  assert.match(r.text, /INC-1/);
});
