# Etapa 9 — Circuit breaker da integração Gemini

## Instalação

Copie `lib/ai-circuit-breaker.ts`, `app/api/chat/route.ts` e `tests/ai-circuit-breaker.test.mjs` nas pastas correspondentes de `nexo-assist-starter`.

Mantenha `.env.local` e a pasta `data` intactos. Não copie o arquivo de diagnóstico manual para o Git caso não seja necessário.

Execute:

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

Se o comando `npm test` ainda não existir, configure o script como `node --import tsx --test tests/*.test.mjs`.

## Comportamento

- O circuito começa fechado, permitindo o Gemini.
- Após **3 falhas consecutivas**, abre por **60 segundos**.
- Enquanto aberto, retorna rapidamente pelo fallback local e grava na trilha que evitou a API externa.
- Após 60 segundos, apenas **uma** chamada de sondagem pode ser iniciada por processo.
- Sucesso fecha o circuito e zera falhas; falha reabre o circuito.
- A reserva da conversa é preservada e liberada ao gravar a resposta.

## Verificação manual

A correção pode ser validada com os testes automatizados, sem gerar falhas reais e sem gastar API. Para testar no navegador, envie perguntas genéricas em conversas separadas somente se for razoável fazer chamadas reais. Se ocorrerem três falhas consecutivas, a quarta tentativa, durante o período de 60s, deverá mostrar `Circuit breaker aberto` na trilha e responder rapidamente.

## Limitações

- O estado é **em memória**, por processo, e reinicia com o servidor. Em múltiplas instâncias, cada instância manterá seu próprio circuito; produção exige estado compartilhado.
- Respostas locais podem não resolver dúvidas amplas; elas nunca devem inventar políticas internas.
- Os testes unitários não substituem os testes de API e de interface.
- A configuração atual não usa retries automáticos para preservar a latência.
