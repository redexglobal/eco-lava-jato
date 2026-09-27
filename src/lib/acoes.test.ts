import { test } from "node:test";
import assert from "node:assert/strict";
import { executar } from "./acoes.ts";
import { criarEstadoDemo } from "./demo.ts";
import type { Estado } from "./tipos.ts";

const admin = { membroId: "m-admin" };
const atend = { membroId: "m-atend" };
const oper = { membroId: "m-oper" };
const consulta = { membroId: "m-fin" };
const proj = { membroId: "m-proj" };

function ok(r: ReturnType<typeof executar>): Estado & { _id?: string } {
  if (!r.ok) assert.fail(r.erro + " " + JSON.stringify(r.erros ?? {}));
  return Object.assign(r.estado, { _id: r.id });
}


test("fluxo completo: contato → agendamento → OS → execução → entrega", () => {
  let e: Estado & { _id?: string } = criarEstadoDemo();
  e = ok(executar(e, atend, {
    tipo: "cliente.salvar",
    dados: { unidadeId: "u-lava", nome: "  Pessoa Teste  ", telefone: "(00) 90000-1111", email: "", origem: "Indicação", indicadoPor: "", estagio: "novo", consentimento: { contatoPermitido: true, origem: "Balcão" }, naoContatar: false, observacoes: "" },
  }));
  const cliente = e.clientes.at(-1)!;
  assert.equal(cliente.nome, "Pessoa Teste");
  assert.ok(cliente.consentimento.data, "registra a data do consentimento");

  e = ok(executar(e, atend, {
    tipo: "agendamento.salvar",
    dados: { unidadeId: "u-lava", clienteId: cliente.id, servicoId: "s-ext", inicio: "2030-01-10T12:00:00.000Z", duracaoMin: 40, responsavelId: "", observacoes: "" },
  }));
  const agId = e._id!;

  const antes = e.proximoNumeroOrdem;
  e = ok(executar(e, oper, { tipo: "agendamento.converter", id: agId, veiculo: { marca: "X", modelo: "Y", cor: "Z", placa: "" } }));
  const ordemId = e._id!;
  assert.equal(e.proximoNumeroOrdem, antes + 1);
  assert.equal(e.agendamentos.find((a) => a.id === agId)!.status, "convertido");

  // Converter de novo é idempotente: não cria segunda ordem.
  const e2 = ok(executar(e, oper, { tipo: "agendamento.converter", id: agId, veiculo: { marca: "X", modelo: "Y", cor: "Z", placa: "" } }));
  assert.equal(e2.ordens.length, e.ordens.length);

  e = ok(executar(e, oper, { tipo: "ordem.status", id: ordemId, para: "em_execucao" }));
  e = ok(executar(e, oper, { tipo: "ordem.checklist", id: ordemId, indice: 0 }));
  e = ok(executar(e, oper, { tipo: "ordem.status", id: ordemId, para: "pronto" }));
  e = ok(executar(e, oper, { tipo: "ordem.status", id: ordemId, para: "entregue" }));
  const o = e.ordens.find((x) => x.id === ordemId)!;
  assert.deepEqual(o.historico.map((h) => h.status), ["aguardando", "em_execucao", "pronto", "entregue"]);
  assert.ok(o.inicio && o.fim);
  assert.equal(o.checklist[0].feito, true);

  const r = executar(e, oper, { tipo: "ordem.status", id: ordemId, para: "cancelado" });
  assert.equal(r.ok, false, "entregue é final");
});

test("agenda recusa conflito e aceita quando a sobreposição é confirmada", () => {
  const e = criarEstadoDemo();
  const a2 = e.agendamentos.find((a) => a.id === "a-2")!;
  const dados = { unidadeId: "u-lava", clienteId: "c-1", servicoId: "s-ext", inicio: a2.inicio, duracaoMin: 30, responsavelId: "", observacoes: "" };
  const r = executar(e, atend, { tipo: "agendamento.salvar", dados });
  assert.equal(r.ok, false);
  assert.ok(executar(e, atend, { tipo: "agendamento.salvar", dados, permitirSobreposicao: true }).ok);
});

