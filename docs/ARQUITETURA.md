# Arquitetura

## Visão geral

```
Navegador
 ├─ Telas (src/app/…/page.tsx)          ← só mostram e coletam dados
 │     │ chamam
 │     ▼
 ├─ executar(ação)  (src/lib/acoes.ts)  ← checa permissão + unidade, valida, audita
 │     │ usa
 │     ▼
 ├─ Regras puras (src/lib/regras.ts)    ← funções testadas, sem tela
 │
 └─ Armazenamento (src/lib/store.tsx)   ← HOJE: localStorage (modo demonstração)
                                          FUTURO: Supabase (Postgres + Auth + RLS)
```

## Tecnologias
- **Next.js 16** (App Router) + **React 19** + **TypeScript** estrito.
- **Tailwind CSS 4** com tokens de cor da marca em `src/app/globals.css`.
- Ícones `lucide-react`; fontes Cormorant Garamond (títulos) e Inter (texto).
- Testes com o executor nativo do Node (`node --test`), sem dependência extra.
- Hospedagem: **Vercel** (deploy automático a cada push em `main`).

## Decisões importantes
1. **Camada de regras separada da tela.** Tudo que altera dados passa por `executar()`. Quando o banco for ligado, essa mesma função roda no servidor (Server Action / rota de API), então as permissões não dependem do navegador.
2. **Modo demonstração honesto.** Sem banco autorizado ainda, os dados ficam no navegador e há faixa avisando. Evita coletar dado real sem política de privacidade aprovada.
3. **Unidades.** Cada registro tem `unidadeId`. É o que permite o mesmo sistema servir lava-jato, oficinas e meliponicultura sem misturar números.
4. **Dinheiro em centavos** e estados financeiros separados — estimativa nunca soma com realizado.
5. **Auditoria limitada** (500 registros no modo demo) e sem nome de cliente no texto.

## Rotas
`/entrar` (escolha de perfil) e, dentro do painel: `/`, `/clientes`, `/agenda`, `/operacao`, `/servicos`, `/estoque`, `/equipe`, `/tarefas`, `/financeiro`, `/projetos`, `/configuracoes`.

## Banco (futuro)
`supabase/schema.sql` traz o esquema proposto com RLS espelhando a matriz de permissões (`pode(modulo, nivel)` + `acessa_unidade(unidade_id)`). **Não foi aplicado.**
