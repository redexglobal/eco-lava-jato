import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertasEstoque,
  aplicarMovimento,
  formatarReais,
  paraCsv,
  pode,
  reaisParaCentavos,
  temConflito,
  totaisPorEstado,
  transicaoValida,
  validarPlaca,
  validarTelefone,
} from "./regras.ts";
import type { Agendamento, ItemEstoque, Lancamento } from "./tipos.ts";

test("permissões: financeiro é restrito", () => {
  assert.equal(pode("admin", "financeiro", "editar"), true);
  assert.equal(pode("gestor", "financeiro", "editar"), true);
  assert.equal(pode("financeiro_consulta", "financeiro", "ler"), true);
  assert.equal(pode("financeiro_consulta", "financeiro", "editar"), false);
  assert.equal(pode("operacao", "financeiro", "ler"), false);
  assert.equal(pode("atendimento", "financeiro", "ler"), false);
});

test("permissões: só admin edita configurações e equipe", () => {
  assert.equal(pode("admin", "configuracoes", "editar"), true);
  assert.equal(pode("gestor", "configuracoes", "editar"), false);
  assert.equal(pode("gestor", "equipe", "editar"), false);
});

test("reais ↔ centavos", () => {
  assert.equal(reaisParaCentavos("1.234,56"), 123456);
  assert.equal(reaisParaCentavos("R$ 50"), 5000);
  assert.equal(reaisParaCentavos("10.5"), 1050);
  assert.equal(reaisParaCentavos("0,1"), 10);
  assert.equal(reaisParaCentavos(""), null);
  assert.equal(reaisParaCentavos("abc"), null);
  assert.equal(reaisParaCentavos("1,234"), null);
  assert.equal(formatarReais(null), "Não definido");
  assert.match(formatarReais(123456), /1\.234,56/);
});

const ag = (id: string, hora: number, dur: number, extra: Partial<Agendamento> = {}): Agendamento => ({
  id, unidadeId: "u", clienteId: "c", servicoId: "s", inicio: `2026-10-01T${String(hora).padStart(2, "0")}:00:00.000Z`,
  duracaoMin: dur, status: "agendado", responsavelId: "", observacoes: "", ...extra,
});

test("agenda: detecta sobreposição respeitando a capacidade", () => {
  const existentes = [ag("a", 9, 60)];
  assert.equal(temConflito(existentes, ag("n", 9, 30), 1), true);
  assert.equal(temConflito(existentes, ag("n", 10, 30), 1), false, "encostar no fim não é conflito");
  assert.equal(temConflito(existentes, ag("n", 9, 30), 2), false, "capacidade 2 aceita um paralelo");
  assert.equal(temConflito([ag("a", 9, 60, { status: "cancelado" })], ag("n", 9, 30), 1), false, "cancelado libera horário");
  assert.equal(temConflito([ag("a", 9, 60, { unidadeId: "outra" })], ag("n", 9, 30), 1), false, "outra unidade não conflita");
  assert.equal(temConflito(existentes, ag("a", 9, 90), 1), false, "editar o próprio não conflita consigo");
});

test("ordem: transições permitidas", () => {
  assert.equal(transicaoValida("aguardando", "em_execucao"), true);
  assert.equal(transicaoValida("em_execucao", "pronto"), true);
  assert.equal(transicaoValida("pronto", "entregue"), true);
  assert.equal(transicaoValida("aguardando", "entregue"), false);
  assert.equal(transicaoValida("entregue", "cancelado"), false);
  assert.equal(transicaoValida("cancelado", "aguardando"), false);
});

test("estoque: movimentos não deixam saldo negativo", () => {
  assert.deepEqual(aplicarMovimento(5, "entrada", 2.5), { ok: true, quantidade: 7.5 });
  assert.deepEqual(aplicarMovimento(5, "saida", 5), { ok: true, quantidade: 0 });
  assert.equal(aplicarMovimento(5, "saida", 6).ok, false);
  assert.equal(aplicarMovimento(5, "entrada", 0).ok, false);
  assert.deepEqual(aplicarMovimento(5, "ajuste", 0), { ok: true, quantidade: 0 });
  assert.equal(aplicarMovimento(5, "entrada", -1).ok, false);
});

test("estoque: alertas de mínimo e validade", () => {
  const base: ItemEstoque = { id: "1", unidadeId: "u", nome: "X", categoria: "", medida: "L", quantidade: 1, minimo: 2, fornecedor: "", lote: "", validade: "", ativo: true, observacoes: "" };
  const hoje = new Date("2026-10-01T12:00:00");
  const a = alertasEstoque([base, { ...base, id: "2", quantidade: 10, validade: "2026-10-10" }, { ...base, id: "3", quantidade: 10, validade: "2026-09-01" }, { ...base, id: "4", ativo: false }], hoje);
  assert.deepEqual(a.map((x) => `${x.itemId}:${x.tipo}`), ["1:minimo", "2:validade", "3:vencido"]);
});

test("financeiro: totais separados por estado", () => {
  const l = (tipo: "entrada" | "saida", valor: number, estado: Lancamento["estado"]): Lancamento => ({
    id: String(Math.random()), unidadeId: "u", tipo, categoria: "c", data: "2026-10-01", descricao: "d", valor, estado, autorId: "a", notas: "", demonstrativo: false,
  });
  const t = totaisPorEstado([l("entrada", 10000, "realizado"), l("saida", 2550, "realizado"), l("saida", 1500000, "estimativa")]);
  assert.equal(t.realizado.saldo, 7450);
  assert.equal(t.estimativa.saidas, 1500000);
  assert.equal(t.aprovado.quantidade, 0);
});

test("CSV: separa por ; e neutraliza fórmulas", () => {
  assert.equal(paraCsv([["a;b", "=SOMA(1)", 3]]), '"a;b";\'=SOMA(1);3');
});

test("validações de contato e placa", () => {
  assert.equal(validarTelefone("(24) 99999-0000"), true);
  assert.equal(validarTelefone("123"), false);
  assert.equal(validarTelefone(""), true);
  assert.equal(validarPlaca("ABC1D23"), true);
  assert.equal(validarPlaca("ABC-1234"), true);
  assert.equal(validarPlaca("12345"), false);
});
