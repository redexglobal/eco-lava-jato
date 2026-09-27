// Regras de negócio puras: sem React, sem navegador. Testadas em regras.test.ts.
import type {
  Agendamento,
  EstadoLancamento,
  ItemEstoque,
  Lancamento,
  Membro,
  Modulo,
  Papel,
  StatusOrdem,
  TipoMovimento,
} from "./tipos.ts";

// ---------------------------------------------------------------- permissões

export const PAPEIS: Record<Papel, { nome: string; descricao: string }> = {
  admin: { nome: "Proprietário/Admin", descricao: "Acesso total, inclusive configurações e equipe." },
  gestor: { nome: "Gestor", descricao: "Opera e administra tudo, exceto configurações do negócio." },
  atendimento: { nome: "Atendimento/CRM", descricao: "Clientes, agenda e tarefas." },
  operacao: { nome: "Operação", descricao: "Ordens de serviço, estoque e tarefas." },
  projetos: { nome: "Coordenação ecológica/projetos", descricao: "Projetos, tarefas e calendário." },
  financeiro_consulta: { nome: "Consulta financeira", descricao: "Somente leitura do financeiro e projetos." },
};

type Nivel = "ler" | "editar";
const L = "ler" as const;
const E = "editar" as const;

/** Matriz papel × módulo. Ausente = sem acesso. Sugestão inicial, ajustável (ver docs/DECISOES_PENDENTES.md). */
const MATRIZ: Record<Papel, Partial<Record<Modulo, Nivel>>> = {
  admin: {
    clientes: E, agenda: E, operacao: E, servicos: E, estoque: E,
    equipe: E, tarefas: E, financeiro: E, projetos: E, configuracoes: E,
  },
  gestor: {
    clientes: E, agenda: E, operacao: E, servicos: E, estoque: E,
    equipe: L, tarefas: E, financeiro: E, projetos: E, configuracoes: L,
  },
  atendimento: { clientes: E, agenda: E, operacao: L, servicos: L, tarefas: E, projetos: L },
  operacao: { clientes: L, agenda: L, operacao: E, servicos: L, estoque: E, tarefas: E },
  projetos: { estoque: L, equipe: L, tarefas: E, projetos: E },
  financeiro_consulta: { financeiro: L, projetos: L },
};

export function pode(papel: Papel, modulo: Modulo, nivel: Nivel = "ler"): boolean {
  const n = MATRIZ[papel]?.[modulo];
  if (!n) return false;
  return nivel === "ler" || n === "editar";
}

/** Admin enxerga todas as unidades; os demais só as que foram vinculadas a eles. */
export function acessaUnidade(membro: Membro, unidadeId: string): boolean {
  return membro.papel === "admin" || membro.unidades.includes(unidadeId);
}

// ---------------------------------------------------------------- dinheiro

/** "1.234,56" | "1234.56" | "R$ 50" → centavos. Retorna null se inválido ou vazio. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo) return null;
  let normal = limpo;
  if (limpo.includes(",")) normal = limpo.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}

export function formatarReais(centavos: number | null): string {
  if (centavos === null) return "Não definido";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function centavosParaCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// ---------------------------------------------------------------- agenda

function intervalo(a: Pick<Agendamento, "inicio" | "duracaoMin">): [number, number] {
  const ini = new Date(a.inicio).getTime();
  return [ini, ini + a.duracaoMin * 60_000];
}

/**
 * Agendamentos ativos da mesma unidade que se sobrepõem ao novo.
 * Há conflito quando o número de sobreposições atinge a capacidade simultânea configurada.
 */
export function sobreposicoes(
  existentes: Agendamento[],
  novo: Pick<Agendamento, "id" | "unidadeId" | "inicio" | "duracaoMin">,
): Agendamento[] {
  const [ini, fim] = intervalo(novo);
  return existentes.filter((a) => {
    if (a.id === novo.id || a.unidadeId !== novo.unidadeId) return false;
    if (a.status === "cancelado") return false;
    const [aIni, aFim] = intervalo(a);
    return aIni < fim && ini < aFim;
  });
}

export function temConflito(
  existentes: Agendamento[],
  novo: Pick<Agendamento, "id" | "unidadeId" | "inicio" | "duracaoMin">,
  capacidade: number,
): boolean {
  return sobreposicoes(existentes, novo).length >= Math.max(1, capacidade);
}

// ---------------------------------------------------------------- ordens de serviço

