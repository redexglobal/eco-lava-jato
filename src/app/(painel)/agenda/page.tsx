"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDados } from "@/lib/store";
import { sobreposicoes } from "@/lib/regras";
import { data, deCampoDataHora, diaLocal, hora, paraCampoDataHora } from "@/lib/formato";
import type { Agendamento, StatusAgendamento, Veiculo } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Etiqueta, Marcar, Modal, RodapeForm, Selecao, useFormulario, useUi, type Tom } from "@/componentes/ui";
import { useAbrirSeNovo, useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const STATUS: Record<StatusAgendamento, { texto: string; tom: Tom }> = {
  agendado: { texto: "Agendado", tom: "alerta" },
  confirmado: { texto: "Confirmado", tom: "marca" },
  convertido: { texto: "Virou OS", tom: "folha" },
  cancelado: { texto: "Cancelado", tom: "neutro" },
};

type Form = Omit<Agendamento, "id" | "status" | "ordemId"> & { id?: string };
const DIAS = 7;

export default function Agenda() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("agenda");
  const podeOperar = usePermissao("operacao").editar;
  const acao = useAcao();
  const { confirmar } = useUi();
  const nomes = useNomes();
  const router = useRouter();
  const u = unidade!.id;

  const [inicioSemana, setInicioSemana] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [sobrepor, setSobrepor] = useState(false);
  const [convertendo, setConvertendo] = useState<Agendamento | null>(null);
  const [veiculo, setVeiculo] = useState<Veiculo>({ marca: "", modelo: "", cor: "", placa: "" });
  const [errosVeiculo, setErrosVeiculo] = useState<Record<string, string>>({});
  const f = useFormulario<Form>({ unidadeId: u, clienteId: "", servicoId: "", inicio: "", duracaoMin: 60, responsavelId: "", observacoes: "" });

  const clientes = estado.clientes.filter((c) => c.unidadeId === u).sort((a, b) => a.nome.localeCompare(b.nome));
  const servicos = estado.servicos.filter((s) => s.unidadeId === u && s.ativo);
  const equipe = estado.membros.filter((m) => m.ativo && (m.papel === "admin" || m.unidades.includes(u)));

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + i);
    return paraCampoDataHora(d.toISOString()).slice(0, 10);
  }), [inicioSemana]);

  const porDia = useMemo(() => {
    const m = new Map<string, Agendamento[]>();
    for (const a of estado.agendamentos) {
      if (a.unidadeId !== u || (!mostrarCancelados && a.status === "cancelado")) continue;
      const k = diaLocal(a.inicio);
      if (!dias.includes(k)) continue;
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    for (const l of m.values()) l.sort((a, b) => a.inicio.localeCompare(b.inicio));
    return m;
  }, [estado.agendamentos, u, dias, mostrarCancelados]);

  const mover = (n: number) => setInicioSemana((d) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; });

  function novo(dia?: string) {
    const s = servicos[0];
    f.reiniciar({ unidadeId: u, clienteId: "", servicoId: s?.id ?? "", inicio: dia ? new Date(dia + "T09:00").toISOString() : "", duracaoMin: s?.duracaoMin ?? 60, responsavelId: "", observacoes: "" });
    setSobrepor(false);
    setAberto(true);
  }
  function editarAg(a: Agendamento) {
    f.reiniciar({ id: a.id, unidadeId: a.unidadeId, clienteId: a.clienteId, servicoId: a.servicoId, inicio: a.inicio, duracaoMin: a.duracaoMin, responsavelId: a.responsavelId, observacoes: a.observacoes });
    setSobrepor(false);
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "agendamento.salvar", dados: f.dados, permitirSobreposicao: sobrepor }, { sucesso: "Agendamento salvo.", setErros: f.setErros })) setAberto(false);
  }
  async function cancelar(a: Agendamento) {
    const ok = await confirmar({ titulo: "Cancelar agendamento", texto: `Cancelar ${nomes.cliente(a.clienteId)} em ${data(a.inicio)} às ${hora(a.inicio)}? O horário fica livre e o registro permanece no histórico.`, rotulo: "Cancelar agendamento", perigo: true });
    if (ok) acao({ tipo: "agendamento.cancelar", id: a.id }, { sucesso: "Agendamento cancelado." });
  }
  function converter(ev: React.FormEvent) {
    ev.preventDefault();
    if (!convertendo) return;
    const id = acao({ tipo: "agendamento.converter", id: convertendo.id, veiculo }, { sucesso: "Ordem de serviço criada.", setErros: setErrosVeiculo });
    if (id) {
      setConvertendo(null);
      router.push("/operacao");
    }
  }

  const conflitos = f.dados.inicio && f.dados.duracaoMin
    ? sobreposicoes(estado.agendamentos, { id: f.dados.id ?? "", unidadeId: u, inicio: f.dados.inicio, duracaoMin: f.dados.duracaoMin })
    : [];

  useAbrirSeNovo(() => novo(), editar && servicos.length > 0);
  return (
    <>
      <Cabecalho
        titulo="Agenda"
        descricao={<>Capacidade configurada: <strong>{estado.config.capacidadeSimultanea}</strong> atendimento(s) ao mesmo tempo. O sistema avisa quando um horário já está cheio. {!estado.config.horario && "Horário de funcionamento ainda não definido."}</>}
        acoes={editar && <Botao onClick={() => novo()} disabled={!servicos.length}><Plus size={16} /> Novo agendamento</Botao>}
      />
      {editar && !servicos.length && <div className="mb-4"><Aviso>Cadastre ou ative um serviço antes de agendar.</Aviso></div>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Botao variante="secundario" onClick={() => mover(-DIAS)} aria-label="Semana anterior"><ChevronLeft size={16} /></Botao>
        <Botao variante="secundario" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setInicioSemana(d); }}>Hoje</Botao>
        <Botao variante="secundario" onClick={() => mover(DIAS)} aria-label="Próxima semana"><ChevronRight size={16} /></Botao>
        <span className="text-sm text-suave">{data(dias[0])} a {data(dias[DIAS - 1])}</span>
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" className="accent-marca" checked={mostrarCancelados} onChange={(e) => setMostrarCancelados(e.target.checked)} /> Mostrar cancelados</label>
      </div>

      <div className="grid gap-3">
        {dias.map((dia) => {
          const lista = porDia.get(dia) ?? [];
          const rotulo = new Date(dia + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
          return (
            <section key={dia} className="rounded-xl border border-borda bg-superficie">
              <div className="flex items-center justify-between border-b border-borda px-4 py-2">
                <h2 className="text-sm font-medium capitalize">{rotulo}</h2>
                {editar && servicos.length > 0 && <button type="button" className="text-xs text-marca hover:underline" onClick={() => novo(dia)}>+ agendar</button>}
              </div>
              {lista.length === 0 ? (
                <p className="px-4 py-3 text-sm text-suave">Sem agendamentos.</p>
              ) : (
                <ul className="divide-y divide-borda">
                  {lista.map((a) => {
                    const aberto_ = a.status === "agendado" || a.status === "confirmado";
                    return (
                      <li key={a.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <p><strong>{hora(a.inicio)}</strong> ({a.duracaoMin} min) · {nomes.cliente(a.clienteId)}</p>
                          <p className="text-xs text-suave">{nomes.servico(a.servicoId)} · {nomes.membro(a.responsavelId)}{a.observacoes && ` · ${a.observacoes}`}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Etiqueta tom={STATUS[a.status].tom}>{STATUS[a.status].texto}</Etiqueta>
                          {aberto_ && editar && a.status === "agendado" && <Botao variante="fantasma" onClick={() => acao({ tipo: "agendamento.confirmar", id: a.id }, { sucesso: "Confirmado." })}>Confirmar</Botao>}
                          {aberto_ && podeOperar && <Botao variante="secundario" onClick={() => { setVeiculo({ marca: "", modelo: "", cor: "", placa: "" }); setErrosVeiculo({}); setConvertendo(a); }}>Abrir OS</Botao>}
                          {aberto_ && editar && <Botao variante="fantasma" onClick={() => editarAg(a)}>Editar</Botao>}
                          {aberto_ && editar && <Botao variante="fantasma" className="text-perigo" onClick={() => cancelar(a)}>Cancelar</Botao>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Modal aberto={aberto} titulo={f.dados.id ? "Editar agendamento" : "Novo agendamento"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          {clientes.length === 0 ? (
            <Aviso>Nenhum cliente nesta unidade. Cadastre em Clientes primeiro.</Aviso>
          ) : (
            <Selecao rotulo="Cliente" obrigatorio vazio="Escolha…" value={f.dados.clienteId} onChange={(e) => f.campo("clienteId")(e.target.value)} erro={f.erros.clienteId}
              opcoes={clientes.map((c) => ({ valor: c.id, texto: c.nome + (c.naoContatar ? " (não contatar)" : "") }))} />
          )}
          <Selecao rotulo="Serviço" obrigatorio vazio="Escolha…" value={f.dados.servicoId} erro={f.erros.servicoId}
            onChange={(e) => { const s = servicos.find((x) => x.id === e.target.value); f.setDados((d) => ({ ...d, servicoId: e.target.value, duracaoMin: s?.duracaoMin ?? d.duracaoMin })); }}
            opcoes={servicos.map((s) => ({ valor: s.id, texto: s.nome }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Data e hora" type="datetime-local" obrigatorio value={paraCampoDataHora(f.dados.inicio)} onChange={(e) => f.campo("inicio")(deCampoDataHora(e.target.value))} erro={f.erros.inicio} />
            <Campo rotulo="Duração (min)" type="number" min={5} step={5} value={f.dados.duracaoMin} onChange={(e) => f.campo("duracaoMin")(Number(e.target.value))} erro={f.erros.duracaoMin} ajuda="Vem do serviço; pode ajustar." />
          </div>
          <Selecao rotulo="Responsável" vazio="A definir" value={f.dados.responsavelId} onChange={(e) => f.campo("responsavelId")(e.target.value)} opcoes={equipe.map((m) => ({ valor: m.id, texto: m.nome }))} />
          <AreaTexto rotulo="Observações" ajuda="Sem dados sensíveis." value={f.dados.observacoes} onChange={(e) => f.campo("observacoes")(e.target.value)} />
          {conflitos.length > 0 && (
            <Aviso titulo={`${conflitos.length} agendamento(s) no mesmo intervalo`}>
              {conflitos.map((c) => `${hora(c.inicio)} ${nomes.cliente(c.clienteId)}`).join(" · ")}
              {conflitos.length >= estado.config.capacidadeSimultanea && (
                <div className="mt-2"><Marcar rotulo="Agendar mesmo assim (sobrepor)" checked={sobrepor} onChange={(e) => setSobrepor(e.target.checked)} /></div>
              )}
            </Aviso>
          )}
          <RodapeForm onCancelar={() => setAberto(false)} desabilitado={!clientes.length} />
        </form>
      </Modal>

      <Modal aberto={!!convertendo} titulo="Abrir ordem de serviço" onFechar={() => setConvertendo(null)}>
        <form onSubmit={converter} noValidate className="grid gap-3">
          <p className="text-sm text-suave">{convertendo && `${nomes.cliente(convertendo.clienteId)} — ${nomes.servico(convertendo.servicoId)}`}. Informe só o necessário para identificar o veículo.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Marca" value={veiculo.marca} onChange={(e) => setVeiculo({ ...veiculo, marca: e.target.value })} />
            <Campo rotulo="Modelo" obrigatorio value={veiculo.modelo} onChange={(e) => setVeiculo({ ...veiculo, modelo: e.target.value })} erro={errosVeiculo.modelo} />
            <Campo rotulo="Cor" value={veiculo.cor} onChange={(e) => setVeiculo({ ...veiculo, cor: e.target.value })} />
          </div>
          <Campo rotulo={estado.config.pedirPlaca ? "Placa" : "Placa (opcional)"} obrigatorio={estado.config.pedirPlaca} value={veiculo.placa} onChange={(e) => setVeiculo({ ...veiculo, placa: e.target.value })} erro={errosVeiculo.placa} ajuda="Só se realmente necessário." />
          <RodapeForm onCancelar={() => setConvertendo(null)} rotulo="Criar OS" />
        </form>
      </Modal>
    </>
  );
}
