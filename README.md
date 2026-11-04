# Nexo Assist — Agente de Service Desk de TI

Protótipo desenvolvido para o **desafio técnico da Beyond the Bytes**. O Nexo Assist atende funcionários por chat, consulta a central de ajuda e chamados, conduz a abertura de incidentes e requisições com confirmação e encaminha conversas para um analista humano quando necessário.

> **Escopo:** aplicação demonstrativa para avaliação técnica; não é um produto pronto para produção. O login é simplificado e a persistência é feita em arquivo JSON local.

## Tecnologias

- **Next.js 16**, **React 19** e **TypeScript** (modo estrito)
- **Mastra** para orquestração do agente e ferramentas tipadas com **Zod**
- **Google Gemini** via API do Google AI Studio
- **Node.js 22+** e **npm**
- Armazenamento local JSON (`data/state.json`), criado automaticamente na primeira execução

## Pré-requisitos

1. Node.js 22 ou superior e npm instalados.
2. Chave de API do Gemini obtida em <https://aistudio.google.com/apikey> para testar respostas por IA.
3. Porta `3000` livre (ou utilize a porta informada pelo Next.js).

## Rodando localmente

Clone o repositório e acesse a pasta:

```bash
git clone https://github.com/alificleiton/nexo-assist.git
cd nexo-assist
npm install
```

Crie o arquivo de configuração local a partir do exemplo:

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```dotenv
SESSION_SECRET=SUBSTITUA_POR_UMA_CHAVE_ALEATORIA_COM_PELO_MENOS_32_CARACTERES
GOOGLE_API_KEY=COLE_SUA_CHAVE_DO_GOOGLE_AQUI
GEMINI_MODEL=google/gemini-3.5-flash-lite
```

Para gerar uma chave de sessão aleatória, execute:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O `GEMINI_MODEL` pode ser alterado conforme a disponibilidade do provedor; a chave do Google não deve ser compartilhada nem commitada. O provedor pode retornar erros de cota (`429`), indisponibilidade (`503`) ou modelo indisponível (`404`); quando isso ocorre, o protótipo usa respostas locais quando possível.

Inicie a aplicação:

```bash
npm run dev
```

Acesse **<http://localhost:3000>**. A interface do funcionário fica em `/chat` e o console do analista em `/console`.

### Contas de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Funcionária | `ana@nexo.com` | Qualquer senha **não vazia** |
| Funcionário | `bruno@nexo.com` | Qualquer senha **não vazia** |
| Analista | `marina@nexo.com` | Qualquer senha **não vazia** |

Essas contas são geradas nos dados iniciais. **A autenticação é exclusivamente demonstrativa**, conforme o enunciado; não utilize senhas reais.

## Funcionalidades

- Login de demonstração com sessão por cookie assinado; separação dos papéis de funcionário e analista.
- Chat com histórico, limite de 30 mensagens do funcionário por sessão e estado persistido localmente.
- Consultas aos chamados **somente do funcionário autenticado**; o modelo não recebe acesso irrestrito à base.
- Central de ajuda com artigos de exemplo, respostas rápidas para consultas específicas e cache local de artigos.
- Agente Mastra/Gemini com ferramentas **somente de leitura** (`list-my-tickets` e `search-help-center`).
- Abertura de chamados com coleta de informações, classificação por regras, rascunho e **confirmação explícita** antes de salvar; prevenção heurística de duplicidade.
- Transferência para analista, pausa das respostas automáticas, mensagens bidirecionais, devolução ao agente e encerramento.
- Transparência por mensagem: intenção, ação, origem, justificativa, ferramentas realmente executadas e indicação de fallback.
- Tratamento de indisponibilidade do Gemini: timeout, fallback e *circuit breaker* em memória após falhas consecutivas.

## Arquitetura e decisões

```text
app/
  chat/                 UI do funcionário
  console/              UI do analista
  api/chat/             Orquestração das conversas
  api/console/          Ações autenticadas do analista
  api/tickets/          Consultas aos chamados
lib/
  mastra/nexo-agent.ts  Agente, instruções e ferramentas de leitura
  ticket-flow.ts        Abertura e confirmação dos chamados
  analyst-flow.ts       Transições de estado do atendimento humano
  intents.ts            Reconhecimento de intenções explícitas
  fast-answers.ts       Respostas locais para artigos específicos
  agent.ts              Respostas determinísticas e fallback
  ai-runtime.ts         Classificação de falhas e controle de execução
  ai-circuit-breaker.ts Proteção contra falhas consecutivas do provedor
  auth.ts               Sessão e autorização
  store.ts              Persistência em arquivo JSON local
  types.ts              Tipos e contratos
 tests/                  Testes automatizados de regras
```

