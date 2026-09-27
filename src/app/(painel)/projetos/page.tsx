"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { data } from "@/lib/formato";
import type { Projeto, StatusProjeto } from "@/lib/tipos";
import { AreaTexto, Botao, Cabecalho, Cartao, Campo, Etiqueta, Modal, RodapeForm, Selecao, Vazio, useFormulario, type Tom } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const STATUS: Record<StatusProjeto, { texto: string; tom: Tom }> = {
  ideia: { texto: "Ideia", tom: "neutro" },
  planejamento: { texto: "Planejamento", tom: "alerta" },
  em_andamento: { texto: "Em andamento", tom: "marca" },
  pausado: { texto: "Pausado", tom: "neutro" },
  concluido: { texto: "Concluído", tom: "folha" },
};

type Form = Omit<Projeto, "id" | "unidadeId" | "decisoes"> & { id?: string };

export default function Projetos() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("projetos");
  const verTarefas = usePermissao("tarefas").ler;
  const acao = useAcao();
  const nomes = useNomes();
  const u = unidade!.id;
  const [aberto, setAberto] = useState(false);
  const [decisao, setDecisao] = useState<Record<string, string>>({});
  const f = useFormulario<Form>({ nome: "", objetivo: "", responsavelId: "", status: "ideia", proximosPassos: "" });

  const projetos = estado.projetos.filter((p) => p.unidadeId === u);
  const equipe = estado.membros.filter((m) => m.ativo && (m.papel === "admin" || m.unidades.includes(u)));

  function abrir(p?: Projeto) {
    f.reiniciar(p ? { id: p.id, nome: p.nome, objetivo: p.objetivo, responsavelId: p.responsavelId, status: p.status, proximosPassos: p.proximosPassos }
      : { nome: "", objetivo: "", responsavelId: "", status: "ideia", proximosPassos: "" });
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "projeto.salvar", dados: { ...f.dados, unidadeId: u } }, { sucesso: "Projeto salvo.", setErros: f.setErros })) setAberto(false);
  }
  function registrar(p: Projeto) {
    if (acao({ tipo: "projeto.decisao", id: p.id, texto: decisao[p.id] ?? "" }, { sucesso: "Decisão registrada." })) setDecisao({ ...decisao, [p.id]: "" });
  }

  return (
    <>
      <Cabecalho titulo="Projetos" descricao={<>Frentes e planos de <strong>{unidade!.nome}</strong>. Troque a unidade no topo para ver as outras vertentes do ecossistema.</>}
        acoes={editar && <Botao onClick={() => abrir()}><Plus size={16} /> Novo projeto</Botao>} />

      {projetos.length === 0 ? <Vazio titulo="Nenhum projeto nesta unidade" /> : (
        <div className="grid gap-4">
          {projetos.map((p) => {
            const tarefas = estado.tarefas.filter((t) => t.projetoId === p.id);
            const feitas = tarefas.filter((t) => t.status === "feito").length;
            return (
              <Cartao key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-titulo text-2xl text-marca-forte">{p.nome}</h2>
                    <p className="text-sm text-suave">Responsável: {nomes.membro(p.responsavelId)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Etiqueta tom={STATUS[p.status].tom}>{STATUS[p.status].texto}</Etiqueta>
                    {editar && <Botao variante="fantasma" className="min-h-8 px-2" onClick={() => abrir(p)}>Editar</Botao>}
                  </div>
                </div>
                <p className="mt-3 text-sm"><strong>Objetivo:</strong> {p.objetivo || "—"}</p>
                <p className="mt-1 text-sm"><strong>Próximos passos:</strong> {p.proximosPassos || "—"}</p>
                <p className="mt-1 text-sm">
                  <strong>Tarefas:</strong> {feitas}/{tarefas.length} concluídas
                  {verTarefas && tarefas.length > 0 && <> · <Link href="/tarefas" className="text-marca underline">ver tarefas</Link></>}
                </p>
                <section className="mt-4 border-t border-borda pt-3">
                  <h3 className="mb-2 text-sm font-medium">Registro de decisões</h3>
                  {editar && (
                    <div className="mb-2 flex gap-2">
                      <input aria-label={`Nova decisão em ${p.nome}`} value={decisao[p.id] ?? ""} onChange={(e) => setDecisao({ ...decisao, [p.id]: e.target.value })} placeholder="O que foi decidido?" className="flex-1 rounded-lg border border-borda bg-superficie px-3 py-2 text-sm" />
                      <Botao variante="secundario" onClick={() => registrar(p)} disabled={!(decisao[p.id] ?? "").trim()}>Registrar</Botao>
                    </div>
                  )}
                  {p.decisoes.length === 0 ? <p className="text-sm text-suave">Nenhuma decisão registrada.</p> : (
                    <ul className="space-y-1 text-sm">{p.decisoes.map((d, i) => <li key={i}><span className="text-xs text-suave">{data(d.data)} · {nomes.membro(d.autorId)}</span> — {d.texto}</li>)}</ul>
                  )}
                </section>
              </Cartao>
            );
          })}
        </div>
      )}

      <Modal aberto={aberto} titulo={f.dados.id ? "Editar projeto" : "Novo projeto"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={f.dados.nome} onChange={(e) => f.campo("nome")(e.target.value)} erro={f.erros.nome} />
          <AreaTexto rotulo="Objetivo" value={f.dados.objetivo} onChange={(e) => f.campo("objetivo")(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao rotulo="Responsável" vazio="A definir" value={f.dados.responsavelId} onChange={(e) => f.campo("responsavelId")(e.target.value)} opcoes={equipe.map((m) => ({ valor: m.id, texto: m.nome }))} />
            <Selecao rotulo="Status" value={f.dados.status} onChange={(e) => f.campo("status")(e.target.value as StatusProjeto)} opcoes={Object.entries(STATUS).map(([valor, v]) => ({ valor, texto: v.texto }))} />
          </div>
          <AreaTexto rotulo="Próximos passos" value={f.dados.proximosPassos} onChange={(e) => f.campo("proximosPassos")(e.target.value)} />
          <RodapeForm onCancelar={() => setAberto(false)} />
        </form>
      </Modal>
    </>
  );
}
