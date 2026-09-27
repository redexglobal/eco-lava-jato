"use client";
import { useState } from "react";
import { useDados } from "@/lib/store";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/regras";
import { dataHora } from "@/lib/formato";
import type { Configuracoes, Unidade } from "@/lib/tipos";
import { AreaTexto, Aviso, Botao, Cabecalho, Campo, Cartao, Etiqueta, Marcar, Modal, RodapeForm, useFormulario, useUi } from "@/componentes/ui";
import { useAcao, useNomes, usePermissao } from "@/componentes/hooks";

export default function ConfiguracoesPagina() {
  const { estado, reiniciarDemo, membro } = useDados();
  const { editar } = usePermissao("configuracoes");
  const acao = useAcao();
  const { confirmar, avisar } = useUi();
  const nomes = useNomes();
  const f = useFormulario<Configuracoes>(estado.config);
  const [orcamento, setOrcamento] = useState(centavosParaCampo(estado.config.orcamentoReferencia.valor));
  const [unidadeAberta, setUnidadeAberta] = useState(false);
  const fu = useFormulario<Omit<Unidade, "id"> & { id?: string }>({ nome: "", descricao: "", ativa: true });
  const d = f.dados;

  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const valor = reaisParaCentavos(orcamento);
    if (valor === null) return f.setErros({ orcamento: "Use o formato 15.000,00." });
    acao({ tipo: "config.salvar", dados: { ...d, orcamentoReferencia: { ...d.orcamentoReferencia, valor } } }, { sucesso: "Configurações salvas.", setErros: f.setErros });
  }
  function abrirUnidade(u?: Unidade) {
    fu.reiniciar(u ? { ...u } : { nome: "", descricao: "", ativa: true });
    setUnidadeAberta(true);
  }
  function salvarUnidade(ev: React.FormEvent) {
    ev.preventDefault();
    if (acao({ tipo: "unidade.salvar", dados: fu.dados }, { sucesso: "Unidade salva.", setErros: fu.setErros })) setUnidadeAberta(false);
  }
  async function reiniciar() {
    if (await confirmar({ titulo: "Reiniciar demonstração", texto: "Tudo o que foi cadastrado neste navegador será apagado e os dados de exemplo voltarão ao estado inicial.", rotulo: "Reiniciar", perigo: true })) {
      reiniciarDemo();
      avisar("Demonstração reiniciada.");
    }
  }

  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Dados do negócio e regras ainda em aberto. Campos vazios são decisões pendentes dos sócios." />
      {!editar && <div className="mb-4"><Aviso tom="neutro">Somente o administrador altera configurações.</Aviso></div>}

      <form onSubmit={salvar} noValidate className="grid gap-4">
        <Cartao className="grid gap-3">
          <h2 className="font-medium">Negócio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" obrigatorio value={d.nomeNegocio} onChange={(e) => f.campo("nomeNegocio")(e.target.value)} erro={f.erros.nomeNegocio} disabled={!editar} />
            <Campo rotulo="Cidade" value={d.cidade} onChange={(e) => f.campo("cidade")(e.target.value)} disabled={!editar} />
          </div>
          <Campo rotulo="Contatos públicos" placeholder="Pendente" value={d.contatos} onChange={(e) => f.campo("contatos")(e.target.value)} disabled={!editar} />
          <Campo rotulo="Horário de funcionamento" placeholder="Pendente — não definido na reunião" value={d.horario} onChange={(e) => f.campo("horario")(e.target.value)} disabled={!editar} />
        </Cartao>

        <Cartao className="grid gap-3">
          <h2 className="font-medium">Operação</h2>
          <Campo rotulo="Atendimentos simultâneos" type="number" min={1} max={50} value={d.capacidadeSimultanea} onChange={(e) => f.campo("capacidadeSimultanea")(Number(e.target.value))} erro={f.erros.capacidadeSimultanea} disabled={!editar}
            ajuda="Quantos carros podem ser atendidos ao mesmo tempo. A agenda avisa quando um horário passa disso." />
          <Marcar rotulo="Exigir placa na ordem de serviço" ajuda="Desligado por padrão: só pedir se for realmente necessário." checked={d.pedirPlaca} onChange={(e) => f.campo("pedirPlaca")(e.target.checked)} disabled={!editar} />
        </Cartao>

        <Cartao className="grid gap-3">
          <h2 className="font-medium">Referência de orçamento</h2>
          <Aviso>Valor citado informalmente na reunião. Não é orçamento aprovado, cotação nem saldo.</Aviso>
          <Campo rotulo="Valor de referência (R$)" inputMode="decimal" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} erro={f.erros.orcamento} disabled={!editar} />
          <Marcar rotulo="Mostrar na visão geral (para quem vê o financeiro)" checked={d.orcamentoReferencia.mostrar} onChange={(e) => f.campo("orcamentoReferencia")({ ...d.orcamentoReferencia, mostrar: e.target.checked })} disabled={!editar} />
        </Cartao>

        <Cartao className="grid gap-3">
          <h2 className="font-medium">Regras do espaço</h2>
          <AreaTexto rotulo="Texto" rows={4} value={d.regrasLocal.texto} onChange={(e) => f.campo("regrasLocal")({ ...d.regrasLocal, texto: e.target.value })} disabled={!editar} />
          <Marcar rotulo="Texto aprovado pelos responsáveis" checked={d.regrasLocal.aprovado} onChange={(e) => f.campo("regrasLocal")({ ...d.regrasLocal, aprovado: e.target.checked })} disabled={!editar} />
          {!d.regrasLocal.aprovado && <Etiqueta tom="alerta">rascunho — não é regra oficial</Etiqueta>}
        </Cartao>

        <Cartao className="grid gap-3">
          <h2 className="font-medium">Política de dados (LGPD)</h2>
          <AreaTexto rotulo="Resumo da política" rows={4} placeholder="Pendente: quem é o responsável pelos dados, por quanto tempo guardar, como a pessoa pede correção/exclusão." value={d.politicaDados} onChange={(e) => f.campo("politicaDados")(e.target.value)} disabled={!editar} />
        </Cartao>

        {editar && <div className="flex justify-end"><Botao type="submit">Salvar configurações</Botao></div>}
      </form>

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-titulo text-2xl text-marca-forte">Unidades do ecossistema</h2>
          {editar && <Botao variante="secundario" onClick={() => abrirUnidade()}>Nova unidade</Botao>}
        </div>
        <ul className="grid gap-2">
          {estado.unidades.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm">
              <span><strong>{u.nome}</strong><span className="block text-xs text-suave">{u.descricao}</span></span>
              <span className="flex items-center gap-2">{!u.ativa && <Etiqueta>inativa</Etiqueta>}{editar && <Botao variante="fantasma" className="min-h-8 px-2" onClick={() => abrirUnidade(u)}>Editar</Botao>}</span>
            </li>
          ))}
        </ul>
      </section>

      {membro?.papel === "admin" && (
        <section className="mt-8">
          <h2 className="mb-2 font-titulo text-2xl text-marca-forte">Auditoria</h2>
          <p className="mb-2 text-sm text-suave">Últimas operações administrativas (até 500). Sem dados pessoais no texto.</p>
          {estado.auditoria.length === 0 ? <p className="text-sm text-suave">Nada registrado ainda.</p> : (
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-borda bg-superficie p-3 text-xs">
              {estado.auditoria.slice(0, 100).map((a) => <li key={a.id}><span className="text-suave">{dataHora(a.data)}</span> · {nomes.membro(a.autorId)} · {a.acao} {a.entidade} — {a.resumo}</li>)}
            </ul>
          )}
        </section>
      )}

      <section id="demo" className="mt-8 scroll-mt-24">
        <h2 className="mb-2 font-titulo text-2xl text-marca-forte">Sobre o modo demonstração</h2>
        <Cartao className="grid gap-2 text-sm">
          <p>Esta versão guarda os dados <strong>somente neste navegador</strong> (localStorage). Outro celular ou computador vê a sua própria cópia. Não há login real: qualquer pessoa com o link pode escolher um perfil.</p>
          <p>Por isso <strong>não cadastre clientes reais aqui</strong>. Para uso real é preciso ligar o banco de dados (Supabase) e o login — o passo a passo está no README do repositório.</p>
          <div><Botao variante="perigo" onClick={reiniciar}>Reiniciar dados de exemplo</Botao></div>
        </Cartao>
      </section>

      <Modal aberto={unidadeAberta} titulo={fu.dados.id ? "Editar unidade" : "Nova unidade"} onFechar={() => setUnidadeAberta(false)}>
        <form onSubmit={salvarUnidade} noValidate className="grid gap-3">
          <Campo rotulo="Nome" obrigatorio value={fu.dados.nome} onChange={(e) => fu.campo("nome")(e.target.value)} erro={fu.erros.nome} />
          <AreaTexto rotulo="Descrição" value={fu.dados.descricao} onChange={(e) => fu.campo("descricao")(e.target.value)} />
          <Marcar rotulo="Ativa" checked={fu.dados.ativa} onChange={(e) => fu.campo("ativa")(e.target.checked)} />
          <RodapeForm onCancelar={() => setUnidadeAberta(false)} />
        </form>
      </Modal>
    </>
  );
}
