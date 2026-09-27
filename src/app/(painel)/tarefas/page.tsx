"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { data, dataHora, deCampoDataHora, hojeISO, paraCampoDataHora } from "@/lib/formato";
import type { Compromisso, Prioridade, StatusTarefa, Tarefa } from "@/lib/tipos";
import { AreaTexto, Botao, Cabecalho, Campo, Etiqueta, Modal, Selecao, Vazio, useFormulario, useUi, type Tom } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const STATUS: Record<StatusTarefa, string> = { a_fazer: "A fazer", fazendo: "Fazendo", feito: "Feito" };
const PRIORIDADE: Record<Prioridade, { texto: string; tom: Tom }> = { alta: { texto: "Alta", tom: "perigo" }, media: { texto: "Média", tom: "alerta" }, baixa: { texto: "Baixa", tom: "neutro" } };
const TIPO_COMP: Record<Compromisso["tipo"], string> = { reuniao: "Reunião", oficina: "Oficina", operacional: "Operacional" };

type FormT = Omit<Tarefa, "id" | "unidadeId" | "comentarios"> & { id?: string };
type FormC = Omit<Compromisso, "id" | "unidadeId"> & { id?: string };

export default function Tarefas() {
  const { estado, unidade, membro } = useDados();
  const { editar } = usePermissao("tarefas");
  const acao = useAcao();
  const { confirmar } = useUi();
  const nomes = useNomes();
  const u = unidade!.id;
  const [soMinhas, setSoMinhas] = useState(false);
  const [projeto, setProjeto] = useState("");
  const [abertaT, setAbertaT] = useState(false);
  const [abertaC, setAbertaC] = useState(false);
  const [comentario, setComentario] = useState("");
  const ft = useFormulario<FormT>({ projetoId: "", titulo: "", responsavelId: "", prazo: "", prioridade: "media", status: "a_fazer" });
  const fc = useFormulario<FormC>({ titulo: "", tipo: "reuniao", inicio: "", local: "", observacoes: "" });

  const projetos = estado.projetos.filter((p) => p.unidadeId === u);
  const equipe = estado.membros.filter((m) => m.ativo && (m.papel === "admin" || m.unidades.includes(u)));
  const tarefas = useMemo(() => estado.tarefas
    .filter((t) => t.unidadeId === u && (!soMinhas || t.responsavelId === membro?.id) && (!projeto || t.projetoId === projeto))
    .sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999")), [estado.tarefas, u, soMinhas, projeto, membro]);
  const agora = new Date().toISOString();
  const compromissos = estado.compromissos.filter((c) => c.unidadeId === u && c.inicio >= agora.slice(0, 10)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const tarefaAberta = ft.dados.id ? estado.tarefas.find((t) => t.id === ft.dados.id) : undefined;
  const hoje = hojeISO();

  function abrirT(t?: Tarefa) {
    ft.reiniciar(t ? { id: t.id, projetoId: t.projetoId, titulo: t.titulo, responsavelId: t.responsavelId, prazo: t.prazo, prioridade: t.prioridade, status: t.status }
      : { projetoId: projeto, titulo: "", responsavelId: membro?.id ?? "", prazo: "", prioridade: "media", status: "a_fazer" });
    setComentario("");
    setAbertaT(true);
  }
  function salvarT(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "tarefa.salvar", dados: { ...ft.dados, unidadeId: u } }, { sucesso: "Tarefa salva.", setErros: ft.setErros })) setAbertaT(false);
  }
  function moverT(t: Tarefa, status: StatusTarefa) {
    acao({ tipo: "tarefa.salvar", dados: { ...t, status } });
  }
  async function excluirT() {
    if (!ft.dados.id) return;
    if (await confirmar({ titulo: "Excluir tarefa", texto: "A tarefa e seus comentários serão apagados.", rotulo: "Excluir", perigo: true })) {
      if (acao({ tipo: "tarefa.excluir", id: ft.dados.id }, { sucesso: "Tarefa excluída." })) setAbertaT(false);
    }
  }
  function comentar() {
    if (ft.dados.id && acao({ tipo: "tarefa.comentar", id: ft.dados.id, texto: comentario })) setComentario("");
  }
  function abrirC(c?: Compromisso) {
    fc.reiniciar(c ? { ...c } : { titulo: "", tipo: "reuniao", inicio: "", local: "", observacoes: "" });
    setAbertaC(true);
  }
  function salvarC(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "compromisso.salvar", dados: { ...fc.dados, unidadeId: u } }, { sucesso: "Compromisso salvo.", setErros: fc.setErros })) setAbertaC(false);
  }
  async function excluirC() {
    if (fc.dados.id && await confirmar({ titulo: "Excluir compromisso", texto: `Excluir "${fc.dados.titulo}"?`, rotulo: "Excluir", perigo: true })) {
      if (acao({ tipo: "compromisso.excluir", id: fc.dados.id }, { sucesso: "Compromisso excluído." })) setAbertaC(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Tarefas e calendário" descricao="O que precisa ser feito, por quem e até quando — e os compromissos da unidade (reuniões, oficinas, rotinas)."
        acoes={editar && <><Botao onClick={() => abrirT()}><Plus size={16} /> Tarefa</Botao><Botao variante="secundario" onClick={() => abrirC()}><Plus size={16} /> Compromisso</Botao></>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label="Filtrar por projeto" value={projeto} onChange={(e) => setProjeto(e.target.value)} className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm">
          <option value="">Todos os projetos</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-marca" checked={soMinhas} onChange={(e) => setSoMinhas(e.target.checked)} /> Só as minhas</label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(STATUS) as StatusTarefa[]).map((s) => {
          const lista = tarefas.filter((t) => t.status === s);
          return (
            <section key={s}>
              <h2 className="mb-2 text-sm font-medium text-suave">{STATUS[s]} ({lista.length})</h2>
              {lista.length === 0 ? <p className="rounded-xl border border-dashed border-borda px-3 py-6 text-center text-xs text-suave">Vazio</p> : (
                <ul className="grid gap-2">
                  {lista.map((t) => {
                    const atrasada = t.prazo && t.prazo < hoje && t.status !== "feito";
                    return (
                      <li key={t.id} className="rounded-xl border border-borda bg-superficie p-3 text-sm">
                        <button type="button" className="w-full text-left" onClick={() => abrirT(t)}>
                          <p className={`font-medium ${t.status === "feito" ? "text-suave line-through" : ""}`}>{t.titulo}</p>
                          <p className="mt-1 text-xs text-suave">{nomes.membro(t.responsavelId)}{t.prazo && ` · até ${data(t.prazo)}`}{t.comentarios.length > 0 && ` · ${t.comentarios.length} coment.`}</p>
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <Etiqueta tom={PRIORIDADE[t.prioridade].tom}>{PRIORIDADE[t.prioridade].texto}</Etiqueta>
                          {atrasada && <Etiqueta tom="perigo">atrasada</Etiqueta>}
                          {editar && (Object.keys(STATUS) as StatusTarefa[]).filter((x) => x !== t.status).map((x) => (
                            <button key={x} type="button" onClick={() => moverT(t, x)} className="ml-auto rounded px-1.5 py-0.5 text-xs text-marca hover:bg-marca-clara first-of-type:ml-auto">→ {STATUS[x]}</button>
                          ))}
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

      <section className="mt-8">
        <h2 className="mb-2 font-titulo text-2xl text-marca-forte">Próximos compromissos</h2>
        {compromissos.length === 0 ? <Vazio titulo="Nenhum compromisso marcado" /> : (
          <ul className="grid gap-2">
            {compromissos.map((c) => (
              <li key={c.id}>
                <button type="button" disabled={!editar} onClick={() => abrirC(c)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-left text-sm enabled:hover:border-marca">
                  <span><strong>{dataHora(c.inicio)}</strong> · {c.titulo}{c.local && <span className="text-suave"> · {c.local}</span>}</span>
                  <Etiqueta tom="marca">{TIPO_COMP[c.tipo]}</Etiqueta>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal aberto={abertaT} titulo={ft.dados.id ? "Tarefa" : "Nova tarefa"} onFechar={() => setAbertaT(false)}>
        <form onSubmit={salvarT} noValidate className="grid gap-3">
          <Campo rotulo="Título" obrigatorio value={ft.dados.titulo} onChange={(e) => ft.campo("titulo")(e.target.value)} erro={ft.erros.titulo} disabled={!editar} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao rotulo="Responsável" vazio="Sem responsável" value={ft.dados.responsavelId} onChange={(e) => ft.campo("responsavelId")(e.target.value)} opcoes={equipe.map((m) => ({ valor: m.id, texto: m.nome }))} disabled={!editar} />
            <Campo rotulo="Prazo" type="date" value={ft.dados.prazo} onChange={(e) => ft.campo("prazo")(e.target.value)} erro={ft.erros.prazo} disabled={!editar} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Selecao rotulo="Prioridade" value={ft.dados.prioridade} onChange={(e) => ft.campo("prioridade")(e.target.value as Prioridade)} opcoes={Object.entries(PRIORIDADE).map(([valor, v]) => ({ valor, texto: v.texto }))} disabled={!editar} />
            <Selecao rotulo="Status" value={ft.dados.status} onChange={(e) => ft.campo("status")(e.target.value as StatusTarefa)} opcoes={Object.entries(STATUS).map(([valor, texto]) => ({ valor, texto }))} disabled={!editar} />
            <Selecao rotulo="Projeto" vazio="Nenhum" value={ft.dados.projetoId} onChange={(e) => ft.campo("projetoId")(e.target.value)} opcoes={projetos.map((p) => ({ valor: p.id, texto: p.nome }))} disabled={!editar} />
          </div>
          {tarefaAberta && (
            <section className="rounded-lg bg-fundo p-3 text-sm">
              <h3 className="mb-2 font-medium">Comentários</h3>
              <ul className="mb-2 space-y-2">
                {tarefaAberta.comentarios.map((c, i) => <li key={i}><span className="text-xs text-suave">{nomes.membro(c.autorId)} · {dataHora(c.data)}</span><br />{c.texto}</li>)}
                {tarefaAberta.comentarios.length === 0 && <li className="text-suave">Nenhum comentário.</li>}
              </ul>
              {editar && (
                <div className="flex gap-2">
                  <input aria-label="Novo comentário" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escreva um comentário" className="flex-1 rounded-lg border border-borda bg-superficie px-3 py-2" />
                  <Botao variante="secundario" onClick={comentar} disabled={!comentario.trim()}>Enviar</Botao>
                </div>
              )}
            </section>
          )}
          {editar ? (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {ft.dados.id && <Botao variante="fantasma" className="mr-auto text-perigo" onClick={excluirT}>Excluir</Botao>}
              <Botao variante="secundario" onClick={() => setAbertaT(false)}>Cancelar</Botao>
              <Botao type="submit">Salvar</Botao>
            </div>
          ) : <div className="flex justify-end"><Botao variante="secundario" onClick={() => setAbertaT(false)}>Fechar</Botao></div>}
        </form>
      </Modal>

      <Modal aberto={abertaC} titulo={fc.dados.id ? "Editar compromisso" : "Novo compromisso"} onFechar={() => setAbertaC(false)}>
        <form onSubmit={salvarC} noValidate className="grid gap-3">
          <Campo rotulo="Título" obrigatorio value={fc.dados.titulo} onChange={(e) => fc.campo("titulo")(e.target.value)} erro={fc.erros.titulo} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao rotulo="Tipo" value={fc.dados.tipo} onChange={(e) => fc.campo("tipo")(e.target.value as Compromisso["tipo"])} opcoes={Object.entries(TIPO_COMP).map(([valor, texto]) => ({ valor, texto }))} />
            <Campo rotulo="Data e hora" type="datetime-local" obrigatorio value={paraCampoDataHora(fc.dados.inicio)} onChange={(e) => fc.campo("inicio")(deCampoDataHora(e.target.value))} erro={fc.erros.inicio} />
          </div>
          <Campo rotulo="Local" value={fc.dados.local} onChange={(e) => fc.campo("local")(e.target.value)} />
          <AreaTexto rotulo="Observações / pauta" value={fc.dados.observacoes} onChange={(e) => fc.campo("observacoes")(e.target.value)} />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {fc.dados.id && <Botao variante="fantasma" className="mr-auto text-perigo" onClick={excluirC}>Excluir</Botao>}
            <Botao variante="secundario" onClick={() => setAbertaC(false)}>Cancelar</Botao>
            <Botao type="submit">Salvar</Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}

