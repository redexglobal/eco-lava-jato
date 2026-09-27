# Plano de testes

## Automáticos (`npm test`) — 20 testes, todos passando
Cobrem `src/lib/regras.ts` e `src/lib/acoes.ts`:
- Matriz de permissões (cada papel lê/edita só o que deve) e acesso por unidade.
- Conversão de reais ↔ centavos, inclusive entradas inválidas.
- Conflito de agenda respeitando a capacidade.
- Transições válidas/inválidas de ordem de serviço.
- Movimentos de estoque (não deixa ficar negativo; ajuste; motivo obrigatório) e alertas.
- Totais financeiros separados por estado.
- CSV neutraliza fórmulas.
- Ações: bloqueio por permissão/unidade, agendamento cancelado não vira OS, exclusão LGPD, proteção do último admin, fluxo completo agendamento → OS → entregue.

## Verificações de build
`npm run typecheck`, `npm run lint`, `npm run build` — todos sem erro na versão publicada.

## Roteiro manual (fazer no celular e no computador)
1. Entrar como **Admin**: ver visão geral, trocar unidade no topo.
2. Clientes: criar um cliente fictício, marcar consentimento, registrar interação, exportar, excluir.
3. Agenda: criar dois agendamentos no mesmo horário → aparece aviso de conflito.
4. Abrir OS a partir do agendamento → em Operação, avançar etapas, marcar checklist, entregar.
5. Estoque: registrar saída maior que o saldo → deve ser recusada. Registrar ajuste com motivo.
6. Financeiro: criar estimativa e realizado; conferir que os totais ficam separados; exportar CSV e abrir no Excel/Planilhas.
7. Sair e entrar como **Consulta financeira**: só Financeiro e Projetos no menu, sem botões de editar.
8. Entrar como **Operação**: tentar abrir `/financeiro` pelo endereço → "Sem acesso".
9. Configurações → Reiniciar dados de exemplo.

## Ainda não verificado
- Leitores de tela reais (só boas práticas de código).
- Comportamento com Supabase (não ligado).
- Testes automatizados de tela (end-to-end) — sugestão: Playwright.