export const STATUS_ORDEM: Record<StatusOrdem, string> = {
  aguardando: "Aguardando",
  em_execucao: "Em execução",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const TRANSICOES: Record<StatusOrdem, StatusOrdem[]> = {
  aguardando: ["em_execucao", "cancelado"],
  em_execucao: ["pronto", "aguardando", "cancelado"],
  pronto: ["entregue", "em_execucao"],
  entregue: [],
  cancelado: [],
};

export function proximosStatus(atual: StatusOrdem): StatusOrdem[] {
  return TRANSICOES[atual];
}

export function transicaoValida(de: StatusOrdem, para: StatusOrdem): boolean {
  return TRANSICOES[de].includes(para);
}

// ---------------------------------------------------------------- estoque

/** Nova quantidade após o movimento, ou erro se ficaria negativa. */
export function aplicarMovimento(
  quantidadeAtual: number,
  tipo: TipoMovimento,
  quantidade: number,
): { ok: true; quantidade: number } | { ok: false; erro: string } {
  if (!Number.isFinite(quantidade) || quantidade < 0) return { ok: false, erro: "Quantidade inválida." };
  if (tipo === "ajuste") return { ok: true, quantidade };
  if (quantidade === 0) return { ok: false, erro: "Informe uma quantidade maior que zero." };
  const nova = tipo === "entrada" ? quantidadeAtual + quantidade : quantidadeAtual - quantidade;
  if (nova < 0) return { ok: false, erro: `Saldo insuficiente: há ${quantidadeAtual} em estoque.` };
  return { ok: true, quantidade: Math.round(nova * 1000) / 1000 };
}

export type Alerta = { itemId: string; tipo: "minimo" | "validade" | "vencido"; texto: string };

export function alertasEstoque(itens: ItemEstoque[], hoje = new Date()): Alerta[] {
  const alertas: Alerta[] = [];
  const limite = hoje.getTime() + 30 * 86_400_000;
  for (const i of itens) {
    if (!i.ativo) continue;
    if (i.quantidade <= i.minimo) {
      alertas.push({ itemId: i.id, tipo: "minimo", texto: `${i.nome}: ${i.quantidade} ${i.medida} (mínimo ${i.minimo})` });
    }
    if (i.validade) {
      const v = new Date(i.validade + "T23:59:59").getTime();
      if (v < hoje.getTime()) alertas.push({ itemId: i.id, tipo: "vencido", texto: `${i.nome}: validade vencida` });
      else if (v <= limite) alertas.push({ itemId: i.id, tipo: "validade", texto: `${i.nome}: vence em até 30 dias` });
    }
  }
  return alertas;
}

// ---------------------------------------------------------------- financeiro

export const ESTADOS_LANCAMENTO: Record<EstadoLancamento, string> = {
  estimativa: "Estimativa",
  proposta: "Proposta",
  aprovado: "Aprovado",
  realizado: "Realizado",
};

export type Totais = Record<EstadoLancamento, { entradas: number; saidas: number; saldo: number; quantidade: number }>;

/** Soma por estado. Nunca mistura estimativa com realizado. */
export function totaisPorEstado(lancamentos: Lancamento[]): Totais {
  const base = () => ({ entradas: 0, saidas: 0, saldo: 0, quantidade: 0 });
  const t: Totais = { estimativa: base(), proposta: base(), aprovado: base(), realizado: base() };
  for (const l of lancamentos) {
    const s = t[l.estado];
    s.quantidade++;
    if (l.tipo === "entrada") s.entradas += l.valor;
    else s.saidas += l.valor;
    s.saldo = s.entradas - s.saidas;
  }
  return t;
}

export function paraCsv(linhas: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    // Evita injeção de fórmula ao abrir no Excel/Sheets.
    const seguro = /^[=+\-@]/.test(s) && typeof v === "string" ? "'" + s : s;
    return /[";\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return linhas.map((l) => l.map(esc).join(";")).join("\n");
}

// ---------------------------------------------------------------- validação

export type Erros = Record<string, string>;

export function validarTelefone(t: string): boolean {
  if (!t) return true;
  const d = t.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

export function validarEmail(e: string): boolean {
  if (!e) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function validarPlaca(p: string): boolean {
  if (!p) return true;
  return /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i.test(p.trim());
}

export function dataValida(iso: string): boolean {
  return !!iso && !Number.isNaN(new Date(iso).getTime());
}
