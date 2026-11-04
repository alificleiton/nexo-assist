# Etapa 8 — Corrigir relevância do fallback

## Instalação
Copie `lib/agent.ts` e `tests/agent-fallback.test.mjs` para as pastas equivalentes do projeto.
Não apague o arquivo `.env.local` ou a pasta `data`.

## Motivo
O fallback anterior escolhia o artigo `VPN com erro 809` apenas pela presença de `VPN` na pergunta.
Agora `decide()` só utiliza artigos da central de ajuda para consultas específicas reconhecidas por `fastAnswer()`; caso contrário explica que a consulta ao agente falhou e oferece atendimento humano.

## Validação
```powershell
npm run typecheck
npm test
npm run build
```

Teste no navegador:
- `O que é uma VPN?` — se o Gemini falhar, não responder sobre erro 809.
- `Minha VPN está com erro 809 no Windows 11. O que fazer?` — resposta rápida da central de ajuda.
- `Como falar com um analista?` — não transferir.
- `Quero falar com um analista` — transferir.

## Limitação
A lista de chamados passada para `decide()` deve ser filtrada pelo usuário autenticado **no servidor**. Os testes de `decide()` não substituem testes de integração da autorização da API.
