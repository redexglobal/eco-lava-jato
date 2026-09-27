"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { alertasEstoque } from "@/lib/regras";
import { data, dataHora } from "@/lib/formato";
import type { ItemEstoque, TipoMovimento } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Etiqueta, Filtro, Marcar, Modal, RodapeForm, Selecao, Vazio, useFormulario } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

type Form = Omit<ItemEstoque, "id" | "unidadeId"> & { id?: string };
const vazio: Form = { nome: "", categoria: "", medida: "un", quantidade: 0, minimo: 0, fornecedor: "", lote: "", validade: "", ativo: true, observacoes: "" };
const MOV: Record<TipoMovimento, string> = { entrada: "Entrada", saida: "Saída", ajuste: "Ajuste (contagem)" };

export default function Estoque() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("estoque");
  const acao = useAcao();
  const nomes = useNomes();
  const u = unidade!.id;
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [movItem, setMovItem] = useState<ItemEstoque | null>(null);
  const [mov, setMov] = useState<{ tipo: TipoMovimento; quantidade: string; motivo: string }>({ tipo: "saida", quantidade: "", motivo: "" });
  const [errosMov, setErrosMov] = useState<Record<string, string>>({});
  const f = useFormulario<Form>(vazio);

  const itens = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return estado.itens.filter((i) => i.unidadeId === u && (!q || (i.nome + i.categoria + i.fornecedor).toLowerCase().includes(q))).sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
  }, [estado.itens, u, busca]);
  const alertas = alertasEstoque(itens);
  const idsItens = new Set(itens.map((i) => i.id));
  const movimentos = estado.movimentos.filter((m) => idsItens.has(m.itemId)).slice(0, 15);

  function abrir(i?: ItemEstoque) {
    f.reiniciar(i ? { ...i } : vazio);
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "item.salvar", dados: { ...f.dados, unidadeId: u } }, { sucesso: "Item salvo.", setErros: f.setErros })) setAberto(false);
  }
  function movimentar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!movItem) return;
    const q = Number(mov.quantidade.replace(",", "."));
    if (!mov.quantidade.trim() || !Number.isFinite(q)) return setErrosMov({ quantidade: "Informe um número." });
    if (acao({ tipo: "item.movimento", itemId: movItem.id, mov: mov.tipo, quantidade: q, motivo: mov.motivo }, { sucesso: "Movimentação registrada.", setErros: setErrosMov })) setMovItem(null);
  }

  return (
    <>
      <Cabecalho titulo="Estoque" descricao="Produtos e materiais. A quantidade só muda por movimentação registrada, para ficar rastreável."
        acoes={editar && <Botao onClick={() => abrir()}><Plus size={16} /> Novo item</Botao>} />
      <div className="mb-4 grid gap-3">
        <Aviso tom="neutro">Nomes como “biodegradável” ou “natural” devem refletir a ficha técnica do fornecedor. O sistema não verifica nem certifica alegações ambientais.</Aviso>
        {alertas.length > 0 && (
          <Aviso titulo={`${alertas.length} alerta(s)`}>
            <ul>{alertas.map((a, i) => <li key={i}>{a.texto}</li>)}</ul>
          </Aviso>
        )}
        <Filtro valor={busca} onChange={setBusca} rotulo="Buscar item, categoria ou fornecedor" />
      </div>

      {itens.length === 0 ? <Vazio titulo={busca ? "Nenhum item encontrado" : "Nenhum item cadastrado"} /> : (
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-fundo text-left text-xs text-suave">
              <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Quantidade</th><th className="px-3 py-2">Mínimo</th><th className="px-3 py-2">Validade</th><th className="px-3 py-2"><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {itens.map((i) => {
                const baixo = i.ativo && i.quantidade <= i.minimo;
                return (
                  <tr key={i.id} className={i.ativo ? "" : "opacity-60"}>
                    <td className="px-3 py-2"><p className="font-medium">{i.nome}</p><p className="text-xs text-suave">{i.categoria}{i.fornecedor && ` · ${i.fornecedor}`}{!i.ativo && " · inativo"}</p></td>
                    <td className="px-3 py-2">{i.quantidade} {i.medida} {baixo && <Etiqueta tom="alerta">baixo</Etiqueta>}</td>
                    <td className="px-3 py-2">{i.minimo} {i.medida}</td>
                    <td className="px-3 py-2">{i.validade ? data(i.validade) : "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {editar && i.ativo && <Botao variante="secundario" className="min-h-8 px-2 text-xs" onClick={() => { setMov({ tipo: "saida", quantidade: "", motivo: "" }); setErrosMov({}); setMovItem(i); }}>Movimentar</Botao>}
                      {editar && <Botao variante="fantasma" className="min-h-8 px-2 text-xs" onClick={() => abrir(i)}>Editar</Botao>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-medium">Últimas movimentações</h2>
        {movimentos.length === 0 ? <p className="text-sm text-suave">Nenhuma movimentação.</p> : (
          <ul className="space-y-1 text-sm">
            {movimentos.map((m) => {
              const it = estado.itens.find((i) => i.id === m.itemId);
              return <li key={m.id}><span className="text-suave">{dataHora(m.data)}</span> · {MOV[m.tipo]} de {m.quantidade} {it?.medida} — {it?.nome} {m.motivo && `(${m.motivo})`} · {nomes.membro(m.autorId)}</li>;
            })}
          </ul>
        )}
      </section>

      <Modal aberto={aberto} titulo={f.dados.id ? "Editar item" : "Novo item"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={f.dados.nome} onChange={(e) => f.campo("nome")(e.target.value)} erro={f.erros.nome} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Categoria" value={f.dados.categoria} onChange={(e) => f.campo("categoria")(e.target.value)} placeholder="Produto de limpeza, material…" />
            <Campo rotulo="Unidade de medida" obrigatorio value={f.dados.medida} onChange={(e) => f.campo("medida")(e.target.value)} erro={f.erros.medida} placeholder="L, kg, un" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!f.dados.id && <Campo rotulo="Quantidade inicial" type="number" min={0} step="any" value={f.dados.quantidade} onChange={(e) => f.campo("quantidade")(Number(e.target.value))} erro={f.erros.quantidade} />}
            <Campo rotulo="Estoque mínimo" type="number" min={0} step="any" value={f.dados.minimo} onChange={(e) => f.campo("minimo")(Number(e.target.value))} erro={f.erros.minimo} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Fornecedor" value={f.dados.fornecedor} onChange={(e) => f.campo("fornecedor")(e.target.value)} />
            <Campo rotulo="Lote" value={f.dados.lote} onChange={(e) => f.campo("lote")(e.target.value)} />
            <Campo rotulo="Validade" type="date" value={f.dados.validade} onChange={(e) => f.campo("validade")(e.target.value)} erro={f.erros.validade} />
          </div>
          <AreaTexto rotulo="Observações" value={f.dados.observacoes} onChange={(e) => f.campo("observacoes")(e.target.value)} />
          <Marcar rotulo="Item ativo" checked={f.dados.ativo} onChange={(e) => f.campo("ativo")(e.target.checked)} />
          <RodapeForm onCancelar={() => setAberto(false)} />
        </form>
      </Modal>

      <Modal aberto={!!movItem} titulo={`Movimentar: ${movItem?.nome ?? ""}`} onFechar={() => setMovItem(null)}>
        <form onSubmit={movimentar} noValidate className="grid gap-3">
          <p className="text-sm text-suave">Saldo atual: <strong className="text-texto">{movItem?.quantidade} {movItem?.medida}</strong></p>
          <Selecao rotulo="Tipo" value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value as TipoMovimento })} opcoes={Object.entries(MOV).map(([valor, texto]) => ({ valor, texto }))} />
          <Campo rotulo={mov.tipo === "ajuste" ? "Nova quantidade (contada)" : "Quantidade"} inputMode="decimal" obrigatorio value={mov.quantidade} onChange={(e) => setMov({ ...mov, quantidade: e.target.value })} erro={errosMov.quantidade} />
          <Campo rotulo="Motivo" obrigatorio={mov.tipo === "ajuste"} value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} erro={errosMov.motivo} placeholder="Compra, uso do dia, contagem…" />
          <RodapeForm onCancelar={() => setMovItem(null)} rotulo="Registrar" />
        </form>
      </Modal>
    </>
  );
}
