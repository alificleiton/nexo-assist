# Etapa 6 — Desempenho e resiliência

## Instalação

Copie somente os arquivos deste pacote para a raiz do projeto `nexo-assist-starter`, mesclando as pastas. Não altere `.env.local` nem a pasta `data`.

```powershell
npm run typecheck
node --import tsx --test tests/*.test.mjs
npm run build
npm run dev
```

## Mudanças

- Gravações curtas: reserva -> chamada ao modelo -> gravação final. A fila de `mutateStore()` não fica travada enquanto a API responde.
- Timeout de 18 segundos via AbortController e `abortSignal` do Mastra. O provedor pode ter encerramento assíncrono/cobrança de tokens mesmo após o cancelamento.
- Classificação de erro sem imprimir requisições nem dados sensíveis. Trilha da resposta registra duração e fallback.
- Rejeita dois envios simultâneos na mesma conversa (HTTP 409), mas permite conversas diferentes em paralelo.
- Recupera reservas travadas após 45 segundos. Para o desafio local, vale apenas uma instância; produção exige uma transação no banco com lease/expiração e idempotência.

## Testes manuais

1. Faça a pergunta `Minha VPN está com erro 809 no Windows 11?` e confira a trilha, inclusive duração.
2. Teste `Abrir chamado`, descrição, impacto, urgência, `confirmar`. Um chamado deve ser criado uma única vez.
3. Abra duas conversas com usuários diferentes para verificar que a resposta lenta de uma não bloqueia a outra.
4. Simule o 503 ou use um modelo inválido temporariamente para verificar fallback, sem registrar chave no log.
5. Reinicie após um envio interrompido; espere 45 segundos antes de reenviar para uma conversa cuja reserva ficou presa.

## Limitações

- O banco é um JSON local, não suporta várias réplicas/instâncias.
- O timeout pode não impedir todos os retries internos de pacotes subjacentes; monitore nos logs e avalie opções de retries conforme a versão do Mastra.
- A reserva não é uma fila durável. Não há idempotência completa para retries de requisições HTTP, como reenvios após perda de conexão.
- Os seis testes adicionais cobrem a classificação e expiração; não são testes de carga nem de integração end-to-end.
