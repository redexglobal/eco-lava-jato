# Instruções para o Claude Code neste repositório

- Idioma: português do Brasil em tudo (telas, docs, commits).
- Antes de mudar código, leia `docs/REQUISITOS.md`, `docs/DECISOES_PENDENTES.md` e o arquivo que vai alterar.
- Toda alteração de dados passa por `src/lib/acoes.ts` (permissão + validação + auditoria). Não altere o estado direto nas telas.
- Dinheiro sempre em centavos (inteiro). `null` = valor não definido. Nunca invente preço.
- Separar sempre estimativa / proposta / aprovado / realizado / demonstrativo.
- Nunca ler, criar ou commitar `.env`, chaves ou senhas. Só `.env.example` sem valores.
- Dados de exemplo são fictícios (`@exemplo.invalid`, `(00) 9…`). Nada de dados de crianças ou dados sensíveis.
- Fora de escopo sem pedido explícito: pagamentos, PIX, nota fiscal, WhatsApp/SMS/e-mail automáticos, scraping, geolocalização.
- Migrações de banco: apenas aditivas.
- Antes de commitar: `npm run typecheck && npm run lint && npm test && npm run build`.
- Commits com o e-mail noreply da conta `redexglobal` (a Vercel bloqueia outro autor).
- Não faça `git push` sem o OK de quem está conduzindo a sessão.
