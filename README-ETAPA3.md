# Etapa 3 — Gemini com Mastra (Nexo Assist)

Esta atualização preserva o fluxo determinístico de abertura/atualização de chamado, aprovação explícita e transferência. Gemini só dispõe de ferramentas de leitura.

## Requisitos
- Node.js 22.13+ (recomendado 22 LTS atualizado)
- Projeto da Etapa 2 funcionando
- Uma chave Gemini obtida no Google AI Studio

## Aplicar
1. Faça `git status` e um commit/backup do que já funciona.
2. Copie as pastas `app`, `lib` para o projeto, mesclando e substituindo somente os arquivos presentes neste pacote.
3. **Não substitua seu `.env.local` e não apague `data/`.**
4. Instale: `npm install @mastra/core@latest zod@latest`.
5. No `.env.local` já existente, acrescente:

```
GOOGLE_API_KEY=sua-chave-aqui
GEMINI_MODEL=google/gemini-2.5-flash
```

6. Execute `npm run typecheck`, depois `npm run dev`.

## Testes manuais
- `Qual é o horário do suporte?` — ferramenta de central de ajuda, decisão com origem `gemini`.
- `Quais são meus chamados?` — ferramenta filtrada pelos chamados do funcionário.
- `Abrir chamado` — regras e confirmação da etapa anterior; NÃO deve criar sem confirmar.
- `Quero falar com um analista` — deve pausar o agente.
- Tente entrar como Bruno e consultar chamados — só devem aparecer os dele.

## Segurança e limites atuais
- Chave somente no servidor. Jamais exponha em `NEXT_PUBLIC_*` ou no GitHub.
- Ferramentas do Mastra só recebem tickets do usuário autenticado; não aceitam userId informado pelo LLM.
- Confiança exibida para respostas Gemini é uma etiqueta técnica fixa **não calibrada**, não medida estatística de acerto.
- Persistência local em JSON, autenticação demonstrativa e fallback por regras: não apropriado para produção.
- A chamada ao modelo ainda ocorre dentro da fila local de gravação, o que pode atrasar requisições simultâneas. Melhorar antes de produção.
- O fallback por regras pode responder quando houver falha na API. Confira em `Ver decisão do agente` se a origem é `gemini`.
- Custos e limites de uso da API Gemini dependem do plano da chave.

## Git
```
git add .
git commit -m "feat: integrar Gemini via Mastra com tools de leitura"
git push origin main
```
