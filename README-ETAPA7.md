# Etapa 7 — Respostas rápidas e cache restrito

Esta atualização implementa um roteamento conservador antes da chamada ao Gemini. Somente consultas **inequívocas** cobertas pelos artigos curados `kb-vpn-809` e `kb-service-hours` são atendidas localmente. Dúvidas amplas, solicitações de mudança, tickets privados e mensagens ambíguas seguem pelo fluxo pré-existente.

## Instalação

Pare o servidor, copie `app/api/chat/route.ts`, `lib/fast-answers.ts` e `tests/fast-answers.test.mjs` para as mesmas pastas no seu projeto. Não substitua `.env.local` ou `data/`.

Execute:

```powershell
npm run typecheck
node --import tsx --test tests/*.test.mjs
npm run build
npm run dev
```

## Testes manuais

- “Minha VPN está com erro 809 no Windows 11. O que fazer?” — origem `knowledge`, rota local e cache hit/miss, sem esperar o Gemini.
- “Qual o horário de funcionamento do service desk?” — origem `knowledge` e artigo aprovado.
- “O que é uma VPN?” — continua para Gemini.
- “Quais são meus chamados?” — continua pelo controle de acesso já existente, nunca entra no cache.
- “Quero abrir chamado” — mantém o fluxo de confirmação.

O cache é **em memória por processo**, TTL de 5 minutos, **somente para artigos estáticos**: não persiste entre reinícios ou instâncias. Não é cache de prompts do usuário, nem de conversas/tickets. Não garante ganho em todas as consultas; medir o tempo com e sem a rota local.

## Limitações e próximos passos

- A correspondência é por regras estritas; não interpreta intenção semanticamente. Perguntas ambíguas continuam com Gemini.
- O roteamento evita as chamadas externas apenas para os dois artigos curados. Ele não resolve lentidão ou 503 nas demais interações.
- A central de ajuda local deste protótipo é estática; uma versão de produção exigiria repositório único de artigos com atualização/invalidação de cache.
- A API atual usa armazenamento local em JSON. Antes de produção, utilizar banco transacional e testes de integração sob concorrência.
