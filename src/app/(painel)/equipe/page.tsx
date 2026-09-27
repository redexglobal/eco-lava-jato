"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { PAPEIS, pode } from "@/lib/regras";
import type { Membro, Modulo, Papel } from "@/lib/tipos";
import { Aviso, Botao, Cabecalho, Campo, Cartao, Etiqueta, Marcar, Modal, RodapeForm, Selecao, useFormulario } from "@/componentes/ui";
import { useAcao, usePermissao } from "@/componentes/hooks";
import { NAV } from "@/componentes/navegacao";

type Form = Omit<Membro, "id"> & { id?: string };

function Ramo({ membro, todos, nivel }: { membro: Membro; todos: Membro[]; nivel: number }) {
  const filhos = todos.filter((m) => m.reportaA === membro.id);
  return (
    <li>
      <div className="inline-flex flex-col rounded-lg border border-borda bg-superficie px-3 py-2 text-sm">
        <span className="font-medium">{membro.nome}</span>
        <span className="text-xs text-suave">{membro.funcao || PAPEIS[membro.papel].nome}</span>
      </div>
      {filhos.length > 0 && nivel < 8 && (
        <ul className="ml-4 mt-2 space-y-2 border-l-2 border-folha/40 pl-4">
          {filhos.map((f) => <Ramo key={f.id} membro={f} todos={todos} nivel={nivel + 1} />)}
        </ul>
      )}
    </li>
  );
}

export default function Equipe() {
  const { estado, membro: eu } = useDados();
  const { editar } = usePermissao("equipe");
  const acao = useAcao();
  const [aberto, setAberto] = useState(false);
  const f = useFormulario<Form>({ nome: "", papel: "operacao", funcao: "", unidades: [], ativo: true, reportaA: "" });

  const ativos = estado.membros.filter((m) => m.ativo);
  const ids = new Set(ativos.map((m) => m.id));
  const raizes = ativos.filter((m) => !m.reportaA || !ids.has(m.reportaA));
  const modulos = NAV.filter((n) => n.modulo).map((n) => ({ modulo: n.modulo as Modulo, rotulo: n.rotulo }));

  function abrir(m?: Membro) {
    f.reiniciar(m ? { ...m, reportaA: m.reportaA ?? "" } : { nome: "", papel: "operacao", funcao: "", unidades: [], ativo: true, reportaA: "" });
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "membro.salvar", dados: { ...f.dados, reportaA: f.dados.reportaA || undefined } }, { sucesso: "Pessoa salva.", setErros: f.setErros })) setAberto(false);
  }
  const alternarUnidade = (id: string) => f.campo("unidades")(f.dados.unidades.includes(id) ? f.dados.unidades.filter((x) => x !== id) : [...f.dados.unidades, id]);

  return (
    <>
      <Cabecalho titulo="Equipe" descricao="Pessoas, papéis de acesso e organograma. Papéis e cargos são sugestões iniciais — os oficiais ainda serão definidos pelos sócios."
        acoes={editar && <Botao onClick={() => abrir()}><Plus size={16} /> Nova pessoa</Botao>} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-medium">Pessoas</h2>
          <ul className="grid gap-2">
            {estado.membros.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{m.nome}</span>{m.id === eu?.id && <span className="text-suave"> (você)</span>}
                  <span className="block text-xs text-suave">{m.funcao} · {m.papel === "admin" ? "todas as unidades" : m.unidades.map((id) => estado.unidades.find((u) => u.id === id)?.nome).filter(Boolean).join(", ")}</span>
                </span>
                <span className="flex items-center gap-2">
                  {!m.ativo && <Etiqueta>inativo</Etiqueta>}
                  <Etiqueta tom="marca">{PAPEIS[m.papel].nome}</Etiqueta>
                  {editar && <Botao variante="fantasma" className="min-h-8 px-2" onClick={() => abrir(m)}>Editar</Botao>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 font-medium">Organograma</h2>
          <Cartao><ul className="space-y-2">{raizes.map((r) => <Ramo key={r.id} membro={r} todos={ativos} nivel={0} />)}</ul></Cartao>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 font-medium">O que cada papel pode fazer</h2>
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-fundo text-left text-suave"><tr><th className="px-3 py-2">Papel</th>{modulos.map((m) => <th key={m.modulo} className="px-2 py-2">{m.rotulo}</th>)}</tr></thead>
            <tbody className="divide-y divide-borda">
              {(Object.keys(PAPEIS) as Papel[]).map((p) => (
                <tr key={p}>
                  <th className="px-3 py-2 text-left font-medium">{PAPEIS[p].nome}</th>
                  {modulos.map((m) => (
                    <td key={m.modulo} className="px-2 py-2">{pode(p, m.modulo, "editar") ? <Etiqueta tom="folha">edita</Etiqueta> : pode(p, m.modulo, "ler") ? <Etiqueta tom="marca">vê</Etiqueta> : <span className="text-suave">—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal aberto={aberto} titulo={f.dados.id ? "Editar pessoa" : "Nova pessoa"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Aviso tom="neutro">No modo demonstração não há senha: o acesso é escolhido na tela de entrada. Com o login real, cada pessoa terá conta própria.</Aviso>
          <Campo rotulo="Nome" obrigatorio value={f.dados.nome} onChange={(e) => f.campo("nome")(e.target.value)} erro={f.erros.nome} />
          <Campo rotulo="Função / cargo" value={f.dados.funcao} onChange={(e) => f.campo("funcao")(e.target.value)} ajuda="Texto livre; não define permissão." />
          <Selecao rotulo="Papel de acesso" value={f.dados.papel} onChange={(e) => f.campo("papel")(e.target.value as Papel)} opcoes={(Object.keys(PAPEIS) as Papel[]).map((p) => ({ valor: p, texto: PAPEIS[p].nome }))} ajuda={PAPEIS[f.dados.papel].descricao} />
          <fieldset className="grid gap-2 rounded-lg border border-borda p-3">
            <legend className="px-1 text-sm font-medium">Unidades que acessa</legend>
            {f.dados.papel === "admin" ? <p className="text-xs text-suave">Admin acessa todas.</p> : estado.unidades.map((u) => (
              <Marcar key={u.id} rotulo={u.nome} checked={f.dados.unidades.includes(u.id)} onChange={() => alternarUnidade(u.id)} />
            ))}
            {f.erros.unidades && <p className="text-xs text-perigo" role="alert">{f.erros.unidades}</p>}
          </fieldset>
          <Selecao rotulo="Reporta-se a" vazio="Ninguém (topo)" value={f.dados.reportaA ?? ""} onChange={(e) => f.campo("reportaA")(e.target.value)} erro={f.erros.reportaA}
            opcoes={estado.membros.filter((m) => m.id !== f.dados.id && m.ativo).map((m) => ({ valor: m.id, texto: m.nome }))} />
          <Marcar rotulo="Ativo" ajuda="Inativos não conseguem entrar." checked={f.dados.ativo} onChange={(e) => f.campo("ativo")(e.target.checked)} />
          <RodapeForm onCancelar={() => setAberto(false)} />
        </form>
      </Modal>
    </>
  );
}
