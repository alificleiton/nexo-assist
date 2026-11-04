# Etapa 10 — Console do analista N1/N2

## Aplicação

Esta atualização é incremental para o **Nexo Assist já atualizado até a Etapa 9**. Extraia o ZIP na raiz `nexo-assist-starter`, mantendo a estrutura de diretórios. Substitua somente os arquivos correspondentes.

- `app/api/console/route.ts`: acesso exclusivo do analista, transições de estado e envio de respostas.
- `app/console/page.tsx` e `app/console/console.css`: filtros, fila de atendimento, histórico, resposta, chamados.
- `app/api/chat/route.ts`: permite ao funcionário conversar com o analista ou acrescentar contexto enquanto espera, sem chamar o LLM.
- `app/chat/page.tsx`: chat humano e atualização periódica (polling a cada 4 segundos).
- `lib/analyst-flow.ts`: regras de estado independentes da interface.
- `tests/analyst-flow.test.mjs`: 13 testes de regras de negócio.

Preserve **`.env.local`**, **`data/`**, a chave do Google, as dependências atuais e `package-lock.json`.

## Verificação

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

Caso ainda não exista `npm test`, execute `node --import tsx --test tests/*.test.mjs`.

## Teste de ponta a ponta (manual)

1. Acesse `http://localhost:3000` em um navegador normal. Entre como `ana@nexo.com` (senha demonstrativa não vazia). Crie uma conversa e envie **Quero falar com um analista**.
2. Em janela anônima, acesse o mesmo endereço. Entre como `marina@nexo.com` e abra `/console`.
3. No filtro **Aguardando**, selecione o atendimento de Ana e clique em **Assumir conversa**.
4. Digite **Olá, sou Marina do suporte. Pode me enviar mais detalhes?** e clique em **Enviar resposta**.
5. Volte ao chat de Ana; aguarde o polling de até cerca de 4 segundos e verifique a resposta. Envie **O problema começou hoje**.
6. No console de Marina, verifique a mensagem recebida. Clique em **Devolver ao agente**; a conversa deverá permitir novamente respostas do Nexo Assist.
7. Teste uma segunda transferência e, após assumir, clique em **Encerrar**. O chat do funcionário deve bloquear novas mensagens nessa conversa.
8. Segurança: tente visitar `/console` com a sessão de Ana. A API deve retornar HTTP 403; ela não deve receber conversas de outros funcionários.

## Cuidados e limitações

- É um protótipo com login simplificado exigido pelo desafio: os funcionários de exemplo entram com qualquer senha não vazia. Não é autenticação apropriada para produção.
- `GET /api/console` retorna todos os chamados somente para papel `analyst`; a API não expõe o console para funcionários.
- O armazenamento continua em um único JSON local com fila de escrita por processo. Migre para banco transacional e atualizações em tempo real (ex.: SSE/WebSockets) em produção.
- Um único papel `analyst` é simulado; para múltiplos analistas, adicionar atribuição de responsável, controle de posse e histórico de auditoria.
- O polling fornece atualização aproximada a cada 4 segundos, não streaming em tempo real.
- As respostas enviadas no estado `analyst` são escritas por um humano e nunca geradas pelo modelo.
