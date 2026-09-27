-- Eco Lava Jato — esquema inicial para Supabase (Postgres).
-- STATUS: proposta, NÃO aplicada. O app hoje roda em modo demonstração (localStorage).
-- Regras:
--   * Migrações sempre ADITIVAS: nunca DROP/ALTER destrutivo sem backup e aprovação.
--   * Dinheiro em centavos (bigint). NULL em preço/valor = ainda não definido.
--   * RLS ligado em todas as tabelas; o navegador só usa a chave anon/publishable.
--   * As mesmas regras de src/lib/regras.ts (matriz de permissões) valem aqui.

create extension if not exists pgcrypto;

-- ---------- Estrutura ----------
create table if not exists unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists membros (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('admin','gestor','atendimento','operacao','projetos','financeiro_consulta')),
  funcao text not null default '',
  reporta_a uuid references membros (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists membro_unidades (
  membro_id uuid not null references membros (id) on delete cascade,
  unidade_id uuid not null references unidades (id) on delete cascade,
  primary key (membro_id, unidade_id)
);

-- ---------- Funções auxiliares de permissão ----------
create or replace function papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select papel from membros where id = auth.uid() and ativo
$$;

create or replace function acessa_unidade(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros m
    where m.id = auth.uid() and m.ativo
      and (m.papel = 'admin' or exists (select 1 from membro_unidades mu where mu.membro_id = m.id and mu.unidade_id = u))
  )
$$;

-- nivel: 'ler' ou 'editar'. Espelha PERMISSOES em src/lib/regras.ts.
create or replace function pode(modulo text, nivel text) returns boolean
language sql stable security definer set search_path = public as $$
  with p as (select papel_atual() as papel)
  select case
    when (select papel from p) is null then false
    when (select papel from p) = 'admin' then true
    when (select papel from p) = 'gestor' then modulo not in ('equipe','configuracoes') or nivel = 'ler'
    when (select papel from p) = 'atendimento' then
      modulo in ('clientes','agenda','tarefas') or (nivel = 'ler' and modulo in ('operacao','servicos','projetos'))
    when (select papel from p) = 'operacao' then
      modulo in ('operacao','estoque','tarefas') or (nivel = 'ler' and modulo in ('clientes','agenda','servicos'))
    when (select papel from p) = 'projetos' then
      modulo in ('tarefas','projetos') or (nivel = 'ler' and modulo in ('estoque','equipe'))
    when (select papel from p) = 'financeiro_consulta' then
      nivel = 'ler' and modulo in ('financeiro','projetos')
    else false
  end
$$;

-- ---------- Tabelas de negócio (todas com unidade_id) ----------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  nome text not null,
  telefone text not null default '',
  email text not null default '',
  origem text not null default '',
  indicado_por text not null default '',
  estagio text not null default 'lead' check (estagio in ('lead','em_contato','cliente','inativo')),
  contato_permitido boolean not null default false,
  consentimento_data date,
  consentimento_origem text,
  nao_contatar boolean not null default false,
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  data timestamptz not null default now(),
  canal text not null default '',
  resumo text not null,
  autor_id uuid references membros (id)
);

create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  nome text not null,
  descricao text not null default '',
  duracao_min int not null check (duracao_min between 5 and 1440),
  preco_centavos bigint check (preco_centavos >= 0), -- NULL = preço não definido
  checklist text[] not null default '{}',
  ativo boolean not null default true
);

create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  cliente_id uuid references clientes (id) on delete set null,
  servico_id uuid references servicos (id),
  inicio timestamptz not null,
  duracao_min int not null check (duracao_min > 0),
  status text not null default 'agendado' check (status in ('agendado','confirmado','cancelado','convertido')),
  responsavel_id uuid references membros (id),
  observacoes text not null default '',
  ordem_id uuid
);

create table if not exists ordens (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  unidade_id uuid not null references unidades (id),
  agendamento_id uuid references agendamentos (id),
  cliente_id uuid references clientes (id) on delete set null,
  servico_id uuid references servicos (id),
  veiculo jsonb not null default '{}',
  valor_centavos bigint check (valor_centavos >= 0),
  status text not null default 'aguardando' check (status in ('aguardando','em_execucao','pronto','entregue','cancelado')),
  checklist jsonb not null default '[]',
  inicio timestamptz,
  fim timestamptz,
  observacoes text not null default '',
  criada_em timestamptz not null default now()
);

create table if not exists ordem_historico (
  id bigint generated always as identity primary key,
  ordem_id uuid not null references ordens (id) on delete cascade,
  status text not null,
  data timestamptz not null default now(),
  autor_id uuid references membros (id)
);

create table if not exists itens_estoque (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  nome text not null,
  categoria text not null default '',
  medida text not null default 'un',
  quantidade numeric not null default 0 check (quantidade >= 0),
  minimo numeric not null default 0 check (minimo >= 0),
  fornecedor text not null default '',
  lote text not null default '',
  validade date,
  ativo boolean not null default true,
  observacoes text not null default ''
);

create table if not exists movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references itens_estoque (id),
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric not null check (quantidade >= 0),
  data timestamptz not null default now(),
  motivo text not null,
  autor_id uuid references membros (id)
);

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  nome text not null,
  objetivo text not null default '',
  responsavel_id uuid references membros (id),
  status text not null default 'ideia' check (status in ('ideia','planejamento','em_andamento','pausado','concluido')),
  proximos_passos text not null default ''
);

