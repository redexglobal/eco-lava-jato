"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { centavosParaCampo, formatarReais, proximosStatus, reaisParaCentavos, STATUS_ORDEM } from "@/lib/regras";
import { dataHora } from "@/lib/formato";
import type { Ordem, StatusOrdem } from "@/lib/tipos";
import { AreaTexto, Botao, Cabecalho, Campo, Etiqueta, Modal, RodapeForm, Selecao, Vazio, useFormulario, useUi, type Tom } from "@/componentes/ui";
import { useAbrirSeNovo, useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const TOM: Record<StatusOrdem, Tom> = { aguardando: "alerta", em_execucao: "marca", pronto: "folha", entregue: "neutro", cancelado: "neutro" };
const ACAO_STATUS: Record<StatusOrdem, string> = { aguardando: "Voltar para fila", em_execucao: "Iniciar", pronto: "Marcar pronto", entregue: "Entregar", cancelado: "Cancelar" };

const COLUNAS: StatusOrdem[] = ["aguardando", "em_execucao", "pronto"];

type Form = { id?: string; clienteId: string; servicoId: string; marca: string; modelo: string; cor: string; placa: string; valor: string; observacoes: string };

export default function Operacao() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("operacao");
  const acao = useAcao();
  const { confirmar } = useUi();
  const nomes = useNomes();
  const u = unidade!.id;
  const [aba, setAba] = useState<"fila" | "encerradas">("fila");
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const f = useFormulario<Form>({ clienteId: "", servicoId: "", marca: "", modelo: "", cor: "", placa: "", valor: "", observacoes: "" });

  const ordens = useMemo(() => estado.ordens.filter((o) => o.unidadeId === u).sort((a, b) => b.numero - a.numero), [estado.ordens, u]);
  const aberta = ordens.find((o) => o.id === abertaId) ?? null;
  const encerradas = ordens.filter((o) => o.status === "entregue" || o.status === "cancelado");

  function novo() {
    f.reiniciar({ clienteId: "", servicoId: estado.servicos.find((s) => s.unidadeId === u && s.ativo)?.id ?? "", marca: "", modelo: "", cor: "", placa: "", valor: "", observacoes: "" });
    setEditando(true);
  }
  function editarOrdem(o: Ordem) {
    f.reiniciar({ id: o.id, clienteId: o.clienteId, servicoId: o.servicoId, ...o.veiculo, valor: centavosParaCampo(o.valor), observacoes: o.observacoes });
    setAbertaId(null);
    setEditando(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const d = f.dados;
    const valor = d.valor.trim() ? reaisParaCentavos(d.valor) : null;
    if (d.valor.trim() && valor === null) return f.setErros({ valor: "Use o formato 50,00." });
    const anterior = d.id ? estado.ordens.find((o) => o.id === d.id) : undefined;
    const sv = estado.servicos.find((s) => s.id === d.servicoId);
    const id = acao({
      tipo: "ordem.salvar",
      dados: {
        id: d.id, unidadeId: u, clienteId: d.clienteId, servicoId: d.servicoId, agendamentoId: anterior?.agendamentoId,
        veiculo: { marca: d.marca, modelo: d.modelo, cor: d.cor, placa: d.placa }, valor, observacoes: d.observacoes,
        checklist: anterior?.checklist ?? (sv?.checklist ?? []).map((t) => ({ texto: t, feito: false })),
      },
    }, { sucesso: "Ordem salva.", setErros: f.setErros });
    if (id) setEditando(false);
  }
  async function mudar(o: Ordem, para: StatusOrdem) {
    if (para === "cancelado" || para === "entregue") {
      const pendentes = o.checklist.filter((c) => !c.feito).length;
      const ok = await confirmar({
        titulo: para === "cancelado" ? `Cancelar OS #${o.numero}` : `Entregar OS #${o.numero}`,
        texto: para === "cancelado"
          ? "A ordem será encerrada como cancelada. Não é possível reabrir."
          : `A ordem será encerrada como entregue e não poderá mais ser editada.${pendentes ? ` Atenção: ${pendentes} item(ns) do checklist não marcado(s).` : ""}`,
        rotulo: para === "cancelado" ? "Cancelar OS" : "Confirmar entrega",
        perigo: para === "cancelado",
      });
      if (!ok) return;
    }
    acao({ tipo: "ordem.status", id: o.id, para }, { sucesso: `OS #${o.numero}: ${STATUS_ORDEM[para]}` });
  }

  const cartao = (o: Ordem) => {
    const feitos = o.checklist.filter((c) => c.feito).length;
    return (
      <li key={o.id} className="rounded-xl border border-borda bg-superficie p-3 text-sm">
        <button type="button" className="w-full text-left" onClick={() => setAbertaId(o.id)}>
          <div className="flex items-center justify-between gap-2">
            <strong>OS #{o.numero}</strong>
            <Etiqueta tom={TOM[o.status]}>{STATUS_ORDEM[o.status]}</Etiqueta>
          </div>
          <p className="mt-1">{[o.veiculo.marca, o.veiculo.modelo, o.veiculo.cor].filter(Boolean).join(" · ")}{o.veiculo.placa && ` · ${o.veiculo.placa}`}</p>
          <p className="text-xs text-suave">{nomes.cliente(o.clienteId)} · {nomes.servico(o.servicoId)}</p>
          {o.checklist.length > 0 && <p className="mt-1 text-xs text-suave">Checklist {feitos}/{o.checklist.length}</p>}
        </button>
        {editar && proximosStatus(o.status).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-borda pt-2">
            {proximosStatus(o.status).map((p) => (
              <Botao key={p} variante={p === "cancelado" ? "fantasma" : "secundario"} className={`min-h-8 px-2 text-xs ${p === "cancelado" ? "text-perigo" : ""}`} onClick={() => mudar(o, p)}>
                {ACAO_STATUS[p]}
              </Botao>
            ))}
          </div>
        )}
      </li>
    );
  };

  const clientes = estado.clientes.filter((c) => c.unidadeId === u);
  const servicos = estado.servicos.filter((s) => s.unidadeId === u && (s.ativo || s.id === f.dados.servicoId));

  useAbrirSeNovo(() => novo(), editar);
  return (
    <>
      <Cabecalho
        titulo="Operação"
        descricao="Ordens de serviço: aguardando → em execução → pronto → entregue. Toda mudança fica registrada com data e autor."
        acoes={editar && <Botao onClick={novo}><Plus size={16} /> OS sem agendamento</Botao>}
      />
      <div role="tablist" className="mb-4 flex gap-1 rounded-lg bg-superficie p-1 text-sm sm:w-fit">
        {(["fila", "encerradas"] as const).map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className="rounded-md px-4 py-1.5 aria-selected:bg-marca aria-selected:text-white">
            {a === "fila" ? "Fila" : `Encerradas (${encerradas.length})`}
          </button>
        ))}
      </div>

      {aba === "fila" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUNAS.map((s) => {
            const lista = ordens.filter((o) => o.status === s);
            return (
              <section key={s}>
                <h2 className="mb-2 text-sm font-medium text-suave">{STATUS_ORDEM[s]} ({lista.length})</h2>
                {lista.length === 0 ? <p className="rounded-xl border border-dashed border-borda px-3 py-6 text-center text-xs text-suave">Vazio</p> : <ul className="grid gap-2">{lista.map(cartao)}</ul>}
              </section>
            );
          })}
        </div>
      ) : encerradas.length === 0 ? (
        <Vazio titulo="Nenhuma ordem encerrada" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">{encerradas.map(cartao)}</ul>
      )}

      <Modal aberto={!!aberta} titulo={aberta ? `OS #${aberta.numero}` : ""} onFechar={() => setAbertaId(null)} largo>
        {aberta && (
          <div className="grid gap-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-3">
              <div><dt className="text-suave">Cliente</dt><dd>{nomes.cliente(aberta.clienteId)}</dd></div>
              <div><dt className="text-suave">Serviço</dt><dd>{nomes.servico(aberta.servicoId)}</dd></div>
              <div><dt className="text-suave">Valor</dt><dd>{formatarReais(aberta.valor)}</dd></div>
              <div><dt className="text-suave">Veículo</dt><dd>{[aberta.veiculo.marca, aberta.veiculo.modelo, aberta.veiculo.cor, aberta.veiculo.placa].filter(Boolean).join(" · ")}</dd></div>
              <div><dt className="text-suave">Início</dt><dd>{dataHora(aberta.inicio)}</dd></div>
              <div><dt className="text-suave">Fim</dt><dd>{dataHora(aberta.fim)}</dd></div>
              {aberta.observacoes && <div className="sm:col-span-3"><dt className="text-suave">Observações</dt><dd>{aberta.observacoes}</dd></div>}
            </dl>
            <section>
              <h3 className="mb-2 font-medium">Checklist</h3>
              {aberta.checklist.length === 0 ? <p className="text-suave">Serviço sem checklist.</p> : (
                <ul className="grid gap-1">
                  {aberta.checklist.map((c, i) => (
                    <li key={i}>
                      <label className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-fundo">
                        <input type="checkbox" className="size-5 accent-folha" checked={c.feito}
                          disabled={!editar || aberta.status === "entregue" || aberta.status === "cancelado"}
                          onChange={() => acao({ tipo: "ordem.checklist", id: aberta.id, indice: i })} />
                        <span className={c.feito ? "text-suave line-through" : ""}>{c.texto}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-medium">Histórico</h3>
              <ol className="space-y-1 text-xs text-suave">
                {aberta.historico.map((h, i) => <li key={i}>{dataHora(h.data)} — <strong className="text-texto">{STATUS_ORDEM[h.status]}</strong> por {nomes.membro(h.autorId)}</li>)}
              </ol>
            </section>
            <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
              {editar && proximosStatus(aberta.status).map((p) => (
                <Botao key={p} variante={p === "cancelado" ? "perigo" : "primario"} onClick={() => mudar(aberta, p)}>{ACAO_STATUS[p]}</Botao>
              ))}
              {editar && aberta.status !== "entregue" && aberta.status !== "cancelado" && <Botao variante="secundario" onClick={() => editarOrdem(aberta)}>Editar dados</Botao>}
            </div>
          </div>
        )}
      </Modal>

      <Modal aberto={editando} titulo={f.dados.id ? "Editar OS" : "Nova OS (sem agendamento)"} onFechar={() => setEditando(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Selecao rotulo="Cliente" obrigatorio vazio="Escolha…" value={f.dados.clienteId} disabled={!!f.dados.id} onChange={(e) => f.campo("clienteId")(e.target.value)} erro={f.erros.clienteId} opcoes={clientes.map((c) => ({ valor: c.id, texto: c.nome }))} />
          <Selecao rotulo="Serviço" obrigatorio vazio="Escolha…" value={f.dados.servicoId} onChange={(e) => f.campo("servicoId")(e.target.value)} erro={f.erros.servicoId} opcoes={servicos.map((s) => ({ valor: s.id, texto: s.nome }))} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Marca" value={f.dados.marca} onChange={(e) => f.campo("marca")(e.target.value)} />
            <Campo rotulo="Modelo" obrigatorio value={f.dados.modelo} onChange={(e) => f.campo("modelo")(e.target.value)} erro={f.erros.modelo} />
            <Campo rotulo="Cor" value={f.dados.cor} onChange={(e) => f.campo("cor")(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo={estado.config.pedirPlaca ? "Placa" : "Placa (opcional)"} value={f.dados.placa} onChange={(e) => f.campo("placa")(e.target.value)} erro={f.erros.placa} />
            <Campo rotulo="Valor (R$)" inputMode="decimal" placeholder="Não definido" value={f.dados.valor} onChange={(e) => f.campo("valor")(e.target.value)} erro={f.erros.valor} ajuda="Definido pelo operador; vazio = não definido." />
          </div>
          <AreaTexto rotulo="Observações" value={f.dados.observacoes} onChange={(e) => f.campo("observacoes")(e.target.value)} />
          <RodapeForm onCancelar={() => setEditando(false)} />
        </form>
      </Modal>
    </>
  );
}
