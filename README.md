# Eco Lava Jato

Sistema de gestão do **Eco Lava Jato** e das outras frentes do ecossistema (oficinas, meliponicultura), feito a partir do prompt mestre da reunião de fundação.

**No ar (demonstração):** https://eco-lava-jato.vercel.app

> ⚠️ **Modo demonstração.** Os dados ficam só no navegador de quem usa (localStorage) e o "login" é uma escolha de perfil, sem senha. Não cadastre dados reais de clientes até o banco (Supabase) e o login estarem ligados.

## O que já funciona

| Tela | Para quê |
|---|---|
| Visão geral (`/`) | Agenda do dia, fila de serviços, alertas de estoque, tarefas. Cada número diz como foi calculado. |
| Clientes (`/clientes`) | Cadastro com consentimento de contato, "não contatar", histórico, exportar e excluir dados (LGPD). |
| Agenda (`/agenda`) | Semana de 7 dias, aviso de conflito de horário (capacidade configurável), confirmar/cancelar, abrir OS. |
| Operação (`/operacao`) | Ordens de serviço em quadro (aguardando → em execução → pronto → entregue), checklist e histórico. |
| Serviços (`/servicos`) | Catálogo (preço vazio = ainda não definido) e checklists de abertura/fechamento. |
| Estoque (`/estoque`) | Itens, mínimo, validade, entradas/saídas/ajustes com motivo, alertas. |
| Equipe (`/equipe`) | Pessoas, papéis de acesso, unidades, organograma e matriz de permissões. |
| Tarefas (`/tarefas`) | Quadro de tarefas por projeto, comentários e compromissos (reuniões/oficinas). |
| Financeiro (`/financeiro`) | Controle gerencial com estados separados: estimativa, proposta, aprovado, realizado. Exporta CSV. |
| Projetos (`/projetos`) | Frentes do ecossistema, responsável, próximos passos e registro de decisões. |
| Configurações (`/configuracoes`) | Dados do negócio, capacidade, regras do espaço (rascunho), política de dados, unidades, auditoria. |

Não faz (de propósito): pagamentos, PIX, nota fiscal, contabilidade, envio automático de WhatsApp/SMS/e-mail, geolocalização.

## Rodar no seu computador

Pré-requisito: Node.js 20 ou mais novo.

```bash
git clone https://github.com/redexglobal/eco-lava-jato.git
cd eco-lava-jato
npm install
npm run dev        # abre em http://localhost:3000
```

Verificações (rode antes de todo commit):

```bash
npm run typecheck  # erros de tipo
npm run lint       # boas práticas
npm test           # testes das regras de negócio
npm run build      # garante que o deploy vai passar
```

## Como está organizado

```
src/lib/        regras do negócio (não dependem de tela)
  tipos.ts      formato de cada dado
  regras.ts     permissões, dinheiro, conflito de agenda, estoque, CSV…
  acoes.ts      toda alteração passa por aqui (checa permissão + valida + audita)
  demo.ts       dados fictícios de exemplo
  store.tsx     guarda o estado no navegador (modo demo)
src/componentes/ peças de tela reutilizáveis (botão, campo, modal…)
src/app/        as páginas (uma pasta por rota)
supabase/       esquema do banco proposto (ainda NÃO aplicado)
docs/           requisitos, arquitetura, segurança, decisões pendentes, testes, guia do Otto
```

## Deploy

Cada `git push` na branch `main` publica automaticamente na Vercel (projeto `eco-lava-jato`). Os commits precisam ser feitos com o e-mail da conta GitHub `redexglobal`, senão a Vercel bloqueia o deploy.

## Próximo grande passo: banco de dados real

1. Criar projeto no Supabase e rodar `supabase/schema.sql` (revisar antes!).
2. Preencher as variáveis do `.env.example` na Vercel.
3. Trocar `src/lib/store.tsx` por chamadas ao Supabase, mantendo `acoes.ts` como camada de regras no servidor.
4. Ligar login real (Supabase Auth) no lugar da escolha de perfil.

Veja `docs/DECISOES_PENDENTES.md` para o que os sócios ainda precisam decidir.