create table if not exists decisoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos (id) on delete cascade,
  texto text not null,
  data timestamptz not null default now(),
  autor_id uuid references membros (id)
);

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  projeto_id uuid references projetos (id) on delete set null,
  titulo text not null,
  responsavel_id uuid references membros (id),
  prazo date,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  status text not null default 'a_fazer' check (status in ('a_fazer','fazendo','feito')),
  comentarios jsonb not null default '[]'
);

create table if not exists compromissos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  titulo text not null,
  tipo text not null check (tipo in ('reuniao','oficina','operacional')),
  inicio timestamptz not null,
  local text not null default '',
  observacoes text not null default ''
);

create table if not exists modelos_checklist (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  nome text not null,
  tipo text not null check (tipo in ('abertura','fechamento','servico')),
  itens text[] not null default '{}'
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text not null,
  data date not null,
  descricao text not null,
  valor_centavos bigint not null check (valor_centavos >= 0),
  estado text not null check (estado in ('estimativa','proposta','aprovado','realizado')),
  autor_id uuid references membros (id),
  notas text not null default '',
  demonstrativo boolean not null default false
);

-- Configuração única do negócio (uma linha).
create table if not exists configuracoes (
  id boolean primary key default true check (id),
  dados jsonb not null default '{}'
);

-- Auditoria: sem dados pessoais no resumo.
create table if not exists auditoria (
  id bigint generated always as identity primary key,
  data timestamptz not null default now(),
  autor_id uuid references membros (id),
  acao text not null,
  entidade text not null,
  entidade_id text not null,
  resumo text not null
);

-- ---------- RLS ----------
alter table unidades enable row level security;
alter table membros enable row level security;
alter table membro_unidades enable row level security;
alter table clientes enable row level security;
alter table interacoes enable row level security;
alter table servicos enable row level security;
alter table agendamentos enable row level security;
alter table ordens enable row level security;
alter table ordem_historico enable row level security;
alter table itens_estoque enable row level security;
alter table movimentos_estoque enable row level security;
alter table projetos enable row level security;
alter table decisoes enable row level security;
alter table tarefas enable row level security;
alter table compromissos enable row level security;
alter table modelos_checklist enable row level security;
alter table lancamentos enable row level security;
alter table configuracoes enable row level security;
alter table auditoria enable row level security;

-- Padrão por tabela com unidade_id: lê quem pode ler o módulo E acessa a unidade; escreve quem pode editar.
do $$
declare
  t record;
begin
  for t in select * from (values
    ('clientes','clientes'), ('servicos','servicos'), ('agendamentos','agenda'), ('ordens','operacao'),
    ('itens_estoque','estoque'), ('projetos','projetos'), ('tarefas','tarefas'), ('compromissos','tarefas'),
    ('modelos_checklist','operacao'), ('lancamentos','financeiro')
  ) as v(tabela, modulo) loop
    execute format('drop policy if exists ler on %I', t.tabela);
    execute format('create policy ler on %I for select using (pode(%L, ''ler'') and acessa_unidade(unidade_id))', t.tabela, t.modulo);
    execute format('drop policy if exists escrever on %I', t.tabela);
    execute format('create policy escrever on %I for all using (pode(%L, ''editar'') and acessa_unidade(unidade_id)) with check (pode(%L, ''editar'') and acessa_unidade(unidade_id))', t.tabela, t.modulo, t.modulo);
  end loop;
end $$;

-- Tabelas filhas: seguem o pai.
create policy ler on interacoes for select using (exists (select 1 from clientes c where c.id = cliente_id));
create policy escrever on interacoes for insert with check (pode('clientes','editar') and exists (select 1 from clientes c where c.id = cliente_id));
create policy ler on ordem_historico for select using (exists (select 1 from ordens o where o.id = ordem_id));
create policy escrever on ordem_historico for insert with check (pode('operacao','editar') and exists (select 1 from ordens o where o.id = ordem_id));
create policy ler on movimentos_estoque for select using (exists (select 1 from itens_estoque i where i.id = item_id));
create policy escrever on movimentos_estoque for insert with check (pode('estoque','editar') and exists (select 1 from itens_estoque i where i.id = item_id));
create policy ler on decisoes for select using (exists (select 1 from projetos p where p.id = projeto_id));
create policy escrever on decisoes for insert with check (pode('projetos','editar') and exists (select 1 from projetos p where p.id = projeto_id));

-- Estrutura: todos os membros ativos leem; só admin altera.
create policy ler on unidades for select using (papel_atual() is not null);
create policy escrever on unidades for all using (papel_atual() = 'admin') with check (papel_atual() = 'admin');
create policy ler on membros for select using (papel_atual() is not null);
create policy escrever on membros for all using (papel_atual() = 'admin') with check (papel_atual() = 'admin');
create policy ler on membro_unidades for select using (papel_atual() is not null);
create policy escrever on membro_unidades for all using (papel_atual() = 'admin') with check (papel_atual() = 'admin');
create policy ler on configuracoes for select using (papel_atual() is not null);
create policy escrever on configuracoes for all using (papel_atual() = 'admin') with check (papel_atual() = 'admin');
create policy ler on auditoria for select using (papel_atual() = 'admin');
create policy escrever on auditoria for insert with check (papel_atual() is not null and autor_id = auth.uid());
-- auditoria: sem update/delete (histórico imutável).
