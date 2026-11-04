import test from 'node:test';
import assert from 'node:assert/strict';
import { fastAnswer, clearFastAnswerCache } from '../lib/fast-answers.ts';

test('VPN erro 809 responde localmente com artigo aprovado', () => {
  clearFastAnswerCache();
  const r = fastAnswer('Minha VPN está com erro 809 no Windows 11. O que fazer?', 1000);
  assert.equal(r?.decision.source, 'knowledge');
  assert.match(r?.text ?? '', /Windows 11/);
  assert.match(r?.decision.trace?.[1].title ?? '', /miss/);
});
test('cache retorna hit dentro do TTL', () => {
  clearFastAnswerCache();
  fastAnswer('VPN erro 809', 1000);
  assert.match(fastAnswer('VPN erro 809', 2000)?.decision.trace?.[1].title ?? '', /hit/);
});
test('cache expira e refaz leitura após TTL', () => {
  clearFastAnswerCache();
  fastAnswer('VPN erro 809', 1000);
  assert.match(fastAnswer('VPN erro 809', 302000)?.decision.trace?.[1].title ?? '', /miss/);
});
test('horário de atendimento tem artigo aprovado', () => {
  assert.match(fastAnswer('Qual o horário de funcionamento do service desk?')?.text ?? '', /8h às 18h/);
});
test('perguntas genéricas continuam com Gemini', () => {
  assert.equal(fastAnswer('O que é uma VPN?'), null);
  assert.equal(fastAnswer('Quando devo abrir um chamado de suporte?'), null);
  assert.equal(fastAnswer('O que é MFA?'), null);
});
test('dados privados e solicitações não entram no cache', () => {
  assert.equal(fastAnswer('Quais são meus chamados?'), null);
  assert.equal(fastAnswer('Quero abrir chamado para VPN erro 809'), null);
  assert.equal(fastAnswer('Quero falar com um analista sobre VPN erro 809'), null);
});
