import { Agent } from '@mastra/core/agent';

const model = process.env.GEMINI_MODEL || 'google/gemini-3.5-flash-lite';

const agent = new Agent({
  id: 'teste-mastra',
  name: 'Teste Mastra',
  model,
  instructions: 'Responda em português brasileiro, de forma breve.',
});

const inicio = performance.now();

try {
  const resposta = await agent.generate(
    'Explique em uma frase o que é uma VPN.',
    { abortSignal: AbortSignal.timeout(30000) }
  );

  console.log('Modelo:', model);
  console.log('Tempo:', Math.round(performance.now() - inicio), 'ms');
  console.log('Resposta:', resposta.text);
} catch (error) {
  console.error('Tempo:', Math.round(performance.now() - inicio), 'ms');
  console.error('Erro:', error instanceof Error ? error.message : error);
}