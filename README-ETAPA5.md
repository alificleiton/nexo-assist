# Etapa 5 — Transparência da execução

Atualização incremental do Nexo Assist. Copie `lib/types.ts`, `lib/mastra/nexo-agent.ts`, `app/api/chat/route.ts`, `app/chat/page.tsx` e `app/globals.css` nas respectivas pastas. Não substitua `.env.local` nem `data/`.

## Como verificar

1. Execute `npm run typecheck` e `npm test` (caso já tenha configurado o script com tsx).
2. Inicie com `npm run dev`.
3. Entre com `ana@nexo.com`, crie uma conversa, pergunte sobre erro 809 de VPN, depois expanda **Ver decisão do agente**.
4. Quando o Gemini executar a ferramenta, aparecerá `search-help-center` e o número de artigos encontrados. Para pedidos explícitos de abertura, aparecerá a regra aplicada.
5. Em caso de falha do Google, aparecerá a origem local e a trilha de fallback.

## Limitações

A trilha de ferramentas registra somente ferramentas que realmente executaram (callbacks `execute`). Uma resposta `gemini` sem ferramentas mostra apenas o passo do modelo. Não mostra prompts, tokens, raciocínio oculto nem dados de outros funcionários. As mensagens antigas não contêm trilha detalhada. O campo `confidence` ainda é um indicador heurístico não calibrado; não é probabilidade. A persistência de dados permanece local e não foi preparada para múltiplas instâncias. A UI e os callbacks ainda precisam de validação de ponta a ponta no computador do candidato.

## Testes

`npm run typecheck`
`node --import tsx --test tests/*.test.mjs`

Se passar, faça commit: `git add . && git commit -m "feat: registrar trilha de execucao do agente" && git push origin main`
