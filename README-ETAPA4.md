# Etapa 4 — classificação conservadora de intenção + testes

Aplique este pacote **sobre a Etapa 3**, substituindo somente os arquivos `lib/ticket-flow.ts` e `app/api/chat/route.ts`, e adicionando `lib/intents.ts` e os testes. Não sobrescreva `lib/mastra/nexo-agent.ts`, `.env.local` nem `data/`.

## O que mudou

- Perguntas como “quando devo abrir um chamado?” não iniciam rascunho.
- Pedidos explícitos como “quero abrir um chamado” continuam o fluxo existente.
- Durante um rascunho, o estado tem precedência sobre a classificação.
- Só solicitações explícitas de contato humano transferem diretamente.
- Confirmação, cancelamento, duplicidade e privacidade continuam no fluxo determinístico.
- Testes automatizados sem dependências adicionais (requer Node 22+).

## Verificar

```powershell
node -v
npm run typecheck
node --experimental-strip-types --test tests/*.test.mjs
npm run dev
```

> Nota: a flag `--experimental-strip-types` é suportada no Node 22. Em versões futuras do Node, a flag pode não ser necessária. `node --test` executa os testes locais de lógica sem usar chaves Gemini.

## Testar na UI

1. Nova conversa: `Explique o que é uma VPN e quando devo abrir um chamado de suporte.` — não deve iniciar um rascunho; pode consultar a central de ajuda ou responder pelo Gemini.
2. Nova conversa: `Quero abrir um chamado` — deve começar a coleta.
3. Preencha descrição, impacto e urgência; confirme apenas no rascunho.
4. Nova conversa: `Como falar com um analista?` — não deve transferir automaticamente.
5. Nova conversa: `Quero falar com um analista` — deve transferir.

## Limites conhecidos

A classificação é conservadora e não cobre todas as maneiras de pedir ajuda. Para mensagens ambíguas, o agente ainda pode pedir que o funcionário digite um comando explícito. A solicitação ao LLM continua dentro do lock de `mutateStore`; separar inferência e persistência é uma melhoria necessária para concorrência/latência. O indicador `confidence` das regras não é uma probabilidade calibrada.