**Por que regras + IA?** As ações que modificam chamados, a confirmação do funcionário, as permissões e os estados da conversa são controlados no backend. A IA interpreta perguntas e usa ferramentas de leitura, mas não pode executar alterações diretamente. Para questões recorrentes com artigo aprovado, a resposta local reduz latência e custos; solicitações complexas podem usar o modelo.

**Por que registrar decisões?** A interface mostra eventos observáveis — ferramentas executadas, resultado resumido, origem e fallback. Os percentuais exibidos como confiança são heurísticos, **não probabilidades calibradas**.

**Por que persistência JSON?** Mantém a demonstração local fácil de executar sem configurar um banco externo. A gravação é serializada em um processo; não é adequada a múltiplas instâncias nem a hospedagem com disco efêmero.

## Testes e verificação

```bash
npm run typecheck
npm test
npm run build
```

Se a sua cópia ainda não tiver o script `test` no `package.json`, instale o executor e utilize:

```bash
npm install -D tsx
node --import tsx --test tests/*.test.mjs
```

Os testes automatizados cobrem regras de intenções, confirmação/cancelamento, duplicidade, isolamento no fluxo, fallback, circuit breaker e transições do analista. **Eles não substituem testes de integração com o provedor externo e de segurança em produção.**

### Roteiro de validação manual

1. Entre como Ana e consulte **“Quais são meus chamados?”**; confirme que chamados de Bruno não aparecem.
2. Pergunte **“Minha VPN está com erro 809 no Windows 11. O que fazer?”** e expanda a trilha da decisão.
3. Abra um chamado com **“Abrir chamado”**, forneça descrição, impacto e urgência e confira o rascunho. Teste `cancelar` e depois `confirmar` em uma nova solicitação.
4. Pergunte **“O que é uma VPN?”**; se o Google estiver disponível, verifique resposta `gemini` na trilha. Caso contrário, verifique o fallback explicado.
5. Em uma janela normal, entre como **Ana** e peça **“Quero falar com um analista”**.
6. Em **janela anônima**, entre como **Marina**, abra `/console`, assuma a conversa e envie uma resposta. Confira no chat de Ana; devolva ao agente ou encerre.
7. Com uma conta de funcionário, confirme que `/api/console` retorna **403**.
8. Reinicie a aplicação e confira se conversas e estados foram preservados no arquivo local.

## Limitações conhecidas e próximos passos

- **Login demonstrativo:** qualquer senha não vazia é aceita para contas pré-cadastradas; em produção, substituir por identidade corporativa, senhas reais/SSO e controles adicionais.
- **Armazenamento JSON local:** exige sistema de arquivos persistente e uma única instância; não é apropriado para serviços serverless ou escalonamento horizontal. Para produção, migrar para um banco transacional.
- **Serviço de chamados simulado:** ainda não é uma integração com sistema legado externo real. É necessário isolar/fortalecer esse contrato e testar falhas intermitentes, retries e idempotência.
- **Classificação e deduplicação heurísticas:** podem falhar com linguagem ambígua; exigem mais cobertura de testes e melhorias de classificação.
- **SLA:** prazos são demonstrativos; calendários de dias úteis e feriados precisam de validação completa.
- **IA externa:** tempos de resposta, custos e disponibilidade dependem do Google. O *circuit breaker* atual mantém estado apenas no processo.
- **Console:** atualização por polling, não WebSockets/SSE; o protótipo não implementa distribuição robusta de atendimentos entre múltiplos analistas.
- **Segurança:** revisar CSRF, rate limiting, armazenamento de dados, observabilidade e testes ponta a ponta antes de qualquer uso real.

## Entrega do desafio

- **Repositório:** <https://github.com/alificleiton/nexo-assist> (liberar acesso à equipe avaliadora caso seja privado).
- **Execução:** seguir os passos deste README.
- **Chave Gemini:** cada avaliador deve utilizar a sua própria `GOOGLE_API_KEY`. Não há chaves válidas no repositório.
- **Deploy:** opcional; não declarar link de produção enquanto ele não existir. Se publicar, escolher infraestrutura com armazenamento persistente e proteção contra abuso da API.

Este projeto foi desenvolvido como demonstração de arquitetura Full Stack, orquestração de agentes e controles de segurança em um service desk assistido por IA.