test("agendamento cancelado não vira OS", () => {
  let e = criarEstadoDemo();
  e = ok(executar(e, atend, { tipo: "agendamento.cancelar", id: "a-3" }));
  const r = executar(e, oper, { tipo: "agendamento.converter", id: "a-3", veiculo: { marca: "", modelo: "Y", cor: "", placa: "" } });
  assert.equal(r.ok, false);
});

test("permissões são checadas na ação, não só na tela", () => {
  const e = criarEstadoDemo();
  const lanc = { unidadeId: "u-lava", tipo: "entrada" as const, categoria: "Serviços", data: "2026-10-01", descricao: "Teste", valor: 1000, estado: "realizado" as const, notas: "" };
  assert.equal(executar(e, consulta, { tipo: "lancamento.salvar", dados: lanc }).ok, false, "consulta só lê");
  assert.equal(executar(e, oper, { tipo: "lancamento.salvar", dados: lanc }).ok, false);
  assert.equal(executar(e, oper, { tipo: "config.salvar", dados: e.config }).ok, false);
  assert.ok(executar(e, admin, { tipo: "lancamento.salvar", dados: lanc }).ok);
});

test("dados de uma unidade não são alterados por quem não tem acesso a ela", () => {
  const e = criarEstadoDemo();
  const r = executar(e, proj, { tipo: "tarefa.salvar", dados: { unidadeId: "u-lava", projetoId: "", titulo: "X", responsavelId: "", prazo: "", prioridade: "baixa", status: "a_fazer" } });
  assert.equal(r.ok, false);
  assert.ok(executar(e, proj, { tipo: "tarefa.salvar", dados: { unidadeId: "u-melipona", projetoId: "", titulo: "X", responsavelId: "", prazo: "", prioridade: "baixa", status: "a_fazer" } }).ok);
});

test("excluir cliente remove dados pessoais e histórico, e fica auditado sem o nome", () => {
  let e = criarEstadoDemo();
  e = ok(executar(e, atend, { tipo: "cliente.excluir", id: "c-3" }));
  assert.equal(e.clientes.some((c) => c.id === "c-3"), false);
  assert.equal(e.interacoes.some((i) => i.clienteId === "c-3"), false);
  assert.equal(e.auditoria[0].entidadeId, "c-3");
  assert.doesNotMatch(JSON.stringify(e.auditoria), /Exemplo Três/);
});

test("pedir para não ser contatado retira o consentimento", () => {
  let e = criarEstadoDemo();
  const c = e.clientes.find((x) => x.id === "c-1")!;
  e = ok(executar(e, atend, { tipo: "cliente.salvar", dados: { ...c, naoContatar: true } }));
  assert.equal(e.clientes.find((x) => x.id === "c-1")!.consentimento.contatoPermitido, false);
});

test("validação devolve erros por campo", () => {
  const r = executar(criarEstadoDemo(), atend, {
    tipo: "cliente.salvar",
    dados: { unidadeId: "u-lava", nome: "", telefone: "12", email: "x@", origem: "", indicadoPor: "", estagio: "novo", consentimento: { contatoPermitido: false }, naoContatar: false, observacoes: "" },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.erros ?? {}).sort(), ["email", "nome", "telefone"]);
});

test("estoque: saída maior que o saldo é recusada; ajuste exige motivo", () => {
  const e = criarEstadoDemo();
  assert.equal(executar(e, oper, { tipo: "item.movimento", itemId: "e-1", mov: "saida", quantidade: 99, motivo: "" }).ok, false);
  assert.equal(executar(e, oper, { tipo: "item.movimento", itemId: "e-1", mov: "ajuste", quantidade: 3, motivo: "" }).ok, false);
  const e2 = ok(executar(e, oper, { tipo: "item.movimento", itemId: "e-1", mov: "entrada", quantidade: 6, motivo: "Compra" }));
  assert.equal(e2.itens.find((i) => i.id === "e-1")!.quantidade, 10);
});

test("não é possível ficar sem administrador nem rebaixar a si mesmo", () => {
  const e = criarEstadoDemo();
  const eu = e.membros.find((m) => m.id === "m-admin")!;
  assert.equal(executar(e, admin, { tipo: "membro.salvar", dados: { ...eu, papel: "gestor" } }).ok, false);
});
