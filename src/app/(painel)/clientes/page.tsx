"use client";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { useDados } from "@/lib/store";
import { STATUS_ORDEM } from "@/lib/regras";
import { data, dataHora } from "@/lib/formato";
import type { Cliente, EstagioCliente } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Etiqueta, Filtro, Marcar, Modal, RodapeForm, Selecao, Vazio, useFormulario, useUi, type Tom } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

const ESTAGIOS: Record<EstagioCliente, { texto: string; tom: Tom }> = {
  lead: { texto: "Lead", tom: "alerta" },
  em_contato: { texto: "Em contato", tom: "marca" },
  cliente: { texto: "Cliente", tom: "folha" },
  inativo: { texto: "Inativo", tom: "neutro" },
};

type Form = Omit<Cliente, "id" | "criadoEm" | "demonstrativo"> & { id?: string };

const vazio = (unidadeId: string): Form => ({
  unidadeId, nome: "", telefone: "", email: "", origem: "", indicadoPor: "", estagio: "lead",
  consentimento: { contatoPermitido: false, origem: "" }, naoContatar: false, observacoes: "",
});

export default function Clientes() {
  const { estado, unidade } = useDados();
  const { editar } = usePermissao("clientes");
  const acao = useAcao();
  const { confirmar } = useUi();
  const nomes = useNomes();
  const [busca, setBusca] = useState("");
  const [estagio, setEstagio] = useState("");
  const [editando, setEditando] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const f = useFormulario<Form>(vazio(unidade!.id));
  const [contato, setContato] = useState({ canal: "WhatsApp", resumo: "" });

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return estado.clientes
      .filter((c) => c.unidadeId === unidade!.id)
      .filter((c) => !estagio || c.estagio === estagio)
      .filter((c) => !q || [c.nome, c.telefone, c.email, c.origem].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [estado.clientes, unidade, busca, estagio]);

  const detalhe = estado.clientes.find((c) => c.id === detalheId) ?? null;

  function abrirNovo() {
    f.reiniciar(vazio(unidade!.id));
    setEditando(true);
  }
  function abrirEdicao(c: Cliente) {
    f.reiniciar({ ...c });
    setDetalheId(null);
    setEditando(true);
  }
  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const id = acao({ tipo: "cliente.salvar", dados: f.dados }, { sucesso: "Cliente salvo.", setErros: f.setErros });
    if (id) setEditando(false);
  }
  async function excluir(c: Cliente) {
    const ok = await confirmar({
      titulo: "Excluir cadastro",
      texto: `Os dados pessoais e o histórico de contatos de "${c.nome}" serão apagados. Ordens de serviço continuam, mas sem nome. Não dá para desfazer.`,
      rotulo: "Excluir definitivamente",
      perigo: true,
    });
    if (ok && acao({ tipo: "cliente.excluir", id: c.id }, { sucesso: "Cadastro excluído." })) setDetalheId(null);
  }
  function exportar(c: Cliente) {
    const pacote = {
      exportadoEm: new Date().toISOString(),
      cliente: c,
      contatos: estado.interacoes.filter((i) => i.clienteId === c.id),
      agendamentos: estado.agendamentos.filter((a) => a.clienteId === c.id),
      ordens: estado.ordens.filter((o) => o.clienteId === c.id),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dados-cliente-${c.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function registrarContato(ev: React.FormEvent) {
    ev.preventDefault();
    if (detalhe && acao({ tipo: "cliente.interacao", clienteId: detalhe.id, ...contato }, { sucesso: "Contato registrado." })) {
      setContato({ canal: contato.canal, resumo: "" });
    }
  }

  const d = f.dados;
  return (
    <>
      <Cabecalho
        titulo="Clientes"
        descricao="Contatos, leads e indicações. Só registre o necessário e respeite quem pediu para não ser contatado."
        acoes={editar && <Botao onClick={abrirNovo}><Plus size={16} /> Novo contato</Botao>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Filtro valor={busca} onChange={setBusca} rotulo="Buscar nome, telefone ou origem" />
        <select aria-label="Filtrar por estágio" value={estagio} onChange={(e) => setEstagio(e.target.value)} className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm">
          <option value="">Todos os estágios</option>
          {Object.entries(ESTAGIOS).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vazio titulo={busca || estagio ? "Nenhum resultado para o filtro" : "Nenhum cliente ainda"} texto={busca || estagio ? "Limpe a busca ou troque o estágio." : "Cadastre o primeiro contato."} />
      ) : (
        <ul className="grid gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setDetalheId(c.id)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-left hover:border-marca">
                <span>
                  <span className="font-medium">{c.nome}</span>
                  <span className="block text-xs text-suave">{c.telefone || "sem telefone"} · origem: {c.origem || "—"}{c.indicadoPor && ` · indicado por ${c.indicadoPor}`}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {c.demonstrativo && <Etiqueta>exemplo</Etiqueta>}
                  {c.naoContatar ? <Etiqueta tom="perigo">não contatar</Etiqueta> : c.consentimento.contatoPermitido ? <Etiqueta tom="folha">contato autorizado</Etiqueta> : <Etiqueta>sem consentimento</Etiqueta>}
                  <Etiqueta tom={ESTAGIOS[c.estagio].tom}>{ESTAGIOS[c.estagio].texto}</Etiqueta>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal aberto={editando} titulo={d.id ? "Editar contato" : "Novo contato"} onFechar={() => setEditando(false)}>
        <form onSubmit={salvar} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={d.nome} onChange={(e) => f.campo("nome")(e.target.value)} erro={f.erros.nome} autoComplete="off" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Telefone" inputMode="tel" value={d.telefone} onChange={(e) => f.campo("telefone")(e.target.value)} erro={f.erros.telefone} placeholder="(24) 90000-0000" />
            <Campo rotulo="E-mail" type="email" value={d.email} onChange={(e) => f.campo("email")(e.target.value)} erro={f.erros.email} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Origem" value={d.origem} onChange={(e) => f.campo("origem")(e.target.value)} placeholder="Indicação, Instagram, passou em frente…" />
            <Campo rotulo="Indicado por" value={d.indicadoPor} onChange={(e) => f.campo("indicadoPor")(e.target.value)} />
          </div>
          <Selecao rotulo="Estágio" value={d.estagio} onChange={(e) => f.campo("estagio")(e.target.value as EstagioCliente)} opcoes={Object.entries(ESTAGIOS).map(([k, v]) => ({ valor: k, texto: v.texto }))} />
          <fieldset className="grid gap-2 rounded-lg border border-borda p-3">
            <legend className="px-1 text-sm font-medium">Consentimento</legend>
            <Marcar rotulo="A pessoa autorizou ser contatada" checked={d.consentimento.contatoPermitido} disabled={d.naoContatar}
              onChange={(e) => f.campo("consentimento")({ ...d.consentimento, contatoPermitido: e.target.checked })} />
            <Campo rotulo="Como autorizou" value={d.consentimento.origem ?? ""} onChange={(e) => f.campo("consentimento")({ ...d.consentimento, origem: e.target.value })} placeholder="Ex.: balcão, mensagem, formulário" />
            <Marcar rotulo="Pediu para NÃO ser contatado" ajuda="Remove a autorização de contato." checked={d.naoContatar} onChange={(e) => f.campo("naoContatar")(e.target.checked)} />
          </fieldset>
          <AreaTexto rotulo="Observações" ajuda="Não registre documentos, saúde ou outros dados sensíveis." value={d.observacoes} onChange={(e) => f.campo("observacoes")(e.target.value)} />
          <RodapeForm onCancelar={() => setEditando(false)} />
        </form>
      </Modal>

      <Modal aberto={!!detalhe} titulo={detalhe?.nome ?? ""} onFechar={() => setDetalheId(null)} largo>
        {detalhe && (
          <div className="grid gap-5 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-suave">Telefone</dt><dd>{detalhe.telefone || "—"}</dd></div>
              <div><dt className="text-suave">E-mail</dt><dd>{detalhe.email || "—"}</dd></div>
              <div><dt className="text-suave">Estágio</dt><dd><Etiqueta tom={ESTAGIOS[detalhe.estagio].tom}>{ESTAGIOS[detalhe.estagio].texto}</Etiqueta></dd></div>
              <div><dt className="text-suave">Consentimento</dt><dd>{detalhe.naoContatar ? "Pediu para não ser contatado" : detalhe.consentimento.contatoPermitido ? `Autorizado em ${data(detalhe.consentimento.data)} — ${detalhe.consentimento.origem || "origem não informada"}` : "Não autorizado"}</dd></div>
              {detalhe.observacoes && <div className="sm:col-span-2"><dt className="text-suave">Observações</dt><dd>{detalhe.observacoes}</dd></div>}
            </dl>

            <section>
              <h3 className="mb-2 font-medium">Histórico de contatos</h3>
              {editar && (
                <form onSubmit={registrarContato} className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <select aria-label="Canal" value={contato.canal} onChange={(e) => setContato({ ...contato, canal: e.target.value })} className="rounded-lg border border-borda bg-superficie px-2 py-2">
                    {["WhatsApp", "Telefone", "Presencial", "E-mail", "Outro"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input aria-label="Resumo do contato" placeholder="Resumo do contato" value={contato.resumo} onChange={(e) => setContato({ ...contato, resumo: e.target.value })} className="flex-1 rounded-lg border border-borda bg-superficie px-3 py-2" />
                  <Botao type="submit" variante="secundario">Registrar</Botao>
                </form>
              )}
              {detalhe.naoContatar && <Aviso tom="perigo">Esta pessoa pediu para não ser contatada. Registre só contatos iniciados por ela.</Aviso>}
              <ul className="mt-2 space-y-2">
                {estado.interacoes.filter((i) => i.clienteId === detalhe.id).map((i) => (
                  <li key={i.id} className="rounded-lg bg-fundo px-3 py-2"><span className="text-xs text-suave">{dataHora(i.data)} · {i.canal} · {nomes.membro(i.autorId)}</span><br />{i.resumo}</li>
                ))}
                {!estado.interacoes.some((i) => i.clienteId === detalhe.id) && <li className="text-suave">Nenhum contato registrado.</li>}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 font-medium">Serviços</h3>
              <ul className="space-y-1">
                {estado.agendamentos.filter((a) => a.clienteId === detalhe.id).map((a) => (
                  <li key={a.id}>Agendamento {dataHora(a.inicio)} — {nomes.servico(a.servicoId)} <Etiqueta>{a.status}</Etiqueta></li>
                ))}
                {estado.ordens.filter((o) => o.clienteId === detalhe.id).map((o) => (
                  <li key={o.id}>OS #{o.numero} — {nomes.servico(o.servicoId)} <Etiqueta tom="marca">{STATUS_ORDEM[o.status]}</Etiqueta></li>
                ))}
                {!estado.agendamentos.some((a) => a.clienteId === detalhe.id) && !estado.ordens.some((o) => o.clienteId === detalhe.id) && <li className="text-suave">Nenhum serviço ainda.</li>}
              </ul>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-borda pt-4">
              {editar && <Botao variante="secundario" onClick={() => abrirEdicao(detalhe)}>Editar</Botao>}
              <Botao variante="secundario" onClick={() => exportar(detalhe)}><Download size={16} /> Exportar dados (LGPD)</Botao>
              {editar && <Botao variante="perigo" onClick={() => excluir(detalhe)} className="sm:ml-auto">Excluir cadastro</Botao>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
