"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { centavosParaCampo, formatarReais, reaisParaCentavos } from "@/lib/regras";
import type { ModeloChecklist, Servico } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Cartao, Etiqueta, Marcar, Modal, RodapeForm, Selecao, Vazio, useFormulario, useUi } from "@/componentes/ui";
import { useAcao, usePermissao } from "@/componentes/hooks";

type FormServico = { id?: string; nome: string; descricao: string; duracaoMin: number; preco: string; checklist: string; ativo: boolean };
type FormChecklist = { id?: string; nome: string; tipo: ModeloChecklist["tipo"]; itens: string };

const TIPOS_CHECKLIST: Record<ModeloChecklist["tipo"], string> = { abertura: "Abertura", fechamento: "Fechamento", servico: "Execução de serviço" };

export default function Servicos() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("servicos");
  const editarChecklist = usePermissao("operacao").editar;
  const acao = useAcao();
  const { confirmar } = useUi();
  const u = unidade!.id;
  const [aberto, setAberto] = useState(false);
  const [abertoCk, setAbertoCk] = useState(false);
  const fs = useFormulario<FormServico>({ nome: "", descricao: "", duracaoMin: 60, preco: "", checklist: "", ativo: true });
  const fc = useFormulario<FormChecklist>({ nome: "", tipo: "abertura", itens: "" });

  const servicos = estado.servicos.filter((s) => s.unidadeId === u);
  const checklists = estado.checklists.filter((c) => c.unidadeId === u);

  function abrir(s?: Servico) {
    fs.reiniciar(s ? { id: s.id, nome: s.nome, descricao: s.descricao, duracaoMin: s.duracaoMin, preco: centavosParaCampo(s.preco), checklist: s.checklist.join("\n"), ativo: s.ativo }
      : { nome: "", descricao: "", duracaoMin: 60, preco: "", checklist: "", ativo: true });
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const d = fs.dados;
    const preco = d.preco.trim() ? reaisParaCentavos(d.preco) : null;
    if (d.preco.trim() && preco === null) return fs.setErros({ preco: "Use o formato 50,00." });
    const id = acao({ tipo: "servico.salvar", dados: { id: d.id, unidadeId: u, nome: d.nome, descricao: d.descricao, duracaoMin: d.duracaoMin, preco, checklist: d.checklist.split("\n"), ativo: d.ativo } }, { sucesso: "Serviço salvo.", setErros: fs.setErros });
    if (id) setAberto(false);
  }
  function abrirCk(c?: ModeloChecklist) {
    fc.reiniciar(c ? { id: c.id, nome: c.nome, tipo: c.tipo, itens: c.itens.join("\n") } : { nome: "", tipo: "abertura", itens: "" });
    setAbertoCk(true);
  }
  function salvarCk(ev: React.FormEvent) {
    ev.preventDefault();
    const d = fc.dados;
    if (acao({ tipo: "checklist.salvar", dados: { id: d.id, unidadeId: u, nome: d.nome, tipo: d.tipo, itens: d.itens.split("\n") } }, { sucesso: "Checklist salvo.", setErros: fc.setErros })) setAbertoCk(false);
  }
  async function excluirCk(c: ModeloChecklist) {
    if (await confirmar({ titulo: "Excluir checklist", texto: `Excluir "${c.nome}"?`, rotulo: "Excluir", perigo: true })) acao({ tipo: "checklist.excluir", id: c.id }, { sucesso: "Checklist excluído." });
  }

  return (
    <>
      <Cabecalho titulo="Serviços" descricao="Catálogo, duração e checklist de cada serviço. Preços começam como “não definido” até serem aprovados pelos responsáveis."
        acoes={editar && <Botao onClick={() => abrir()}><Plus size={16} /> Novo serviço</Botao>} />

      {servicos.length === 0 ? <Vazio titulo="Nenhum serviço nesta unidade" /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {servicos.map((s) => (
            <li key={s.id}>
              <Cartao className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{s.nome}</h2>
                  {s.ativo ? <Etiqueta tom="folha">ativo</Etiqueta> : <Etiqueta>inativo</Etiqueta>}
                </div>
                <p className="mt-1 text-sm text-suave">{s.descricao}</p>
                <p className="mt-2 text-sm">{s.duracaoMin} min · <span className={s.preco === null ? "text-alerta" : ""}>{formatarReais(s.preco)}</span> · {s.checklist.length} itens no checklist</p>
                {editar && <Botao variante="fantasma" className="mt-2 -ml-2" onClick={() => abrir(s)}>Editar</Botao>}
              </Cartao>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-titulo text-2xl text-marca-forte">Checklists da rotina</h2>
          {editarChecklist && <Botao variante="secundario" onClick={() => abrirCk()}><Plus size={16} /> Novo checklist</Botao>}
        </div>
        <Aviso tom="neutro">Rascunhos editáveis pela equipe. Não são procedimentos de segurança aprovados.</Aviso>
        {checklists.length === 0 ? <div className="mt-3"><Vazio titulo="Nenhum checklist" /></div> : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {checklists.map((c) => (
              <li key={c.id}>
                <Cartao>
                  <div className="flex items-center justify-between"><h3 className="font-medium">{c.nome}</h3><Etiqueta tom="marca">{TIPOS_CHECKLIST[c.tipo]}</Etiqueta></div>
                  <ul className="mt-2 list-inside list-disc text-sm text-texto/80">{c.itens.map((i, k) => <li key={k}>{i}</li>)}</ul>
                  {editarChecklist && (
                    <div className="mt-2 flex gap-2">
                      <Botao variante="fantasma" className="-ml-2" onClick={() => abrirCk(c)}>Editar</Botao>
                      <Botao variante="fantasma" className="text-perigo" onClick={() => excluirCk(c)}>Excluir</Botao>
                    </div>
                  )}
                </Cartao>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal aberto={aberto} titulo={fs.dados.id ? "Editar serviço" : "Novo serviço"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={fs.dados.nome} onChange={(e) => fs.campo("nome")(e.target.value)} erro={fs.erros.nome} />
          <AreaTexto rotulo="Descrição" value={fs.dados.descricao} onChange={(e) => fs.campo("descricao")(e.target.value)} ajuda="Evite alegações ambientais sem comprovação (ex.: “100% ecológico”)." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Duração (min)" type="number" min={5} step={5} value={fs.dados.duracaoMin} onChange={(e) => fs.campo("duracaoMin")(Number(e.target.value))} erro={fs.erros.duracaoMin} />
            <Campo rotulo="Preço (R$)" inputMode="decimal" placeholder="Não definido" value={fs.dados.preco} onChange={(e) => fs.campo("preco")(e.target.value)} erro={fs.erros.preco} ajuda="Deixe vazio até ser aprovado." />
          </div>
          <AreaTexto rotulo="Checklist (um item por linha)" rows={5} value={fs.dados.checklist} onChange={(e) => fs.campo("checklist")(e.target.value)} />
          <Marcar rotulo="Serviço ativo (aparece na agenda)" checked={fs.dados.ativo} onChange={(e) => fs.campo("ativo")(e.target.checked)} />
          <RodapeForm onCancelar={() => setAberto(false)} />
        </form>
      </Modal>

      <Modal aberto={abertoCk} titulo={fc.dados.id ? "Editar checklist" : "Novo checklist"} onFechar={() => setAbertoCk(false)}>
        <form onSubmit={salvarCk} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={fc.dados.nome} onChange={(e) => fc.campo("nome")(e.target.value)} erro={fc.erros.nome} />
          <Selecao rotulo="Tipo" value={fc.dados.tipo} onChange={(e) => fc.campo("tipo")(e.target.value as ModeloChecklist["tipo"])} opcoes={Object.entries(TIPOS_CHECKLIST).map(([valor, texto]) => ({ valor, texto }))} />
          <AreaTexto rotulo="Itens (um por linha)" rows={6} value={fc.dados.itens} onChange={(e) => fc.campo("itens")(e.target.value)} erro={fc.erros.itens} />
          <RodapeForm onCancelar={() => setAbertoCk(false)} />
        </form>
      </Modal>
    </>
  );
}
