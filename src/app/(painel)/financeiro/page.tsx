"use client";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { centavosParaCampo, ESTADOS_LANCAMENTO, formatarReais, paraCsv, reaisParaCentavos, totaisPorEstado } from "@/lib/regras";
import { data, hojeISO } from "@/lib/formato";
import type { EstadoLancamento, Lancamento } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Cartao, Etiqueta, Modal, Selecao, Vazio, useFormulario, useUi, type Tom } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const TOM: Record<EstadoLancamento, Tom> = { estimativa: "neutro", proposta: "alerta", aprovado: "marca", realizado: "folha" };
const EXPLICA: Record<EstadoLancamento, string> = {
  estimativa: "Palpite inicial, sem cotação.",
  proposta: "Valor proposto, aguardando aprovação.",
  aprovado: "Aprovado pelos responsáveis, ainda não pago/recebido.",
  realizado: "Dinheiro que de fato entrou ou saiu.",
};

type Form = { id?: string; tipo: "entrada" | "saida"; categoria: string; data: string; descricao: string; valor: string; estado: EstadoLancamento; notas: string };

export default function Financeiro() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("financeiro");
  const acao = useAcao();
  const { confirmar } = useUi();
  const nomes = useNomes();
  const u = unidade!.id;
  const [filtro, setFiltro] = useState({ estado: "", tipo: "", de: "", ate: "", categoria: "" });
  const [aberto, setAberto] = useState(false);
  const f = useFormulario<Form>({ tipo: "saida", categoria: "", data: hojeISO(), descricao: "", valor: "", estado: "estimativa", notas: "" });

  const daUnidade = estado.lancamentos.filter((l) => l.unidadeId === u);
  const categorias = [...new Set(daUnidade.map((l) => l.categoria))].sort();
  const lista = daUnidade
    .filter((l) => (!filtro.estado || l.estado === filtro.estado) && (!filtro.tipo || l.tipo === filtro.tipo) && (!filtro.categoria || l.categoria === filtro.categoria)
      && (!filtro.de || l.data >= filtro.de) && (!filtro.ate || l.data <= filtro.ate))
    .sort((a, b) => b.data.localeCompare(a.data));
  const totais = totaisPorEstado(lista);

  function abrir(l?: Lancamento) {
    f.reiniciar(l ? { id: l.id, tipo: l.tipo, categoria: l.categoria, data: l.data, descricao: l.descricao, valor: centavosParaCampo(l.valor), estado: l.estado, notas: l.notas }
      : { tipo: "saida", categoria: "", data: hojeISO(), descricao: "", valor: "", estado: "estimativa", notas: "" });
    setAberto(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const valor = reaisParaCentavos(f.dados.valor);
    if (valor === null) return f.setErros({ valor: "Use o formato 1.234,56." });
    const { valor: _v, ...resto } = f.dados;
    void _v;
    if (acao({ tipo: "lancamento.salvar", dados: { ...resto, unidadeId: u, valor } }, { sucesso: "Lançamento salvo.", setErros: f.setErros })) setAberto(false);
  }
  async function excluir() {
    if (f.dados.id && await confirmar({ titulo: "Excluir lançamento", texto: "O lançamento será removido. A exclusão fica registrada na auditoria.", rotulo: "Excluir", perigo: true })) {
      if (acao({ tipo: "lancamento.excluir", id: f.dados.id }, { sucesso: "Lançamento excluído." })) setAberto(false);
    }
  }
  function exportar() {
    const csv = paraCsv([
      ["Data", "Tipo", "Estado", "Categoria", "Descrição", "Valor (R$)", "Demonstrativo"],
      ...lista.map((l) => [l.data, l.tipo, ESTADOS_LANCAMENTO[l.estado], l.categoria, l.descricao, (l.valor / 100).toFixed(2).replace(".", ","), l.demonstrativo ? "sim" : "não"]),
    ]);
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${unidade!.nome.toLowerCase().replace(/\W+/g, "-")}-${hojeISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sel = "rounded-lg border border-borda bg-superficie px-3 py-2 text-sm";
  return (
    <>
      <Cabecalho titulo="Financeiro gerencial" descricao={<>Controle interno de <strong>{unidade!.nome}</strong>. Cada unidade tem o seu; nada é somado entre frentes automaticamente.</>}
        acoes={<>{editar && <Botao onClick={() => abrir()}><Plus size={16} /> Lançamento</Botao>}<Botao variante="secundario" onClick={exportar} disabled={!lista.length}><Download size={16} /> CSV</Botao></>} />
      <Aviso titulo="Controle gerencial básico">
        Não substitui contabilidade, nota fiscal, cálculo de impostos, folha de pagamento, conciliação bancária ou orientação profissional. Não há integração com banco ou pagamentos.
      </Aviso>
      {!editar && <p className="mt-2 text-sm text-suave">Seu papel permite apenas consultar.</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ESTADOS_LANCAMENTO) as EstadoLancamento[]).map((e) => (
          <Cartao key={e}>
            <div className="flex items-center justify-between"><Etiqueta tom={TOM[e]}>{ESTADOS_LANCAMENTO[e]}</Etiqueta><span className="text-xs text-suave">{totais[e].quantidade} lanç.</span></div>
            <p className={`mt-2 font-titulo text-3xl ${totais[e].saldo < 0 ? "text-perigo" : "text-marca-forte"}`}>{formatarReais(totais[e].saldo)}</p>
            <p className="text-xs text-suave">entradas {formatarReais(totais[e].entradas)} − saídas {formatarReais(totais[e].saidas)}</p>
            <p className="mt-1 text-xs text-suave">{EXPLICA[e]}</p>
          </Cartao>
        ))}
      </div>
      <p className="mt-2 text-xs text-suave">Os totais seguem os filtros abaixo. Cada estado é somado separadamente: estimativa nunca entra no realizado.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label="Estado" className={sel} value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
          <option value="">Todos os estados</option>{Object.entries(ESTADOS_LANCAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Tipo" className={sel} value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
          <option value="">Entradas e saídas</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
        </select>
        <select aria-label="Categoria" className={sel} value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}>
          <option value="">Todas as categorias</option>{categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">de <input type="date" className={sel} value={filtro.de} onChange={(e) => setFiltro({ ...filtro, de: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-sm">até <input type="date" className={sel} value={filtro.ate} onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })} /></label>
      </div>

      <div className="mt-4">
        {lista.length === 0 ? <Vazio titulo="Nenhum lançamento" texto={daUnidade.length ? "Nada corresponde aos filtros." : "Registre o primeiro lançamento desta unidade."} /> : (
          <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-fundo text-left text-xs text-suave"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody className="divide-y divide-borda">
                {lista.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{data(l.data)}</td>
                    <td className="px-3 py-2"><p>{l.descricao} {l.demonstrativo && <Etiqueta>exemplo</Etiqueta>}</p><p className="text-xs text-suave">{l.categoria} · por {nomes.membro(l.autorId)}</p></td>
                    <td className="px-3 py-2"><Etiqueta tom={TOM[l.estado]}>{ESTADOS_LANCAMENTO[l.estado]}</Etiqueta></td>
                    <td className={`px-3 py-2 text-right whitespace-nowrap ${l.tipo === "entrada" ? "text-folha-forte" : "text-perigo"}`}>{l.tipo === "entrada" ? "+" : "−"} {formatarReais(l.valor)}</td>
                    <td className="px-3 py-2 text-right">{editar && <Botao variante="fantasma" className="min-h-8 px-2 text-xs" onClick={() => abrir(l)}>Editar</Botao>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal aberto={aberto} titulo={f.dados.id ? "Editar lançamento" : "Novo lançamento"} onFechar={() => setAberto(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao rotulo="Tipo" value={f.dados.tipo} onChange={(e) => f.campo("tipo")(e.target.value as Form["tipo"])} opcoes={[{ valor: "saida", texto: "Saída (despesa)" }, { valor: "entrada", texto: "Entrada (receita)" }]} />
            <Selecao rotulo="Estado" value={f.dados.estado} onChange={(e) => f.campo("estado")(e.target.value as EstadoLancamento)} opcoes={Object.entries(ESTADOS_LANCAMENTO).map(([valor, texto]) => ({ valor, texto }))} ajuda={EXPLICA[f.dados.estado]} />
          </div>
          <Campo rotulo="Descrição" obrigatorio value={f.dados.descricao} onChange={(e) => f.campo("descricao")(e.target.value)} erro={f.erros.descricao} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Categoria" obrigatorio list="categorias" value={f.dados.categoria} onChange={(e) => f.campo("categoria")(e.target.value)} erro={f.erros.categoria} />
            <Campo rotulo="Data" type="date" obrigatorio value={f.dados.data} onChange={(e) => f.campo("data")(e.target.value)} erro={f.erros.data} />
            <Campo rotulo="Valor (R$)" inputMode="decimal" obrigatorio value={f.dados.valor} onChange={(e) => f.campo("valor")(e.target.value)} erro={f.erros.valor} placeholder="0,00" />
          </div>
          <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          <AreaTexto rotulo="Notas" value={f.dados.notas} onChange={(e) => f.campo("notas")(e.target.value)} />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {f.dados.id && <Botao variante="fantasma" className="mr-auto text-perigo" onClick={excluir}>Excluir</Botao>}
            <Botao variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao type="submit">Salvar</Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
