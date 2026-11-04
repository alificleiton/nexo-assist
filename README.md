# Nexo Assist — etapa 2 (fluxo de chamados com confirmação)

Projeto inicial do desafio técnico da Beyond the Bytes. **Não é a solução final**: a interface demonstra a navegação e um agente determinístico; Mastra/LLM ainda não foi integrado. O fluxo de criação/atualização com confirmação foi adicionado nesta etapa.

## Pré-requisitos
- Node.js 22+
- npm

## Executar
```bash
npm install
cp .env.example .env.local
# Troque SESSION_SECRET por uma chave aleatória com 32+ caracteres
npm run dev
```
Windows PowerShell: `Copy-Item .env.example .env.local`. Depois acesse http://localhost:3000.

## Contas demonstrativas
- `ana@nexo.com` — funcionária
- `bruno@nexo.com` — funcionário
- `marina@nexo.com` — analista
- **Qualquer senha não vazia**, conforme o enunciado. Isto **não é autenticação de produção**.

## O que está implementado
- Next.js + React + TypeScript estrito
- Login demonstrativo; cookie de sessão assinado e HttpOnly
- Chat com histórico persistido em JSON local e limite de 30 mensagens enviadas por sessão
- Consultas restritas aos chamados do usuário autenticado
- Respostas determinísticas para artigos de ajuda e perguntas simples
- Abertura guiada: descrição → impacto → urgência → rascunho → confirmação explícita
- Criação/atualização de chamados autenticados, heurística básica para duplicados e reabertura de resolvidos recentes
- Prioridade e SLA determinísticos; transferência ao analista para casos críticos depois de confirmar
- Transparência: intenção, ação, motivo, origem e confiança das decisões
- Transferência para analista; pausa do agente; analista assume, devolve ou encerra
- Console do analista e dados de exemplo

## Arquitetura
- `app/` interface + endpoints
- `lib/auth.ts` validação da sessão
- `lib/agent.ts` **simulador determinístico**, não é um LLM
- `lib/store.ts` persistência JSON para a demonstração local
- `lib/types.ts` contratos de dados

## Regras/limitações e próximos passos
1. Implementar Mastra, ferramentas tipadas, guardrails e um LLM real (atualmente não há integração de IA).
2. Evoluir fluxo de chamados: classificação guiada mais robusta e cálculo real de dias úteis/SLA por calendário.
3. Melhorar busca semântica de duplicidade e encaminhar automaticamente chamados vencidos.
4. Adicionar artigos de ajuda (5 a 10), busca, controle de confiança e trilha auditável persistida.
5. Evoluir serviço de chamados para camada independente, com simulação de falhas e testes.
6. Usar PostgreSQL/transações em vez de JSON para múltiplos processos/deploy.
7. Implementar rate limit, proteção de CSRF/origem, validação de entrada e autenticação real caso não seja apenas demonstração.
8. Completar mensagens bidirecionais do analista, estados de erro e fidelidade visual ao Pencil.
9. Testar políticas de privacidade, transições de estados e falhas do legado.

**Atenção**: `data/state.json` contém dados persistidos de demonstração e está no `.gitignore`. O mecanismo de JSON local não funciona para deploys com filesystem efêmero, nem suporta múltiplas instâncias. Não publique como produto real.

## Teste manual
1. Login como Ana e pergunte “Quais são meus chamados?”. O INC de Bruno não pode aparecer.
2. Pergunte “VPN com erro 809” e expanda o detalhe de decisão.
3. Peça “Quero falar com um analista”. O chat deve parar.
4. Em janela separada, entre como Marina, abra o console, assuma a conversa e depois devolva ao agente.
5. Reinicie o servidor: a conversa e o estado devem persistir.

## Para a entrevista
Explique que esta é a etapa inicial: a lógica `decide` serve como baseline previsível, mas não satisfaz o requisito de **agent Mastra**. A evolução proposta separa decisões do agente da execução de ações autorizadas e exige confirmação humana para qualquer mutação de chamado.

## Teste da etapa 2
1. Em nova conversa, digite `abrir chamado`.
2. Descreva `Meu notebook parou de funcionar e não liga após atualização do Windows`.
3. Em impacto, responda `só eu`.
4. Em urgência, responda `não consigo trabalhar hoje`.
5. Confirme que o rascunho mostra tipo, categoria, prioridade, afetados e prazo.
6. Digite `cancelar` e confirme que nenhum chamado foi criado; refaça e digite `confirmar`.
7. Consulte os chamados na barra lateral ou pergunte `Quais são meus chamados?`.
8. Repita a mesma descrição para observar a detecção heurística de possível duplicidade.

Limitações deliberadas: classificação por palavras-chave, e cálculo de SLA apenas exibe o prazo (sem calendário de dias úteis). A busca de duplicados é heurística e pode falhar em descrições parafraseadas. O fluxo não representa integração com LLM/Mastra. Não usar em produção.
