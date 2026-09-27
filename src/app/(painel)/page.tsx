"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { alertasEstoque, formatarReais, pode, STATUS_ORDEM } from "@/lib/regras";
import { diaLocal, hojeISO, hora } from "@/lib/formato";
import { Aviso, Cabecalho, Cartao, Etiqueta, Vazio } from "@/componentes/ui";
import { useNomes } from "@/componentes/hooks";

function Indicador({ titulo, valor, como, href }: { titulo: string; valor: React.ReactNode; como: string; href?: string }) {
  const corpo = (
    <Cartao className="h-full">
      <p className="text-sm text-suave">{titulo}</p>
      <p className="mt-1 font-titulo text-4xl text-marca-forte">{valor}</p>
      <p className="mt-2 text-xs text-suave">{como}</p>
    </Cartao>
  );
  return href ? <Link href={href} className="block rounded-xl hover:ring-2 hover:ring-marca/30">{corpo}</Link> : corpo;
}

export default function VisaoGeral() {
  const { estado, membro, unidade } = useDados();
  const nomes = useNomes();
  if (!membro || !unidade) return null;
  const u = unidade.id;
  const hoje = hojeISO();

  const agendaHoje = estado.agendamentos
    .filter((a) => a.unidadeId === u && a.status !== "cancelado" && diaLocal(a.inicio) === hoje)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const abertas = estado.ordens.filter((o) => o.unidadeId === u && ["aguardando", "em_execucao", "pronto"].includes(o.status));
  const seteDias = new Date(`${hoje}T00:00:00`).getTime() - 6 * 86_400_000; // hoje + 6 dias anteriores
  const entregues7 = estado.ordens.filter((o) => o.unidadeId === u && o.status === "entregue" && new Date(o.historico.at(-1)!.data).getTime() >= seteDias);
  const alertas = alertasEstoque(estado.itens.filter((i) => i.unidadeId === u));
  const minhas = estado.tarefas.filter((t) => t.unidadeId === u && t.responsavelId === membro.id && t.status !== "feito");
  const aAtender = estado.clientes.filter((c) => c.unidadeId === u && !c.naoContatar && ["novo", "contatado", "interessado"].includes(c.estagio));
  const vencidas = estado.tarefas.filter((t) => t.unidadeId === u && t.status !== "feito" && t.prazo && t.prazo < hoje);
  const pode_ = (m: Parameters<typeof pode>[1]) => pode(membro.papel, m, "ler");
  const rapidas = ([
    ["clientes", "/clientes", "Contato"], ["agenda", "/agenda", "Agendamento"],
    ["operacao", "/operacao", "Ordem de serviço"], ["tarefas", "/tarefas", "Tarefa"],
  ] as const).filter(([m]) => pode(membro.papel, m, "editar")).map(([, href, texto]) => ({ href, texto }));

  return (
    <>
      <Cabecalho titulo={`Olá, ${membro.nome.split(" ")[0]}`} descricao={<>Resumo de <strong>{unidade.nome}</strong>. Cada número diz como foi calculado.</>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pode_("clientes") && <Indicador titulo="Contatos a atender" valor={aAtender.length} como="Contatos em 'novo', 'contatado' ou 'interessado', sem pedido de não contato." href="/clientes" />}
        {pode_("agenda") && <Indicador titulo="Agendamentos hoje" valor={agendaHoje.length} como="Agendamentos de hoje não cancelados nesta unidade." href="/agenda" />}
        {pode_("operacao") && <Indicador titulo="Ordens em aberto" valor={abertas.length} como="OS aguardando, em execução ou prontas para entrega." href="/operacao" />}
        {pode_("operacao") && <Indicador titulo="Entregues em 7 dias" valor={entregues7.length} como="OS cujo último registro foi 'entregue' nos últimos 7 dias." href="/operacao" />}
        {pode_("estoque") && <Indicador titulo="Alertas de estoque" valor={alertas.length} como="Itens no mínimo ou abaixo, ou com validade em até 30 dias." href="/estoque" />}
        {pode_("tarefas") && <Indicador titulo="Minhas tarefas abertas" valor={minhas.length} como="Tarefas desta unidade com você como responsável, não concluídas." href="/tarefas" />}
        {pode_("tarefas") && <Indicador titulo="Tarefas vencidas" valor={vencidas.length} como="Tarefas desta unidade não concluídas com prazo antes de hoje (de todos)." href="/tarefas" />}
      </div>

      {rapidas.length > 0 && (
        <nav aria-label="Ações rápidas" className="mt-4 flex flex-wrap gap-2">
          {rapidas.map((r) => (
            <Link key={r.href} href={`${r.href}?novo`} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-borda bg-superficie px-3 text-sm hover:border-marca">
              <Plus size={16} aria-hidden /> {r.texto}
            </Link>
          ))}
        </nav>
      )}

      <Cartao className="mt-4">
        <h2 className="font-medium">Indicadores ecológicos</h2>
        <p className="mt-1 text-sm text-suave">
          Água, produtos e resíduos: <strong>não medido</strong>. Só serão exibidos quando houver medição real e metodologia definida pelos responsáveis — o sistema não estima impacto ambiental.
        </p>
      </Cartao>

      {pode_("financeiro") && estado.config.orcamentoReferencia.mostrar && (
        <div className="mt-4">
          <Aviso titulo="Referência preliminar — NÃO aprovada">
            Na reunião foi citado, informalmente, cerca de {formatarReais(estado.config.orcamentoReferencia.valor)} para o lava-jato.
            Não é orçamento aprovado, cotação nem saldo disponível. Pode ser ocultado em Configurações.
          </Aviso>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {pode_("agenda") && (
          <Cartao>
            <h2 className="mb-3 font-medium">Agenda de hoje</h2>
            {agendaHoje.length === 0 ? (
              <Vazio titulo="Nada agendado para hoje" acao={<Link className="text-marca underline" href="/agenda">Abrir agenda</Link>} />
            ) : (
              <ul className="divide-y divide-borda">
                {agendaHoje.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span><strong>{hora(a.inicio)}</strong> · {nomes.cliente(a.clienteId)} — {nomes.servico(a.servicoId)}</span>
                    <Etiqueta tom={a.status === "convertido" ? "folha" : "marca"}>{a.status}</Etiqueta>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        )}
        {pode_("operacao") && (
          <Cartao>
            <h2 className="mb-3 font-medium">Fila da operação</h2>
            {abertas.length === 0 ? (
              <Vazio titulo="Nenhuma ordem em aberto" />
            ) : (
              <ul className="divide-y divide-borda">
                {abertas.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>OS #{o.numero} · {o.veiculo.modelo} {o.veiculo.cor}</span>
                    <Etiqueta tom={o.status === "pronto" ? "folha" : "marca"}>{STATUS_ORDEM[o.status]}</Etiqueta>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        )}
        {pode_("estoque") && alertas.length > 0 && (
          <Cartao>
            <h2 className="mb-3 font-medium">Alertas de estoque</h2>
            <ul className="space-y-1 text-sm">
              {alertas.map((a, i) => (
                <li key={i}><Etiqueta tom={a.tipo === "minimo" ? "alerta" : "perigo"}>{a.tipo === "minimo" ? "mínimo" : a.tipo}</Etiqueta> {a.texto}</li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>
    </>
  );
}
